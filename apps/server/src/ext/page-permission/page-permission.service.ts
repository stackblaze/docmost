import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PagePermissionRepo } from '@docmost/db/repos/page/page-permission.repo';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { PageAccessService } from '../../core/page/page-access/page-access.service';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';

@Injectable()
export class PagePermissionService {
  constructor(
    private readonly pagePermissionRepo: PagePermissionRepo,
    private readonly pageRepo: PageRepo,
    private readonly pageAccessService: PageAccessService,
  ) {}

  async restrict(pageId: string, user: User, workspace: Workspace) {
    const page = await this.requirePage(pageId, workspace.id);
    await this.pageAccessService.validateCanEdit(page, user);
    const existing = await this.pagePermissionRepo.findPageAccessByPageId(page.id);
    if (existing) {
      return existing;
    }
    return this.pagePermissionRepo.insertPageAccess({
      pageId: page.id,
      workspaceId: workspace.id,
      spaceId: page.spaceId,
      accessLevel: 'restricted',
      creatorId: user.id,
    });
  }

  async unrestrict(pageId: string, user: User, workspace: Workspace) {
    const page = await this.requirePage(pageId, workspace.id);
    await this.pageAccessService.validateCanEdit(page, user);
    await this.pagePermissionRepo.deletePageAccess(page.id);
  }

  async addPermission(
    data: { pageId: string; userId?: string; groupId?: string; role: string },
    user: User,
    workspace: Workspace,
  ) {
    const page = await this.requirePage(data.pageId, workspace.id);
    await this.pageAccessService.validateCanEdit(page, user);
    let access = await this.pagePermissionRepo.findPageAccessByPageId(page.id);
    if (!access) {
      access = await this.pagePermissionRepo.insertPageAccess({
        pageId: page.id,
        workspaceId: workspace.id,
        spaceId: page.spaceId,
        accessLevel: 'restricted',
        creatorId: user.id,
      });
    }
    if (!data.userId && !data.groupId) {
      throw new BadRequestException('userId or groupId is required');
    }
    await this.pagePermissionRepo.insertPagePermissions([
      {
        pageAccessId: access.id,
        userId: data.userId ?? null,
        groupId: data.groupId ?? null,
        role: data.role || 'reader',
        addedById: user.id,
      },
    ]);
  }

  async removePermission(
    data: { pageId: string; userId?: string; groupId?: string },
    user: User,
    workspace: Workspace,
  ) {
    const page = await this.requirePage(data.pageId, workspace.id);
    await this.pageAccessService.validateCanEdit(page, user);
    const access = await this.pagePermissionRepo.findPageAccessByPageId(page.id);
    if (!access) {
      return;
    }
    if (data.userId) {
      await this.pagePermissionRepo.deletePagePermissionByUserId(access.id, data.userId);
    }
    if (data.groupId) {
      await this.pagePermissionRepo.deletePagePermissionByGroupId(access.id, data.groupId);
    }
  }

  async updateRole(
    data: { pageId: string; userId?: string; groupId?: string; role: string },
    user: User,
    workspace: Workspace,
  ) {
    const page = await this.requirePage(data.pageId, workspace.id);
    await this.pageAccessService.validateCanEdit(page, user);
    const access = await this.pagePermissionRepo.findPageAccessByPageId(page.id);
    if (!access) {
      throw new NotFoundException('Page is not restricted');
    }
    await this.pagePermissionRepo.updatePagePermissionRole(access.id, data.role, {
      userId: data.userId,
      groupId: data.groupId,
    });
  }

  async list(pageId: string, user: User, workspace: Workspace, pagination: PaginationOptions) {
    const page = await this.requirePage(pageId, workspace.id);
    await this.pageAccessService.validateCanView(page, user);
    const access = await this.pagePermissionRepo.findPageAccessByPageId(page.id);
    if (!access) {
      return { items: [], meta: { hasNextPage: false } };
    }
    return this.pagePermissionRepo.getPagePermissionsPaginated(access.id, pagination);
  }

  async info(pageId: string, user: User, workspace: Workspace) {
    const page = await this.requirePage(pageId, workspace.id);
    await this.pageAccessService.validateCanView(page, user);
    const level = await this.pagePermissionRepo.getUserPageAccessLevel(
      user.id,
      page.id,
    );
    return {
      pageId,
      ...level,
    };
  }

  private async requirePage(pageId: string, workspaceId: string) {
    const page = await this.pageRepo.findById(pageId);
    if (!page || page.workspaceId !== workspaceId || page.deletedAt) {
      throw new NotFoundException('Page not found');
    }
    return page;
  }
}

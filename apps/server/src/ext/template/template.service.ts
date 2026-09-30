import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TemplateRepo } from '@docmost/db/repos/template/template.repo';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { SpaceMemberRepo } from '@docmost/db/repos/space/space-member.repo';
import { UserRole } from '../../common/helpers/types/permission';

@Injectable()
export class TemplateService {
  constructor(
    private readonly templateRepo: TemplateRepo,
    private readonly pageRepo: PageRepo,
    private readonly spaceMemberRepo: SpaceMemberRepo,
  ) {}

  async list(user: User, workspace: Workspace, pagination: PaginationOptions, spaceId?: string) {
    const spaces = await this.spaceMemberRepo.getUserSpaceIds(user.id);
    return this.templateRepo.findTemplates(workspace.id, spaces, pagination, { spaceId });
  }

  async get(templateId: string, workspace: Workspace) {
    const template = await this.templateRepo.findById(templateId, workspace.id, {
      includeContent: true,
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  async create(
    user: User,
    workspace: Workspace,
    data: { title: string; description?: string; content?: any; spaceId?: string; icon?: string },
  ) {
    const allowMembers = Boolean(
      (workspace.settings as any)?.templates?.allowMemberTemplates,
    );
    if (
      !allowMembers &&
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('Only admins can create templates');
    }
    const inserted = await this.templateRepo.insertTemplate({
      title: data.title,
      description: data.description ?? null,
      content: data.content ?? null,
      icon: data.icon ?? null,
      spaceId: data.spaceId ?? null,
      workspaceId: workspace.id,
      creatorId: user.id,
      lastUpdatedById: user.id,
    });
    return this.templateRepo.findById(inserted.id, workspace.id, {
      includeContent: true,
    });
  }

  async update(
    user: User,
    workspace: Workspace,
    data: { templateId: string; title?: string; description?: string; content?: any; icon?: string },
  ) {
    await this.templateRepo.updateTemplate(
      {
        title: data.title,
        description: data.description,
        content: data.content,
        icon: data.icon,
        lastUpdatedById: user.id,
      },
      data.templateId,
      workspace.id,
    );
    return this.get(data.templateId, workspace);
  }

  async remove(templateId: string, workspace: Workspace) {
    await this.templateRepo.deleteTemplate(templateId, workspace.id);
  }

  async useTemplate(
    user: User,
    workspace: Workspace,
    data: { templateId: string; spaceId: string; parentPageId?: string },
  ) {
    const template = await this.get(data.templateId, workspace);
    return this.pageRepo.insertPage({
      title: template.title || 'Untitled',
      content: template.content,
      icon: template.icon,
      spaceId: data.spaceId,
      workspaceId: workspace.id,
      creatorId: user.id,
      lastUpdatedById: user.id,
      parentPageId: data.parentPageId ?? null,
    } as any);
  }
}

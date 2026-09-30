import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { PageAccessService } from '../../core/page/page-access/page-access.service';
import { randomUUID } from 'node:crypto';

@Injectable()
export class BaseService {
  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly pageRepo: PageRepo,
    private readonly pageAccessService: PageAccessService,
  ) {}

  async convertPage(pageId: string, user: User, workspace: Workspace) {
    const page = await this.requirePage(pageId, workspace.id);
    await this.pageAccessService.validateCanEdit(page, user);
    await this.db
      .updateTable('pages')
      .set({ isBase: true, updatedAt: new Date() } as any)
      .where('id', '=', page.id)
      .execute();
    return this.getBase(page.id, user, workspace);
  }

  async getBase(pageId: string, user: User, workspace: Workspace) {
    const page = await this.requirePage(pageId, workspace.id);
    await this.pageAccessService.validateCanView(page, user);
    const [properties, rows, views] = await Promise.all([
      this.db
        .selectFrom('baseProperties')
        .selectAll()
        .where('pageId', '=', page.id)
        .where('deletedAt', 'is', null)
        .orderBy('position', 'asc')
        .execute(),
      this.db
        .selectFrom('baseRows')
        .selectAll()
        .where('pageId', '=', page.id)
        .where('deletedAt', 'is', null)
        .orderBy('position', 'asc')
        .execute(),
      this.db
        .selectFrom('baseViews')
        .selectAll()
        .where('pageId', '=', page.id)
        .execute(),
    ]);
    return { page, properties, rows, views };
  }

  async addProperty(
    data: { pageId: string; name: string; type: string; typeOptions?: any },
    user: User,
    workspace: Workspace,
  ) {
    const page = await this.requirePage(data.pageId, workspace.id);
    await this.pageAccessService.validateCanEdit(page, user);
    const count = await this.db
      .selectFrom('baseProperties')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('pageId', '=', page.id)
      .executeTakeFirst();
    return this.db
      .insertInto('baseProperties')
      .values({
        id: randomUUID(),
        pageId: page.id,
        workspaceId: workspace.id,
        name: data.name,
        type: data.type,
        typeOptions: data.typeOptions ?? null,
        position: String(Number(count?.count ?? 0) + 1).padStart(6, '0'),
        isPrimary: Number(count?.count ?? 0) === 0,
      })
      .returningAll()
      .executeTakeFirst();
  }

  async addRow(
    data: { pageId: string; cells?: Record<string, any> },
    user: User,
    workspace: Workspace,
  ) {
    const page = await this.requirePage(data.pageId, workspace.id);
    await this.pageAccessService.validateCanEdit(page, user);
    const count = await this.db
      .selectFrom('baseRows')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('pageId', '=', page.id)
      .executeTakeFirst();
    return this.db
      .insertInto('baseRows')
      .values({
        pageId: page.id,
        workspaceId: workspace.id,
        cells: data.cells ?? {},
        position: String(Number(count?.count ?? 0) + 1).padStart(6, '0'),
      })
      .returningAll()
      .executeTakeFirst();
  }

  async updateRow(
    data: { rowId: string; cells: Record<string, any> },
    user: User,
    workspace: Workspace,
  ) {
    const row = await this.db
      .selectFrom('baseRows')
      .selectAll()
      .where('id', '=', data.rowId)
      .where('workspaceId', '=', workspace.id)
      .executeTakeFirst();
    if (!row) {
      throw new NotFoundException('Row not found');
    }
    const page = await this.requirePage(row.pageId, workspace.id);
    await this.pageAccessService.validateCanEdit(page, user);
    return this.db
      .updateTable('baseRows')
      .set({ cells: { ...(row.cells as any), ...data.cells }, updatedAt: new Date() })
      .where('id', '=', row.id)
      .returningAll()
      .executeTakeFirst();
  }

  async deleteRow(rowId: string, user: User, workspace: Workspace) {
    const row = await this.db
      .selectFrom('baseRows')
      .selectAll()
      .where('id', '=', rowId)
      .where('workspaceId', '=', workspace.id)
      .executeTakeFirst();
    if (!row) return;
    const page = await this.requirePage(row.pageId, workspace.id);
    await this.pageAccessService.validateCanEdit(page, user);
    await this.db
      .updateTable('baseRows')
      .set({ deletedAt: new Date() })
      .where('id', '=', rowId)
      .execute();
  }

  async addView(
    data: { pageId: string; name: string; type?: string; config?: any },
    user: User,
    workspace: Workspace,
  ) {
    const page = await this.requirePage(data.pageId, workspace.id);
    await this.pageAccessService.validateCanEdit(page, user);
    return this.db
      .insertInto('baseViews')
      .values({
        pageId: page.id,
        workspaceId: workspace.id,
        name: data.name,
        type: data.type ?? 'table',
        config: data.config ?? {},
        position: '000001',
        creatorId: user.id,
      })
      .returningAll()
      .executeTakeFirst();
  }

  private async requirePage(pageId: string, workspaceId: string) {
    const page = await this.pageRepo.findById(pageId);
    if (!page || page.workspaceId !== workspaceId || page.deletedAt) {
      throw new NotFoundException('Page not found');
    }
    return page;
  }
}

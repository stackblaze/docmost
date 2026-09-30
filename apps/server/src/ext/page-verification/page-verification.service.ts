import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { PageAccessService } from '../../core/page/page-access/page-access.service';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { executeWithCursorPagination } from '@docmost/db/pagination/cursor-pagination';

@Injectable()
export class PageVerificationService {
  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly pageRepo: PageRepo,
    private readonly pageAccessService: PageAccessService,
  ) {}

  async setup(
    data: {
      pageId: string;
      type?: string;
      mode?: string;
      periodAmount?: number;
      periodUnit?: string;
      verifierIds?: string[];
    },
    user: User,
    workspace: Workspace,
  ) {
    const page = await this.pageRepo.findById(data.pageId);
    if (!page || page.workspaceId !== workspace.id) {
      throw new NotFoundException('Page not found');
    }
    await this.pageAccessService.validateCanEdit(page, user);

    const row = await this.db
      .insertInto('pageVerifications')
      .values({
        pageId: page.id,
        workspaceId: workspace.id,
        spaceId: page.spaceId,
        type: data.type ?? 'review',
        status: 'pending',
        mode: data.mode ?? 'manual',
        periodAmount: data.periodAmount ?? null,
        periodUnit: data.periodUnit ?? null,
        creatorId: user.id,
      })
      .returningAll()
      .executeTakeFirst();

    const verifierIds = data.verifierIds ?? [user.id];
    if (verifierIds.length) {
      await this.db
        .insertInto('pageVerifiers')
        .values(
          verifierIds.map((id, i) => ({
            pageVerificationId: row.id,
            userId: id,
            isPrimary: i === 0,
            addedById: user.id,
          })),
        )
        .execute();
    }
    return row;
  }

  async verify(verificationId: string, user: User, workspace: Workspace) {
    const row = await this.db
      .selectFrom('pageVerifications')
      .selectAll()
      .where('id', '=', verificationId)
      .where('workspaceId', '=', workspace.id)
      .executeTakeFirst();
    if (!row) {
      throw new NotFoundException('Verification not found');
    }
    const expiresAt =
      row.periodAmount && row.periodUnit
        ? this.addPeriod(new Date(), row.periodAmount, row.periodUnit)
        : null;
    return this.db
      .updateTable('pageVerifications')
      .set({
        status: 'verified',
        verifiedAt: new Date(),
        verifiedById: user.id,
        expiresAt,
        updatedAt: new Date(),
      })
      .where('id', '=', verificationId)
      .returningAll()
      .executeTakeFirst();
  }

  async reject(
    verificationId: string,
    user: User,
    workspace: Workspace,
    comment?: string,
  ) {
    return this.db
      .updateTable('pageVerifications')
      .set({
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedById: user.id,
        rejectionComment: comment ?? null,
        updatedAt: new Date(),
      })
      .where('id', '=', verificationId)
      .where('workspaceId', '=', workspace.id)
      .returningAll()
      .executeTakeFirst();
  }

  async remove(verificationId: string, workspace: Workspace) {
    await this.db
      .deleteFrom('pageVerifications')
      .where('id', '=', verificationId)
      .where('workspaceId', '=', workspace.id)
      .execute();
  }

  async list(workspace: Workspace, pagination: PaginationOptions) {
    const query = this.db
      .selectFrom('pageVerifications')
      .selectAll()
      .where('workspaceId', '=', workspace.id);

    return executeWithCursorPagination(query, {
      perPage: pagination.limit,
      cursor: pagination.cursor,
      beforeCursor: pagination.beforeCursor,
      fields: [{ expression: 'createdAt', direction: 'desc' }],
      parseCursor: (cursor) => ({ createdAt: new Date(cursor.createdAt) }),
    });
  }

  async getByPage(pageId: string, workspaceId: string) {
    return this.db
      .selectFrom('pageVerifications')
      .selectAll()
      .where('pageId', '=', pageId)
      .where('workspaceId', '=', workspaceId)
      .orderBy('createdAt', 'desc')
      .executeTakeFirst();
  }

  private addPeriod(from: Date, amount: number, unit: string) {
    const next = new Date(from);
    if (unit === 'day') next.setDate(next.getDate() + amount);
    else if (unit === 'week') next.setDate(next.getDate() + amount * 7);
    else if (unit === 'month') next.setMonth(next.getMonth() + amount);
    else next.setDate(next.getDate() + amount);
    return next;
  }
}

@Injectable()
export class PageVerificationSchedulerService {
  constructor(
    @InjectKysely() private readonly db: KyselyDB,
  ) {}

  async reconcile(): Promise<void> {
    const now = new Date();
    await this.db
      .updateTable('pageVerifications')
      .set({ status: 'expired', updatedAt: now })
      .where('status', '=', 'verified')
      .where('expiresAt', 'is not', null)
      .where('expiresAt', '<', now)
      .execute();
  }
}

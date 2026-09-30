import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { ClsService } from 'nestjs-cls';
import {
  AuditLogPayload,
  ActorType,
} from '../../common/events/audit-events';
import {
  AuditLogContext,
  IAuditService,
} from '../../integrations/audit/audit.service';
import {
  AUDIT_CONTEXT_KEY,
  AuditContext,
} from '../../common/middlewares/audit-context.middleware';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { executeWithCursorPagination } from '@docmost/db/pagination/cursor-pagination';

@Injectable()
export class AuditLogService implements IAuditService {
  private readonly logger = new Logger(AuditLogService.name);
  private actorId?: string;
  private actorType?: ActorType;

  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly cls: ClsService,
  ) {}

  setActorId(actorId: string): void {
    this.actorId = actorId;
  }

  setActorType(actorType: ActorType): void {
    this.actorType = actorType;
  }

  log(payload: AuditLogPayload): void {
    const ctx = this.cls.get<AuditContext>(AUDIT_CONTEXT_KEY);
    void this.persist(payload, {
      workspaceId: ctx?.workspaceId,
      actorId: this.actorId ?? ctx?.actorId,
      actorType: this.actorType ?? ctx?.actorType,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });
  }

  logWithContext(payload: AuditLogPayload, context: AuditLogContext): void {
    void this.persist(payload, context);
  }

  logBatchWithContext(
    payloads: AuditLogPayload[],
    context: AuditLogContext,
  ): void {
    for (const payload of payloads) {
      void this.persist(payload, context);
    }
  }

  async updateRetention(
    workspaceId: string,
    retentionDays: number,
  ): Promise<void> {
    await this.db
      .updateTable('workspaces')
      .set({ auditRetentionDays: retentionDays })
      .where('id', '=', workspaceId)
      .execute();
  }

  async list(workspaceId: string, pagination: PaginationOptions) {
    let query = this.db
      .selectFrom('audit')
      .selectAll()
      .where('workspaceId', '=', workspaceId);

    if (pagination.query) {
      query = query.where('event', 'ilike', `%${pagination.query}%`);
    }

    return executeWithCursorPagination(query, {
      perPage: pagination.limit,
      cursor: pagination.cursor,
      beforeCursor: pagination.beforeCursor,
      fields: [{ expression: 'createdAt', direction: 'desc' }],
      parseCursor: (cursor) => ({ createdAt: new Date(cursor.createdAt) }),
    });
  }

  async prune(workspaceId: string, retentionDays: number): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    await this.db
      .deleteFrom('audit')
      .where('workspaceId', '=', workspaceId)
      .where('createdAt', '<', cutoff)
      .execute();
  }

  private async persist(
    payload: AuditLogPayload,
    context: AuditLogContext,
  ): Promise<void> {
    const workspaceId = context.workspaceId;
    if (!workspaceId) {
      return;
    }

    try {
      await this.db
        .insertInto('audit')
        .values({
          workspaceId,
          actorId: context.actorId ?? null,
          actorType: context.actorType ?? (payload as any).actorType ?? 'user',
          event: payload.event,
          resourceType: payload.resourceType,
          resourceId: payload.resourceId ?? null,
          spaceId: payload.spaceId ?? null,
          changes: payload.changes ?? null,
          metadata: payload.metadata ?? null,
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null,
        })
        .execute();
    } catch (err) {
      this.logger.warn(`Failed to write audit log: ${err}`);
    }
  }
}

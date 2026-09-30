import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { EncryptionService } from '../../integrations/encryption/encryption.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SiemService {
  private readonly logger = new Logger(SiemService.name);

  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly encryptionService: EncryptionService,
  ) {}

  async list(workspace: Workspace) {
    return this.db
      .selectFrom('siemDestinations')
      .selectAll()
      .where('workspaceId', '=', workspace.id)
      .execute();
  }

  async create(
    user: User,
    workspace: Workspace,
    data: { name: string; type: string; config: any; secrets?: any },
  ) {
    return this.db
      .insertInto('siemDestinations')
      .values({
        name: data.name,
        type: data.type,
        config: data.config ?? {},
        secrets: this.encryptionService.encrypt(JSON.stringify(data.secrets ?? {})),
        workspaceId: workspace.id,
        creatorId: user.id,
        enabled: true,
        status: 'healthy',
      })
      .returningAll()
      .executeTakeFirst();
  }

  async update(
    workspace: Workspace,
    data: { destinationId: string; name?: string; config?: any; secrets?: any; enabled?: boolean },
  ) {
    const patch: Record<string, any> = { updatedAt: new Date() };
    if (data.name !== undefined) patch.name = data.name;
    if (data.config !== undefined) patch.config = data.config;
    if (data.enabled !== undefined) patch.enabled = data.enabled;
    if (data.secrets !== undefined) {
      patch.secrets = this.encryptionService.encrypt(JSON.stringify(data.secrets));
    }
    const row = await this.db
      .updateTable('siemDestinations')
      .set(patch)
      .where('id', '=', data.destinationId)
      .where('workspaceId', '=', workspace.id)
      .returningAll()
      .executeTakeFirst();
    if (!row) {
      throw new NotFoundException('Destination not found');
    }
    return row;
  }

  async remove(workspace: Workspace, destinationId: string) {
    await this.db
      .deleteFrom('siemDestinations')
      .where('id', '=', destinationId)
      .where('workspaceId', '=', workspace.id)
      .execute();
  }

  async test(workspace: Workspace, destinationId: string) {
    const dest = await this.db
      .selectFrom('siemDestinations')
      .selectAll()
      .where('id', '=', destinationId)
      .where('workspaceId', '=', workspace.id)
      .executeTakeFirst();
    if (!dest) {
      throw new NotFoundException('Destination not found');
    }
    try {
      await this.deliver(dest, [
        {
          event: 'siem.destination.test',
          createdAt: new Date().toISOString(),
          workspaceId: workspace.id,
        },
      ]);
      await this.db
        .updateTable('siemDestinations')
        .set({
          status: 'healthy',
          lastDeliveredAt: new Date(),
          consecutiveFailures: 0,
          lastError: null,
        })
        .where('id', '=', dest.id)
        .execute();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async shipPending() {
    const dests = await this.db
      .selectFrom('siemDestinations')
      .selectAll()
      .where('enabled', '=', true)
      .execute();
    for (const dest of dests) {
      try {
        const events = await this.db
          .selectFrom('audit')
          .selectAll()
          .where('workspaceId', '=', dest.workspaceId)
          .where('createdAt', '>', dest.cursorCreatedAt)
          .orderBy('createdAt', 'asc')
          .limit(100)
          .execute();
        if (!events.length) continue;
        await this.deliver(dest, events);
        const last = events[events.length - 1];
        await this.db
          .updateTable('siemDestinations')
          .set({
            cursorCreatedAt: last.createdAt,
            cursorId: last.id,
            lastDeliveredAt: new Date(),
            consecutiveFailures: 0,
            status: 'healthy',
            lastError: null,
          })
          .where('id', '=', dest.id)
          .execute();
      } catch (err) {
        this.logger.warn(`SIEM ship failed for ${dest.id}: ${err}`);
        await this.db
          .updateTable('siemDestinations')
          .set({
            consecutiveFailures: dest.consecutiveFailures + 1,
            lastError: String(err),
            lastErrorAt: new Date(),
            status: dest.consecutiveFailures + 1 >= 5 ? 'failing' : dest.status,
          })
          .where('id', '=', dest.id)
          .execute();
      }
    }
  }

  private async deliver(dest: any, events: any[]) {
    const secrets = JSON.parse(this.encryptionService.decrypt(dest.secrets) || '{}');
    const config = dest.config || {};
    if (dest.type === 'webhook' || dest.type === 'http') {
      const res = await fetch(config.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(secrets.token ? { authorization: `Bearer ${secrets.token}` } : {}),
        },
        body: JSON.stringify({ events }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return;
    }
    this.logger.debug(`SIEM destination type ${dest.type} accepted ${events.length} events`);
  }
}

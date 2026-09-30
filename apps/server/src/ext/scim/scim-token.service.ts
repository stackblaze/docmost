import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { executeWithCursorPagination } from '@docmost/db/pagination/cursor-pagination';
import { createHash, randomBytes } from 'node:crypto';
import { jsonObjectFrom } from 'kysely/helpers/postgres';

@Injectable()
export class ScimTokenService {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async list(workspace: Workspace, pagination: PaginationOptions) {
    const query = this.db
      .selectFrom('scimTokens')
      .selectAll('scimTokens')
      .select((eb) =>
        jsonObjectFrom(
          eb
            .selectFrom('users')
            .select(['users.id', 'users.name', 'users.avatarUrl'])
            .whereRef('users.id', '=', 'scimTokens.creatorId'),
        ).as('creator'),
      )
      .where('scimTokens.workspaceId', '=', workspace.id)
      .where('scimTokens.deletedAt', 'is', null);

    return executeWithCursorPagination(query, {
      perPage: pagination.limit,
      cursor: pagination.cursor,
      beforeCursor: pagination.beforeCursor,
      fields: [{ expression: 'createdAt', direction: 'desc' }],
      parseCursor: (cursor) => ({ createdAt: new Date(cursor.createdAt) }),
    });
  }

  async create(user: User, workspace: Workspace, name: string) {
    if (!workspace.isScimEnabled) {
      throw new ForbiddenException('SCIM is not enabled');
    }
    const token = `scim_${randomBytes(24).toString('hex')}`;
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const row = await this.db
      .insertInto('scimTokens')
      .values({
        name,
        tokenHash,
        tokenLastFour: token.slice(-4),
        creatorId: user.id,
        workspaceId: workspace.id,
        isEnabled: true,
      })
      .returningAll()
      .executeTakeFirst();
    return { ...row, token };
  }

  async update(workspace: Workspace, tokenId: string, name: string) {
    const row = await this.db
      .updateTable('scimTokens')
      .set({ name, updatedAt: new Date() })
      .where('id', '=', tokenId)
      .where('workspaceId', '=', workspace.id)
      .where('deletedAt', 'is', null)
      .returningAll()
      .executeTakeFirst();
    if (!row) {
      throw new NotFoundException('SCIM token not found');
    }
    return row;
  }

  async revoke(workspace: Workspace, tokenId: string) {
    await this.db
      .updateTable('scimTokens')
      .set({ deletedAt: new Date(), isEnabled: false })
      .where('id', '=', tokenId)
      .where('workspaceId', '=', workspace.id)
      .execute();
  }

  async authenticate(rawToken: string, workspaceId: string) {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const row = await this.db
      .selectFrom('scimTokens')
      .selectAll()
      .where('tokenHash', '=', tokenHash)
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .where('isEnabled', '=', true)
      .executeTakeFirst();
    if (!row) {
      throw new UnauthorizedException('Invalid SCIM token');
    }
    void this.db
      .updateTable('scimTokens')
      .set({ lastUsedAt: new Date() })
      .where('id', '=', row.id)
      .execute();
    return row;
  }
}

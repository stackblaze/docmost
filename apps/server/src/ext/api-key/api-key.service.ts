import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { UserRepo } from '@docmost/db/repos/user/user.repo';
import { WorkspaceRepo } from '@docmost/db/repos/workspace/workspace.repo';
import { TokenService } from '../../core/auth/services/token.service';
import { JwtApiKeyPayload } from '../../core/auth/dto/jwt-payload';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { executeWithCursorPagination } from '@docmost/db/pagination/cursor-pagination';
import { createHash } from 'node:crypto';
import { jsonObjectFrom } from 'kysely/helpers/postgres';
import { UserRole } from '../../common/helpers/types/permission';

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly userRepo: UserRepo,
    private readonly workspaceRepo: WorkspaceRepo,
    private readonly tokenService: TokenService,
  ) {}

  async list(user: User, workspace: Workspace, pagination: PaginationOptions) {
    const adminView = Boolean(pagination.adminView);
    let query = this.db
      .selectFrom('apiKeys')
      .selectAll('apiKeys')
      .select((eb) =>
        jsonObjectFrom(
          eb
            .selectFrom('users')
            .select(['users.id', 'users.name', 'users.avatarUrl'])
            .whereRef('users.id', '=', 'apiKeys.creatorId'),
        ).as('creator'),
      )
      .where('apiKeys.workspaceId', '=', workspace.id)
      .where('apiKeys.deletedAt', 'is', null);

    if (!adminView) {
      query = query.where('apiKeys.creatorId', '=', user.id);
    } else if (user.role !== UserRole.OWNER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }

    return executeWithCursorPagination(query, {
      perPage: pagination.limit,
      cursor: pagination.cursor,
      beforeCursor: pagination.beforeCursor,
      fields: [{ expression: 'createdAt', direction: 'desc' }],
      parseCursor: (cursor) => ({ createdAt: new Date(cursor.createdAt) }),
    });
  }

  async create(
    user: User,
    workspace: Workspace,
    data: { name: string; expiresAt?: string },
  ) {
    if (workspace.settings && (workspace.settings as any)?.api?.restrictToAdmins) {
      if (user.role !== UserRole.OWNER && user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('API keys are restricted to admins');
      }
    }

    const row = await this.db
      .insertInto('apiKeys')
      .values({
        name: data.name,
        creatorId: user.id,
        workspaceId: workspace.id,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      })
      .returningAll()
      .executeTakeFirst();

    const token = await this.tokenService.generateApiToken({
      apiKeyId: row.id,
      user,
      workspaceId: workspace.id,
      expiresIn: data.expiresAt
        ? Math.max(
            60,
            Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000),
          )
        : undefined,
    });

    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.db
      .updateTable('apiKeys')
      .set({ tokenHash })
      .where('id', '=', row.id)
      .execute();

    return { ...row, token };
  }

  async update(user: User, workspace: Workspace, data: { apiKeyId: string; name: string }) {
    const row = await this.db
      .selectFrom('apiKeys')
      .selectAll()
      .where('id', '=', data.apiKeyId)
      .where('workspaceId', '=', workspace.id)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
    if (!row) {
      throw new NotFoundException('API key not found');
    }
    if (row.creatorId !== user.id && user.role !== UserRole.OWNER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }
    return this.db
      .updateTable('apiKeys')
      .set({ name: data.name, updatedAt: new Date() })
      .where('id', '=', row.id)
      .returningAll()
      .executeTakeFirst();
  }

  async revoke(user: User, workspace: Workspace, apiKeyId: string) {
    const row = await this.db
      .selectFrom('apiKeys')
      .selectAll()
      .where('id', '=', apiKeyId)
      .where('workspaceId', '=', workspace.id)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
    if (!row) {
      throw new NotFoundException('API key not found');
    }
    if (row.creatorId !== user.id && user.role !== UserRole.OWNER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }
    await this.db
      .updateTable('apiKeys')
      .set({ deletedAt: new Date() })
      .where('id', '=', apiKeyId)
      .execute();
  }

  async validateApiKey(payload: JwtApiKeyPayload) {
    const key = await this.db
      .selectFrom('apiKeys')
      .selectAll()
      .where('id', '=', payload.apiKeyId)
      .where('workspaceId', '=', payload.workspaceId)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();

    if (!key) {
      throw new UnauthorizedException('Invalid API key');
    }
    if (key.expiresAt && key.expiresAt < new Date()) {
      throw new UnauthorizedException('API key expired');
    }

    const workspace = await this.workspaceRepo.findById(payload.workspaceId);
    const user = await this.userRepo.findById(payload.sub, payload.workspaceId);
    if (!workspace || !user) {
      throw new UnauthorizedException();
    }

    void this.db
      .updateTable('apiKeys')
      .set({ lastUsedAt: new Date() })
      .where('id', '=', key.id)
      .execute();

    return { user, workspace };
  }
}

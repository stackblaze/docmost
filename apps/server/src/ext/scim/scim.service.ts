import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { UserRepo } from '@docmost/db/repos/user/user.repo';
import { GroupRepo } from '@docmost/db/repos/group/group.repo';
import { GroupUserRepo } from '@docmost/db/repos/group/group-user.repo';
import { SignupService } from '../../core/auth/services/signup.service';
import { WorkspaceService } from '../../core/workspace/services/workspace.service';
import { randomBytes } from 'node:crypto';
import { UserRole } from '../../common/helpers/types/permission';

@Injectable()
export class ScimService {
  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly userRepo: UserRepo,
    private readonly groupRepo: GroupRepo,
    private readonly groupUserRepo: GroupUserRepo,
    private readonly signupService: SignupService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  async listUsers(workspaceId: string, startIndex = 1, count = 100, filter?: string) {
    let query = this.db
      .selectFrom('users')
      .selectAll()
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null);
    if (filter) {
      const email = /userName eq "([^"]+)"/i.exec(filter)?.[1];
      if (email) {
        query = query.where('email', '=', email.toLowerCase());
      }
    }
    const rows = await query
      .limit(count)
      .offset(Math.max(0, startIndex - 1))
      .execute();
    const total = await this.db
      .selectFrom('users')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
    return {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: Number(total?.count ?? 0),
      startIndex,
      itemsPerPage: rows.length,
      Resources: rows.map((u) => this.toScimUser(u)),
    };
  }

  async getUser(workspaceId: string, userId: string) {
    const user = await this.userRepo.findById(userId, workspaceId, {
      includeScimExternalId: true,
    });
    if (!user) {
      throw new NotFoundException({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        detail: 'User not found',
        status: '404',
      });
    }
    return this.toScimUser(user);
  }

  async createUser(workspaceId: string, body: any) {
    const email = (body.userName || body.emails?.[0]?.value || '').toLowerCase();
    if (!email) {
      throw new BadRequestException('userName is required');
    }
    const existing = await this.userRepo.findByEmail(email, workspaceId);
    if (existing) {
      return this.toScimUser(existing);
    }
    const name = body.displayName || body.name?.formatted || email.split('@')[0];
    const user = await this.signupService.signup(
      {
        email,
        name,
        password: randomBytes(16).toString('hex'),
      } as any,
      workspaceId,
    );
    if (body.id || body.externalId) {
      await this.db
        .updateTable('users')
        .set({ scimExternalId: body.externalId || body.id })
        .where('id', '=', user.id)
        .execute();
    }
    return this.toScimUser({ ...user, scimExternalId: body.externalId || body.id });
  }

  async replaceUser(workspaceId: string, userId: string, body: any) {
    const user = await this.userRepo.findById(userId, workspaceId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const name = body.displayName || body.name?.formatted || user.name;
    const email = (body.userName || user.email).toLowerCase();
    const active = body.active !== false;
    await this.db
      .updateTable('users')
      .set({
        name,
        email,
        deactivatedAt: active ? null : new Date(),
        scimExternalId: body.externalId ?? user.scimExternalId,
      })
      .where('id', '=', userId)
      .execute();
    return this.getUser(workspaceId, userId);
  }

  async patchUser(workspaceId: string, userId: string, body: any) {
    const ops = body.Operations || [];
    const user = await this.userRepo.findById(userId, workspaceId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const patch: Record<string, any> = {};
    for (const op of ops) {
      const path = String(op.path || '').toLowerCase();
      if (path === 'active' && op.value === false) {
        patch.deactivatedAt = new Date();
      }
      if (path === 'active' && op.value === true) {
        patch.deactivatedAt = null;
      }
      if (path === 'displayname') {
        patch.name = op.value;
      }
    }
    if (Object.keys(patch).length) {
      await this.db
        .updateTable('users')
        .set(patch)
        .where('id', '=', userId)
        .execute();
    }
    return this.getUser(workspaceId, userId);
  }

  async deleteUser(workspaceId: string, userId: string) {
    await this.db
      .updateTable('users')
      .set({ deletedAt: new Date(), deactivatedAt: new Date() })
      .where('id', '=', userId)
      .where('workspaceId', '=', workspaceId)
      .execute();
  }

  async listGroups(workspaceId: string, startIndex = 1, count = 100) {
    const rows = await this.db
      .selectFrom('groups')
      .selectAll()
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .limit(count)
      .offset(Math.max(0, startIndex - 1))
      .execute();
    return {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: rows.length,
      startIndex,
      itemsPerPage: rows.length,
      Resources: rows.map((g) => this.toScimGroup(g, [])),
    };
  }

  async createGroup(workspaceId: string, body: any) {
    const group = await this.groupRepo.insertGroup({
      name: body.displayName,
      workspaceId,
      isDefault: false,
      scimExternalId: body.externalId ?? null,
    } as any);
    return this.toScimGroup(group, []);
  }

  async getGroup(workspaceId: string, groupId: string) {
    const group = await this.groupRepo.findById(groupId, workspaceId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return this.toScimGroup(group, []);
  }

  async deleteGroup(workspaceId: string, groupId: string) {
    await this.db
      .updateTable('groups')
      .set({ deletedAt: new Date() })
      .where('id', '=', groupId)
      .where('workspaceId', '=', workspaceId)
      .execute();
  }

  private toScimUser(user: any) {
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: user.id,
      externalId: user.scimExternalId,
      userName: user.email,
      displayName: user.name,
      active: !user.deactivatedAt && !user.deletedAt,
      emails: [{ value: user.email, primary: true }],
      meta: {
        resourceType: 'User',
        created: user.createdAt,
        lastModified: user.updatedAt,
      },
    };
  }

  private toScimGroup(group: any, members: any[]) {
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      id: group.id,
      externalId: group.scimExternalId,
      displayName: group.name,
      members,
      meta: { resourceType: 'Group' },
    };
  }
}

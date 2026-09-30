import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { UserRepo } from '@docmost/db/repos/user/user.repo';
import { SignupService } from '../../core/auth/services/signup.service';
import { SessionService } from '../../core/session/session.service';
import { EncryptionService } from '../../integrations/encryption/encryption.service';
import { EnvironmentService } from '../../integrations/environment/environment.service';
import { Client } from 'ldapts';
import * as client from 'openid-client';
import { randomBytes, createHash } from 'node:crypto';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { executeWithCursorPagination } from '@docmost/db/pagination/cursor-pagination';

type ProviderType = 'saml' | 'oidc' | 'google' | 'ldap';

@Injectable()
export class SsoService {
  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly userRepo: UserRepo,
    private readonly signupService: SignupService,
    private readonly sessionService: SessionService,
    private readonly encryptionService: EncryptionService,
    private readonly environmentService: EnvironmentService,
  ) {}

  async list(workspaceId: string, pagination: PaginationOptions) {
    const query = this.db
      .selectFrom('authProviders')
      .selectAll()
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null);

    return executeWithCursorPagination(query, {
      perPage: pagination.limit,
      cursor: pagination.cursor,
      beforeCursor: pagination.beforeCursor,
      fields: [{ expression: 'createdAt', direction: 'desc' }],
      parseCursor: (cursor) => ({ createdAt: new Date(cursor.createdAt) }),
    });
  }

  async findById(workspaceId: string, providerId: string) {
    const row = await this.db
      .selectFrom('authProviders')
      .selectAll()
      .where('id', '=', providerId)
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
    if (!row) {
      throw new NotFoundException('SSO provider not found');
    }
    return this.sanitize(row);
  }

  async create(user: User, workspace: Workspace, data: Record<string, any>) {
    const type = data.type as ProviderType;
    if (!['saml', 'oidc', 'google', 'ldap'].includes(type)) {
      throw new BadRequestException('Unsupported SSO provider type');
    }
    const row = await this.db
      .insertInto('authProviders')
      .values({
        name: data.name,
        type,
        allowSignup: data.allowSignup ?? false,
        isEnabled: data.isEnabled ?? true,
        groupSync: data.groupSync ?? false,
        creatorId: user.id,
        workspaceId: workspace.id,
        samlUrl: data.samlUrl ?? null,
        samlCertificate: data.samlCertificate ?? null,
        oidcIssuer: data.oidcIssuer ?? (type === 'google' ? 'https://accounts.google.com' : null),
        oidcClientId: data.oidcClientId ?? null,
        oidcClientSecret: data.oidcClientSecret
          ? this.encryptionService.encrypt(data.oidcClientSecret)
          : null,
        ldapUrl: data.ldapUrl ?? null,
        ldapBindDn: data.ldapBindDn ?? null,
        ldapBindPassword: data.ldapBindPassword
          ? this.encryptionService.encrypt(data.ldapBindPassword)
          : null,
        ldapBaseDn: data.ldapBaseDn ?? null,
        ldapUserSearchFilter: data.ldapUserSearchFilter ?? null,
        ldapUserAttributes: data.ldapUserAttributes ?? null,
        ldapTlsEnabled: data.ldapTlsEnabled ?? false,
        ldapTlsCaCert: data.ldapTlsCaCert ?? null,
      })
      .returningAll()
      .executeTakeFirst();
    return this.sanitize(row);
  }

  async update(workspaceId: string, data: Record<string, any>) {
    const existing = await this.findById(workspaceId, data.providerId ?? data.id);
    const patch: Record<string, any> = { updatedAt: new Date() };
    for (const key of [
      'name',
      'allowSignup',
      'isEnabled',
      'groupSync',
      'samlUrl',
      'samlCertificate',
      'oidcIssuer',
      'oidcClientId',
      'ldapUrl',
      'ldapBindDn',
      'ldapBaseDn',
      'ldapUserSearchFilter',
      'ldapUserAttributes',
      'ldapTlsEnabled',
      'ldapTlsCaCert',
    ]) {
      if (data[key] !== undefined) {
        patch[key] = data[key];
      }
    }
    if (data.oidcClientSecret) {
      patch.oidcClientSecret = this.encryptionService.encrypt(data.oidcClientSecret);
    }
    if (data.ldapBindPassword) {
      patch.ldapBindPassword = this.encryptionService.encrypt(data.ldapBindPassword);
    }
    const row = await this.db
      .updateTable('authProviders')
      .set(patch)
      .where('id', '=', existing.id)
      .returningAll()
      .executeTakeFirst();
    return this.sanitize(row);
  }

  async delete(workspaceId: string, providerId: string) {
    await this.findById(workspaceId, providerId);
    await this.db
      .updateTable('authProviders')
      .set({ deletedAt: new Date(), isEnabled: false })
      .where('id', '=', providerId)
      .execute();
  }

  callbackUrl(providerId: string) {
    return `${this.environmentService.getAppUrl()}/api/sso/callback/${providerId}`;
  }

  async startOidc(workspaceId: string, providerId: string) {
    const provider = await this.requireEnabled(workspaceId, providerId);
    if (provider.type !== 'oidc' && provider.type !== 'google') {
      throw new BadRequestException('Provider is not OIDC');
    }
    const issuer = new URL(
      provider.oidcIssuer || 'https://accounts.google.com',
    );
    const secret = provider.oidcClientSecret
      ? this.encryptionService.decrypt(provider.oidcClientSecret)
      : undefined;
    const config = await client.discovery(
      issuer,
      provider.oidcClientId,
      secret,
    );
    const state = randomBytes(16).toString('hex');
    const nonce = randomBytes(16).toString('hex');
    const url = client.buildAuthorizationUrl(config, {
      redirect_uri: this.callbackUrl(provider.id),
      scope: 'openid email profile',
      state,
      nonce,
    });
    return { url: url.toString(), state, nonce };
  }

  async handleOidcCallback(
    workspace: Workspace,
    providerId: string,
    currentUrl: URL,
    expectedState: string,
    expectedNonce: string,
  ) {
    const provider = await this.requireEnabled(workspace.id, providerId);
    const secret = provider.oidcClientSecret
      ? this.encryptionService.decrypt(provider.oidcClientSecret)
      : undefined;
    const config = await client.discovery(
      new URL(provider.oidcIssuer || 'https://accounts.google.com'),
      provider.oidcClientId,
      secret,
    );
    const tokens = await client.authorizationCodeGrant(config, currentUrl, {
      expectedState,
      expectedNonce,
      idTokenExpected: true,
    });
    const claims = tokens.claims();
    const email = (claims?.email as string) || '';
    const name = (claims?.name as string) || email.split('@')[0];
    const providerUserId = String(claims?.sub || '');
    if (!email || !providerUserId) {
      throw new UnauthorizedException('SSO did not return an email');
    }
    return this.loginOrProvision({
      workspace,
      provider,
      email,
      name,
      providerUserId,
    });
  }

  async ldapLogin(
    workspace: Workspace,
    providerId: string,
    username: string,
    password: string,
  ) {
    const provider = await this.requireEnabled(workspace.id, providerId);
    if (provider.type !== 'ldap') {
      throw new BadRequestException('Provider is not LDAP');
    }
    const ldap = new Client({
      url: provider.ldapUrl,
      timeout: 10000,
      connectTimeout: 10000,
      tlsOptions: provider.ldapTlsEnabled
        ? { ca: provider.ldapTlsCaCert ? [provider.ldapTlsCaCert] : undefined }
        : undefined,
    });
    try {
      if (provider.ldapBindDn && provider.ldapBindPassword) {
        await ldap.bind(
          provider.ldapBindDn,
          this.encryptionService.decrypt(provider.ldapBindPassword),
        );
      }
      const filter = (provider.ldapUserSearchFilter || '(uid={{username}})').replace(
        '{{username}}',
        username.replace(/[()\\*\0]/g, ''),
      );
      const { searchEntries } = await ldap.search(provider.ldapBaseDn, {
        filter,
        scope: 'sub',
        sizeLimit: 1,
      });
      const entry = searchEntries[0];
      if (!entry) {
        throw new UnauthorizedException('Invalid credentials');
      }
      await ldap.bind(entry.dn, password);
      const attrs = (provider.ldapUserAttributes as any) || {};
      const emailAttr = attrs.email || 'mail';
      const nameAttr = attrs.name || 'cn';
      const email = String(entry[emailAttr] || username);
      const name = String(entry[nameAttr] || username);
      return this.loginOrProvision({
        workspace,
        provider,
        email,
        name,
        providerUserId: entry.dn,
      });
    } finally {
      await ldap.unbind().catch(() => undefined);
    }
  }

  async handleSamlCallback(
    workspace: Workspace,
    providerId: string,
    profile: { nameID?: string; email?: string; displayName?: string },
  ) {
    const provider = await this.requireEnabled(workspace.id, providerId);
    const email = profile.email || profile.nameID;
    if (!email) {
      throw new UnauthorizedException('SAML assertion had no email');
    }
    return this.loginOrProvision({
      workspace,
      provider,
      email,
      name: profile.displayName || email.split('@')[0],
      providerUserId: profile.nameID || email,
    });
  }

  private async requireEnabled(workspaceId: string, providerId: string) {
    const row = await this.db
      .selectFrom('authProviders')
      .selectAll()
      .where('id', '=', providerId)
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
    if (!row || !row.isEnabled) {
      throw new NotFoundException('SSO provider not found');
    }
    return row;
  }

  private async loginOrProvision(opts: {
    workspace: Workspace;
    provider: any;
    email: string;
    name: string;
    providerUserId: string;
  }) {
    const { workspace, provider, email, name, providerUserId } = opts;
    let user = await this.userRepo.findByEmail(email, workspace.id);
    if (!user) {
      if (!provider.allowSignup) {
        throw new UnauthorizedException(
          'No account exists for this identity and signup is disabled',
        );
      }
      const password = createHash('sha256')
        .update(randomBytes(32))
        .digest('hex');
      user = await this.signupService.signup(
        { email, name, password } as any,
        workspace.id,
      );
    }

    const existing = await this.db
      .selectFrom('authAccounts')
      .selectAll()
      .where('userId', '=', user.id)
      .where('authProviderId', '=', provider.id)
      .executeTakeFirst();
    if (!existing) {
      await this.db
        .insertInto('authAccounts')
        .values({
          userId: user.id,
          authProviderId: provider.id,
          providerUserId,
          workspaceId: workspace.id,
        })
        .execute();
    }

    await this.userRepo.updateLastLogin(user.id, workspace.id);
    return this.sessionService.createSessionAndToken(user);
  }

  private sanitize(row: any) {
    if (!row) return row;
    const { oidcClientSecret, ldapBindPassword, ...rest } = row;
    return {
      ...rest,
      oidcClientSecret: oidcClientSecret ? '********' : null,
      ldapBindPassword: ldapBindPassword ? '********' : null,
      providerId: row.id,
    };
  }
}

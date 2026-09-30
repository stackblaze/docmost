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
import { WorkspaceRepo } from '@docmost/db/repos/workspace/workspace.repo';
import { JwtService } from '@nestjs/jwt';
import { JwtOAuthPayload, JwtType } from '../../core/auth/dto/jwt-payload';
import { createHash, randomBytes } from 'node:crypto';
import { EnvironmentService } from '../../integrations/environment/environment.service';

@Injectable()
export class OAuthService {
  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly jwtService: JwtService,
    private readonly environmentService: EnvironmentService,
  ) {}

  async listClients(workspaceId: string) {
    return this.db
      .selectFrom('oauthClients')
      .selectAll()
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .execute();
  }

  async createClient(
    workspace: Workspace,
    data: { name: string; redirectUris: string[]; scopes?: string[] },
  ) {
    const secret = randomBytes(24).toString('hex');
    const secretHash = createHash('sha256').update(secret).digest('hex');
    const row = await this.db
      .insertInto('oauthClients')
      .values({
        name: data.name,
        workspaceId: workspace.id,
        redirectUris: data.redirectUris,
        scopes: data.scopes ?? ['read'],
        grantTypes: ['authorization_code', 'refresh_token'],
        secretHash,
        tokenEndpointAuthMethod: 'client_secret_post',
      })
      .returningAll()
      .executeTakeFirst();
    return { ...row, clientSecret: secret };
  }

  async deleteClient(workspaceId: string, clientId: string) {
    await this.db
      .updateTable('oauthClients')
      .set({ deletedAt: new Date() })
      .where('id', '=', clientId)
      .where('workspaceId', '=', workspaceId)
      .execute();
  }

  async authorize(
    user: User,
    workspace: Workspace,
    data: {
      clientId: string;
      redirectUri: string;
      scope?: string;
      codeChallenge?: string;
      codeChallengeMethod?: string;
      state?: string;
    },
  ) {
    const client = await this.db
      .selectFrom('oauthClients')
      .selectAll()
      .where('id', '=', data.clientId)
      .where('workspaceId', '=', workspace.id)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
    if (!client) {
      throw new NotFoundException('OAuth client not found');
    }
    const uris = client.redirectUris as string[];
    if (!uris.includes(data.redirectUri)) {
      throw new BadRequestException('Invalid redirect URI');
    }
    const code = randomBytes(24).toString('hex');
    const codeHash = createHash('sha256').update(code).digest('hex');
    await this.db
      .insertInto('oauthAuthorizationCodes')
      .values({
        clientId: client.id,
        userId: user.id,
        workspaceId: workspace.id,
        redirectUri: data.redirectUri,
        scopes: (data.scope || 'read').split(' '),
        codeHash,
        codeChallenge: data.codeChallenge ?? null,
        codeChallengeMethod: data.codeChallengeMethod ?? null,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      })
      .execute();
    const url = new URL(data.redirectUri);
    url.searchParams.set('code', code);
    if (data.state) {
      url.searchParams.set('state', data.state);
    }
    return { redirectUri: url.toString() };
  }

  async exchange(
    workspace: Workspace,
    data: {
      clientId: string;
      clientSecret?: string;
      code: string;
      redirectUri: string;
      codeVerifier?: string;
    },
  ) {
    const client = await this.db
      .selectFrom('oauthClients')
      .selectAll()
      .where('id', '=', data.clientId)
      .where('workspaceId', '=', workspace.id)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
    if (!client) {
      throw new UnauthorizedException('Invalid client');
    }
    if (client.secretHash && data.clientSecret) {
      const hash = createHash('sha256').update(data.clientSecret).digest('hex');
      if (hash !== client.secretHash) {
        throw new UnauthorizedException('Invalid client secret');
      }
    }
    const codeHash = createHash('sha256').update(data.code).digest('hex');
    const authCode = await this.db
      .selectFrom('oauthAuthorizationCodes')
      .selectAll()
      .where('codeHash', '=', codeHash)
      .where('clientId', '=', client.id)
      .executeTakeFirst();
    if (!authCode || authCode.consumedAt || authCode.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid authorization code');
    }
    if (authCode.redirectUri !== data.redirectUri) {
      throw new BadRequestException('redirect_uri mismatch');
    }
    if (authCode.codeChallenge && data.codeVerifier) {
      const computed = createHash('sha256')
        .update(data.codeVerifier)
        .digest('base64url');
      if (computed !== authCode.codeChallenge) {
        throw new UnauthorizedException('PKCE verification failed');
      }
    }

    await this.db
      .updateTable('oauthAuthorizationCodes')
      .set({ consumedAt: new Date() })
      .where('id', '=', authCode.id)
      .execute();

    const grant = await this.db
      .insertInto('oauthGrants')
      .values({
        clientId: client.id,
        userId: authCode.userId,
        workspaceId: workspace.id,
        scopes: authCode.scopes,
      })
      .returningAll()
      .executeTakeFirst();

    const jti = randomBytes(16).toString('hex');
    const access = this.jwtService.sign(
      {
        sub: authCode.userId,
        workspaceId: workspace.id,
        grantId: grant.id,
        scope: (authCode.scopes as string[]).join(' '),
        aud: client.id,
        iss: this.environmentService.getAppUrl(),
        jti,
        type: JwtType.OAUTH_ACCESS,
      } satisfies JwtOAuthPayload,
      { expiresIn: '1h' },
    );

    await this.db
      .insertInto('oauthTokens')
      .values({
        grantId: grant.id,
        workspaceId: workspace.id,
        accessTokenJti: jti,
        accessExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        scopes: authCode.scopes,
      })
      .execute();

    return {
      access_token: access,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: (authCode.scopes as string[]).join(' '),
    };
  }

  async listGrants(user: User, workspaceId: string) {
    return this.db
      .selectFrom('oauthGrants')
      .innerJoin('oauthClients', 'oauthClients.id', 'oauthGrants.clientId')
      .select([
        'oauthGrants.id',
        'oauthGrants.scopes',
        'oauthGrants.createdAt',
        'oauthGrants.lastUsedAt',
        'oauthClients.name as clientName',
        'oauthClients.id as clientId',
      ])
      .where('oauthGrants.userId', '=', user.id)
      .where('oauthGrants.workspaceId', '=', workspaceId)
      .where('oauthGrants.revokedAt', 'is', null)
      .execute();
  }

  async revokeGrant(user: User, grantId: string) {
    await this.db
      .updateTable('oauthGrants')
      .set({ revokedAt: new Date() })
      .where('id', '=', grantId)
      .where('userId', '=', user.id)
      .execute();
  }
}

@Injectable()
export class OAuthStrategyService {
  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly userRepo: UserRepo,
    private readonly workspaceRepo: WorkspaceRepo,
  ) {}

  async validateOAuthToken(
    payload: JwtOAuthPayload,
    _ctx: { workspaceId?: string; host?: string },
  ) {
    const token = await this.db
      .selectFrom('oauthTokens')
      .selectAll()
      .where('accessTokenJti', '=', payload.jti)
      .where('revokedAt', 'is', null)
      .executeTakeFirst();
    if (!token || token.accessExpiresAt < new Date()) {
      throw new UnauthorizedException('OAuth token expired');
    }
    const grant = await this.db
      .selectFrom('oauthGrants')
      .selectAll()
      .where('id', '=', payload.grantId)
      .where('revokedAt', 'is', null)
      .executeTakeFirst();
    if (!grant) {
      throw new UnauthorizedException('OAuth grant revoked');
    }
    const user = await this.userRepo.findById(payload.sub, payload.workspaceId);
    const workspace = await this.workspaceRepo.findById(payload.workspaceId);
    if (!user || !workspace) {
      throw new UnauthorizedException();
    }
    return { user, workspace, scope: payload.scope };
  }
}

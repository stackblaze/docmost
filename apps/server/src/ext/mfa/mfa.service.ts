import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { UserRepo } from '@docmost/db/repos/user/user.repo';
import { TokenService } from '../../core/auth/services/token.service';
import { SessionService } from '../../core/session/session.service';
import { comparePasswordHash, hashPassword } from '../../common/helpers';
import { LoginDto } from '../../core/auth/dto/login.dto';
import { FastifyReply } from 'fastify';
import { EnvironmentService } from '../../integrations/environment/environment.service';
import { Secret, TOTP } from 'otpauth';
import { randomBytes } from 'node:crypto';

@Injectable()
export class MfaService {
  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly userRepo: UserRepo,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly environmentService: EnvironmentService,
  ) {}

  async checkMfaRequirements(
    loginInput: LoginDto,
    workspace: Workspace,
    res: FastifyReply,
  ) {
    const user = await this.userRepo.findByEmail(
      loginInput.email,
      workspace.id,
      { includePassword: true },
    );
    if (!user || !user.password) {
      return null;
    }
    const match = await comparePasswordHash(loginInput.password, user.password);
    if (!match) {
      return null;
    }

    const row = await this.db
      .selectFrom('userMfa')
      .selectAll()
      .where('userId', '=', user.id)
      .executeTakeFirst();

    const userHasMfa = Boolean(row?.isEnabled);
    const isMfaEnforced = Boolean(workspace.enforceMfa);
    const requiresMfaSetup = isMfaEnforced && !userHasMfa;

    if (userHasMfa || requiresMfaSetup) {
      const mfaToken = await this.tokenService.generateMfaToken(
        user,
        workspace.id,
      );
      res.setCookie('mfaToken', mfaToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        expires: new Date(Date.now() + 5 * 60 * 1000),
        secure: this.environmentService.isHttps(),
      });
      return { userHasMfa, requiresMfaSetup, isMfaEnforced };
    }

    const authToken = await this.sessionService.createSessionAndToken(user);
    return { authToken, userHasMfa: false, requiresMfaSetup: false };
  }

  async status(user: User) {
    const row = await this.db
      .selectFrom('userMfa')
      .selectAll()
      .where('userId', '=', user.id)
      .executeTakeFirst();
    return {
      isEnabled: Boolean(row?.isEnabled),
      method: row?.method ?? null,
      backupCodesCount: row?.backupCodes?.length ?? 0,
    };
  }

  async setup(user: User) {
    const secret = new Secret({ size: 20 });
    const totp = new TOTP({
      issuer: 'Docmost',
      label: user.email,
      secret,
    });

    await this.db
      .insertInto('userMfa')
      .values({
        userId: user.id,
        workspaceId: user.workspaceId,
        method: 'totp',
        secret: secret.base32,
        isEnabled: false,
      })
      .onConflict((oc) =>
        oc.column('userId').doUpdateSet({
          secret: secret.base32,
          isEnabled: false,
          method: 'totp',
          updatedAt: new Date(),
        }),
      )
      .execute();

    return {
      method: 'totp',
      qrCode: totp.toString(),
      manualKey: secret.base32,
    };
  }

  async enable(user: User, code: string) {
    const row = await this.db
      .selectFrom('userMfa')
      .selectAll()
      .where('userId', '=', user.id)
      .executeTakeFirst();
    if (!row?.secret) {
      throw new BadRequestException('MFA setup has not been started');
    }
    if (!this.verifyTotp(row.secret, code)) {
      throw new BadRequestException('Invalid verification code');
    }
    const backupCodes = Array.from({ length: 8 }, () =>
      randomBytes(5).toString('hex'),
    );
    const hashed = await Promise.all(backupCodes.map((c) => hashPassword(c)));
    await this.db
      .updateTable('userMfa')
      .set({ isEnabled: true, backupCodes: hashed, updatedAt: new Date() })
      .where('userId', '=', user.id)
      .execute();
    return { success: true, backupCodes };
  }

  async disable(user: User, password?: string) {
    if (password) {
      const full = await this.userRepo.findById(user.id, user.workspaceId, {
        includePassword: true,
      });
      if (!full?.password || !(await comparePasswordHash(password, full.password))) {
        throw new UnauthorizedException('Invalid password');
      }
    }
    await this.db.deleteFrom('userMfa').where('userId', '=', user.id).execute();
    return { success: true };
  }

  async regenerateBackupCodes(user: User) {
    const backupCodes = Array.from({ length: 8 }, () =>
      randomBytes(5).toString('hex'),
    );
    const hashed = await Promise.all(backupCodes.map((c) => hashPassword(c)));
    await this.db
      .updateTable('userMfa')
      .set({ backupCodes: hashed, updatedAt: new Date() })
      .where('userId', '=', user.id)
      .execute();
    return { backupCodes };
  }

  async verifyChallenge(mfaToken: string, code: string) {
    const payload = await this.tokenService.verifyJwt(mfaToken, 'mfa_token');
    const user = await this.userRepo.findById(payload.sub, payload.workspaceId);
    if (!user) {
      throw new UnauthorizedException();
    }
    const row = await this.db
      .selectFrom('userMfa')
      .selectAll()
      .where('userId', '=', user.id)
      .executeTakeFirst();
    if (!row?.isEnabled || !row.secret) {
      throw new UnauthorizedException('MFA is not enabled');
    }

    let valid = this.verifyTotp(row.secret, code);
    if (!valid && row.backupCodes?.length) {
      for (let i = 0; i < row.backupCodes.length; i++) {
        if (await comparePasswordHash(code, row.backupCodes[i])) {
          valid = true;
          const remaining = [...row.backupCodes];
          remaining.splice(i, 1);
          await this.db
            .updateTable('userMfa')
            .set({ backupCodes: remaining, updatedAt: new Date() })
            .where('userId', '=', user.id)
            .execute();
          break;
        }
      }
    }
    if (!valid) {
      throw new UnauthorizedException('Invalid code');
    }

    return this.sessionService.createSessionAndToken(user);
  }

  async validateAccess(user: User, workspace: Workspace) {
    const row = await this.db
      .selectFrom('userMfa')
      .selectAll()
      .where('userId', '=', user.id)
      .executeTakeFirst();
    const userHasMfa = Boolean(row?.isEnabled);
    const isMfaEnforced = Boolean(workspace.enforceMfa);
    return {
      valid: userHasMfa || !isMfaEnforced,
      userHasMfa,
      isMfaEnforced,
      requiresMfaSetup: isMfaEnforced && !userHasMfa,
    };
  }

  private verifyTotp(secret: string, code: string): boolean {
    const totp = new TOTP({ secret: Secret.fromBase32(secret) });
    return totp.validate({ token: code, window: 1 }) !== null;
  }
}

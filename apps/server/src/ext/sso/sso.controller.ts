import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { SsoService } from './sso.service';
import WorkspaceAbilityFactory from '../../core/casl/abilities/workspace-ability.factory';
import {
  WorkspaceCaslAction,
  WorkspaceCaslSubject,
} from '../../core/casl/interfaces/workspace-ability.type';
import { EnvironmentService } from '../../integrations/environment/environment.service';
import { SAML } from '@node-saml/node-saml';

@Controller('sso')
export class SsoController {
  constructor(
    private readonly ssoService: SsoService,
    private readonly workspaceAbility: WorkspaceAbilityFactory,
    private readonly environmentService: EnvironmentService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('providers')
  list(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() pagination: PaginationOptions,
  ) {
    this.assertAdmin(user, workspace);
    return this.ssoService.list(workspace.id, pagination);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('info')
  info(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: { providerId: string },
  ) {
    this.assertAdmin(user, workspace);
    return this.ssoService.findById(workspace.id, body.providerId);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('create')
  create(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: Record<string, any>,
  ) {
    this.assertAdmin(user, workspace);
    return this.ssoService.create(user, workspace, body);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('update')
  update(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: Record<string, any>,
  ) {
    this.assertAdmin(user, workspace);
    return this.ssoService.update(workspace.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('delete')
  remove(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: { providerId: string },
  ) {
    this.assertAdmin(user, workspace);
    return this.ssoService.delete(workspace.id, body.providerId);
  }

  @Get('redirect/:providerId')
  async redirect(
    @AuthWorkspace() workspace: Workspace,
    @Param('providerId') providerId: string,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const { url, state, nonce } = await this.ssoService.startOidc(
      workspace.id,
      providerId,
    );
    res.setCookie('ssoState', `${state}.${nonce}`, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: this.environmentService.isHttps(),
      maxAge: 600,
    });
    return res.redirect(url);
  }

  @Get('callback/:providerId')
  async callback(
    @AuthWorkspace() workspace: Workspace,
    @Param('providerId') providerId: string,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const raw = req.cookies?.ssoState || '';
    const [state, nonce] = raw.split('.');
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host;
    const proto =
      (req.headers['x-forwarded-proto'] as string) ||
      (this.environmentService.isHttps() ? 'https' : 'http');
    const currentUrl = new URL(`${proto}://${host}${req.url}`);
    const authToken = await this.ssoService.handleOidcCallback(
      workspace,
      providerId,
      currentUrl,
      state,
      nonce,
    );
    res.clearCookie('ssoState');
    this.setAuthCookie(res, authToken);
    return res.redirect('/');
  }

  @HttpCode(HttpStatus.OK)
  @Post('ldap')
  async ldap(
    @AuthWorkspace() workspace: Workspace,
    @Res({ passthrough: true }) res: FastifyReply,
    @Body() body: { providerId: string; username: string; password: string },
  ) {
    const authToken = await this.ssoService.ldapLogin(
      workspace,
      body.providerId,
      body.username,
      body.password,
    );
    this.setAuthCookie(res, authToken);
    return { success: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post('saml/:providerId')
  async samlAcs(
    @AuthWorkspace() workspace: Workspace,
    @Param('providerId') providerId: string,
    @Body() body: { SAMLResponse?: string },
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const provider = await this.ssoService.findById(workspace.id, providerId);
    const saml = new SAML({
      callbackUrl: this.ssoService.callbackUrl(providerId),
      entryPoint: (provider as any).samlUrl,
      idpCert: (provider as any).samlCertificate,
      issuer: this.environmentService.getAppUrl(),
      wantAssertionsSigned: false,
    });
    const { profile } = await saml.validatePostResponseAsync({
      SAMLResponse: body.SAMLResponse,
    });
    const authToken = await this.ssoService.handleSamlCallback(
      workspace,
      providerId,
      {
        nameID: (profile as any)?.nameID,
        email: (profile as any)?.email || (profile as any)?.nameID,
        displayName: (profile as any)?.displayName,
      },
    );
    this.setAuthCookie(res, authToken);
    return res.redirect('/');
  }

  private assertAdmin(user: User, workspace: Workspace) {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Settings)) {
      throw new ForbiddenException();
    }
  }

  private setAuthCookie(res: FastifyReply, token: string) {
    res.setCookie('authToken', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      expires: this.environmentService.getCookieExpiresIn(),
      secure: this.environmentService.isHttps(),
    });
  }
}

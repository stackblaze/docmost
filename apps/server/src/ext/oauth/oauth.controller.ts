import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { OAuthService } from './oauth.service';
import WorkspaceAbilityFactory from '../../core/casl/abilities/workspace-ability.factory';
import {
  WorkspaceCaslAction,
  WorkspaceCaslSubject,
} from '../../core/casl/interfaces/workspace-ability.type';

@Controller()
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly workspaceAbility: WorkspaceAbilityFactory,
  ) {}

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('oauth/clients')
  listClients(@AuthUser() user: User, @AuthWorkspace() workspace: Workspace) {
    this.assertAdmin(user, workspace);
    return this.oauthService.listClients(workspace.id);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('oauth/clients/create')
  createClient(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: { name: string; redirectUris: string[]; scopes?: string[] },
  ) {
    this.assertAdmin(user, workspace);
    return this.oauthService.createClient(workspace, body);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('oauth/clients/delete')
  deleteClient(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: { clientId: string },
  ) {
    this.assertAdmin(user, workspace);
    return this.oauthService.deleteClient(workspace.id, body.clientId);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('oauth/authorize')
  authorize(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: any,
  ) {
    return this.oauthService.authorize(user, workspace, body);
  }

  @HttpCode(HttpStatus.OK)
  @Post('oauth/token')
  token(@AuthWorkspace() workspace: Workspace, @Body() body: any) {
    return this.oauthService.exchange(workspace, body);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('oauth/grants')
  grants(@AuthUser() user: User, @AuthWorkspace() workspace: Workspace) {
    return this.oauthService.listGrants(user, workspace.id);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('oauth/grants/revoke')
  revoke(
    @AuthUser() user: User,
    @Body() body: { grantId: string },
  ) {
    return this.oauthService.revokeGrant(user, body.grantId);
  }

  private assertAdmin(user: User, workspace: Workspace) {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Settings)) {
      throw new ForbiddenException();
    }
  }
}

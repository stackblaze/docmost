import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { ScimTokenService } from './scim-token.service';
import { ScimService } from './scim.service';
import WorkspaceAbilityFactory from '../../core/casl/abilities/workspace-ability.factory';
import {
  WorkspaceCaslAction,
  WorkspaceCaslSubject,
} from '../../core/casl/interfaces/workspace-ability.type';
import { FastifyRequest } from 'fastify';

@UseGuards(JwtAuthGuard)
@Controller('scim-tokens')
export class ScimTokenController {
  constructor(
    private readonly scimTokenService: ScimTokenService,
    private readonly workspaceAbility: WorkspaceAbilityFactory,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post()
  list(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() pagination: PaginationOptions,
  ) {
    this.assertAdmin(user, workspace);
    return this.scimTokenService.list(workspace, pagination);
  }

  @HttpCode(HttpStatus.OK)
  @Post('create')
  create(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: { name: string },
  ) {
    this.assertAdmin(user, workspace);
    return this.scimTokenService.create(user, workspace, body.name);
  }

  @HttpCode(HttpStatus.OK)
  @Post('update')
  update(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: { tokenId: string; name: string },
  ) {
    this.assertAdmin(user, workspace);
    return this.scimTokenService.update(workspace, body.tokenId, body.name);
  }

  @HttpCode(HttpStatus.OK)
  @Post('revoke')
  revoke(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: { tokenId: string },
  ) {
    this.assertAdmin(user, workspace);
    return this.scimTokenService.revoke(workspace, body.tokenId);
  }

  private assertAdmin(user: User, workspace: Workspace) {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Settings)) {
      throw new ForbiddenException();
    }
  }
}

@Controller('scim/v2')
export class ScimProvisioningController {
  constructor(
    private readonly scimTokenService: ScimTokenService,
    private readonly scimService: ScimService,
  ) {}

  @Get('Users')
  async listUsers(
    @Req() req: FastifyRequest,
    @AuthWorkspace() workspace: Workspace,
    @Query('startIndex') startIndex?: string,
    @Query('count') count?: string,
    @Query('filter') filter?: string,
  ) {
    await this.auth(req, workspace.id);
    return this.scimService.listUsers(
      workspace.id,
      Number(startIndex || 1),
      Number(count || 100),
      filter,
    );
  }

  @Get('Users/:id')
  async getUser(
    @Req() req: FastifyRequest,
    @AuthWorkspace() workspace: Workspace,
    @Param('id') id: string,
  ) {
    await this.auth(req, workspace.id);
    return this.scimService.getUser(workspace.id, id);
  }

  @Post('Users')
  async createUser(
    @Req() req: FastifyRequest,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: any,
  ) {
    await this.auth(req, workspace.id);
    return this.scimService.createUser(workspace.id, body);
  }

  @Put('Users/:id')
  async replaceUser(
    @Req() req: FastifyRequest,
    @AuthWorkspace() workspace: Workspace,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    await this.auth(req, workspace.id);
    return this.scimService.replaceUser(workspace.id, id, body);
  }

  @Patch('Users/:id')
  async patchUser(
    @Req() req: FastifyRequest,
    @AuthWorkspace() workspace: Workspace,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    await this.auth(req, workspace.id);
    return this.scimService.patchUser(workspace.id, id, body);
  }

  @Delete('Users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(
    @Req() req: FastifyRequest,
    @AuthWorkspace() workspace: Workspace,
    @Param('id') id: string,
  ) {
    await this.auth(req, workspace.id);
    await this.scimService.deleteUser(workspace.id, id);
  }

  @Get('Groups')
  async listGroups(
    @Req() req: FastifyRequest,
    @AuthWorkspace() workspace: Workspace,
    @Query('startIndex') startIndex?: string,
    @Query('count') count?: string,
  ) {
    await this.auth(req, workspace.id);
    return this.scimService.listGroups(
      workspace.id,
      Number(startIndex || 1),
      Number(count || 100),
    );
  }

  @Get('Groups/:id')
  async getGroup(
    @Req() req: FastifyRequest,
    @AuthWorkspace() workspace: Workspace,
    @Param('id') id: string,
  ) {
    await this.auth(req, workspace.id);
    return this.scimService.getGroup(workspace.id, id);
  }

  @Post('Groups')
  async createGroup(
    @Req() req: FastifyRequest,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: any,
  ) {
    await this.auth(req, workspace.id);
    return this.scimService.createGroup(workspace.id, body);
  }

  @Delete('Groups/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGroup(
    @Req() req: FastifyRequest,
    @AuthWorkspace() workspace: Workspace,
    @Param('id') id: string,
  ) {
    await this.auth(req, workspace.id);
    await this.scimService.deleteGroup(workspace.id, id);
  }

  private async auth(req: FastifyRequest, workspaceId: string) {
    const header = (req.headers.authorization || '') as string;
    const token = header.replace(/^Bearer\s+/i, '');
    await this.scimTokenService.authenticate(token, workspaceId);
  }
}

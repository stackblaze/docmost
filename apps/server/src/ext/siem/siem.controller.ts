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
import { SiemService } from './siem.service';
import WorkspaceAbilityFactory from '../../core/casl/abilities/workspace-ability.factory';
import {
  WorkspaceCaslAction,
  WorkspaceCaslSubject,
} from '../../core/casl/interfaces/workspace-ability.type';

@UseGuards(JwtAuthGuard)
@Controller('siem')
export class SiemController {
  constructor(
    private readonly siemService: SiemService,
    private readonly workspaceAbility: WorkspaceAbilityFactory,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('destinations')
  list(@AuthUser() user: User, @AuthWorkspace() workspace: Workspace) {
    this.assertOwner(user, workspace);
    return this.siemService.list(workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('destinations/create')
  create(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: any,
  ) {
    this.assertOwner(user, workspace);
    return this.siemService.create(user, workspace, body);
  }

  @HttpCode(HttpStatus.OK)
  @Post('destinations/update')
  update(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: any,
  ) {
    this.assertOwner(user, workspace);
    return this.siemService.update(workspace, body);
  }

  @HttpCode(HttpStatus.OK)
  @Post('destinations/delete')
  remove(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: { destinationId: string },
  ) {
    this.assertOwner(user, workspace);
    return this.siemService.remove(workspace, body.destinationId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('destinations/test')
  test(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: { destinationId: string },
  ) {
    this.assertOwner(user, workspace);
    return this.siemService.test(workspace, body.destinationId);
  }

  private assertOwner(user: User, workspace: Workspace) {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Audit)) {
      throw new ForbiddenException();
    }
  }
}

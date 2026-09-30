import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { PagePermissionService } from './page-permission.service';

@UseGuards(JwtAuthGuard)
@Controller('pages')
export class PagePermissionController {
  constructor(private readonly pagePermissionService: PagePermissionService) {}

  @HttpCode(HttpStatus.OK)
  @Post('restrict')
  restrict(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: { pageId: string },
  ) {
    return this.pagePermissionService.restrict(body.pageId, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('remove-restriction')
  unrestrict(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: { pageId: string },
  ) {
    return this.pagePermissionService.unrestrict(body.pageId, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('add-permission')
  add(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: any,
  ) {
    return this.pagePermissionService.addPermission(body, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('remove-permission')
  remove(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: any,
  ) {
    return this.pagePermissionService.removePermission(body, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('update-permission')
  update(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: any,
  ) {
    return this.pagePermissionService.updateRole(body, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('permissions')
  list(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: PaginationOptions & { pageId: string },
  ) {
    return this.pagePermissionService.list(body.pageId, user, workspace, body);
  }

  @HttpCode(HttpStatus.OK)
  @Post('permission-info')
  info(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: { pageId: string },
  ) {
    return this.pagePermissionService.info(body.pageId, user, workspace);
  }
}

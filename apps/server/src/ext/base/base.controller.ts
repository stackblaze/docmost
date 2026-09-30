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
import { BaseService } from './base.service';

@UseGuards(JwtAuthGuard)
@Controller('bases')
export class BaseController {
  constructor(private readonly baseService: BaseService) {}

  @HttpCode(HttpStatus.OK)
  @Post('info')
  info(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: { pageId: string },
  ) {
    return this.baseService.getBase(body.pageId, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('convert')
  convert(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: { pageId: string },
  ) {
    return this.baseService.convertPage(body.pageId, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('properties/create')
  addProperty(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: any,
  ) {
    return this.baseService.addProperty(body, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('rows/create')
  addRow(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: any,
  ) {
    return this.baseService.addRow(body, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('rows/update')
  updateRow(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: any,
  ) {
    return this.baseService.updateRow(body, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('rows/delete')
  deleteRow(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: { rowId: string },
  ) {
    return this.baseService.deleteRow(body.rowId, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('views/create')
  addView(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: any,
  ) {
    return this.baseService.addView(body, user, workspace);
  }
}

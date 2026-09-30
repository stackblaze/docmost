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
import { TemplateService } from './template.service';

@UseGuards(JwtAuthGuard)
@Controller('templates')
export class TemplateController {
  constructor(private readonly service: TemplateService) {}

  @HttpCode(HttpStatus.OK)
  @Post()
  list(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: PaginationOptions & { spaceId?: string },
  ) {
    return this.service.list(user, workspace, body, body.spaceId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('info')
  info(@AuthWorkspace() workspace: Workspace, @Body() body: { templateId: string }) {
    return this.service.get(body.templateId, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('create')
  create(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: any,
  ) {
    return this.service.create(user, workspace, body);
  }

  @HttpCode(HttpStatus.OK)
  @Post('update')
  update(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: any,
  ) {
    return this.service.update(user, workspace, body);
  }

  @HttpCode(HttpStatus.OK)
  @Post('delete')
  remove(
    @AuthWorkspace() workspace: Workspace,
    @Body() body: { templateId: string },
  ) {
    return this.service.remove(body.templateId, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('use')
  use(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: any,
  ) {
    return this.service.useTemplate(user, workspace, body);
  }
}

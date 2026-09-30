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
import { PageVerificationService } from './page-verification.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class PageVerificationController {
  constructor(private readonly service: PageVerificationService) {}

  @HttpCode(HttpStatus.OK)
  @Post('verifications')
  list(
    @AuthWorkspace() workspace: Workspace,
    @Body() pagination: PaginationOptions,
  ) {
    return this.service.list(workspace, pagination);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verifications/setup')
  setup(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: any,
  ) {
    return this.service.setup(body, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verifications/verify')
  verify(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: { verificationId: string },
  ) {
    return this.service.verify(body.verificationId, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verifications/reject')
  reject(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: { verificationId: string; comment?: string },
  ) {
    return this.service.reject(body.verificationId, user, workspace, body.comment);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verifications/remove')
  remove(
    @AuthWorkspace() workspace: Workspace,
    @Body() body: { verificationId: string },
  ) {
    return this.service.remove(body.verificationId, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verifications/page')
  byPage(
    @AuthWorkspace() workspace: Workspace,
    @Body() body: { pageId: string },
  ) {
    return this.service.getByPage(body.pageId, workspace.id);
  }
}

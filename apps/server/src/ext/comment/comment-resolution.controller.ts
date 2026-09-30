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
import { CommentResolutionService } from './comment-resolution.service';

@UseGuards(JwtAuthGuard)
@Controller('comments')
export class CommentResolutionController {
  constructor(private readonly service: CommentResolutionService) {}

  @HttpCode(HttpStatus.OK)
  @Post('resolve')
  resolve(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: { commentId: string; pageId: string; resolved: boolean },
  ) {
    return this.service.resolve(body, user, workspace);
  }
}

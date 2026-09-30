import { Module } from '@nestjs/common';
import { CommentResolutionService } from './comment-resolution.service';
import { CommentResolutionController } from './comment-resolution.controller';

@Module({
  controllers: [CommentResolutionController],
  providers: [CommentResolutionService],
  exports: [CommentResolutionService],
})
export class ExtCommentModule {}

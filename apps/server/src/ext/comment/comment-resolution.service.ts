import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommentRepo } from '@docmost/db/repos/comment/comment.repo';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { PageAccessService } from '../../core/page/page-access/page-access.service';
import { WsService } from '../../ws/ws.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueJob, QueueName } from '../../integrations/queue/constants';

@Injectable()
export class CommentResolutionService {
  constructor(
    private readonly commentRepo: CommentRepo,
    private readonly pageRepo: PageRepo,
    private readonly pageAccessService: PageAccessService,
    private readonly wsService: WsService,
    @InjectQueue(QueueName.NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue,
  ) {}

  async resolve(
    data: { commentId: string; pageId: string; resolved: boolean },
    user: User,
    workspace: Workspace,
  ) {
    const comment = await this.commentRepo.findById(data.commentId, {
      includeCreator: true,
      includeResolvedBy: true,
    });
    if (!comment || comment.pageId !== data.pageId) {
      throw new NotFoundException('Comment not found');
    }
    const page = await this.pageRepo.findById(comment.pageId);
    if (!page || page.workspaceId !== workspace.id) {
      throw new NotFoundException('Page not found');
    }
    await this.pageAccessService.validateCanComment(page, user, workspace.id);

    await this.commentRepo.updateComment(
      {
        resolvedAt: data.resolved ? new Date() : null,
        resolvedById: data.resolved ? user.id : null,
      },
      comment.id,
    );

    const updated = await this.commentRepo.findById(comment.id, {
      includeCreator: true,
      includeResolvedBy: true,
    });

    this.wsService.emitCommentEvent(page.spaceId, page.id, {
      operation: data.resolved ? 'commentResolved' : 'commentReopened',
      pageId: page.id,
      comment: updated,
    });

    if (data.resolved && comment.creatorId && comment.creatorId !== user.id) {
      this.notificationQueue
        .add(QueueJob.COMMENT_RESOLVED_NOTIFICATION, {
          commentId: comment.id,
          pageId: page.id,
          spaceId: page.spaceId,
          workspaceId: workspace.id,
          actorId: user.id,
        })
        .catch(() => undefined);
    }

    return updated;
  }
}

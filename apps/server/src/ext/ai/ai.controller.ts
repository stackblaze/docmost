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
import { AiService } from './ai.service';
import { PageSearchService } from './page-search.service';
import WorkspaceAbilityFactory from '../../core/casl/abilities/workspace-ability.factory';
import {
  WorkspaceCaslAction,
  WorkspaceCaslSubject,
} from '../../core/casl/interfaces/workspace-ability.type';

@UseGuards(JwtAuthGuard)
@Controller()
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly pageSearchService: PageSearchService,
    private readonly workspaceAbility: WorkspaceAbilityFactory,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('ai/settings')
  settings(@AuthWorkspace() workspace: Workspace) {
    return this.aiService.getPublicSettings(workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('ai/settings/update')
  updateSettings(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: any,
  ) {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Settings)) {
      throw new ForbiddenException();
    }
    return this.aiService.updateSettings(workspace, body);
  }

  @HttpCode(HttpStatus.OK)
  @Post('ai/chats')
  listChats(@AuthUser() user: User, @AuthWorkspace() workspace: Workspace) {
    return this.aiService.listChats(user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('ai/chats/info')
  getChat(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: { chatId: string },
  ) {
    return this.aiService.getChat(body.chatId, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('ai/chats/create')
  createChat(@AuthUser() user: User, @AuthWorkspace() workspace: Workspace) {
    return this.aiService.createChat(user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('ai/search')
  search(
    @AuthWorkspace() workspace: Workspace,
    @Body() body: { query?: string; spaceId?: string; limit?: number },
  ) {
    return this.pageSearchService.searchPage(body, {
      workspaceId: workspace.id,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('ai/chat')
  send(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() body: any,
  ) {
    return this.aiService.sendMessage(user, workspace, body);
  }
}

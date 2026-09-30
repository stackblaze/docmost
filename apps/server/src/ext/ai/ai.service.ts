import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { EncryptionService } from '../../integrations/encryption/encryption.service';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

type AiSettings = {
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  search?: boolean;
  generative?: boolean;
  chat?: boolean;
  mcp?: boolean;
};

@Injectable()
export class AiService {
  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly encryptionService: EncryptionService,
  ) {}

  getPublicSettings(workspace: Workspace) {
    const ai = ((workspace.settings as any)?.ai ?? {}) as AiSettings;
    return {
      provider: ai.provider ?? null,
      model: ai.model ?? 'gpt-4o-mini',
      baseUrl: ai.baseUrl ?? null,
      hasApiKey: Boolean(ai.apiKey),
      search: Boolean(ai.search),
      generative: Boolean(ai.generative),
      chat: Boolean(ai.chat),
      mcp: Boolean(ai.mcp),
    };
  }

  async updateSettings(workspace: Workspace, data: AiSettings) {
    const current = ((workspace.settings as any) ?? {}) as Record<string, any>;
    const ai = { ...(current.ai ?? {}) };
    if (data.provider !== undefined) ai.provider = data.provider;
    if (data.model !== undefined) ai.model = data.model;
    if (data.baseUrl !== undefined) ai.baseUrl = data.baseUrl;
    if (data.apiKey) {
      ai.apiKey = this.encryptionService.encrypt(data.apiKey);
    }
    const settings = { ...current, ai };
    await this.db
      .updateTable('workspaces')
      .set({ settings, updatedAt: new Date() })
      .where('id', '=', workspace.id)
      .execute();
    return this.getPublicSettings({ ...workspace, settings });
  }

  async listChats(user: User, workspace: Workspace) {
    return this.db
      .selectFrom('aiChats')
      .selectAll()
      .where('workspaceId', '=', workspace.id)
      .where('creatorId', '=', user.id)
      .where('deletedAt', 'is', null)
      .orderBy('updatedAt', 'desc')
      .execute();
  }

  async getChat(chatId: string, user: User, workspace: Workspace) {
    const chat = await this.db
      .selectFrom('aiChats')
      .selectAll()
      .where('id', '=', chatId)
      .where('workspaceId', '=', workspace.id)
      .where('creatorId', '=', user.id)
      .executeTakeFirst();
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    const messages = await this.db
      .selectFrom('aiChatMessages')
      .selectAll()
      .where('chatId', '=', chat.id)
      .orderBy('createdAt', 'asc')
      .execute();
    return { ...chat, messages };
  }

  async createChat(user: User, workspace: Workspace, title?: string) {
    return this.db
      .insertInto('aiChats')
      .values({
        workspaceId: workspace.id,
        creatorId: user.id,
        title: title ?? 'New chat',
      })
      .returningAll()
      .executeTakeFirst();
  }

  async sendMessage(
    user: User,
    workspace: Workspace,
    data: { chatId?: string; content: string; pageId?: string },
  ) {
    const settings = ((workspace.settings as any)?.ai ?? {}) as AiSettings;
    if (!settings.apiKey) {
      throw new BadRequestException('Configure an AI provider API key first');
    }
    if ((workspace.settings as any)?.ai?.chatReadOnly) {
      throw new BadRequestException('AI chat is read-only in this workspace');
    }

    let chatId = data.chatId;
    if (!chatId) {
      const chat = await this.createChat(user, workspace, data.content.slice(0, 60));
      chatId = chat.id;
    }

    await this.db
      .insertInto('aiChatMessages')
      .values({
        chatId,
        workspaceId: workspace.id,
        userId: user.id,
        role: 'user',
        content: data.content,
      })
      .execute();

    let context = '';
    if (data.pageId) {
      const page = await this.db
        .selectFrom('pages')
        .select(['title', 'textContent'])
        .where('id', '=', data.pageId)
        .executeTakeFirst();
      if (page) {
        context = `Page "${page.title}":\n${(page.textContent || '').slice(0, 4000)}`;
      }
    } else if ((workspace.settings as any)?.ai?.chatWorkspaceKnowledgeOnly) {
      const pages = await this.db
        .selectFrom('pages')
        .select(['title', 'textContent'])
        .where('workspaceId', '=', workspace.id)
        .where('deletedAt', 'is', null)
        .limit(8)
        .execute();
      context = pages
        .map((p) => `${p.title}: ${(p.textContent || '').slice(0, 500)}`)
        .join('\n');
    }

    const apiKey = this.encryptionService.decrypt(settings.apiKey);
    const modelId = settings.model || 'gpt-4o-mini';
    const model = settings.baseUrl
      ? createOpenAICompatible({
          name: settings.provider || 'custom',
          apiKey,
          baseURL: settings.baseUrl,
        }).chatModel(modelId)
      : createOpenAI({ apiKey })(modelId);

    const result = await generateText({
      model,
      system: context
        ? `Answer using the following workspace context:\n${context}`
        : 'You are a helpful assistant in a wiki.',
      prompt: data.content,
    });

    await this.db
      .insertInto('aiChatMessages')
      .values({
        chatId,
        workspaceId: workspace.id,
        role: 'assistant',
        content: result.text,
      })
      .execute();

    return { chatId, content: result.text };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { StorageService } from '../../integrations/storage/storage.service';

@Injectable()
export class AttachmentEeService {
  private readonly logger = new Logger(AttachmentEeService.name);

  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly storageService: StorageService,
  ) {}

  async indexAttachment(attachmentId: string): Promise<void> {
    const attachment = await this.db
      .selectFrom('attachments')
      .selectAll()
      .where('id', '=', attachmentId)
      .executeTakeFirst();
    if (!attachment) {
      return;
    }
    try {
      const stream = await this.storageService.readStream(attachment.filePath);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const raw = Buffer.concat(chunks).toString('utf8');
      const textContent = raw.replace(/[^\x09\x0a\x0d\x20-\x7e]/g, ' ').slice(0, 20000);
      await this.db
        .updateTable('attachments')
        .set({ textContent, updatedAt: new Date() })
        .where('id', '=', attachmentId)
        .execute();
    } catch (err) {
      this.logger.warn(`Failed to index attachment ${attachmentId}: ${err}`);
    }
  }

  async indexAttachments(workspaceId: string): Promise<void> {
    const rows = await this.db
      .selectFrom('attachments')
      .select('id')
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .execute();
    for (const row of rows) {
      await this.indexAttachment(row.id);
    }
  }
}

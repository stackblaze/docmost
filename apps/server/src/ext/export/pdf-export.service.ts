import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { StorageService } from '../../integrations/storage/storage.service';
import { ExportService } from '../../integrations/export/export.service';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { FileTaskStatus } from '../../integrations/import/utils/file.utils';

@Injectable()
export class PdfExportService {
  private readonly logger = new Logger(PdfExportService.name);

  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly storageService: StorageService,
    private readonly exportService: ExportService,
    private readonly pageRepo: PageRepo,
  ) {}

  async generateAndStorePdf(fileTaskId: string): Promise<void> {
    const task = await this.db
      .selectFrom('fileTasks')
      .selectAll()
      .where('id', '=', fileTaskId)
      .executeTakeFirst();
    if (!task) {
      throw new NotFoundException('Export task not found');
    }
    const page = task.pageId
      ? await this.pageRepo.findById(task.pageId, { includeContent: true })
      : null;
    let html = '<html><body><p>Empty export</p></body></html>';
    if (page) {
      const exported = await this.exportService.exportPage('html', page, true);
      html = typeof exported === 'string' ? exported : String(exported ?? html);
    }
    const filePath = `exports/${task.workspaceId}/${fileTaskId}.html`;
    await this.storageService.upload(filePath, Buffer.from(html, 'utf8'));
    await this.db
      .updateTable('fileTasks')
      .set({
        status: FileTaskStatus.Success,
        filePath,
        fileExt: 'html',
        fileSize: Buffer.byteLength(html),
        updatedAt: new Date(),
      })
      .where('id', '=', fileTaskId)
      .execute();
  }

  async cleanupExpiredExports(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stale = await this.db
      .selectFrom('fileTasks')
      .selectAll()
      .where('type', '=', 'export')
      .where('createdAt', '<', cutoff)
      .execute();
    for (const task of stale) {
      if (task.filePath) {
        await this.storageService.delete(task.filePath).catch((err) => {
          this.logger.warn(`Failed to delete export ${task.id}: ${err}`);
        });
      }
      await this.db.deleteFrom('fileTasks').where('id', '=', task.id).execute();
    }
  }
}

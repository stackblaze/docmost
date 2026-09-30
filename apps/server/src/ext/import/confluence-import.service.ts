import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { FileImportTaskService } from '../../integrations/import/services/file-import-task.service';

@Injectable()
export class ConfluenceImportService {
  private readonly logger = new Logger(ConfluenceImportService.name);

  constructor(private readonly fileImportTaskService: FileImportTaskService) {}

  async processConfluenceImport(opts: {
    extractDir: string;
    fileTask: any;
  }): Promise<void> {
    const { extractDir, fileTask } = opts;
    // Confluence space exports are HTML trees. Reuse the generic HTML importer.
    await (this.fileImportTaskService as any).processGenericImport({
      extractDir,
      fileTask,
    });
    this.logger.log(`Imported Confluence archive for task ${fileTask.id}`);
  }
}

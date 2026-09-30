import { Module } from '@nestjs/common';
import { DocxImportService } from './docx-import.service';
import { PdfImportService } from './pdf-import.service';
import { ConfluenceImportService } from './confluence-import.service';
import { ImportModule } from '../../integrations/import/import.module';

@Module({
  imports: [ImportModule],
  providers: [DocxImportService, PdfImportService, ConfluenceImportService],
  exports: [DocxImportService, PdfImportService, ConfluenceImportService],
})
export class ExtImportModule {}

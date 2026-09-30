import { Module } from '@nestjs/common';
import { PdfExportService } from './pdf-export.service';
import { ExportModule } from '../../integrations/export/export.module';

@Module({
  imports: [ExportModule],
  providers: [PdfExportService],
  exports: [PdfExportService],
})
export class ExtExportModule {}

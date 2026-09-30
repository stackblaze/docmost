import { Injectable } from '@nestjs/common';

@Injectable()
export class PdfImportService {
  async convertPdfToHtml(
    fileBuffer: Buffer,
    _workspaceId: string,
    _spaceId: string,
    _pageId: string,
    _userId: string,
  ): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PDFParse } = require('@docmost/pdf-inspector');
      if (PDFParse) {
        const parser = new PDFParse({ data: fileBuffer });
        const text = await parser.getText();
        const pages = text?.pages || [];
        const body = pages
          .map((p: any) => `<p>${escapeHtml(p.text || '')}</p>`)
          .join('');
        return body || '<p></p>';
      }
    } catch {
      // fall through
    }
    const text = fileBuffer.toString('utf8').replace(/[^\x09\x0a\x0d\x20-\x7e]/g, ' ');
    return `<p>${escapeHtml(text.slice(0, 20000))}</p>`;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

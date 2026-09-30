import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { PageSearchService } from './page-search.service';

@Module({
  controllers: [AiController],
  providers: [AiService, PageSearchService],
  exports: [AiService, PageSearchService],
})
export class ExtAiModule {}

import { Module } from '@nestjs/common';
import { BaseService } from './base.service';
import { BaseController } from './base.controller';
import { BaseWsService } from './base-ws.service';

@Module({
  controllers: [BaseController],
  providers: [BaseService, BaseWsService],
  exports: [BaseService, BaseWsService],
})
export class ExtBaseModule {}

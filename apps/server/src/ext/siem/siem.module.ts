import { Module } from '@nestjs/common';
import { SiemService } from './siem.service';
import { SiemController } from './siem.controller';

@Module({
  controllers: [SiemController],
  providers: [SiemService],
  exports: [SiemService],
})
export class ExtSiemModule {}

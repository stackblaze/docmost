import { Module } from '@nestjs/common';
import {
  PageVerificationService,
  PageVerificationSchedulerService,
} from './page-verification.service';
import { PageVerificationController } from './page-verification.controller';

@Module({
  controllers: [PageVerificationController],
  providers: [PageVerificationService, PageVerificationSchedulerService],
  exports: [PageVerificationService, PageVerificationSchedulerService],
})
export class ExtPageVerificationModule {}

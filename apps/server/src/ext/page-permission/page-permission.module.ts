import { Module } from '@nestjs/common';
import { PagePermissionService } from './page-permission.service';
import { PagePermissionController } from './page-permission.controller';

@Module({
  controllers: [PagePermissionController],
  providers: [PagePermissionService],
  exports: [PagePermissionService],
})
export class ExtPagePermissionModule {}

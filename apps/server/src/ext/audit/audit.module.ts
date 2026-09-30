import { Global, Module } from '@nestjs/common';
import { AuditLogService } from './audit.service';
import { AuditController } from './audit.controller';
import {
  AUDIT_SERVICE,
} from '../../integrations/audit/audit.service';

@Global()
@Module({
  controllers: [AuditController],
  providers: [
    AuditLogService,
    {
      provide: AUDIT_SERVICE,
      useExisting: AuditLogService,
    },
  ],
  exports: [AUDIT_SERVICE, AuditLogService],
})
export class ExtAuditModule {}

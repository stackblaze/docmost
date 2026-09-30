import { Global, Module } from '@nestjs/common';
import { ExtAuditModule } from './audit/audit.module';
import { ExtMfaModule } from './mfa/mfa.module';
import { ExtApiKeyModule } from './api-key/api-key.module';
import { ExtSsoModule } from './sso/sso.module';
import { ExtScimModule } from './scim/scim.module';
import { ExtOauthModule } from './oauth/oauth.module';
import { ExtPagePermissionModule } from './page-permission/page-permission.module';
import { ExtCommentModule } from './comment/comment.module';
import { ExtPageVerificationModule } from './page-verification/page-verification.module';
import { ExtTemplateModule } from './template/template.module';
import { ExtSiemModule } from './siem/siem.module';
import { ExtImportModule } from './import/import.module';
import { ExtExportModule } from './export/export.module';
import { ExtAttachmentModule } from './attachments/attachment.module';
import { ExtBaseModule } from './base/base.module';
import { ExtAiModule } from './ai/ai.module';
import { ExtPersonalSpaceModule } from './personal-space/personal-space.module';

@Global()
@Module({
  imports: [
    ExtAuditModule,
    ExtMfaModule,
    ExtApiKeyModule,
    ExtSsoModule,
    ExtScimModule,
    ExtOauthModule,
    ExtPagePermissionModule,
    ExtCommentModule,
    ExtPageVerificationModule,
    ExtTemplateModule,
    ExtSiemModule,
    ExtImportModule,
    ExtExportModule,
    ExtAttachmentModule,
    ExtBaseModule,
    ExtAiModule,
    ExtPersonalSpaceModule,
  ],
})
export class ExtModule {}

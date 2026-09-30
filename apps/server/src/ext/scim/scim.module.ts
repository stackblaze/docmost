import { Module } from '@nestjs/common';
import { ScimTokenService } from './scim-token.service';
import { ScimService } from './scim.service';
import { ScimTokenController, ScimProvisioningController } from './scim.controller';
import { WorkspaceModule } from '../../core/workspace/workspace.module';
import { AuthModule } from '../../core/auth/auth.module';

@Module({
  imports: [WorkspaceModule, AuthModule],
  controllers: [ScimTokenController, ScimProvisioningController],
  providers: [ScimTokenService, ScimService],
  exports: [ScimTokenService, ScimService],
})
export class ExtScimModule {}

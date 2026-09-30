import { Module } from '@nestjs/common';
import { SsoService } from './sso.service';
import { SsoController } from './sso.controller';
import { WorkspaceModule } from '../../core/workspace/workspace.module';
import { AuthModule } from '../../core/auth/auth.module';

@Module({
  imports: [WorkspaceModule, AuthModule],
  controllers: [SsoController],
  providers: [SsoService],
  exports: [SsoService],
})
export class ExtSsoModule {}

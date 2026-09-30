import { Module } from '@nestjs/common';
import { MfaService } from './mfa.service';
import { MfaController } from './mfa.controller';
import { TokenModule } from '../../core/auth/token.module';

@Module({
  imports: [TokenModule],
  controllers: [MfaController],
  providers: [MfaService],
  exports: [MfaService],
})
export class ExtMfaModule {}

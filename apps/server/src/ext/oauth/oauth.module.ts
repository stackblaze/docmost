import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OAuthService, OAuthStrategyService } from './oauth.service';
import { OAuthController } from './oauth.controller';
import { EnvironmentService } from '../../integrations/environment/environment.service';
import type { StringValue } from 'ms';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async (environmentService: EnvironmentService) => ({
        secret: environmentService.getAppSecret(),
        signOptions: {
          expiresIn: environmentService.getJwtTokenExpiresIn() as StringValue,
          issuer: 'Docmost',
        },
      }),
      inject: [EnvironmentService],
    }),
  ],
  controllers: [OAuthController],
  providers: [OAuthService, OAuthStrategyService],
  exports: [OAuthService, OAuthStrategyService],
})
export class ExtOauthModule {}

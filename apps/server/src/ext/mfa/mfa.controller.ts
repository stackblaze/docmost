import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { MfaService } from './mfa.service';
import { EnvironmentService } from '../../integrations/environment/environment.service';
import { IsOptional, IsString } from 'class-validator';

class MfaCodeDto {
  @IsString()
  code: string;
}

class MfaEnableDto {
  @IsString()
  verificationCode: string;
}

class MfaPasswordDto {
  @IsOptional()
  @IsString()
  confirmPassword?: string;
}

@Controller('mfa')
export class MfaController {
  constructor(
    private readonly mfaService: MfaService,
    private readonly environmentService: EnvironmentService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('status')
  status(@AuthUser() user: User) {
    return this.mfaService.status(user);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('setup')
  setup(@AuthUser() user: User) {
    return this.mfaService.setup(user);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('enable')
  enable(@AuthUser() user: User, @Body() dto: MfaEnableDto) {
    return this.mfaService.enable(user, dto.verificationCode);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('disable')
  disable(@AuthUser() user: User, @Body() dto: MfaPasswordDto) {
    return this.mfaService.disable(user, dto.confirmPassword);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('generate-backup-codes')
  regenerate(@AuthUser() user: User) {
    return this.mfaService.regenerateBackupCodes(user);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('validate-access')
  validateAccess(@AuthUser() user: User, @AuthWorkspace() workspace: Workspace) {
    return this.mfaService.validateAccess(user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify')
  async verify(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
    @Body() dto: MfaCodeDto,
  ) {
    const token = req.cookies?.mfaToken;
    const authToken = await this.mfaService.verifyChallenge(token, dto.code);
    res.clearCookie('mfaToken');
    res.setCookie('authToken', authToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      expires: this.environmentService.getCookieExpiresIn(),
      secure: this.environmentService.isHttps(),
    });
    return { success: true };
  }
}

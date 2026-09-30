import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { ApiKeyService } from './api-key.service';
import { IsOptional, IsString, IsUUID } from 'class-validator';

class CreateApiKeyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}

class UpdateApiKeyDto {
  @IsUUID()
  apiKeyId: string;

  @IsString()
  name: string;
}

class RevokeApiKeyDto {
  @IsUUID()
  apiKeyId: string;
}

@UseGuards(JwtAuthGuard)
@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @HttpCode(HttpStatus.OK)
  @Post()
  list(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() pagination: PaginationOptions,
  ) {
    return this.apiKeyService.list(user, workspace, pagination);
  }

  @HttpCode(HttpStatus.OK)
  @Post('create')
  create(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.apiKeyService.create(user, workspace, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('update')
  update(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() dto: UpdateApiKeyDto,
  ) {
    return this.apiKeyService.update(user, workspace, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('revoke')
  revoke(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Body() dto: RevokeApiKeyDto,
  ) {
    return this.apiKeyService.revoke(user, workspace, dto.apiKeyId);
  }
}

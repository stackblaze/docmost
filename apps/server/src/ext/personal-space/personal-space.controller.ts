import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { PersonalSpaceService } from './personal-space.service';

@UseGuards(JwtAuthGuard)
@Controller('personal-space')
export class PersonalSpaceController {
  constructor(private readonly personalSpaceService: PersonalSpaceService) {}

  @HttpCode(HttpStatus.OK)
  @Post()
  get(@AuthUser() user: User, @AuthWorkspace() workspace: Workspace) {
    return this.personalSpaceService.get(user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('create')
  create(@AuthUser() user: User, @AuthWorkspace() workspace: Workspace) {
    return this.personalSpaceService.create(user, workspace);
  }
}

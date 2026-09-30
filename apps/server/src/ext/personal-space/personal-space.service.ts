import { ForbiddenException, Injectable } from '@nestjs/common';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { SpaceRepo } from '@docmost/db/repos/space/space.repo';
import { SpaceService } from '../../core/space/services/space.service';
import slugify from '@sindresorhus/slugify';

@Injectable()
export class PersonalSpaceService {
  constructor(
    private readonly spaceRepo: SpaceRepo,
    private readonly spaceService: SpaceService,
  ) {}

  async get(user: User, workspace: Workspace) {
    return this.spaceRepo.findPersonalSpace(user.id, workspace.id);
  }

  async create(user: User, workspace: Workspace) {
    if (!(workspace.settings as any)?.spaces?.allowPersonal) {
      throw new ForbiddenException('Personal spaces are disabled');
    }
    const existing = await this.get(user, workspace);
    if (existing) {
      return existing;
    }
    const name = `${user.name || 'Personal'} space`;
    const slug = slugify(`${user.name || 'me'}-${user.id.slice(0, 6)}`).slice(0, 40);
    return this.spaceService.createSpace(
      user,
      workspace.id,
      { name, slug, description: 'Personal space' },
      undefined,
      { isPersonal: true },
    );
  }
}

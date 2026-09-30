import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { sql } from 'kysely';

@Injectable()
export class PageSearchService {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async searchPage(
    searchParams: { query?: string; spaceId?: string; limit?: number },
    opts: { userId?: string; workspaceId: string; publicPageIds?: string[] },
  ) {
    const q = (searchParams.query || '').trim();
    if (!q) {
      return [];
    }
    let query = this.db
      .selectFrom('pages')
      .select(['pages.id', 'pages.title', 'pages.spaceId', 'pages.icon', 'pages.slugId'])
      .select(sql<string>`left(pages.text_content, 240)`.as('highlight'))
      .where('pages.workspaceId', '=', opts.workspaceId)
      .where('pages.deletedAt', 'is', null)
      .where((eb) =>
        eb.or([
          eb('pages.title', 'ilike', `%${q}%`),
          eb('pages.textContent', 'ilike', `%${q}%`),
        ]),
      )
      .limit(searchParams.limit || 20);

    if (searchParams.spaceId) {
      query = query.where('pages.spaceId', '=', searchParams.spaceId);
    }
    if (opts.publicPageIds?.length) {
      query = query.where('pages.id', 'in', opts.publicPageIds);
    }
    return query.execute();
  }
}

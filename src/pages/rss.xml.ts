import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { getPostsNewestFirst } from '../lib/posts';

export const GET: APIRoute = async ({ site }) =>
  rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: site!,
    items: (await getPostsNewestFirst()).map(({ id, data }) => ({
      title: data.title,
      description: data.description,
      pubDate: data.pubDate,
      link: `/posts/${id}/`,
    })),
  });

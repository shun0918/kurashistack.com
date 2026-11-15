import { getCollection } from 'astro:content';

export async function getPostsNewestFirst() {
  return (await getCollection('posts')).sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

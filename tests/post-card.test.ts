import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import config from '../astro.config.mjs';
import PostCard from '../src/components/PostCard.astro';

const PR_TAG = />\s*PR\s*</;

async function renderCard(pr: boolean) {
  const container = await AstroContainer.create({ astroConfig: config });
  return container.renderToString(PostCard, {
    props: {
      id: 'standing-desk',
      data: {
        title: 'スタンディングデスクを購入した',
        description: '天板の奥行きで選んだ',
        pubDate: new Date('2026-10-28'),
        pr,
      },
    },
  });
}

test('トップの記事カードで pr が true の時、PR タグが表示されること', async () => {
  expect(await renderCard(true)).toMatch(PR_TAG);
  expect(await renderCard(false)).not.toMatch(PR_TAG);
});

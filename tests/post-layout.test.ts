import type { ImageMetadata } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';
import config from '../astro.config.mjs';
import PostLayout from '../src/layouts/PostLayout.astro';

const PR_NOTICE = 'PR｜この記事には広告（アフィリエイトリンク）が含まれます';
const BODY = '本文の最初の段落';

async function renderPost(props: { pr: boolean; cover?: ImageMetadata; coverAlt?: string }) {
  const container = await AstroContainer.create({ astroConfig: config });
  return container.renderToString(PostLayout, {
    props: {
      title: '4K モニターを購入した',
      description: '机の幅とケーブルの本数で選んだ',
      pubDate: new Date('2026-11-10'),
      ...props,
    },
    slots: { default: `<p>${BODY}</p>` },
  });
}

describe('記事ページの PR 表記', () => {
  test('pr が true の記事の時、本文より前に PR 表記が表示されること', async () => {
    const html = await renderPost({ pr: true });
    expect(html).toContain(PR_NOTICE);
    expect(html.indexOf(PR_NOTICE)).toBeLessThan(html.indexOf(BODY));
  });

  test('pr が false の記事の時、PR 表記が表示されないこと', async () => {
    const html = await renderPost({ pr: false });
    expect(html).toContain(BODY);
    expect(html).not.toContain(PR_NOTICE);
  });
});

describe('記事ページのカバー画像', () => {
  const cover: ImageMetadata = { src: '/_astro/cover.svg', width: 800, height: 600, format: 'svg' };

  test('カバーがある時、coverAlt を alt に持つカバー画像が本文より前に表示されること', async () => {
    const html = await renderPost({ pr: false, cover, coverAlt: '机に置いたモニターの線画' });
    const image = html.search(/<img[^>]*alt="机に置いたモニターの線画"/);
    expect(image).toBeGreaterThan(-1);
    expect(image).toBeLessThan(html.indexOf(BODY));
  });

  test('カバーがない時、カバー画像が表示されないこと', async () => {
    const html = await renderPost({ pr: false });
    expect(html).toContain(BODY);
    expect(html).not.toContain('<img');
  });
});

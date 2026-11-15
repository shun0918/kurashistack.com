import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';
import config from '../astro.config.mjs';
import PostLayout from '../src/layouts/PostLayout.astro';

const PR_NOTICE = 'PR｜この記事には広告（アフィリエイトリンク）が含まれます';
const BODY = '本文の最初の段落';

async function renderPost(pr: boolean) {
  const container = await AstroContainer.create({ astroConfig: config });
  return container.renderToString(PostLayout, {
    props: {
      title: '4K モニターを要件から選ぶ',
      description: '机の幅とケーブルの本数で選んだ記録',
      pubDate: new Date('2026-11-10'),
      pr,
    },
    slots: { default: `<p>${BODY}</p>` },
  });
}

describe('記事ページの PR 表記', () => {
  test('pr が true の記事の時、本文より前に PR 表記が表示されること', async () => {
    const html = await renderPost(true);
    expect(html).toContain(PR_NOTICE);
    expect(html.indexOf(PR_NOTICE)).toBeLessThan(html.indexOf(BODY));
  });

  test('pr が false の記事の時、PR 表記が表示されないこと', async () => {
    const html = await renderPost(false);
    expect(html).toContain(BODY);
    expect(html).not.toContain(PR_NOTICE);
  });
});

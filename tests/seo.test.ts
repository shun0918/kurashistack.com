import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SITE = 'https://kurashistack.com';

const SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><path d="M20 180L280 20" fill="none" stroke="#1F2522" stroke-width="4"/></svg>',
);

type FixturePost = { slug: string; title: string; pubDate: string; cover?: { file: string; bytes: () => Promise<Buffer> } };

const POSTS: FixturePost[] = [
  {
    slug: 'jpeg-cover',
    title: 'JPEG のカバーの記事',
    pubDate: '2026-11-01',
    cover: {
      file: 'cover.jpg',
      bytes: () => sharp({ create: { width: 900, height: 600, channels: 3, background: '#FFFFFF' } }).jpeg().toBuffer(),
    },
  },
  { slug: 'svg-cover', title: 'SVG のカバーの記事', pubDate: '2026-11-05', cover: { file: 'cover.svg', bytes: async () => SVG } },
  { slug: 'no-cover', title: 'カバーのない記事', pubDate: '2026-11-10' },
];

let dir: string | undefined;

async function writePost(root: string, { slug, title, pubDate, cover }: FixturePost) {
  const postDir = join(root, 'src/content/posts', slug);
  mkdirSync(postDir, { recursive: true });
  const frontmatter = [`title: ${title}`, `description: ${title}の説明`, `pubDate: ${pubDate}`];
  if (cover) {
    frontmatter.push(`cover: ./${cover.file}`, 'coverAlt: 線画');
    writeFileSync(join(postDir, cover.file), await cover.bytes());
  }
  writeFileSync(join(postDir, 'index.md'), `---\n${frontmatter.join('\n')}\n---\n\n本文\n`);
}

// 実際の設定とソースを一時ディレクトリに写し、記事だけテスト用に差し替えてビルドする
beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'kurashistack-build-'));
  const posts = join(ROOT, 'src/content/posts');
  for (const file of ['astro.config.mjs', 'package.json', 'tsconfig.json']) cpSync(join(ROOT, file), join(dir, file));
  cpSync(join(ROOT, 'src'), join(dir, 'src'), {
    recursive: true,
    filter: (source) => source !== posts && !source.startsWith(posts + sep),
  });
  // node_modules はパッケージごとにリンクし、キャッシュ（.astro や .vite）を本物の node_modules に書かせない
  mkdirSync(join(dir, 'node_modules'));
  for (const name of readdirSync(join(ROOT, 'node_modules')).filter((name) => !name.startsWith('.'))) {
    symlinkSync(join(ROOT, 'node_modules', name), join(dir, 'node_modules', name));
  }
  for (const post of POSTS) await writePost(dir, post);

  const { PATH, HOME, TMPDIR } = process.env;
  execFileSync(process.execPath, [join(ROOT, 'node_modules/astro/bin/astro.mjs'), 'build', '--root', dir], {
    cwd: dir,
    env: { PATH, HOME, TMPDIR, ASTRO_TELEMETRY_DISABLED: '1' },
    stdio: 'pipe',
  });
}, 120_000);

afterAll(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

const read = (path: string) => readFileSync(join(dir!, 'dist', path), 'utf8');

function tag(html: string, name: string, attribute: string, value: string) {
  return html.match(new RegExp(`<${name}\\b[^>]*\\b${attribute}="${value}"[^>]*>`))?.[0];
}

const meta = (html: string, key: string) => tag(html, 'meta', '(?:property|name)', key)?.match(/content="([^"]*)"/)?.[1];

describe('OGP', () => {
  test('記事ページの時、og:title・og:description・og:url・og:type（article）が出力され、og:url が末尾スラッシュ付きの絶対 URL であること', () => {
    const html = read('posts/no-cover/index.html');
    expect({
      title: meta(html, 'og:title'),
      description: meta(html, 'og:description'),
      url: meta(html, 'og:url'),
      type: meta(html, 'og:type'),
    }).toEqual({
      title: 'カバーのない記事',
      description: 'カバーのない記事の説明',
      url: `${SITE}/posts/no-cover/`,
      type: 'article',
    });
  });

  test('トップページの時、og:type が website で、og:url がサイトの URL であること', () => {
    const html = read('index.html');
    expect({ type: meta(html, 'og:type'), url: meta(html, 'og:url') }).toEqual({ type: 'website', url: `${SITE}/` });
  });

  test.each([
    ['JPEG', 'jpeg-cover'],
    ['SVG', 'svg-cover'],
  ])('カバーが %s の記事の時、og:image が 1200×630 の PNG を指してビルド結果にあり、twitter:card が summary_large_image になること', async (_format, slug) => {
    const html = read(`posts/${slug}/index.html`);
    const image = meta(html, 'og:image') ?? '';
    expect(image.startsWith(`${SITE}/`)).toBe(true);
    const { format, width, height } = await sharp(join(dir!, 'dist', new URL(image).pathname)).metadata();
    expect({ format, width, height }).toEqual({ format: 'png', width: 1200, height: 630 });
    expect(meta(html, 'twitter:card')).toBe('summary_large_image');
  });

  test('カバーがない記事の時、og:image を出さず、twitter:card が summary になること', () => {
    const html = read('posts/no-cover/index.html');
    expect({ image: meta(html, 'og:image'), card: meta(html, 'twitter:card') }).toEqual({ image: undefined, card: 'summary' });
  });
});

test.each([
  ['index.html', `${SITE}/`],
  ['posts/no-cover/index.html', `${SITE}/posts/no-cover/`],
])('どのページでも、canonical が kurashistack.com の末尾スラッシュ付き URL を指していること（%s）', (path, url) => {
  expect(tag(read(path), 'link', 'rel', 'canonical')?.match(/href="([^"]*)"/)?.[1]).toBe(url);
});

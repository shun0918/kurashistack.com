import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { APIRoute, InferGetStaticPropsType } from 'astro';
import { getCollection } from 'astro:content';
import sharp from 'sharp';

// SNS でシェアされた時のカード画像。カバーを切らずに、台紙の色の上に収める
const WIDTH = 1200;
const HEIGHT = 630;
const PADDING = 40;
const MAT = '#D8DCD6';

export async function getStaticPaths() {
  const posts = await getCollection('posts');
  return posts.flatMap(({ id, filePath, rendered }) => {
    // data.cover は表示用に解決済みなので、元ファイルは frontmatter の相対パスと記事ファイル（ルートからの相対パス）から求める
    const { cover } = (rendered?.metadata?.frontmatter ?? {}) as { cover?: string };
    return cover && filePath ? [{ params: { slug: id }, props: { coverPath: resolve(dirname(filePath), cover) } }] : [];
  });
}

export const GET: APIRoute<InferGetStaticPropsType<typeof getStaticPaths>> = async ({ props }) => {
  const source = await readFile(props.coverPath);
  const { width = WIDTH, height = HEIGHT, format } = await sharp(source).metadata();
  const scale = Math.min((WIDTH - PADDING * 2) / width, (HEIGHT - PADDING * 2) / height);
  // SVG は拡大してもぼけないよう、収める大きさで描き直す
  const art = await sharp(source, format === 'svg' ? { density: 72 * scale } : {})
    .resize(Math.round(width * scale), Math.round(height * scale))
    .toBuffer();
  const png = await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background: MAT } })
    .composite([{ input: art }])
    .png()
    .toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};

import { readFile, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
import sharp from 'sharp';
import { inspectImage } from './image-metadata.ts';

export type PhotoResult = { path: string; changed: boolean };

const JPEG_QUALITY = 85;
const MAX_EDGE = 2400;

async function optimizePhoto(path: string): Promise<PhotoResult> {
  const input = await readFile(path);
  const { width = 0, height = 0 } = await sharp(input).metadata();
  // 再エンコードのたびに画質が落ちるので、すでに整っている写真は書き換えない
  if ((await inspectImage(path, input)).length === 0 && Math.max(width, height) <= MAX_EDGE) {
    return { path, changed: false };
  }
  const photo = sharp(input)
    .autoOrient()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .keepIccProfile();
  const image = extname(path).toLowerCase() === '.png' ? photo.png() : photo.jpeg({ quality: JPEG_QUALITY });
  await writeFile(path, await image.toBuffer());
  return { path, changed: true };
}

export async function optimizePhotos(targets: string[], _postsRoot: string): Promise<PhotoResult[]> {
  const results: PhotoResult[] = [];
  for (const path of targets) results.push(await optimizePhoto(path));
  return results;
}

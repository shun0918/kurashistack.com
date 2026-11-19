import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import sharp from 'sharp';
import { inspectImage } from './image-metadata.ts';

export type PhotoResult = { path: string; changed: boolean };

const JPEG_QUALITY = 85;
const MAX_EDGE = 2400;
const PHOTO_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);
const HEIC_EXTENSIONS = new Set(['.heic', '.heif']);

const hasExtension = (path: string, extensions: Set<string>) => extensions.has(extname(path).toLowerCase());

function isInside(root: string, path: string) {
  const rel = relative(root, path);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

async function filesIn(target: string) {
  if (!(await stat(target)).isDirectory()) return [target];
  const entries = await readdir(target, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}

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

export async function optimizePhotos(targets: string[], postsRoot: string): Promise<PhotoResult[]> {
  const root = resolve(postsRoot);
  const paths = targets.map((target) => resolve(target));
  const outside = paths.filter((path) => !isInside(root, path));
  if (outside.length > 0) {
    throw new Error(`記事のフォルダ (${root}) の中の写真だけ整えられる: ${outside.join(', ')}`);
  }

  // 何かを書き換える前に、渡されたものをすべて確かめる
  const files = (await Promise.all(paths.map(filesIn))).flat();
  const heic = files.filter((file) => hasExtension(file, HEIC_EXTENSIONS));
  if (heic.length > 0) {
    throw new Error(
      `HEIC は置けない。JPEG に書き出してから使う (macOS なら sips -s format jpeg <ファイル> --out <ファイル>.jpg): ${heic.join(', ')}`,
    );
  }

  const results: PhotoResult[] = [];
  for (const file of files.filter((file) => hasExtension(file, PHOTO_EXTENSIONS))) {
    results.push(await optimizePhoto(file));
  }
  return results;
}

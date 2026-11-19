import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

export type PhotoResult = { path: string; changed: boolean };

const JPEG_QUALITY = 85;
const MAX_EDGE = 2400;

export async function optimizePhotos(targets: string[], _postsRoot: string): Promise<PhotoResult[]> {
  const results: PhotoResult[] = [];
  for (const path of targets) {
    const image = sharp(await readFile(path))
      .autoOrient()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .keepIccProfile()
      .jpeg({ quality: JPEG_QUALITY });
    await writeFile(path, await image.toBuffer());
    results.push({ path, changed: true });
  }
  return results;
}

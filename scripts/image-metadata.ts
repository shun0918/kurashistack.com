import { extname } from 'node:path';
import sharp from 'sharp';

const INSPECTED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.tif', '.tiff']);
const REJECTED = new Set(['.heic', '.heif']);
const METADATA = { exif: 'EXIF', xmp: 'XMP', iptc: 'IPTC' } as const;

export const isImagePath = (path: string) => {
  const ext = extname(path).toLowerCase();
  return INSPECTED.has(ext) || REJECTED.has(ext);
};

export async function inspectImage(path: string, data: Buffer): Promise<string[]> {
  const ext = extname(path).toLowerCase();
  if (REJECTED.has(ext)) return ['HEIC/HEIF は置けない (JPEG に変換する)'];
  if (!INSPECTED.has(ext)) return [];
  try {
    const meta = await sharp(data).metadata();
    return Object.entries(METADATA)
      .filter(([key]) => meta[key as keyof typeof METADATA])
      .map(([, label]) => label);
  } catch {
    return ['画像として読めない'];
  }
}

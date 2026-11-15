import { extname } from 'node:path';
import sharp from 'sharp';

const RASTER = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.tif', '.tiff']);
const REJECTED = new Set(['.heic', '.heif']);
const METADATA = { exif: 'EXIF', xmp: 'XMP', iptc: 'IPTC' } as const;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_TEXT_CHUNKS = new Set(['tEXt', 'zTXt', 'iTXt']);
const SVG_METADATA: [RegExp, string][] = [
  [/<metadata[\s>]/i, 'SVG の <metadata>'],
  [/<!--/, 'SVG のコメント'],
  [/\b(?:inkscape|sodipodi):/i, 'SVG の編集ソフトの属性'],
];

export const isImagePath = (path: string) => {
  const ext = extname(path).toLowerCase();
  return RASTER.has(ext) || REJECTED.has(ext) || ext === '.svg';
};

function hasPngText(data: Buffer) {
  if (!data.subarray(0, 8).equals(PNG_SIGNATURE)) return false;
  for (let offset = 8; offset + 8 <= data.length; offset += 12 + data.readUInt32BE(offset)) {
    if (PNG_TEXT_CHUNKS.has(data.toString('latin1', offset + 4, offset + 8))) return true;
  }
  return false;
}

export async function inspectImage(path: string, data: Buffer): Promise<string[]> {
  const ext = extname(path).toLowerCase();
  if (REJECTED.has(ext)) return ['HEIC/HEIF は置けない (JPEG に変換する)'];
  if (ext === '.svg') {
    const text = data.toString('utf8');
    return SVG_METADATA.filter(([pattern]) => pattern.test(text)).map(([, label]) => label);
  }
  if (!RASTER.has(ext)) return [];
  try {
    const meta = await sharp(data).metadata();
    const problems = Object.entries(METADATA)
      .filter(([key]) => meta[key as keyof typeof METADATA])
      .map(([, label]) => label);
    return hasPngText(data) ? [...problems, 'PNG のテキスト情報'] : problems;
  } catch {
    return ['画像として読めない'];
  }
}

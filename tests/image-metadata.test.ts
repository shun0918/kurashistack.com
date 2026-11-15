import { crc32 } from 'node:zlib';
import sharp from 'sharp';
import { describe, expect, test } from 'vitest';
import { inspectImage } from '../scripts/image-metadata.ts';

const pixel = () => sharp({ create: { width: 8, height: 8, channels: 3, background: '#888' } });

function withPngText(png: Buffer, keyword: string, text: string) {
  const type = Buffer.from('tEXt', 'latin1');
  const data = Buffer.from(`${keyword}\0${text}`, 'latin1');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([type, data])));
  const iend = png.length - 12;
  return Buffer.concat([png.subarray(0, iend), length, type, data, crc, png.subarray(iend)]);
}

const svg = (extra: string) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">${extra}<path d="M1 1L9 9" fill="none" stroke="#000"/></svg>`,
  );
const XMP =
  '<?xpacket begin=""?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"/></x:xmpmeta><?xpacket end="w"?>';

describe('画像メタデータの検査', () => {
  test('EXIF を含む JPEG の時、違反として報告されること', async () => {
    const jpeg = await pixel()
      .jpeg()
      .withExif({ IFD0: { Make: 'Cam' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '35/1 39/1 0/1' } })
      .toBuffer();
    expect(await inspectImage('photo.jpg', jpeg)).toContain('EXIF');
  });

  test('XMP を含む PNG の時、違反として報告されること', async () => {
    const png = await pixel().png().withXmp(XMP).toBuffer();
    expect(await inspectImage('screenshot.png', png)).toContain('XMP');
  });

  test('メタデータを除去した JPEG の時、違反がないこと', async () => {
    expect(await inspectImage('photo.jpg', await pixel().jpeg().toBuffer())).toEqual([]);
  });

  test('ICC プロファイルだけを含む画像の時、違反がないこと', async () => {
    const jpeg = await pixel().jpeg().withIccProfile('p3').toBuffer();
    expect((await sharp(jpeg).metadata()).icc).toBeDefined();
    expect(await inspectImage('photo.jpg', jpeg)).toEqual([]);
  });

  test('画像として読めないファイルの時、違反として報告されること', async () => {
    expect(await inspectImage('broken.jpg', Buffer.from('not an image'))).not.toEqual([]);
  });

  test('HEIC の時、違反として報告されること', async () => {
    expect(await inspectImage('IMG_0001.HEIC', Buffer.from('anything'))).not.toEqual([]);
  });

  test('画像以外のファイルの時、違反として扱わないこと', async () => {
    expect(await inspectImage('index.md', Buffer.from('Exif GPS'))).toEqual([]);
  });

  test('PNG にテキスト情報（生成 AI のプロンプトなど）が残っている時、違反として報告されること', async () => {
    const png = withPngText(await pixel().png().toBuffer(), 'parameters', 'minimal line drawing of a desk');
    expect(await inspectImage('cover.png', png)).toContain('PNG のテキスト情報');
  });

  test.each([
    ['<metadata>', '<metadata><rdf:RDF/></metadata>', 'SVG の <metadata>'],
    ['コメント', '<!-- Generator: Adobe Illustrator -->', 'SVG のコメント'],
    ['編集ソフトの属性', '<g inkscape:label="layer1"></g>', 'SVG の編集ソフトの属性'],
    ['編集ソフトのファイル名', '<sodipodi:namedview sodipodi:docname="desk.svg"></sodipodi:namedview>', 'SVG の編集ソフトの属性'],
  ])('SVG に %s が残っている時、違反として報告されること', async (_kind, extra, label) => {
    expect(await inspectImage('cover.svg', svg(extra))).toContain(label);
  });

  test('図形だけの SVG の時、違反がないこと', async () => {
    expect(await inspectImage('cover.svg', svg(''))).toEqual([]);
  });
});

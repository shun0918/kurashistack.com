import sharp from 'sharp';
import { describe, expect, test } from 'vitest';
import { inspectImage } from '../scripts/image-metadata.ts';

const pixel = () => sharp({ create: { width: 8, height: 8, channels: 3, background: '#888' } });
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
});

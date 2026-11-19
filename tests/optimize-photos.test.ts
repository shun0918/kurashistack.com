import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, test } from 'vitest';
import { inspectImage } from '../scripts/image-metadata.ts';
import { optimizePhotos } from '../scripts/optimize-photos.ts';

const created: string[] = [];
afterEach(() => {
  for (const dir of created.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// 記事のフォルダ (src/content/posts) に見立てた一時フォルダ
function postsRoot() {
  const root = mkdtempSync(join(tmpdir(), 'photo-'));
  created.push(root);
  return root;
}

const solid = (width: number, height: number, background = '#888') =>
  sharp({ create: { width, height, channels: 3, background } });

const WITH_GPS = { IFD0: { Make: 'Cam' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '35/1 39/1 0/1' } };

async function pixelAt(file: string, x: number, y: number) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * info.channels;
  return { r: data[i] ?? 0, b: data[i + 2] ?? 0 };
}

describe('写真を整える', () => {
  test('位置情報入りの JPEG を渡した時、書き出した JPEG がメタデータのチェックを通ること', async () => {
    const root = postsRoot();
    const file = join(root, 'photo.jpg');
    writeFileSync(file, await solid(64, 48).jpeg().withExif(WITH_GPS).toBuffer());
    expect(await inspectImage(file, readFileSync(file))).toContain('EXIF');

    await optimizePhotos([file], root);

    expect(await inspectImage(file, readFileSync(file))).toEqual([]);
  });

  test('向きを EXIF で持つ縦写真を渡した時、画素が縦向きに直って書き出されること', async () => {
    const root = postsRoot();
    const file = join(root, 'portrait.jpg');
    // 左が赤、右が青の横長 (200×100)。向き 6 は「90 度回して表示する」縦写真
    const red = await solid(100, 100, '#f00').png().toBuffer();
    const blue = await solid(100, 100, '#00f').png().toBuffer();
    writeFileSync(
      file,
      await solid(200, 100)
        .composite([
          { input: red, left: 0, top: 0 },
          { input: blue, left: 100, top: 0 },
        ])
        .jpeg({ quality: 100 })
        .withMetadata({ orientation: 6 })
        .toBuffer(),
    );
    expect((await sharp(file).metadata()).orientation).toBe(6);

    await optimizePhotos([file], root);

    const meta = await sharp(file).metadata();
    expect([meta.width, meta.height]).toEqual([100, 200]);
    expect(meta.orientation).toBeUndefined();
    const top = await pixelAt(file, 50, 20);
    const bottom = await pixelAt(file, 50, 180);
    expect(top.r).toBeGreaterThan(200);
    expect(top.b).toBeLessThan(60);
    expect(bottom.b).toBeGreaterThan(200);
    expect(bottom.r).toBeLessThan(60);
  });

  test('ICC プロファイル付きの JPEG を渡した時、同じプロファイルが残ること', async () => {
    const root = postsRoot();
    const file = join(root, 'p3.jpg');
    writeFileSync(file, await solid(64, 48).jpeg().withIccProfile('p3').withExif(WITH_GPS).toBuffer());
    const before = (await sharp(file).metadata()).icc;
    expect(before).toBeDefined();

    await optimizePhotos([file], root);

    expect(await inspectImage(file, readFileSync(file))).toEqual([]);
    expect((await sharp(file).metadata()).icc).toEqual(before);
  });

  test.each([
    ['横長', 4000, 3000, 2400, 1800],
    ['縦長', 3000, 4000, 1800, 2400],
  ])(
    '長辺が 2400px を超える%sの写真を渡した時、縦横比を保ったまま長辺が 2400px に縮むこと',
    async (_kind, width, height, expectedWidth, expectedHeight) => {
      const root = postsRoot();
      const file = join(root, 'big.jpg');
      writeFileSync(file, await solid(width, height).jpeg().toBuffer());

      await optimizePhotos([file], root);

      const meta = await sharp(file).metadata();
      expect([meta.width, meta.height]).toEqual([expectedWidth, expectedHeight]);
    },
  );

  test.each([
    [1200, 800],
    [2400, 1600],
  ])('長辺が 2400px 以下 (%i×%i) の写真を渡した時、大きさが変わらないこと', async (width, height) => {
    const root = postsRoot();
    const file = join(root, 'small.jpg');
    // メタデータ付きにして、整える対象に入れる
    writeFileSync(file, await solid(width, height).jpeg().withExif(WITH_GPS).toBuffer());

    await optimizePhotos([file], root);

    expect(await inspectImage(file, readFileSync(file))).toEqual([]);
    const meta = await sharp(file).metadata();
    expect([meta.width, meta.height]).toEqual([width, height]);
  });
});

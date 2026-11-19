import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { afterEach, describe, expect, test } from 'vitest';
import { inspectImage } from '../scripts/image-metadata.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const POSTS = join(ROOT, 'src', 'content', 'posts');

const created: string[] = [];
afterEach(() => {
  for (const dir of created.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// _ で始まる下書きのフォルダ。git には入らない
function draftFolder() {
  // 公開済みの記事がまだない clone (CI を含む) には、記事のフォルダがない
  mkdirSync(POSTS, { recursive: true });
  const dir = mkdtempSync(join(POSTS, '_photo-test-'));
  created.push(dir);
  return dir;
}

const jpeg = () => sharp({ create: { width: 64, height: 48, channels: 3, background: '#888' } }).jpeg();
const exifJpeg = () => jpeg().withExif({ IFD0: { Make: 'Cam' } }).toBuffer();

const photo = (...args: string[]) =>
  spawnSync('npm', ['run', '--silent', 'photo', '--', ...args], { cwd: ROOT, encoding: 'utf8' });

describe('npm run photo', () => {
  test('記事のフォルダの写真を渡した時、整えたと伝えて終了コード 0 で終わること', async () => {
    const file = join(draftFolder(), 'photo.jpg');
    writeFileSync(file, await exifJpeg());

    const run = photo(relative(ROOT, file));

    expect(run.status).toBe(0);
    expect(run.stdout).toContain(`整えた: ${relative(ROOT, file)}`);
    expect(await inspectImage(file, readFileSync(file))).toEqual([]);
  });

  test('すでに整っている写真を渡した時、変更なしと伝えて終了コード 0 で終わること', async () => {
    const file = join(draftFolder(), 'photo.jpg');
    writeFileSync(file, await jpeg().toBuffer());

    const run = photo(relative(ROOT, file));

    expect(run.status).toBe(0);
    expect(run.stdout).toContain(`変更なし: ${relative(ROOT, file)}`);
  });

  test('JPEG・PNG のないフォルダを渡した時、見つからなかったと伝えて終了コード 0 で終わること', () => {
    const dir = draftFolder();
    writeFileSync(join(dir, 'index.md'), '# 下書き\n');

    const run = photo(relative(ROOT, dir));

    expect(run.status).toBe(0);
    expect(run.stdout).toContain('見つからなかった');
  });

  test('ファイルもフォルダも渡さなかった時、使い方を伝えて終了コード 1 で終わること', () => {
    const run = photo();

    expect(run.status).toBe(1);
    expect(run.stderr).toContain('使い方: npm run photo');
  });

  test('記事のフォルダの外のファイルを渡した時、終了コード 1 で終わり、ファイルを変えないこと', async () => {
    const outside = mkdtempSync(join(tmpdir(), 'photo-outside-'));
    created.push(outside);
    const file = join(outside, 'photo.jpg');
    writeFileSync(file, await exifJpeg());
    const before = readFileSync(file);

    const run = photo(file);

    expect(run.status).toBe(1);
    expect(run.stderr).toContain('記事のフォルダ');
    expect(readFileSync(file).equals(before)).toBe(true);
  });
});

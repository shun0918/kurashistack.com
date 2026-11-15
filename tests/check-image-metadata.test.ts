import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, test } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const HOOKS = join(ROOT, '.githooks');
const CHECK = join(ROOT, 'scripts', 'check-image-metadata.ts');

const pixel = () => sharp({ create: { width: 8, height: 8, channels: 3, background: '#888' } });
const exifJpeg = () => pixel().jpeg().withExif({ IFD0: { Make: 'Cam' } }).toBuffer();
const cleanJpeg = () => pixel().jpeg().toBuffer();

function repoWith(files: Record<string, Buffer>) {
  const dir = mkdtempSync(join(tmpdir(), 'image-guard-'));
  const git = (...args: string[]) => spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
  git('init', '-q');
  git('config', 'user.name', 'test');
  git('config', 'user.email', 'test@example.com');
  git('config', 'commit.gpgsign', 'false');
  for (const [name, data] of Object.entries(files)) writeFileSync(join(dir, name), data);
  git('add', '.');
  return { dir, git };
}

const commitWithHook = (git: ReturnType<typeof repoWith>['git']) =>
  git('-c', `core.hooksPath=${HOOKS}`, 'commit', '-q', '-m', 'add photo');

describe('pre-commit フック', () => {
  test('メタデータ付きの画像をステージした時、コミットが止まること', async () => {
    const { git } = repoWith({ 'photo.jpg': await exifJpeg() });
    const commit = commitWithHook(git);
    expect(commit.status).not.toBe(0);
    expect(commit.stderr).toContain('photo.jpg');
    expect(git('rev-parse', '--verify', '-q', 'HEAD').status).not.toBe(0);
  });

  test('メタデータのない画像をステージした時、コミットできること', async () => {
    const { git } = repoWith({ 'photo.jpg': await cleanJpeg() });
    expect(commitWithHook(git).status).toBe(0);
  });
});

describe('CI のチェック', () => {
  test('Git 管理下の画像にメタデータが残っている時、終了コード 1 でファイル名を出すこと', async () => {
    const { dir, git } = repoWith({ 'photo.jpg': await exifJpeg(), 'README.md': Buffer.from('# test') });
    git('commit', '-q', '--no-verify', '-m', 'add');
    const run = spawnSync(process.execPath, [CHECK], { cwd: dir, encoding: 'utf8' });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('photo.jpg');
  });

  test('Git 管理下の画像にメタデータがない時、終了コード 0 で終わること', async () => {
    const { dir, git } = repoWith({ 'photo.jpg': await cleanJpeg() });
    git('commit', '-q', '--no-verify', '-m', 'add');
    expect(spawnSync(process.execPath, [CHECK], { cwd: dir, encoding: 'utf8' }).status).toBe(0);
  });
});

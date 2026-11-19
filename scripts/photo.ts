import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { optimizePhotos } from './optimize-photos.ts';

const postsRoot = fileURLToPath(new URL('../src/content/posts', import.meta.url));
const targets = process.argv.slice(2);

if (targets.length === 0) {
  console.error('使い方: pnpm photo <ファイルかフォルダ>');
  process.exit(1);
}

try {
  const results = await optimizePhotos(targets, postsRoot);
  for (const { path, changed } of results) {
    console.log(`${changed ? '整えた' : '変更なし'}: ${relative(process.cwd(), path)}`);
  }
  if (results.length === 0) console.log('JPEG・PNG の写真が見つからなかった');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

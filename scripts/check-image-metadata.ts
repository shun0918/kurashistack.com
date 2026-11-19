import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { inspectImage, isImagePath } from './image-metadata.ts';

const staged = process.argv.includes('--staged');
const git = (...args: string[]) => execFileSync('git', args, { maxBuffer: 1024 ** 3 });

const listed = staged
  ? git('diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z')
  : git('ls-files', '-z');
const paths = listed
  .toString()
  .split('\0')
  .filter((path) => path && isImagePath(path));

const failures: string[] = [];
for (const path of paths) {
  const data = staged ? git('show', `:${path}`) : readFileSync(path);
  const problems = await inspectImage(path, data);
  if (problems.length > 0) failures.push(`  ${path}: ${problems.join(', ')}`);
}

if (failures.length > 0) {
  console.error(
    '画像にメタデータが残っている。記事のフォルダの JPEG・PNG は npm run photo -- <ファイルかフォルダ> で整える。それ以外の画像は exiftool -all= <ファイル>、SVG は該当する要素と属性を消す。直したら、もう一度コミットする。',
  );
  console.error(failures.join('\n'));
  process.exit(1);
}

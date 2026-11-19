# kurashistack.com

「暮らしの技術選定」のソースコード。ソフトウェアエンジニアのモノの選定と意思決定のログ。

- Astro (静的出力) + Cloudflare Workers Static Assets
- 記事は `src/content/posts/<slug>/index.md`

## コマンド

| コマンド | 内容 |
| --- | --- |
| `pnpm dev` | 開発サーバー |
| `pnpm build` | `dist/` にビルド |
| `pnpm check` | 型チェック |
| `pnpm test` | テスト |
| `pnpm photo <ファイルかフォルダ>` | 記事の写真の向きを直し、メタデータを消し、長辺 2400px に収める |
| `pnpm preview` | `dist/` を wrangler でローカル配信 |

## ライセンス

コードは MIT、記事と画像は All rights reserved。詳細は `LICENSE`。

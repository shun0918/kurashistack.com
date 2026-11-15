# kurashistack.com

「暮らしの技術選定」のソースコード。ソフトウェアエンジニアが、要件と比較表で暮らしの道具を選ぶブログ。

- Astro (静的出力) + Cloudflare Workers Static Assets
- 記事は `src/content/posts/<slug>/index.md`

## コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run build` | `dist/` にビルド |
| `npm run check` | 型チェック |
| `npm test` | テスト |
| `npm run preview` | `dist/` を wrangler でローカル配信 |

## ライセンス

コードは MIT、記事と画像は All rights reserved。詳細は `LICENSE`。

# CLAUDE.md

「暮らしの技術選定」（https://kurashistack.com）。ソフトウェアエンジニアのモノ（ガジェット・家電・生活ツール）の選定と意思決定のログ。
Astro（静的出力）+ Cloudflare Workers Static Assets。広告・アフィリエイトで多少の収益化を狙う。

## このリポジトリは public

以下は必ず守る。違反しそうな変更を頼まれたら、実装する前に指摘する。

- **画像の EXIF（特に GPS）を残さない**。自宅で撮った写真が多く、位置情報から住所が特定できるため。リポジトリにコミットする画像は事前にメタデータを除去する（記事の写真は `npm run photo -- <ファイルかフォルダ>`、それ以外は `exiftool -all=` 等。コミット前のフックと CI が、メタデータの残った画像を止める）。git 履歴に一度入ると消すのが困難なので、コミット前に止めることを最優先にする
- **下書きはコミットしない**。書きかけの記事は `src/content/posts/_<slug>/` に置き（`_` で始まるフォルダは .gitignore 済み）、手元の開発サーバーで読む。公開する時にフォルダ名の `_` を外してコミットする。push した時点で公開される（PR ブランチも公開）
- シークレット（Cloudflare API トークン等）はコミットしない。AdSense のパブリッシャー ID やアフィリエイトタグは配信 HTML に載るものなので公開して問題ない
- ライセンスはコードと記事で分ける（`LICENSE` 参照）。コードは MIT、`src/content/` と画像は All rights reserved

## 決定済みの方針（理由つき。変える場合は相談）

- ホスティングは Cloudflare Workers Static Assets。Pages ではない（Cloudflare の新規推奨が Workers）。Vercel は Hobby プランが広告・アフィリエイト不可のため不採用
- Worker スクリプトは持たない。SSR / アダプターは入れない
- 独自ドメインはダッシュボードで Worker（`kurashistack-com`）に割り当てる。本番は kurashistack.com、PR のプレビューは preview.kurashistack.com の下。`wrangler.jsonc` の `routes` には書かない（二重管理を避けるため）。workers.dev は本番もプレビューも無効（同じサイトを別のホストで出さないため）
- 記事は `.md` のみ（MDX なし）。素の Markdown で足りるうちは増やさない。リッチなアフィリエイト部品が必要になったら MDX 追加を検討
- URL は末尾スラッシュあり（`trailingSlash: 'always'`）。公開後は変えない
- 画像は記事と同じフォルダに置く（`posts/<slug>/index.md` + `cover.jpg`）
- `pr: true` の記事には PR 表記を自動表示（ステマ規制対応）。アフィリエイトリンクを含む記事は必ず `pr: true`

## コマンド

- `npm run dev` / `npm run build` / `npm run check` / `npm run preview`（wrangler でローカル配信）
- `npm run photo -- <ファイルかフォルダ>`（記事のフォルダの JPEG・PNG の向きを直し、メタデータを消し、長辺 2400px に収める。HEIC は先に JPEG へ書き出す）
- 変更後は `npm run check` と `npm run build` が通ることを確認する

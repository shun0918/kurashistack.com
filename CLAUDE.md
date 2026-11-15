# CLAUDE.md

「暮らしの技術選定」（https://kurashistack.com）。ソフトウェアエンジニアのモノ（ガジェット・家電・生活ツール）の選定と意思決定のログ。
Astro（静的出力）+ Cloudflare Workers Static Assets。広告・アフィリエイトで多少の収益化を狙う。

## このリポジトリは public

以下は必ず守る。違反しそうな変更を頼まれたら、実装する前に指摘する。

- **画像の EXIF（特に GPS）を残さない**。自宅で撮った写真が多く、位置情報から住所が特定できるため。リポジトリにコミットする画像は事前にメタデータを除去する（`exiftool -all=` 等で除去し、CI でも EXIF が残った画像があれば失敗させる）。git 履歴に一度入ると消すのが困難なので、コミット前に止めることを最優先にする
- **下書きをこのリポジトリに入れない**。ここに来るのは公開してよいものだけ。PR ブランチも公開される点に注意
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
- 変更後は `npm run check` と `npm run build` が通ることを確認する

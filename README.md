# ミームUIデモ

## セットアップ

```bash
npm install
```

## 開発サーバー起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開くと、デモが動きます。

## GitHub Pages で公開する

このリポジトリは Next.js の静的エクスポートに対応しているため、GitHub Pages で公開できます。

1. GitHub の Settings → Pages で "Source" を GitHub Actions に設定します。
2. `main` ブランチに push すると、`Deploy to GitHub Pages` ワークフローが実行されます。

公開 URL は `https://<ユーザー名>.github.io/<リポジトリ名>/` になります。

### トラブルシューティング

- `actions/deploy-pages@v4` の実行時に `Failed to create deployment (status: 404)` が出る場合は、GitHub Pages が未有効化です。Settings → Pages で "Source" を GitHub Actions に設定してください。

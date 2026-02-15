# Image Annotation Tool

Next.js 16 + React 19 + react-konva で構築した ML 訓練データ作成用画像アノテーションツール。
ローカルディレクトリの画像に対して BBox / Polygon / Point のアノテーションを行い、COCO JSON / YOLO TXT でエクスポートする。

## 必要環境

- Node.js >= 20
- pnpm >= 9


### プロジェクト設定

`annotation-config.json` でラベルと画像ディレクトリを設定する:

```json
{
  "imageDir": "./data/images",
  "outputDir": "./data/annotations",
  "labels": ["car", "person", "dog", "cat", "bicycle"]
}
```

## 起動

```bash
# 開発サーバー
pnpm dev
```

http://localhost:3000 でアクセス。

## その他のコマンド

```bash
pnpm build     # プロダクションビルド
pnpm start     # ビルド後のサーバー起動
pnpm lint      # Biome リントチェック
pnpm format    # Biome フォーマット
pnpm check     # Biome リント + フォーマット (自動修正)
```

## 操作方法

### ツール

| キー | ツール | 操作 |
|------|--------|------|
| V | Select | クリックで選択、ドラッグで移動・リサイズ |
| B | BBox | ドラッグで矩形描画 |
| P | Polygon | クリックで頂点追加、ダブルクリックで確定 |
| . | Point | クリックで配置 |

### その他のショートカット

| キー | アクション |
|------|-----------|
| Delete / Backspace | 選択中のアノテーション削除 |
| ← | 前の画像 |
| → | 次の画像 |
| マウスホイール | ズーム (0.1x - 10x) |

### エクスポート

ヘッダーの「Export COCO」/「Export YOLO」ボタンからダウンロード。

## Tech Stack

| 技術 | 用途 |
|------|------|
| Next.js 16 (App Router) | フレームワーク |
| React 19 | UI |
| Konva + react-konva | Canvas 描画 |
| Zustand | 状態管理 |
| Zod | スキーマ検証 |
| Tailwind CSS 4 + shadcn/ui | スタイリング |
| Biome | リント + フォーマット |

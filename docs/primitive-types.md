# Primitive Type の設計アプローチ比較

本プロジェクトでは `number` や `string` をそのまま使っている箇所が多い。
より型安全にするためのアプローチを3つ比較する。

## 現状の課題

```typescript
// schemas.ts の現状: すべて素の number / string
x: z.number().min(0).max(1),
y: z.number().min(0).max(1),
id: z.string().uuid(),
label: z.string().min(1),
```

推論される型はすべて `number` / `string` になるため、以下のミスをコンパイラが検出できない:

```typescript
// ピクセル座標と正規化座標を取り違えても型エラーにならない
const bbox: BBoxAnnotation = {
  x: 150,     // 本来 0-1 の正規化座標であるべきだが number なので通る
  y: 200,
  width: 300,
  height: 400,
  // ...
};

// UUID でない文字列を渡しても型エラーにならない
const ann: BBoxAnnotation = {
  id: "not-a-uuid",  // string なので通る
  // ...
};
```

---

## アプローチ 1: Branded Types

TypeScript の intersection 型を利用して、同じ primitive に「ブランド」を付ける。

### 実装

```typescript
// lib/branded.ts
declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type NormalizedCoord = Brand<number, "NormalizedCoord">;  // 0-1
export type PixelCoord = Brand<number, "PixelCoord">;
export type UUID = Brand<string, "UUID">;
export type Label = Brand<string, "Label">;

// コンストラクタ関数
export function normalizedCoord(value: number): NormalizedCoord {
  if (value < 0 || value > 1) throw new RangeError(`Expected 0-1, got ${value}`);
  return value as NormalizedCoord;
}

export function uuid(value: string): UUID {
  // UUID 形式チェック
  return value as UUID;
}
```

```typescript
// 使用例: 型が異なるので取り違えない
interface BBoxAnnotation {
  id: UUID;
  x: NormalizedCoord;
  y: NormalizedCoord;
  width: NormalizedCoord;
  height: NormalizedCoord;
}

function drawRect(x: PixelCoord, y: PixelCoord) { /* ... */ }

const bbox: BBoxAnnotation = { x: normalizedCoord(0.5), /* ... */ };
drawRect(bbox.x, bbox.y);
//       ^^^^^^ 型エラー: NormalizedCoord は PixelCoord に代入できない
```

### 利点

| 項目 | 評価 |
|------|------|
| 型安全性 | 高い。正規化座標とピクセル座標の混同をコンパイル時に検出 |
| ランタイムコスト | なし。ブランドは型レベルのみで JS に出力されない |
| Zod 統合 | `.transform()` でブランド型への変換が可能 |
| DX | 値を作るたびにコンストラクタ関数を呼ぶ必要がある |
| JSON シリアライズ | 透過的。ブランドは JSON に影響しない |

### 欠点

- 全座標値で `normalizedCoord()` を呼ぶボイラープレートが増える
- react-konva は素の `number` を受け取るため、Canvas 層との境界で変換が必要
- チーム全員がブランド型の仕組みを理解する必要がある

### Zod との統合例

```typescript
const normalizedCoordSchema = z.number().min(0).max(1).transform((v) => v as NormalizedCoord);
const uuidSchema = z.string().uuid().transform((v) => v as UUID);

export const bboxAnnotationSchema = z.object({
  id: uuidSchema,
  type: z.literal("bbox"),
  label: z.string().min(1).transform((v) => v as Label),
  x: normalizedCoordSchema,
  y: normalizedCoordSchema,
  width: normalizedCoordSchema,
  height: normalizedCoordSchema,
});
// z.infer<typeof bboxAnnotationSchema> の x は NormalizedCoord 型になる
```

---

## アプローチ 2: Template Literal Types

TypeScript のテンプレートリテラル型で文字列の形式をコンパイル時に制約する。

### 実装

```typescript
// lib/template-types.ts

// UUID の形式を型レベルで制約
type HexChar = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "a" | "b" | "c" | "d" | "e" | "f";
type UUID = `${string}-${string}-${string}-${string}-${string}`;
// 注: 完全な UUID バリデーションは型レベルでは現実的でないため、簡略化

// ファイル名を拡張子で制約
type ImageExtension = ".jpg" | ".jpeg" | ".png" | ".webp" | ".bmp";
type ImageFilename = `${string}${ImageExtension}`;

// ラベルを literal union で制約
type Label = "car" | "person" | "dog" | "cat" | "bicycle";
// ただし設定ファイルから動的に読むため、実際には使いにくい
```

```typescript
// 使用例
function loadImage(filename: ImageFilename) { /* ... */ }

loadImage("photo.jpg");      // OK
loadImage("photo.txt");      // 型エラー
loadImage("photo.JPG");      // 型エラー (大文字)
```

### 利点

| 項目 | 評価 |
|------|------|
| 型安全性 | 文字列フォーマットの検証に強い |
| ランタイムコスト | なし。型レベルのみ |
| DX | リテラル値ならコード補完が効く |
| パターン表現力 | ファイル名、パスなどの文字列パターンに有効 |

### 欠点

- `number` には使えない（正規化座標には適用不可）
- 動的な値（ユーザー入力、API レスポンス）には `as` キャストが必要
- 複雑なパターン（完全な UUID）は型レベルで表現困難
- ラベルが設定ファイルから動的に読み込まれる本プロジェクトでは、リテラル union が使えない

### 本プロジェクトでの適用範囲

Template Literal Types が有効なのは限定的:

```typescript
// 有効: ファイル名の拡張子チェック
type ImageFilename = `${string}${".jpg" | ".jpeg" | ".png" | ".webp" | ".bmp"}`;

// 有効: アノテーションの type フィールド (既に literal union で実現済み)
type AnnotationType = "bbox" | "polygon" | "point";

// 無効: 座標値 (number なので対象外)
// 無効: ラベル (動的に読み込むので固定リテラルにできない)
```

---

## アプローチ 3: Zod の共通プリミティブスキーマ切り出し

Zod スキーマ側で意味のある名前の再利用可能プリミティブを定義する。

### 実装

```typescript
// lib/schemas.ts

// --- Primitive Schemas ---
const normalizedCoord = z.number().min(0).max(1)
  .describe("画像サイズに対する正規化座標 (0-1)");

const pixelDimension = z.number().int().nonnegative()
  .describe("ピクセル単位の画像サイズ");

const annotationId = z.string().uuid()
  .describe("アノテーションの一意識別子");

const labelName = z.string().min(1)
  .describe("アノテーションラベル名");

// --- Annotation Schemas ---
export const bboxAnnotationSchema = z.object({
  id: annotationId,
  type: z.literal("bbox"),
  label: labelName,
  x: normalizedCoord,
  y: normalizedCoord,
  width: normalizedCoord,
  height: normalizedCoord,
});

export const imageAnnotationSchema = z.object({
  imageFile: z.string().min(1),
  width: pixelDimension,
  height: pixelDimension,
  annotations: z.array(annotationSchema),
});
```

### 利点

| 項目 | 評価 |
|------|------|
| 型安全性 | ランタイムバリデーションで守られる (コンパイル時は `number`) |
| ランタイムコスト | `safeParse` 時のみ。API 境界でのみ実行 |
| DX | 最もシンプル。既存コードからの変更が少ない |
| Zod エコシステム | `.describe()` で OpenAPI ドキュメント生成に対応 |
| 導入コスト | 低い。現状のスキーマを変数に切り出すだけ |
| 保守性 | バリデーションルール変更が1箇所で完結 |

### 欠点

- TypeScript の型レベルでは `number` のまま。コンパイル時に正規化座標とピクセル座標の混同は検出できない
- IDE のホバーで `number` としか表示されない（`.describe()` は見えない）

---

## 比較まとめ

| 観点 | Branded Types | Template Literal | Zod 切り出し |
|------|:---:|:---:|:---:|
| コンパイル時の型安全性 | ◎ | △ (文字列のみ) | × |
| ランタイムバリデーション | ○ (Zod 連携) | × | ◎ |
| number への適用 | ◎ | × | ◎ (ランタイム) |
| string への適用 | ◎ | ◎ | ◎ (ランタイム) |
| ボイラープレート | 多い | 中程度 | 少ない |
| 導入コスト | 高い | 中 | 低い |
| 既存コードへの影響 | 大 (全座標値の書き換え) | 小 | 小 |
| react-konva との相性 | △ (境界で変換必要) | - | ◎ |
| OpenAPI ドキュメント生成 | × | × | ◎ (.describe) |

## 推奨

**段階的に導入する組み合わせ:**

1. **まず**: Zod 切り出し (アプローチ 3) — 既に着手済み。導入コスト最低
2. **次に**: Branded Types (アプローチ 1) を座標系のみに導入 — `NormalizedCoord` と `PixelCoord` の混同防止
3. **必要なら**: Template Literal Types をファイル名に適用 — `ImageFilename` 型

最もインパクトが大きいのは `NormalizedCoord` / `PixelCoord` の Branded Type。
Canvas 描画で正規化座標をピクセル座標に変換する箇所が多く、取り違えバグのリスクが高い。

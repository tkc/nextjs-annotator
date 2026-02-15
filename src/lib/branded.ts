/**
 * Branded Types — 構造的に同じ primitive を名前で区別する
 *
 * NormalizedCoord (0-1) と PixelCoord (ピクセル値) の取り違えを
 * コンパイル時に検出する。
 *
 * ブランドは型レベルのみで、ランタイムの JS には影響しない。
 */

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

// --- 座標系 ---

/** 画像サイズに対する正規化座標 (0-1) */
export type NormalizedCoord = Brand<number, "NormalizedCoord">;

/** ピクセル単位の座標値 */
export type PixelCoord = Brand<number, "PixelCoord">;

/** ピクセル単位の画像サイズ */
export type PixelDimension = Brand<number, "PixelDimension">;

// --- 識別子 ---

/** UUID 形式の一意識別子 */
export type UUID = Brand<string, "UUID">;

// --- コンストラクタ ---

export function normalizedCoord(value: number): NormalizedCoord {
  return value as NormalizedCoord;
}

export function pixelCoord(value: number): PixelCoord {
  return value as PixelCoord;
}

export function pixelDimension(value: number): PixelDimension {
  return value as PixelDimension;
}

export function uuid(value: string): UUID {
  return value as UUID;
}

// --- 変換ユーティリティ ---

/** 正規化座標 → ピクセル座標 */
export function toPixel(normalized: NormalizedCoord, dimension: number): number {
  return (normalized as number) * dimension;
}

/** ピクセル座標 → 正規化座標 */
export function toNormalized(pixel: number, dimension: number): NormalizedCoord {
  return (pixel / dimension) as NormalizedCoord;
}

/**
 * SAM ViT-B Encoder — server-side inference via onnxruntime-node
 *
 * Preprocessing:
 *   1. Resize longest side to 1024, pad to 1024x1024
 *   2. Normalize with ImageNet mean/std
 *   3. CHW → [1, 3, 1024, 1024] Float32 tensor
 *
 * Output: Float32Array of shape [1, 256, 64, 64]
 */

import path from "node:path";

const LONG_SIDE = 1024;
const IMAGENET_MEAN = [0.485, 0.456, 0.406] as const;
const IMAGENET_STD = [0.229, 0.224, 0.225] as const;
const MODEL_PATH = path.join(process.cwd(), "models", "sam_vit_b_encoder_quantized.onnx");

// Lazy-loaded singleton
let sessionPromise: Promise<import("onnxruntime-node").InferenceSession> | null = null;

async function getSession() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort = await import("onnxruntime-node");
      return ort.InferenceSession.create(MODEL_PATH, {
        executionProviders: ["cpu"],
      });
    })();
  }
  return sessionPromise;
}

/**
 * Run the SAM encoder on a raw image buffer (JPEG/PNG/etc).
 * Returns the embedding as Float32Array [1, 256, 64, 64].
 */
export async function encodeImage(imageBuffer: Buffer): Promise<Float32Array> {
  const sharp = (await import("sharp")).default;
  const ort = await import("onnxruntime-node");

  // Get original dimensions
  const metadata = await sharp(imageBuffer).metadata();
  const origW = metadata.width ?? 0;
  const origH = metadata.height ?? 0;
  if (origW === 0 || origH === 0) throw new Error("Could not read image dimensions");

  // Compute resize: longest side → 1024
  const scale = LONG_SIDE / Math.max(origW, origH);
  const newW = Math.round(origW * scale);
  const newH = Math.round(origH * scale);

  // Resize + get raw RGB pixels
  const resizedPixels = await sharp(imageBuffer).resize(newW, newH, { fit: "fill" }).removeAlpha().raw().toBuffer();

  // Build [1024, 1024, 3] HWC tensor with zero-padding
  const tensorData = new Float32Array(LONG_SIDE * LONG_SIDE * 3);

  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      const srcIdx = (y * newW + x) * 3;
      const dstIdx = (y * LONG_SIDE + x) * 3;
      for (let c = 0; c < 3; c++) {
        const pixel = resizedPixels[srcIdx + c] / 255.0;
        const normalized = (pixel - IMAGENET_MEAN[c]) / IMAGENET_STD[c];
        tensorData[dstIdx + c] = normalized;
      }
    }
  }

  const inputTensor = new ort.Tensor("float32", tensorData, [LONG_SIDE, LONG_SIDE, 3]);

  const session = await getSession();
  const results = await session.run({ input_image: inputTensor });

  // Output key is "image_embeddings" — shape [1, 256, 64, 64]
  const embeddingKey = Object.keys(results)[0];
  return results[embeddingKey].data as Float32Array;
}

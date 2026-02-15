/**
 * SAM Decoder — browser-side ONNX Runtime Web wrapper
 *
 * Uses dynamic import to avoid SSR issues with onnxruntime-web.
 */

// --- Types ---

export interface SamClick {
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  clickType: 0 | 1; // 0 = background, 1 = foreground
}

export interface SamResult {
  mask: Float32Array; // logits (w * h)
  width: number;
  height: number;
  iouScore: number;
}

// --- Constants ---

const LONG_SIDE = 1024;
const MODEL_PATH = "/models/sam_vit_b_decoder_quantized.onnx";

// --- Lazy-loaded ORT + session ---

type OrtModule = typeof import("onnxruntime-web");
let ortModule: OrtModule | null = null;
// biome-ignore lint/suspicious/noExplicitAny: InferenceSession type from dynamic import
let session: any = null;

async function getOrt(): Promise<OrtModule> {
  if (ortModule) return ortModule;
  ortModule = await import("onnxruntime-web");
  ortModule.env.wasm.wasmPaths = "/";
  ortModule.env.wasm.numThreads = 1;
  return ortModule;
}

export async function loadDecoder(): Promise<void> {
  if (session) return;

  const ort = await getOrt();
  session = await ort.InferenceSession.create(MODEL_PATH, {
    executionProviders: ["wasm"],
  });
}

export function isDecoderLoaded(): boolean {
  return session !== null;
}

export async function runDecoder(
  embedding: Float32Array,
  clicks: readonly SamClick[],
  imageWidth: number,
  imageHeight: number,
  previousMask?: Float32Array,
): Promise<SamResult> {
  if (!session) throw new Error("Decoder not loaded. Call loadDecoder() first.");
  if (clicks.length === 0) throw new Error("At least one click is required.");

  const ort = await getOrt();
  const samScale = LONG_SIDE / Math.max(imageWidth, imageHeight);

  // Build point_coords and point_labels with extra padding point
  const numPoints = clicks.length + 1; // +1 for padding point
  const pointCoords = new Float32Array(numPoints * 2);
  const pointLabels = new Float32Array(numPoints);

  for (let i = 0; i < clicks.length; i++) {
    // Convert normalized coords to SAM input space
    pointCoords[i * 2] = clicks[i].x * imageWidth * samScale;
    pointCoords[i * 2 + 1] = clicks[i].y * imageHeight * samScale;
    pointLabels[i] = clicks[i].clickType;
  }

  // Padding point (label = -1)
  pointCoords[clicks.length * 2] = 0;
  pointCoords[clicks.length * 2 + 1] = 0;
  pointLabels[clicks.length] = -1;

  // Build mask input (previous mask or zeros)
  const maskInput = previousMask ?? new Float32Array(256 * 256);
  const hasMaskInput = new Float32Array([previousMask ? 1 : 0]);

  // Image size tensor (h, w in original pixel dimensions)
  const origImSize = new Float32Array([imageHeight, imageWidth]);

  const feeds = {
    image_embeddings: new ort.Tensor("float32", embedding, [1, 256, 64, 64]),
    point_coords: new ort.Tensor("float32", pointCoords, [1, numPoints, 2]),
    point_labels: new ort.Tensor("float32", pointLabels, [1, numPoints]),
    mask_input: new ort.Tensor("float32", maskInput, [1, 1, 256, 256]),
    has_mask_input: new ort.Tensor("float32", hasMaskInput, [1]),
    orig_im_size: new ort.Tensor("float32", origImSize, [2]),
  };

  const results = await session.run(feeds);

  // Output: masks [1, N, H, W], iou_predictions [1, N]
  const masksData = results.masks?.data as Float32Array;
  const iouData = results.iou_predictions?.data as Float32Array;

  // Pick the mask with highest IoU score
  const numMasks = iouData.length;
  let bestIdx = 0;
  let bestIou = iouData[0];
  for (let i = 1; i < numMasks; i++) {
    if (iouData[i] > bestIou) {
      bestIou = iouData[i];
      bestIdx = i;
    }
  }

  const maskSize = imageWidth * imageHeight;
  const bestMask = masksData.slice(bestIdx * maskSize, (bestIdx + 1) * maskSize);

  return {
    mask: bestMask,
    width: imageWidth,
    height: imageHeight,
    iouScore: bestIou,
  };
}

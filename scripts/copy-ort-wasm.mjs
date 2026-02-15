/**
 * Copy ONNX Runtime WASM files from node_modules to public/
 * Runs automatically via "postinstall" in package.json.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SRC = join("node_modules", "onnxruntime-web", "dist");
const DEST = "public";

if (!existsSync(SRC)) {
  console.log("[copy-ort-wasm] onnxruntime-web not installed yet, skipping.");
  process.exit(0);
}

if (!existsSync(DEST)) {
  mkdirSync(DEST, { recursive: true });
}

const files = readdirSync(SRC).filter(
  (f) => f.startsWith("ort-wasm-") && (f.endsWith(".wasm") || f.endsWith(".mjs")),
);

for (const file of files) {
  copyFileSync(join(SRC, file), join(DEST, file));
}

console.log(`[copy-ort-wasm] Copied ${files.length} files to ${DEST}/`);

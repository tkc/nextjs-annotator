#!/usr/bin/env bash
set -euo pipefail

# Download SAM ViT-B models (quantized ONNX) from HuggingFace
# Both encoder and decoder are extracted from the quantized zip (~75MB)
# - Decoder → public/models/ (browser, onnxruntime-web)
# - Encoder → models/ (server-side, onnxruntime-node)

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DECODER_FILE="$PROJECT_DIR/public/models/sam_vit_b_decoder_quantized.onnx"
ENCODER_FILE="$PROJECT_DIR/models/sam_vit_b_encoder_quantized.onnx"
ZIP_URL="https://huggingface.co/vietanhdev/segment-anything-onnx-models/resolve/main/sam_vit_b_01ec64_quant.zip"

if [ -f "$DECODER_FILE" ] && [ -f "$ENCODER_FILE" ]; then
  echo "All models already exist."
  ls -lh "$DECODER_FILE" "$ENCODER_FILE"
  exit 0
fi

TMPDIR="$(mktemp -d)"
TMPZIP="$TMPDIR/sam_quant.zip"

echo "[download] SAM ViT-B quantized zip (~75MB) ..."
if command -v curl &> /dev/null; then
  curl -L -o "$TMPZIP" "$ZIP_URL"
elif command -v wget &> /dev/null; then
  wget -O "$TMPZIP" "$ZIP_URL"
else
  echo "Error: curl or wget is required" >&2
  exit 1
fi

echo "[extract] Extracting models ..."

if [ ! -f "$DECODER_FILE" ]; then
  mkdir -p "$(dirname "$DECODER_FILE")"
  unzip -o -j "$TMPZIP" "*.decoder.quant.onnx" -d "$TMPDIR"
  mv "$TMPDIR"/sam_vit_b_01ec64.decoder.quant.onnx "$DECODER_FILE"
  echo "[done] Decoder → $DECODER_FILE"
fi

if [ ! -f "$ENCODER_FILE" ]; then
  mkdir -p "$(dirname "$ENCODER_FILE")"
  unzip -o -j "$TMPZIP" "*.encoder.quant.onnx" -d "$TMPDIR"
  mv "$TMPDIR"/sam_vit_b_01ec64.encoder.quant.onnx "$ENCODER_FILE"
  echo "[done] Encoder → $ENCODER_FILE"
fi

rm -rf "$TMPDIR"

echo ""
echo "All models ready."
ls -lh "$DECODER_FILE" "$ENCODER_FILE"

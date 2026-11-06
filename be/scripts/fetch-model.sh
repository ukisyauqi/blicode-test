#!/usr/bin/env bash
# Mengunduh best.onnx saat build karena model tidak di-commit ke repo
# (lihat be/.gitignore). Dipakai oleh buildCommand di render.yaml.
set -euo pipefail

TARGET="${ML_MODEL_PATH:-./models/best.onnx}"

if [ -f "$TARGET" ]; then
  echo "model sudah ada: $TARGET"
  exit 0
fi

if [ -z "${ML_MODEL_URL:-}" ]; then
  echo "fetch-model: $TARGET tidak ada dan ML_MODEL_URL kosong" >&2
  exit 1
fi

mkdir -p "$(dirname "$TARGET")"
echo "fetch-model: mengunduh model ke $TARGET"
curl -fL --retry 3 "$ML_MODEL_URL" -o "$TARGET"
ls -lh "$TARGET"

"""Tahap 7: inferensi CLI untuk satu atau beberapa gambar.

Pemakaian (dari folder ml/):
    uv run waste-predict path/ke/gambar.jpg [lebih_banyak.jpg ...]
    uv run waste-predict --checkpoint models/best.pt foto.jpg
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import torch
from PIL import Image

from waste_classifier.data import eval_transform, load_image
from waste_classifier.model import load_checkpoint

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CKPT = ROOT / "models" / "best.pt"


class Predictor:
    """Muat checkpoint sekali, lalu pakai berulang. Dipakai oleh CLI dan API."""

    def __init__(self, checkpoint: str | Path = DEFAULT_CKPT, device: str = "cpu") -> None:
        self.model, ckpt = load_checkpoint(str(checkpoint), device)
        self.classes: list[str] = ckpt["classes"]
        self.model_name: str = ckpt["model_name"]
        self.epoch: str = str(ckpt.get("epoch", "tidak diketahui"))  # checkpoint lama mungkin tanpa ini
        self.device = device
        self.tfm = eval_transform(ckpt["image_size"])

    @torch.inference_mode()
    def predict_image(self, img: Image.Image) -> dict:
        """Prediksi untuk gambar RGB yang sudah lewat to_rgb (rotasi EXIF sudah diterapkan)."""
        x = self.tfm(img).unsqueeze(0).to(self.device)
        probs = torch.softmax(self.model(x), dim=1)[0].cpu()
        idx = int(probs.argmax())
        return {
            "label": self.classes[idx],
            "confidence": float(probs[idx]),
            "probabilities": {c: float(probs[i]) for i, c in enumerate(self.classes)},
        }


def predict_paths(
    paths: list[str | Path],
    checkpoint: str | Path = DEFAULT_CKPT,
    device: str = "cpu",
) -> list[dict]:
    """Kembalikan label dan probabilitas per kelas untuk setiap gambar."""
    predictor = Predictor(checkpoint, device)
    results = []
    for p in paths:
        result = predictor.predict_image(load_image(Path(p).resolve()))
        results.append({"path": str(p), **result})
    return results


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Klasifikasi gambar sampah.")
    parser.add_argument("images", nargs="+", help="Path gambar")
    parser.add_argument("--checkpoint", default=str(DEFAULT_CKPT))
    parser.add_argument("--device", default="cpu", help="cpu | mps | cuda")
    args = parser.parse_args(argv)

    missing = [p for p in args.images if not Path(p).is_file()]
    if missing:
        print(f"File tidak ditemukan: {', '.join(missing)}", file=sys.stderr)
        return 1
    if not Path(args.checkpoint).is_file():
        print(f"Checkpoint tidak ditemukan: {args.checkpoint}. Jalankan waste-train dulu.",
              file=sys.stderr)
        return 1

    try:
        results = predict_paths(args.images, args.checkpoint, args.device)
    except OSError as e:  # termasuk UnidentifiedImageError dari PIL (gambar rusak)
        print(f"Gagal membaca gambar: {e}", file=sys.stderr)
        return 1

    for r in results:
        probs = ", ".join(f"{c}={v:.3f}" for c, v in r["probabilities"].items())
        print(f"{r['path']}\t{r['label']}\t{r['confidence']:.3f}\t[{probs}]")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Test ekspor ONNX: hasil harus sama dengan PyTorch, termasuk untuk batch berukuran berbeda."""

import json
import sys
from pathlib import Path

import pytest
import torch
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

pytest.importorskip("onnx")  # extra `export`; dilewati bila belum terpasang
ort = pytest.importorskip("onnxruntime")

from waste_classifier.data import file_sha256
from waste_classifier.export import INPUT_NAME, export_onnx, write_parity_reference
from waste_classifier.model import build_model, state_dict_sha256

CLASSES = ["organic", "plastic", "paper"]


def _save_random_checkpoint(tmp_path):
    model = build_model("mobilenet_v3_large", len(CLASSES), pretrained=False).eval()
    ckpt = tmp_path / "best.pt"
    torch.save(
        {
            "state_dict": model.state_dict(),
            "model_name": "mobilenet_v3_large",
            "classes": CLASSES,
            "image_size": 224,
            "epoch": "head:1",
        },
        ckpt,
    )
    return model, ckpt


def test_onnx_matches_pytorch_for_dynamic_batch(tmp_path):
    model, ckpt = _save_random_checkpoint(tmp_path)
    onnx_path = export_onnx(ckpt, tmp_path / "best.onnx")

    sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    for batch in (1, 3):
        x = torch.randn(batch, 3, 224, 224)
        with torch.no_grad():
            ref = model(x).numpy()
        (out,) = sess.run(None, {INPUT_NAME: x.numpy()})
        assert out.shape == (batch, len(CLASSES))
        assert abs(ref - out).max() < 1e-3


def test_parity_reference_matches_checkpoint(tmp_path):
    _, ckpt = _save_random_checkpoint(tmp_path)
    onnx_path = export_onnx(ckpt, tmp_path / "best.onnx")
    images = []
    for i, label in enumerate(("organic", "plastic")):
        path = tmp_path / f"img{i}.png"
        Image.new("RGB", (300 + i * 40, 200), (40 * i, 120, 60)).save(path)
        images.append((path, label))
    split = tmp_path / "val.csv"
    split.write_text("path,label\n" + "".join(f"{path},{label}\n" for path, label in images))

    ref = write_parity_reference(ckpt, onnx_path, split, tmp_path / "parity_reference.json")
    data = json.loads(ref.read_text())
    assert data["onnx_sha256"] == file_sha256(onnx_path)
    assert data["weights_sha256"] == state_dict_sha256(torch.load(ckpt, weights_only=True)["state_dict"])
    assert data["classes"] == CLASSES
    assert data["image_size"] == 224
    assert [row["label"] for row in data["images"]] == ["organic", "plastic"]
    for row in data["images"]:
        assert sum(row["probabilities"]) == pytest.approx(1.0)

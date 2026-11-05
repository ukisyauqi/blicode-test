"""Test CLI prediksi: pemeriksaan input, jalur sukses, dan format output."""

import sys
from pathlib import Path

import torch
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from waste_classifier.model import build_model
from waste_classifier.predict import main

CLASSES = ["organic", "plastic", "paper"]


def _make_checkpoint(path: Path) -> None:
    model = build_model("mobilenet_v3_large", len(CLASSES), pretrained=False)
    torch.save(
        {
            "state_dict": model.state_dict(),
            "model_name": "mobilenet_v3_large",
            "classes": CLASSES,
            "image_size": 224,
            "epoch": "head:1",
        },
        path,
    )


def test_missing_image_returns_error(tmp_path, capsys):
    code = main([str(tmp_path / "tidak_ada.jpg")])
    assert code == 1
    assert "tidak ditemukan" in capsys.readouterr().err


def test_missing_checkpoint_returns_error(tmp_path, capsys):
    img = tmp_path / "a.jpg"
    Image.new("RGB", (10, 10)).save(img)
    code = main([str(img), "--checkpoint", str(tmp_path / "no.pt")])
    assert code == 1
    assert "Checkpoint tidak ditemukan" in capsys.readouterr().err


def test_unreadable_image_returns_error(tmp_path, capsys):
    ckpt = tmp_path / "best.pt"
    _make_checkpoint(ckpt)
    bad = tmp_path / "rusak.jpg"
    bad.write_bytes(b"ini bukan gambar")
    code = main([str(bad), "--checkpoint", str(ckpt)])
    assert code == 1
    assert "Gagal membaca gambar" in capsys.readouterr().err


def test_predict_outputs_label_and_confidence(tmp_path, capsys):
    ckpt = tmp_path / "best.pt"
    _make_checkpoint(ckpt)
    img = tmp_path / "a.jpg"
    Image.new("RGB", (64, 48), color=(10, 200, 30)).save(img)
    code = main([str(img), "--checkpoint", str(ckpt)])
    assert code == 0
    path, label, conf, _probs = capsys.readouterr().out.strip().split("\t")
    assert path == str(img)
    assert label in CLASSES
    assert 0.0 < float(conf) <= 1.0

"""Test evaluasi akhir: keluaran lengkap, penolakan menimpa tanpa --force, dan kecocokan kelas."""

import csv
import json
import sys
from pathlib import Path

import pytest
import torch
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from waste_classifier.evaluate import run_evaluation
from waste_classifier.model import build_model

CLASSES = ["organic", "plastic", "paper"]


def _setup(root: Path, ckpt_classes: list[str] = CLASSES) -> dict:
    img_dir = root / "img"
    img_dir.mkdir(parents=True)
    rows = []
    for ci, c in enumerate(CLASSES):
        for i in range(2):
            p = img_dir / f"{c}_{i}.jpg"
            Image.new("RGB", (64, 64), color=(40 * ci, 90, 150 + 20 * i)).save(p)
            rows.append((p, c))
    splits = root / "splits"
    splits.mkdir()
    with (splits / "test.csv").open("w") as f:
        f.write("path,label\n")
        for p, c in rows:
            f.write(f"{p},{c}\n")

    model = build_model("mobilenet_v3_large", len(ckpt_classes), pretrained=False)
    ckpt_dir = root / "models"
    ckpt_dir.mkdir()
    torch.save(
        {
            "state_dict": model.state_dict(),
            "model_name": "mobilenet_v3_large",
            "classes": ckpt_classes,
            "image_size": 224,
            "epoch": "head:1",
        },
        ckpt_dir / "best.pt",
    )
    # log pelatihan kecil agar kurva ikut diuji
    reports = root / "reports"
    reports.mkdir()
    with (reports / "train_log.csv").open("w", newline="") as f:
        w = csv.DictWriter(
            f,
            fieldnames=["stage", "epoch", "train_loss", "val_loss", "val_acc", "val_macro_f1", "seconds"],
        )
        w.writeheader()
        w.writerow({"stage": "head", "epoch": 1, "train_loss": 1.0, "val_loss": 0.9,
                    "val_acc": 0.4, "val_macro_f1": 0.3, "seconds": 1.0})
        w.writerow({"stage": "finetune", "epoch": 1, "train_loss": 0.8, "val_loss": 0.7,
                    "val_acc": 0.5, "val_macro_f1": 0.45, "seconds": 1.0})

    return {
        "data": {"classes": CLASSES, "splits_dir": "splits"},
        "train": {"batch_size": 4, "device": "cpu"},
        "output": {"checkpoint_dir": "models", "reports_dir": "reports"},
    }


def test_evaluation_writes_outputs_and_refuses_overwrite_without_force(tmp_path):
    cfg = _setup(tmp_path)
    assert run_evaluation(cfg, root=tmp_path) == 0

    reports = tmp_path / "reports"
    for name in ["test_metrics.json", "test_errors.csv", "test_confusion_matrix.png", "train_curves.png"]:
        assert (reports / name).is_file(), name

    metrics = json.loads((reports / "test_metrics.json").read_text())
    assert metrics["n_samples"] == 6
    assert sum(sum(row) for row in metrics["confusion_matrix"]) == 6
    assert set(metrics["per_class"]) == set(CLASSES)
    assert 0.0 <= metrics["accuracy"] <= 1.0

    before = (reports / "test_metrics.json").read_text()
    # Pemanggilan kedua tanpa --force harus ditolak dan tidak mengubah hasil.
    assert run_evaluation(cfg, root=tmp_path) == 1
    assert (reports / "test_metrics.json").read_text() == before

    # Dengan --force, hasil boleh ditimpa.
    assert run_evaluation(cfg, root=tmp_path, force=True) == 0


def test_checkpoint_classes_must_match_config(tmp_path):
    cfg = _setup(tmp_path, ckpt_classes=["plastic", "organic", "paper"])
    with pytest.raises(ValueError):
        run_evaluation(cfg, root=tmp_path)

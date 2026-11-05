"""Test pipeline training: logging, bobot kelas, dan satu siklus training kecil end-to-end."""

import sys
from pathlib import Path

import pytest
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from waste_classifier.model import load_checkpoint
from waste_classifier.train import LOG_FIELDS, EpochLog, class_weights, train

CLASSES = ["organic", "plastic", "paper"]


def test_class_weights_rejects_empty_class():
    with pytest.raises(ValueError):
        class_weights([0, 0, 1], 3)  # kelas 2 tidak punya contoh


def test_epoch_log_is_on_disk_before_close(tmp_path):
    path = tmp_path / "log.csv"
    log = EpochLog(path)
    try:
        log.write(
            {
                "stage": "head", "epoch": 1, "train_loss": 1.0, "val_loss": 0.9,
                "val_acc": 0.5, "val_macro_f1": 0.4, "seconds": 1.2,
            }
        )
        # Dibaca sebelum file ditutup: baris harus sudah ada di disk.
        lines = path.read_text().splitlines()
        assert lines[0].split(",") == LOG_FIELDS
        assert lines[1].startswith("head,1,")
    finally:
        log.close()


def _write_split(path: Path, rows: list[tuple[Path, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        f.write("path,label\n")
        for p, label in rows:
            f.write(f"{p},{label}\n")


def test_train_runs_end_to_end_on_tiny_dataset(tmp_path):
    img_dir = tmp_path / "img"
    img_dir.mkdir()
    train_rows, val_rows = [], []
    for ci, c in enumerate(CLASSES):
        for i in range(4):
            p = img_dir / f"{c}_tr{i}.jpg"
            Image.new("RGB", (64, 64), color=(40 * ci, 100, 200 - 30 * i)).save(p)
            train_rows.append((p, c))
        for i in range(2):
            p = img_dir / f"{c}_va{i}.jpg"
            Image.new("RGB", (64, 64), color=(40 * ci, 120, 180 - 30 * i)).save(p)
            val_rows.append((p, c))
    _write_split(tmp_path / "splits" / "train.csv", train_rows)
    _write_split(tmp_path / "splits" / "val.csv", val_rows)

    cfg = {
        "seed": 42,
        "data": {"classes": CLASSES, "image_size": 224, "splits_dir": "splits"},
        "model": {"name": "mobilenet_v3_large", "pretrained": False, "dropout": 0.2},
        "train": {
            "epochs_head": 1,
            "epochs_finetune": 1,
            "batch_size": 4,
            "num_workers": 0,
            "lr_head": 1e-3,
            "lr_finetune": 1e-4,
            "weight_decay": 1e-4,
            "label_smoothing": 0.1,
            "early_stopping_patience": 5,
            "device": "cpu",
        },
        "output": {"checkpoint_dir": "models", "reports_dir": "reports"},
    }
    state = train(cfg, root=tmp_path)

    assert state["best_epoch"] is not None
    _, ckpt = load_checkpoint(str(tmp_path / "models" / "best.pt"))
    assert ckpt["classes"] == CLASSES
    # header + 1 epoch tahap head + 1 epoch tahap finetune
    log_lines = (tmp_path / "reports" / "train_log.csv").read_text().splitlines()
    assert len(log_lines) == 3

"""Test untuk pemetaan label dan transform data."""

import sys
from pathlib import Path

import torch
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from waste_classifier.data import eval_transform, label_to_idx, load_image, split_fingerprint


def test_label_to_idx_is_stable():
    assert label_to_idx(["organic", "plastic", "paper"]) == {
        "organic": 0,
        "plastic": 1,
        "paper": 2,
    }


def test_eval_transform_output_shape():
    img = Image.new("RGB", (640, 480), color=(120, 80, 40))
    x = eval_transform(224)(img)
    assert x.shape == (3, 224, 224)
    assert x.dtype == torch.float32


def test_load_image_converts_rgba_to_rgb(tmp_path):
    p = tmp_path / "rgba.png"
    Image.new("RGBA", (32, 32), color=(255, 0, 0, 128)).save(p)
    # load_image memakai path relatif terhadap ROOT; path absolut tetap bekerja
    # karena Path(ROOT) / absolut = absolut.
    img = load_image(p)
    assert img.mode == "RGB"


def test_load_image_applies_exif_orientation(tmp_path):
    p = tmp_path / "potret.jpg"
    exif = Image.Exif()
    exif[0x0112] = 6  # Orientation 6: piksel harus diputar 90 derajat agar tampil tegak
    Image.new("RGB", (40, 20), color=(0, 0, 255)).save(p, exif=exif.tobytes())
    assert load_image(p).size == (20, 40)


def test_split_fingerprint_counts_rows_and_classes(tmp_path):
    (tmp_path / "train.csv").write_text("path,label\na.jpg,organic\nb.jpg,plastic\nc.jpg,organic\n")
    fp = split_fingerprint(tmp_path, names=("train", "val"))  # val tidak ada, dilewati
    assert fp["rows"] == {"train": 3}
    assert fp["per_class"]["train"] == {"organic": 2, "plastic": 1}
    assert len(fp["files_sha256"]["train"]) == 64

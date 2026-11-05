"""Loading dataset dari CSV split (data/splits/*.csv) dengan transform standar ImageNet."""

from __future__ import annotations

import hashlib
from pathlib import Path

import pandas as pd
import torch
from PIL import Image, ImageOps
from torch.utils.data import Dataset
from torchvision import transforms

ROOT = Path(__file__).resolve().parents[2]
IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)


def label_to_idx(classes: list[str]) -> dict[str, int]:
    return {c: i for i, c in enumerate(classes)}


def eval_transform(image_size: int = 224) -> transforms.Compose:
    """Transform deterministik untuk validasi, test, dan inferensi."""
    return transforms.Compose(
        [
            transforms.Resize(int(image_size * 256 / 224)),
            transforms.CenterCrop(image_size),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )


def train_transform(image_size: int = 224) -> transforms.Compose:
    """Augmentasi ringan untuk training (dipakai di Tahap 5)."""
    return transforms.Compose(
        [
            transforms.RandomResizedCrop(image_size, scale=(0.7, 1.0)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(10),
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.1),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )


def to_rgb(im: Image.Image) -> Image.Image:
    """Terapkan rotasi EXIF lalu paksa ke RGB. Dipakai untuk file maupun upload.

    Foto dari HP sering menyimpan orientasi di metadata EXIF, bukan di piksel.
    Tanpa exif_transpose, foto potret tampil miring saat training dan inferensi.
    """
    return ImageOps.exif_transpose(im).convert("RGB")


def load_image(path: str | Path) -> Image.Image:
    """Buka gambar dari path (relatif ke ROOT atau absolut), lalu to_rgb."""
    with Image.open(ROOT / path) as im:
        return to_rgb(im)


class WasteDataset(Dataset):
    def __init__(self, csv_path: str | Path, classes: list[str], transform=None):
        self.df = pd.read_csv(csv_path)
        self.classes = classes
        self.label_map = label_to_idx(classes)
        self.transform = transform

    def __len__(self) -> int:
        return len(self.df)

    def __getitem__(self, idx: int):
        row = self.df.iloc[idx]
        img = load_image(row["path"])
        if self.transform is not None:
            img = self.transform(img)
        return img, torch.tensor(self.label_map[row["label"]])


def file_sha256(path: str | Path) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def split_fingerprint(splits_dir: str | Path, names: tuple[str, ...] = ("train", "val", "test")) -> dict:
    """Sidik jari dataset (dipakai sebagai 'versi dataset'): hash isi CSV dan jumlah per kelas."""
    splits_dir = Path(splits_dir)
    out: dict = {"files_sha256": {}, "rows": {}, "per_class": {}}
    for name in names:
        path = splits_dir / f"{name}.csv"
        if not path.is_file():
            continue
        df = pd.read_csv(path)
        out["files_sha256"][name] = file_sha256(path)
        out["rows"][name] = len(df)
        out["per_class"][name] = {str(k): int(v) for k, v in df["label"].value_counts().sort_index().items()}
    return out

"""Loading dataset dari CSV split (data/splits/*.csv) dengan transform standar ImageNet."""

from __future__ import annotations

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


def load_image(path: str | Path) -> Image.Image:
    """Buka gambar, terapkan rotasi EXIF, lalu paksa ke RGB.

    Foto dari HP sering menyimpan orientasi di metadata EXIF, bukan di piksel.
    Tanpa exif_transpose, foto potret tampil miring saat training dan inferensi.
    """
    with Image.open(ROOT / path) as im:
        im = ImageOps.exif_transpose(im)
        return im.convert("RGB")


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

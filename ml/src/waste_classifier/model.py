"""Definisi model klasifikasi: backbone pretrained ImageNet dengan head 3 kelas."""

from __future__ import annotations

import torch
from torch import nn
from torchvision.models import (
    EfficientNet_B0_Weights,
    MobileNet_V3_Large_Weights,
    efficientnet_b0,
    mobilenet_v3_large,
)


def build_model(
    name: str,
    num_classes: int,
    pretrained: bool = True,
    dropout: float | None = None,
) -> nn.Module:
    if name == "mobilenet_v3_large":
        weights = MobileNet_V3_Large_Weights.DEFAULT if pretrained else None
        model = mobilenet_v3_large(weights=weights)
    elif name == "efficientnet_b0":
        weights = EfficientNet_B0_Weights.DEFAULT if pretrained else None
        model = efficientnet_b0(weights=weights)
    else:
        raise ValueError(f"Arsitektur tidak dikenal: {name}")

    # Ganti Linear terakhir di classifier dengan head sesuai jumlah kelas.
    last = model.classifier[-1]
    if not isinstance(last, nn.Linear):
        raise TypeError(f"Layer terakhir classifier bukan Linear: {type(last).__name__}")
    model.classifier[-1] = nn.Linear(last.in_features, num_classes)

    # Terapkan dropout dari config (menggantikan default torchvision).
    if dropout is not None:
        for m in model.classifier.modules():
            if isinstance(m, nn.Dropout):
                m.p = dropout
    return model


def freeze_backbone(model: nn.Module) -> None:
    """Bekukan semua parameter kecuali classifier (tahap 1: latih head saja)."""
    for p in model.parameters():
        p.requires_grad = False
    for p in model.classifier.parameters():
        p.requires_grad = True


def unfreeze_all(model: nn.Module) -> None:
    for p in model.parameters():
        p.requires_grad = True


def set_train_mode(model: nn.Module, frozen_backbone: bool) -> None:
    """Ganti ke mode training, tetapi BatchNorm backbone yang beku tetap mode eval.

    Tanpa ini, statistik running BatchNorm ikut berubah selama tahap head meskipun
    bobotnya beku, sehingga statistiknya tidak lagi sesuai dengan pretrained ImageNet.
    """
    model.train()
    if frozen_backbone:
        for m in model.features.modules():
            if isinstance(m, nn.BatchNorm2d):
                m.eval()


def load_checkpoint(path: str, device: torch.device | str = "cpu") -> tuple[nn.Module, dict]:
    """Muat checkpoint hasil training beserta metadatanya (kelas, arsitektur, ukuran gambar).

    weights_only=True mencegah eksekusi kode arbitrer dari file pickle.
    """
    ckpt = torch.load(path, map_location=device, weights_only=True)
    model = build_model(ckpt["model_name"], len(ckpt["classes"]), pretrained=False)
    model.load_state_dict(ckpt["state_dict"])
    model.eval().to(device)
    return model, ckpt

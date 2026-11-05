"""Tahap 5: fine-tuning dua tahap (head dulu, lalu seluruh backbone).

Model terbaik berdasarkan macro F1 validasi disimpan ke models/best.pt.
Test set TIDAK dipakai di sini.

Pemakaian (dari folder ml/):
    uv run waste-train
"""

from __future__ import annotations

import csv
import random
import time
from pathlib import Path
from typing import Self

import numpy as np
import torch
import yaml
from sklearn.metrics import f1_score
from torch import nn
from torch.utils.data import DataLoader
from tqdm import tqdm

from waste_classifier.data import WasteDataset, eval_transform, train_transform
from waste_classifier.model import build_model, freeze_backbone, set_train_mode, unfreeze_all

ROOT = Path(__file__).resolve().parents[2]
LOG_FIELDS = ["stage", "epoch", "train_loss", "val_loss", "val_acc", "val_macro_f1", "seconds"]


def load_cfg() -> dict:
    return yaml.safe_load((ROOT / "configs" / "train.yaml").read_text())


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


def get_device(choice: str) -> torch.device:
    if choice != "auto":
        return torch.device(choice)
    if torch.backends.mps.is_available():
        return torch.device("mps")
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def class_weights(labels: list[int], n_classes: int) -> torch.Tensor:
    counts = np.bincount(labels, minlength=n_classes).astype(np.float32)
    if (counts == 0).any():
        raise ValueError(f"Ada kelas tanpa contoh training: {counts.tolist()}")
    w = counts.sum() / (n_classes * counts)
    return torch.tensor(w / w.mean(), dtype=torch.float32)


class EpochLog:
    """Log CSV per epoch. Setiap baris langsung di-flush agar tidak hilang bila training dihentikan."""

    def __init__(self, path: Path) -> None:
        self._f = path.open("w", newline="")
        self._w = csv.DictWriter(self._f, fieldnames=LOG_FIELDS)
        self._w.writeheader()
        self._f.flush()

    def write(self, row: dict) -> None:
        self._w.writerow(row)
        self._f.flush()

    def close(self) -> None:
        self._f.close()

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *exc_info) -> None:
        self.close()


@torch.no_grad()
def evaluate(model, loader, criterion, device):
    model.eval()
    total_loss, preds, targets = 0.0, [], []
    for x, y in loader:
        x, y = x.to(device), y.to(device)
        logits = model(x)
        total_loss += criterion(logits, y).item() * len(y)
        preds.append(logits.argmax(1).cpu().numpy())
        targets.append(y.cpu().numpy())
    preds, targets = np.concatenate(preds), np.concatenate(targets)
    loss = total_loss / len(targets)
    acc = float((preds == targets).mean())
    macro_f1 = float(f1_score(targets, preds, average="macro"))
    return loss, acc, macro_f1


def run_stage(
    name: str,
    model: nn.Module,
    epochs: int,
    lr: float,
    weight_decay: float,
    criterion: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    device: torch.device,
    patience: int,
    state: dict,
    log: EpochLog,
    frozen_backbone: bool,
) -> None:
    params = [p for p in model.parameters() if p.requires_grad]
    optimizer = torch.optim.AdamW(params, lr=lr, weight_decay=weight_decay)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    bad_epochs = 0

    for epoch in range(1, epochs + 1):
        set_train_mode(model, frozen_backbone)
        t0 = time.time()
        running, seen = 0.0, 0
        for x, y in tqdm(train_loader, desc=f"{name} ep{epoch}", leave=False):
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad()
            loss = criterion(model(x), y)
            loss.backward()
            optimizer.step()
            running += loss.item() * len(y)
            seen += len(y)
        scheduler.step()

        train_loss = running / seen
        val_loss, val_acc, val_f1 = evaluate(model, val_loader, criterion, device)
        dt = time.time() - t0
        print(
            f"[{name}] epoch {epoch:02d}/{epochs} | train_loss {train_loss:.4f} | "
            f"val_loss {val_loss:.4f} | val_acc {val_acc:.4f} | val_macro_f1 {val_f1:.4f} | {dt:.0f}s"
        )
        log.write(
            {
                "stage": name,
                "epoch": epoch,
                "train_loss": round(train_loss, 5),
                "val_loss": round(val_loss, 5),
                "val_acc": round(val_acc, 5),
                "val_macro_f1": round(val_f1, 5),
                "seconds": round(dt, 1),
            }
        )

        if val_f1 > state["best_f1"]:
            state["best_f1"] = val_f1
            state["best_epoch"] = f"{name}:{epoch}"
            bad_epochs = 0
            torch.save(
                {
                    "state_dict": model.state_dict(),
                    "model_name": state["model_name"],
                    "classes": state["classes"],
                    "image_size": state["image_size"],
                    "val_macro_f1": val_f1,
                    "val_acc": val_acc,
                    "epoch": f"{name}:{epoch}",
                },
                state["ckpt_path"],
            )
            print(f"  -> model terbaik disimpan (val_macro_f1 {val_f1:.4f})")
        else:
            bad_epochs += 1
            if bad_epochs >= patience:
                print(f"  early stopping setelah {patience} epoch tanpa perbaikan")
                break


def train(cfg: dict, root: Path = ROOT) -> dict:
    """Latih model sesuai cfg. Path di cfg dihitung relatif terhadap root.

    Mengembalikan state berisi epoch dan macro F1 terbaik.
    """
    set_seed(cfg["seed"])
    device = get_device(cfg["train"]["device"])
    print(f"Device: {device}")

    classes: list[str] = cfg["data"]["classes"]
    image_size: int = cfg["data"]["image_size"]
    splits = root / cfg["data"]["splits_dir"]
    out_dir = root / cfg["output"]["checkpoint_dir"]
    reports = root / cfg["output"]["reports_dir"]
    out_dir.mkdir(parents=True, exist_ok=True)
    reports.mkdir(parents=True, exist_ok=True)

    t = cfg["train"]
    bs, nw = t["batch_size"], t["num_workers"]
    train_ds = WasteDataset(splits / "train.csv", classes, train_transform(image_size))
    val_ds = WasteDataset(splits / "val.csv", classes, eval_transform(image_size))
    # drop_last mencegah batch terakhir berukuran kecil (BatchNorm butuh >1 sampel saat training)
    train_loader = DataLoader(
        train_ds,
        batch_size=bs,
        shuffle=True,
        num_workers=nw,
        drop_last=len(train_ds) >= bs,
    )
    val_loader = DataLoader(val_ds, batch_size=bs, shuffle=False, num_workers=nw)

    train_labels = [train_ds.label_map[l] for l in train_ds.df["label"]]
    weights = class_weights(train_labels, len(classes)).to(device)
    print("Bobot kelas:", dict(zip(classes, weights.tolist())))
    criterion = nn.CrossEntropyLoss(weight=weights, label_smoothing=t["label_smoothing"])

    model = build_model(
        cfg["model"]["name"],
        len(classes),
        cfg["model"]["pretrained"],
        dropout=cfg["model"]["dropout"],
    )
    model.to(device)

    state = {
        "best_f1": -1.0,
        "best_epoch": None,
        "model_name": cfg["model"]["name"],
        "classes": classes,
        "image_size": image_size,
        "ckpt_path": out_dir / "best.pt",
    }

    with EpochLog(reports / "train_log.csv") as log:
        print("\n== Tahap 1: head saja (backbone dibekukan) ==")
        freeze_backbone(model)
        run_stage(
            "head", model, t["epochs_head"], t["lr_head"], t["weight_decay"],
            criterion, train_loader, val_loader, device, t["early_stopping_patience"],
            state, log, frozen_backbone=True,
        )
        if state["best_epoch"] is None:
            raise RuntimeError("Tahap 1 tidak menyimpan checkpoint; cek nilai val macro F1.")

        print("\n== Tahap 2: fine-tuning seluruh model ==")
        # Muat ulang model terbaik dari tahap 1 sebelum fine-tuning
        ckpt = torch.load(state["ckpt_path"], map_location=device, weights_only=True)
        model.load_state_dict(ckpt["state_dict"])
        unfreeze_all(model)
        run_stage(
            "finetune", model, t["epochs_finetune"], t["lr_finetune"], t["weight_decay"],
            criterion, train_loader, val_loader, device, t["early_stopping_patience"],
            state, log, frozen_backbone=False,
        )
    return state


def main() -> None:
    state = train(load_cfg())
    print(
        f"\nSelesai. Model terbaik: epoch {state['best_epoch']}, "
        f"val_macro_f1 {state['best_f1']:.4f}, disimpan di {state['ckpt_path']}"
    )


if __name__ == "__main__":
    main()

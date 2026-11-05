"""Tahap 4: baseline = embedding MobileNetV3 pretrained + logistic regression.

Hanya split validasi yang dievaluasi di sini. Test set disimpan untuk evaluasi akhir (Tahap 6).

Pemakaian (dari folder ml/):
    uv run python scripts/baseline.py
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import torch
import yaml
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.preprocessing import StandardScaler
from torch.utils.data import DataLoader
from torchvision.models import MobileNet_V3_Large_Weights, mobilenet_v3_large

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from waste_classifier.data import WasteDataset, eval_transform

CFG = yaml.safe_load((ROOT / "configs" / "train.yaml").read_text())
CLASSES: list[str] = CFG["data"]["classes"]
SPLITS = ROOT / CFG["data"]["splits_dir"]
REPORTS = ROOT / CFG["output"]["reports_dir"]
SEED: int = CFG["seed"]


def get_device() -> torch.device:
    if CFG["train"]["device"] != "auto":
        return torch.device(CFG["train"]["device"])
    if torch.backends.mps.is_available():
        return torch.device("mps")
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def cache_key() -> str:
    """Sidik jari isi split. Cache fitur dipakai ulang hanya jika split-nya sama."""
    h = hashlib.sha256()
    for split in ("train", "val"):
        h.update((SPLITS / f"{split}.csv").read_bytes())
    return h.hexdigest()


@torch.no_grad()
def extract_features(split: str, model: torch.nn.Module, device: torch.device):
    ds = WasteDataset(SPLITS / f"{split}.csv", CLASSES, transform=eval_transform())
    dl = DataLoader(ds, batch_size=64, shuffle=False, num_workers=4)
    feats, labels = [], []
    for x, y in dl:
        feats.append(model(x.to(device)).cpu().numpy())
        labels.append(y.numpy())
    return np.concatenate(feats), np.concatenate(labels)


def main() -> None:
    torch.manual_seed(SEED)
    np.random.seed(SEED)
    REPORTS.mkdir(parents=True, exist_ok=True)
    device = get_device()
    print(f"Device: {device}")

    # Backbone pretrained tanpa classifier head -> embedding 960-d
    weights = MobileNet_V3_Large_Weights.DEFAULT
    model = mobilenet_v3_large(weights=weights)
    model.classifier = torch.nn.Identity()
    model.eval().to(device)

    cache = ROOT / "models" / "baseline_features.npz"
    key = cache_key()
    cached = np.load(cache) if cache.exists() else None
    if cached is not None and "key" in cached.files and str(cached["key"]) == key:
        X_tr, y_tr = cached["X_tr"], cached["y_tr"]
        X_va, y_va = cached["X_va"], cached["y_va"]
        print("Fitur dari cache (sesuai split saat ini).")
    else:
        if cached is not None:
            print("Cache fitur tidak cocok dengan split saat ini; diekstrak ulang.")
        print("Mengekstrak fitur train...")
        X_tr, y_tr = extract_features("train", model, device)
        print("Mengekstrak fitur val...")
        X_va, y_va = extract_features("val", model, device)
        np.savez(cache, X_tr=X_tr, y_tr=y_tr, X_va=X_va, y_va=y_va, key=np.array(key))

    scaler = StandardScaler().fit(X_tr)
    clf = LogisticRegression(
        max_iter=2000, C=1.0, class_weight="balanced", random_state=SEED
    )
    clf.fit(scaler.transform(X_tr), y_tr)
    pred = clf.predict(scaler.transform(X_va))

    acc = accuracy_score(y_va, pred)
    macro_f1 = f1_score(y_va, pred, average="macro")
    cm = confusion_matrix(y_va, pred)
    report = classification_report(y_va, pred, target_names=CLASSES, digits=3)

    print(f"\nVal accuracy : {acc:.4f}")
    print(f"Val macro F1 : {macro_f1:.4f}")
    print(report)
    print("Confusion matrix (baris=aktual, kolom=prediksi):")
    print(f"{'':>10}" + "".join(f"{c:>10}" for c in CLASSES))
    for c, row in zip(CLASSES, cm):
        print(f"{c:>10}" + "".join(f"{v:>10d}" for v in row))

    metrics = {
        "model": "mobilenet_v3_large embedding + logistic regression",
        "split": "val",
        "accuracy": round(float(acc), 4),
        "macro_f1": round(float(macro_f1), 4),
        "confusion_matrix": cm.tolist(),
        "classes": CLASSES,
    }
    (REPORTS / "baseline_metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"\nMetrik disimpan ke {REPORTS / 'baseline_metrics.json'}")


if __name__ == "__main__":
    main()

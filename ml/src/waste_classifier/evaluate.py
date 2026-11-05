"""Tahap 6: evaluasi akhir pada test set. Test set hanya dipakai SEKALI.

Aturan dari PLAN: test set tidak boleh dipakai untuk memilih model atau hyperparameter.
Karena itu skrip menolak menimpa hasil yang sudah ada kecuali dengan --force.

Pemakaian (dari folder ml/):
    uv run waste-evaluate

Keluaran di reports/:
    test_metrics.json, test_errors.csv, test_confusion_matrix.png, train_curves.png
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from datetime import datetime
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # render ke file, tanpa jendela GUI
import matplotlib.pyplot as plt
import numpy as np
import torch
from sklearn.metrics import classification_report, confusion_matrix
from torch.utils.data import DataLoader

from waste_classifier.data import WasteDataset, eval_transform
from waste_classifier.model import load_checkpoint
from waste_classifier.train import get_device, load_cfg

ROOT = Path(__file__).resolve().parents[2]
ERROR_FIELDS = ["path", "true_label", "pred_label", "pred_confidence", "true_label_prob"]


@torch.no_grad()
def predict(model, loader, device) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Kembalikan label benar, label prediksi, dan probabilitas per kelas (urut sesuai loader)."""
    targets, probs = [], []
    for x, y in loader:
        probs.append(torch.softmax(model(x.to(device)), dim=1).cpu().numpy())
        targets.append(y.numpy())
    probs_arr = np.concatenate(probs)
    return np.concatenate(targets), probs_arr.argmax(1), probs_arr


def plot_confusion(cm: np.ndarray, classes: list[str], path: Path) -> None:
    n = len(classes)
    fig, ax = plt.subplots(figsize=(5, 4.5))
    im = ax.imshow(cm, cmap="Blues")
    ax.set_xticks(range(n), classes, rotation=30)
    ax.set_yticks(range(n), classes)
    ax.set_xlabel("Prediksi")
    ax.set_ylabel("Aktual")
    ax.set_title("Confusion matrix (test)")
    threshold = cm.max() / 2
    for i in range(n):
        for j in range(n):
            ax.text(
                j, i, int(cm[i, j]), ha="center", va="center",
                color="white" if cm[i, j] > threshold else "black",
            )
    fig.colorbar(im, ax=ax)
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)


def plot_curves(log_path: Path, path: Path) -> None:
    """Kurva loss dan val macro F1 per epoch; garis putus-putus menandai awal fine-tuning."""
    with log_path.open() as f:
        rows = list(csv.DictReader(f))
    epochs = list(range(1, len(rows) + 1))
    stage_break = next((i for i, r in enumerate(rows) if r["stage"] == "finetune"), None)

    fig, (ax_loss, ax_f1) = plt.subplots(1, 2, figsize=(10, 4))
    for ax in (ax_loss, ax_f1):
        if stage_break is not None:
            ax.axvline(stage_break + 0.5, color="gray", linestyle="--", linewidth=1)
        ax.set_xlabel("Epoch (berurutan)")
    ax_loss.plot(epochs, [float(r["train_loss"]) for r in rows], label="train loss")
    ax_loss.plot(epochs, [float(r["val_loss"]) for r in rows], label="val loss")
    ax_loss.set_title("Loss")
    ax_loss.legend()
    ax_f1.plot(epochs, [float(r["val_macro_f1"]) for r in rows], marker="o")
    ax_f1.set_title("Val macro F1")
    ax_f1.set_ylim(0, 1)
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)


def run_evaluation(
    cfg: dict,
    root: Path = ROOT,
    ckpt_path: Path | None = None,
    force: bool = False,
) -> int:
    reports = root / cfg["output"]["reports_dir"]
    metrics_path = reports / "test_metrics.json"
    if metrics_path.exists() and not force:
        print(
            f"{metrics_path} sudah ada. Test set hanya boleh dipakai sekali; "
            "gunakan --force hanya jika memang perlu menimpa hasil.",
            file=sys.stderr,
        )
        return 1

    device = get_device(cfg["train"]["device"])
    ckpt_path = ckpt_path or root / cfg["output"]["checkpoint_dir"] / "best.pt"
    model, ckpt = load_checkpoint(str(ckpt_path), device)

    classes: list[str] = ckpt["classes"]
    if classes != cfg["data"]["classes"]:
        raise ValueError(f"Kelas checkpoint {classes} tidak sama dengan config {cfg['data']['classes']}")

    ds = WasteDataset(
        root / cfg["data"]["splits_dir"] / "test.csv",
        classes,
        eval_transform(ckpt["image_size"]),
    )
    loader = DataLoader(ds, batch_size=cfg["train"]["batch_size"], shuffle=False, num_workers=0)
    y_true, y_pred, probs = predict(model, loader, device)

    label_ids = list(range(len(classes)))
    report = classification_report(
        y_true, y_pred, labels=label_ids, target_names=classes,
        output_dict=True, zero_division=0,
    )
    cm = confusion_matrix(y_true, y_pred, labels=label_ids)
    acc = float((y_true == y_pred).mean())
    macro_f1 = float(report["macro avg"]["f1-score"])

    errors = [
        {
            "path": ds.df.iloc[i]["path"],
            "true_label": classes[y_true[i]],
            "pred_label": classes[y_pred[i]],
            "pred_confidence": round(float(probs[i, y_pred[i]]), 4),
            "true_label_prob": round(float(probs[i, y_true[i]]), 4),
        }
        for i in np.where(y_true != y_pred)[0]
    ]

    reports.mkdir(parents=True, exist_ok=True)
    with (reports / "test_errors.csv").open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=ERROR_FIELDS)
        writer.writeheader()
        writer.writerows(errors)

    metrics = {
        "split": "test",
        "model": ckpt["model_name"],
        "checkpoint_epoch": ckpt["epoch"],
        "n_samples": len(y_true),
        "accuracy": round(acc, 4),
        "macro_f1": round(macro_f1, 4),
        "per_class": {
            c: {
                "precision": round(report[c]["precision"], 4),
                "recall": round(report[c]["recall"], 4),
                "f1": round(report[c]["f1-score"], 4),
                "support": int(report[c]["support"]),
            }
            for c in classes
        },
        "classes": classes,
        "confusion_matrix": cm.tolist(),
        "misclassified": len(errors),
        "evaluated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "catatan": "Test set dipakai sekali (PLAN §5). Jangan dipakai untuk memilih model.",
    }
    metrics_path.write_text(json.dumps(metrics, indent=2, ensure_ascii=False))
    plot_confusion(cm, classes, reports / "test_confusion_matrix.png")
    if (reports / "train_log.csv").exists():
        plot_curves(reports / "train_log.csv", reports / "train_curves.png")

    print(f"Test accuracy : {acc:.4f}")
    print(f"Test macro F1 : {macro_f1:.4f}")
    print("Confusion matrix (baris=aktual, kolom=prediksi):")
    print(f"{'':>10}" + "".join(f"{c:>10}" for c in classes))
    for c, row in zip(classes, cm):
        print(f"{c:>10}" + "".join(f"{v:>10d}" for v in row))
    print(f"Salah klasifikasi: {len(errors)} dari {len(y_true)} (lihat {reports / 'test_errors.csv'})")
    print(f"Metrik disimpan ke {metrics_path}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Evaluasi akhir pada test set (sekali).")
    parser.add_argument("--force", action="store_true", help="timpa hasil evaluasi sebelumnya")
    args = parser.parse_args(argv)
    return run_evaluation(load_cfg(), force=args.force)


if __name__ == "__main__":
    raise SystemExit(main())

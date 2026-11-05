"""Tahap 3: validasi gambar, deduplikasi, dan split stratified train/val/test.

Gambar yang rusak atau duplikat TIDAK dihapus, melainkan dipindah ke data/rejected/
supaya bisa dikembalikan jika ternyata keliru.

Pemakaian (dari folder ml/):
    uv run python scripts/prepare_data.py
"""

from __future__ import annotations

import hashlib
import shutil
from collections import Counter
from pathlib import Path

import pandas as pd
import yaml
from PIL import Image
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parents[1]
CFG = yaml.safe_load((ROOT / "configs" / "train.yaml").read_text())
CLASSES: list[str] = CFG["data"]["classes"]
RAW = ROOT / CFG["data"]["raw_dir"]
SPLITS = ROOT / CFG["data"]["splits_dir"]
REJECTED = ROOT / "data" / "rejected"
SEED: int = CFG["seed"]
MAX_PER_CLASS: int | None = CFG["data"]["max_per_class"]
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def dhash(img: Image.Image, size: int = 8) -> str:
    """Difference hash: sidik jari visual untuk mendeteksi gambar yang mirip/duplikat."""
    g = img.convert("L").resize((size + 1, size), Image.Resampling.LANCZOS)
    px = g.tobytes()  # mode L: satu byte per piksel
    bits = []
    for row in range(size):
        for col in range(size):
            bits.append("1" if px[row * (size + 1) + col] > px[row * (size + 1) + col + 1] else "0")
    return f"{int(''.join(bits), 2):016x}"


def main() -> None:
    # Validasi sebelum apa pun dipindah, supaya konfigurasi salah tidak merusak data
    if MAX_PER_CLASS is not None and MAX_PER_CLASS < 1:
        raise ValueError(f"data.max_per_class harus >= 1 atau null, nilai sekarang: {MAX_PER_CLASS}")

    files = sorted(
        p for c in CLASSES for p in (RAW / c).iterdir() if p.suffix.lower() in IMAGE_EXTS
    )
    print(f"Total file ditemukan: {len(files)}")

    broken: list[Path] = []
    exact_seen: dict[str, Path] = {}
    dhash_seen: dict[str, Path] = {}
    duplicates: list[tuple[Path, Path, str]] = []
    keep: list[dict] = []
    modes: Counter = Counter()
    sizes: Counter = Counter()

    for p in files:
        try:
            with Image.open(p) as im:
                im.verify()
            with Image.open(p) as im:
                im.load()
                modes[im.mode] += 1
                sizes[im.size] += 1
                h = dhash(im)
        except (OSError, SyntaxError, ValueError, Image.DecompressionBombError):
            broken.append(p)
            continue

        digest = hashlib.sha256(p.read_bytes()).hexdigest()
        if digest in exact_seen:
            duplicates.append((p, exact_seen[digest], "exact"))
            continue
        if h in dhash_seen:
            duplicates.append((p, dhash_seen[h], "visual"))
            continue
        exact_seen[digest] = p
        dhash_seen[h] = p
        keep.append({"path": str(p.relative_to(ROOT)), "label": p.parent.name})

    # Pindahkan yang ditolak ke data/rejected (bukan dihapus)
    for p in broken:
        dest = REJECTED / "broken" / p.parent.name
        dest.mkdir(parents=True, exist_ok=True)
        shutil.move(str(p), dest / p.name)
    for p, _, kind in duplicates:
        dest = REJECTED / f"duplicate_{kind}" / p.parent.name
        dest.mkdir(parents=True, exist_ok=True)
        shutil.move(str(p), dest / p.name)

    df = pd.DataFrame(keep)
    print(f"Rusak dipindah: {len(broken)}")
    print(f"Duplikat dipindah: {len(duplicates)} (exact: {sum(k=='exact' for *_, k in duplicates)}, "
          f"visual: {sum(k=='visual' for *_, k in duplicates)})")
    print(f"Tersisa: {len(df)}")
    print("Per kelas setelah cleaning:")
    print(df["label"].value_counts().to_string())

    # Subset acak per kelas. Gambar di luar subset tetap di data/raw, hanya tidak dipakai.
    if MAX_PER_CLASS is not None:
        parts = [
            g.sample(n=min(len(g), MAX_PER_CLASS), random_state=SEED)
            for _, g in df.groupby("label")
        ]
        df = pd.concat(parts, ignore_index=True)
        print(f"\nSubset {MAX_PER_CLASS} per kelas:")
        print(df["label"].value_counts().to_string())

    # Split 70 / 15 / 15, stratified per kelas
    val_ratio = CFG["data"]["val_ratio"]
    test_ratio = CFG["data"]["test_ratio"]
    train_df, temp_df = train_test_split(
        df, test_size=val_ratio + test_ratio, stratify=df["label"], random_state=SEED
    )
    val_df, test_df = train_test_split(
        temp_df,
        test_size=test_ratio / (val_ratio + test_ratio),
        stratify=temp_df["label"],
        random_state=SEED,
    )

    SPLITS.mkdir(parents=True, exist_ok=True)
    for name, part in [("train", train_df), ("val", val_df), ("test", test_df)]:
        part.sort_values("path").to_csv(SPLITS / f"{name}.csv", index=False)

    print("\nSplit:")
    summary = pd.DataFrame(
        {
            "train": train_df["label"].value_counts(),
            "val": val_df["label"].value_counts(),
            "test": test_df["label"].value_counts(),
        }
    ).fillna(0).astype(int)
    summary.loc["TOTAL"] = summary.sum()
    print(summary.to_string())

    # Ringkasan EDA
    print("\nMode warna:", dict(modes))
    print("Ukuran gambar (10 teratas):", sizes.most_common(10))
    print(f"Ukuran unik: {len(sizes)}")


if __name__ == "__main__":
    main()

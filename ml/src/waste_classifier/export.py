"""Tahap 7: ekspor checkpoint ke ONNX, verifikasi hasilnya terhadap PyTorch, dan ukur latensi.

Ekspor ini membuat inferensi di server tidak bergantung pada PyTorch (PLAN §9).
Butuh extra `export`: uv sync --extra export

Pemakaian (dari folder ml/):
    uv run waste-export

Keluaran: models/best.onnx (tidak di-commit) dan reports/parity_reference.json (di-commit).
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
from pathlib import Path

import numpy as np
import torch

from waste_classifier.data import WasteDataset, eval_transform, file_sha256
from waste_classifier.model import load_checkpoint, state_dict_sha256
from waste_classifier.train import load_cfg

ROOT = Path(__file__).resolve().parents[2]
OPSET = 18  # default exporter dynamo; tanpa konversi versi opset
INPUT_NAME = "image"
OUTPUT_NAME = "logits"
LATENCY_TARGET_MS = 200.0  # PLAN §1: inferensi ≤ 200 ms per gambar pada CPU


def export_onnx(ckpt_path: Path, out_path: Path) -> Path:
    """Ekspor checkpoint ke ONNX dengan dimensi batch yang dinamis."""
    model, ckpt = load_checkpoint(str(ckpt_path), "cpu")
    size = ckpt["image_size"]
    dummy = torch.randn(1, 3, size, size)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    batch = torch.export.Dim("batch")
    torch.onnx.export(
        model,
        (dummy,),
        str(out_path),
        input_names=[INPUT_NAME],
        output_names=[OUTPUT_NAME],
        dynamic_shapes=({0: batch},),
        opset_version=OPSET,
        dynamo=True,
    )

    # Simpan bobot di dalam satu file .onnx (bukan .onnx.data terpisah) agar mudah dideploy.
    import onnx

    model_proto = onnx.load(str(out_path))  # ikut memuat data eksternal bila ada
    onnx.save(model_proto, str(out_path), save_as_external_data=False)
    stale_data = out_path.with_name(out_path.name + ".data")
    if stale_data.exists():
        stale_data.unlink()
    return out_path


def _onnx_session(onnx_path: Path):
    import onnxruntime as ort  # hanya dibutuhkan saat ekspor/verifikasi (extra `export`)

    return ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])


def verify_onnx(ckpt_path: Path, onnx_path: Path, split_csv: Path, n: int = 16) -> dict:
    """Bandingkan logit ONNX dengan PyTorch pada n gambar dari split, sekaligus cek kontrak backend."""
    model, ckpt = load_checkpoint(str(ckpt_path), "cpu")
    _check_contract(onnx_path, ckpt["image_size"], len(ckpt["classes"]))
    ds = WasteDataset(split_csv, ckpt["classes"], eval_transform(ckpt["image_size"]))
    x = torch.stack([ds[i][0] for i in range(min(n, len(ds)))])
    with torch.no_grad():
        ref = model(x).numpy()
    (out,) = _onnx_session(onnx_path).run(None, {INPUT_NAME: x.numpy()})
    return {
        "n": len(x),
        "max_abs_diff": float(np.abs(ref - out).max()),
        "argmax_agreement": float((ref.argmax(1) == out.argmax(1)).mean()),
    }


def _check_contract(onnx_path: Path, size: int, n_classes: int) -> None:
    """Gagalkan ekspor jika nama, tipe, atau bentuk berubah dari kontrak ml/PLAN.md §9.2."""
    sess = _onnx_session(onnx_path)
    inp, out = sess.get_inputs()[0], sess.get_outputs()[0]
    ok = (
        inp.name == INPUT_NAME
        and inp.type == "tensor(float)"
        and isinstance(inp.shape[0], str)
        and list(inp.shape[1:]) == [3, size, size]
        and out.name == OUTPUT_NAME
        and out.type == "tensor(float)"
        and isinstance(out.shape[0], str)
        and list(out.shape[1:]) == [n_classes]
    )
    if not ok:
        raise ValueError(f"kontrak ONNX berubah: input {inp.name} {inp.shape}, output {out.name} {out.shape}")


def write_parity_reference(ckpt_path: Path, onnx_path: Path, split_csv: Path, out_path: Path) -> Path:
    """Tulis probabilitas PyTorch semua gambar split sebagai acuan tes paritas backend (ml/PLAN.md §9.4)."""
    model, ckpt = load_checkpoint(str(ckpt_path), "cpu")
    ds = WasteDataset(split_csv, ckpt["classes"], eval_transform(ckpt["image_size"]))
    x = torch.stack([ds[i][0] for i in range(len(ds))])
    with torch.no_grad():
        probs = torch.softmax(model(x), dim=1).tolist()
    payload = {
        "onnx_sha256": file_sha256(onnx_path),
        "weights_sha256": state_dict_sha256(ckpt["state_dict"]),
        "classes": ckpt["classes"],
        "image_size": ckpt["image_size"],
        "images": [
            {"path": row.path, "label": row.label, "probabilities": p}
            for row, p in zip(ds.df.itertuples(index=False), probs)
        ],
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2) + "\n")
    return out_path


def benchmark(ckpt_path: Path, onnx_path: Path, runs: int = 50) -> dict:
    """Latensi median per gambar (satu gambar per panggilan, CPU). Tidak termasuk membaca file."""
    model, ckpt = load_checkpoint(str(ckpt_path), "cpu")
    size = ckpt["image_size"]
    x = torch.randn(1, 3, size, size)
    xn = x.numpy()
    sess = _onnx_session(onnx_path)

    def median_ms(fn) -> float:
        for _ in range(5):  # pemanasan
            fn()
        times = []
        for _ in range(runs):
            t0 = time.perf_counter()
            fn()
            times.append((time.perf_counter() - t0) * 1000)
        return statistics.median(times)

    with torch.no_grad():
        pytorch_ms = median_ms(lambda: model(x))
    onnx_ms = median_ms(lambda: sess.run(None, {INPUT_NAME: xn}))
    return {"pytorch_cpu_ms": round(pytorch_ms, 2), "onnx_cpu_ms": round(onnx_ms, 2)}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Ekspor checkpoint ke ONNX dan verifikasi.")
    parser.add_argument("--checkpoint", default=str(ROOT / "models" / "best.pt"))
    parser.add_argument("--out", default=str(ROOT / "models" / "best.onnx"))
    parser.add_argument("--tol", type=float, default=1e-3, help="toleransi selisih logit maksimum")
    args = parser.parse_args(argv)

    cfg = load_cfg()
    ckpt_path, out_path = Path(args.checkpoint), Path(args.out)
    if not ckpt_path.is_file():
        print(f"Checkpoint tidak ditemukan: {ckpt_path}. Jalankan waste-train dulu.", file=sys.stderr)
        return 1

    export_onnx(ckpt_path, out_path)
    print(f"ONNX ditulis ke {out_path}")

    split_csv = ROOT / cfg["data"]["splits_dir"] / "val.csv"
    result = verify_onnx(ckpt_path, out_path, split_csv)
    print(
        f"Verifikasi ({result['n']} gambar val): selisih logit maks {result['max_abs_diff']:.2e}, "
        f"kesesuaian label {result['argmax_agreement']:.0%}"
    )
    speed = benchmark(ckpt_path, out_path)
    print(f"Latensi CPU (median per gambar): PyTorch {speed['pytorch_cpu_ms']} ms, "
          f"ONNX {speed['onnx_cpu_ms']} ms (target ≤ {LATENCY_TARGET_MS:.0f} ms)")

    ok = result["max_abs_diff"] <= args.tol and result["argmax_agreement"] == 1.0
    if not ok:
        print("GAGAL: hasil ONNX tidak sesuai PyTorch.", file=sys.stderr)
        return 1

    parity_path = write_parity_reference(
        ckpt_path, out_path, split_csv, ROOT / cfg["output"]["reports_dir"] / "parity_reference.json"
    )
    print(f"Referensi paritas ditulis ke {parity_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

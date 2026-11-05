# Waste Classifier

Klasifikasi gambar sampah ke tiga kategori: `organic`, `plastic`, `paper`.

Rencana lengkap ada di [PLAN.md](PLAN.md).

## Setup

Membutuhkan Python 3.11+ dan [uv](https://docs.astral.sh/uv/).

```bash
uv sync --extra dev        # buat .venv dan install dependensi
uv run pytest              # jalankan test
uv run ruff check .        # lint
```

## Struktur

```
configs/      konfigurasi training (train.yaml)
data/         dataset (tidak di-commit)
models/       checkpoint model (tidak di-commit)
reports/      metrik dan hasil evaluasi
scripts/      utilitas data & ekspor model
src/          kode package waste_classifier
tests/        unit test
```

## Pemakaian

```bash
uv run waste-train                    # latih model, simpan models/best.pt
uv run waste-evaluate                 # evaluasi test set (sekali; --force untuk menimpa hasil)
uv run waste-predict foto.jpg         # prediksi satu atau beberapa gambar
```

Jumlah gambar per kelas diatur di `configs/train.yaml` (`data.max_per_class`).

## Status

- [x] Tahap 1: setup repo dan environment
- [x] Tahap 2: pencarian dataset (Custom Waste Classification, CC BY-NC-SA 4.0, untuk tugas kuliah)
- [x] Tahap 3: validasi, deduplikasi, split. Fase ini memakai 70 gambar per kelas (210 total).
- [x] Tahap 4: baseline (val macro F1 0.967 pada 210 gambar, `scripts/baseline.py`)
- [x] Tahap 5: training (checkpoint terbaik `head:2`, val macro F1 0.936)
- [x] Tahap 6: evaluasi test set, dilakukan sekali (akurasi 0.844, macro F1 0.839). Target di atas 80% tercapai.
- [ ] Tahap 7: inferensi CLI sudah ada; ekspor ONNX belum (opsional)
- [ ] Tahap 8: testing & dokumentasi (21 tes lulus; dokumentasi belum lengkap)
- [ ] Lanjutan: REST API (FastAPI) & deployment server

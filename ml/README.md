# Waste Classifier

Model klasifikasi gambar sampah ke tiga kategori: **`organic`**, **`plastic`**, dan **`paper`**.

Proyek ini mencakup pipeline data, training transfer learning, evaluasi, inferensi CLI, ekspor
ONNX untuk backend Node.js, serta REST API lokal untuk pengujian. Rencana kerja lengkap ada di
[PLAN.md](PLAN.md); sumber dan lisensi dataset ada di [data/SOURCES.md](data/SOURCES.md).

**Status:** tahap 1–9 selesai. Target akurasi test di atas 80% tercapai (akurasi **0.844**,
macro F1 **0.839**).

---

## Ringkasan

| Item | Nilai |
| --- | --- |
| Tugas | Klasifikasi gambar 3 kelas: `organic`, `plastic`, `paper` |
| Arsitektur | MobileNetV3-Large, pretrained ImageNet |
| Input | RGB, 224×224, dinormalisasi ImageNet |
| Dataset | 210 gambar (70 per kelas) dari Custom Waste Classification Dataset |
| Split | 147 train / 31 val / 32 test |
| Checkpoint terbaik | `models/best.pt` (`head:2`, val macro F1 0.936) |
| Hasil test | Akurasi 0.844, macro F1 0.839 |
| Artefak produksi | `models/best.onnx` (ONNX opset 18, batch dinamis) |
| Latensi CPU | ONNX sekitar 4 ms per gambar; target ≤ 200 ms |
| Runtime produksi | Backend Express + ONNX Runtime (`../be/`), bukan Python |

Python hanya dipakai untuk data preparation, training, evaluasi, ekspor, dan alat uji lokal.
Inferensi produksi berjalan di backend Node.js memakai `models/best.onnx`.

---

## Fitur

- **Transfer learning dua tahap:** 5 epoch melatih classifier head dengan backbone beku, lalu
  15 epoch fine-tuning seluruh model (dibatasi early stopping).
- **Augmentasi ringan:** random resized crop, horizontal flip, rotasi 10°, dan color jitter.
- **Penanganan data tidak seimbang:** class weights dihitung dari distribusi train.
- **Evaluasi disiplin:** test set hanya dipakai sekali; `waste-evaluate` menolak menimpa hasil
  tanpa `--force`.
- **Inferensi CLI:** satu atau beberapa gambar sekaligus, dengan confidence dan probabilitas
  per kelas.
- **Ekspor ONNX terverifikasi:** memeriksa kontrak input/output, membandingkan logit dengan
  PyTorch, mengukur latensi CPU, dan menulis referensi paritas untuk backend.
- **Parity reference:** probabilitas PyTorch untuk seluruh 31 gambar validasi, dipakai tes
  backend agar preprocessing Node.js tidak bergeser.
- **REST API lokal (FastAPI):** `POST /predict` dan `GET /health`, termasuk validasi upload,
  batas 10 MB, EXIF orientation, dan inferensi di threadpool.
- **Reproducibility:** semua hyperparameter di `configs/train.yaml`, seed tetap, lock file `uv`,
  metadata checkpoint (commit git, versi library, fingerprint dataset, hash bobot).
- **33 tes otomatis** dan lint `ruff` bersih.

---

## Hasil

### Metrik utama

| Model | Split | Accuracy | Macro F1 |
| --- | --- | --- | --- |
| Baseline: MobileNetV3 embedding + logistic regression | val (31) | 0.9677 | 0.9666 |
| Transfer learning, checkpoint `head:2` | val (31) | 0.9355 | 0.9364 |
| Transfer learning, checkpoint `head:2` | test (32) | **0.8438** | **0.8385** |

Baseline hanya pembanding minimum; model final dipilih berdasarkan validation macro F1 selama
training, dan test set tidak dipakai untuk memilih model.

### Metrik per kelas (test)

| Kelas | Precision | Recall | F1 | Support |
| --- | --- | --- | --- | --- |
| `organic` | 0.8333 | 1.0000 | 0.9091 | 10 |
| `plastic` | 0.8750 | 0.6364 | 0.7368 | 11 |
| `paper` | 0.8333 | 0.9091 | 0.8696 | 11 |

Confusion matrix (baris = aktual, kolom = prediksi):

| Aktual \ Prediksi | `organic` | `plastic` | `paper` |
| --- | --- | --- | --- |
| `organic` | 10 | 0 | 0 |
| `plastic` | 2 | 7 | 2 |
| `paper` | 0 | 1 | 10 |

Dari 32 gambar test, 5 salah klasifikasi. Kelas `plastic` paling lemah (4 dari 11 gambar
tertukar), terutama dengan `organic` dan `paper`. Detail kesalahan ada di
`reports/test_errors.csv`, confusion matrix di `reports/test_confusion_matrix.png`, dan kurva
training di `reports/train_curves.png`.

### Hasil ekspor ONNX

- Selisih logit maksimum ONNX vs PyTorch: **5e-6** (toleransi 1e-3).
- Kesesuaian label: **100%** pada gambar validasi yang diuji.
- Latensi CPU median ONNX: **sekitar 4 ms per gambar** (target ≤ 200 ms).
- Referensi paritas ditulis untuk seluruh 31 gambar `data/splits/val.csv`.

Angka di atas berasal dari ekspor terakhir; jalankan ulang `uv run waste-export` setiap
checkpoint berubah.

---

## Instalasi

Kebutuhan:

- Python **3.11+**
- [uv](https://docs.astral.sh/uv/)

Dari folder `ml/`:

```bash
# dependensi inti (training, evaluasi, CLI prediksi)
uv sync

# semua dependensi: test, ekspor ONNX, dan REST API lokal
uv sync --extra dev --extra export --extra api
```

Extra yang tersedia:

| Extra | Isi | Dipakai untuk |
| --- | --- | --- |
| `dev` | pytest, ruff, httpx2 | test dan lint |
| `export` | onnx, onnxruntime, onnxscript | `waste-export` dan tes paritas |
| `api` | fastapi, python-multipart, uvicorn | `waste-api` (alat uji lokal) |

Tanpa `--extra export`, tes ekspor dilewati. Tanpa `--extra api`, tes API dilewati.

---

## Dataset

### Sumber dan lisensi

Dataset yang dipakai: **Custom Waste Classification Dataset** oleh `wasifmahmood01` di Kaggle.
Enam dari sembilan kelas aslinya tidak dipakai; hanya tiga kelas yang dipetakan ke target:

| Kelas asli | Kelas target |
| --- | --- |
| `organic waste` | `organic` |
| `plastic waste` | `plastic` |
| `paper waste` | `paper` |

Lisensi: **CC BY-NC-SA 4.0**. Artinya:

- Wajib atribusi ke sumber dataset.
- **Hanya untuk penggunaan non-komersial**; proyek ini dipakai untuk tugas kuliah.
- Distribusi turunan wajib memakai lisensi yang sama.

Detail lengkap, termasuk kandidat dataset lain yang tidak dipakai, ada di
[data/SOURCES.md](data/SOURCES.md). Gambar dataset **tidak di-commit** ke repository.

### Struktur data

```text
data/
├── raw/                 # gambar asli per kelas (tidak di-commit)
│   ├── organic/
│   ├── plastic/
│   └── paper/
├── processed/           # opsional, hasil resize/cleaning
├── rejected/            # gambar rusak/duplikat dipindah ke sini, bukan dihapus
├── splits/              # train.csv, val.csv, test.csv (path + label)
└── SOURCES.md
```

### Menyiapkan data

1. Salin gambar ke `data/raw/<kelas>/` sesuai tiga kelas target.
2. Jalankan:

```bash
uv run python scripts/prepare_data.py
```

Skrip ini:

- Memvalidasi bahwa setiap file benar-benar gambar yang bisa dibuka.
- Menghapus duplikat exact (SHA-256) dan duplikat visual (difference hash).
- Memindahkan gambar rusak/duplikat ke `data/rejected/` agar masih bisa dipulihkan.
- Mengambil subset acak `data.max_per_class` per kelas (seed dari config; `null` = pakai semua).
- Membuat split stratified **70% train / 15% val / 15% test** sebelum augmentasi.
- Menulis `data/splits/train.csv`, `val.csv`, dan `test.csv`.

Jumlah per kelas diatur di `configs/train.yaml`:

```yaml
data:
  max_per_class: 70   # 70 gambar acak per kelas; null = semua gambar
```

Fase ini memakai 70 gambar per kelas (210 total): 147 train, 31 val, 32 test.

---

## Struktur Project

```text
ml/
├── configs/
│   └── train.yaml            # seed, path, hyperparameter, model, output
├── data/                     # dataset lokal (tidak di-commit)
│   ├── raw/
│   ├── rejected/
│   ├── splits/
│   └── SOURCES.md
├── models/                   # artefak model (tidak di-commit)
│   ├── best.pt               # checkpoint PyTorch
│   ├── best.onnx             # model untuk backend Node.js
│   └── baseline_features.npz # cache fitur baseline
├── notebooks/                # ruang untuk eksplorasi/EDA
├── reports/                  # metrik, log, confusion matrix, referensi paritas
├── scripts/
│   ├── prepare_data.py       # validasi, dedup, subset, split
│   └── baseline.py           # baseline embedding + logistic regression
├── src/waste_classifier/
│   ├── data.py               # dataset, transform, fingerprint, load gambar
│   ├── model.py              # MobileNetV3/EfficientNet, freeze/unfreeze, checkpoint
│   ├── train.py              # dua tahap training + metadata + log
│   ├── evaluate.py           # evaluasi test set + confusion matrix + kurva
│   ├── predict.py            # Predictor dan CLI prediksi
│   ├── export.py             # ekspor ONNX, verifikasi, latensi, parity reference
│   └── api.py                # REST API FastAPI lokal
├── tests/                    # 33 tes
├── PLAN.md                   # rencana dan keputusan proyek
├── README.md
├── pyproject.toml
└── uv.lock
```

---

## Pemakaian

Semua perintah dijalankan dari folder `ml/`.

### 1. Baseline

```bash
uv run python scripts/baseline.py
```

Mengekstrak embedding MobileNetV3-Large pretrained dari split train dan val, lalu melatih
logistic regression. Hasil (val accuracy dan macro F1) ditulis ke
`reports/baseline_metrics.json`. Fitur di-cache di `models/baseline_features.npz` dan otomatis
diekstrak ulang jika isi split berubah. Test set tidak dipakai di sini.

### 2. Training

```bash
uv run waste-train
```

Alur training:

1. **Tahap head:** backbone dibekukan; hanya classifier head yang dilatih
   (`epochs_head: 5`, `lr_head: 1e-3`). BatchNorm backbone tetap mode eval agar statistik
   ImageNet tidak berubah.
2. **Tahap fine-tuning:** seluruh parameter dilatih dengan learning rate kecil
   (`epochs_finetune: 15`, `lr_finetune: 1e-4`).
3. Model terbaik berdasarkan **validation macro F1** disimpan ke `models/best.pt`.
4. Early stopping dengan patience 5 epoch.

Konfigurasi utama di `configs/train.yaml`:

| Parameter | Nilai |
| --- | --- |
| Seed | 42 |
| Arsitektur | `mobilenet_v3_large` (alternatif: `efficientnet_b0`) |
| Pretrained | `true` |
| Dropout | 0.2 |
| Batch size | 32 |
| Optimizer | AdamW |
| Scheduler | CosineAnnealingLR |
| Weight decay | 1e-4 |
| Label smoothing | 0.1 |
| Class weights | Dihitung otomatis dari train |
| Device | `auto` → MPS → CUDA → CPU |

Output:

- `models/best.pt`
- `reports/train_log.csv` — loss, accuracy, macro F1, dan durasi per epoch
- `reports/train_meta.json` — salinan metadata checkpoint terbaik

### 3. Evaluasi test set

```bash
uv run waste-evaluate
```

Test set hanya boleh dipakai **sekali**. Jika `reports/test_metrics.json` sudah ada, perintah
ini menolak menimpa dan mengembalikan exit code 1. Gunakan `--force` hanya jika memang perlu
mengulang evaluasi.

Output:

- `reports/test_metrics.json` — akurasi, macro F1, metrik per kelas, confusion matrix
- `reports/test_errors.csv` — daftar gambar yang salah klasifikasi beserta confidence
- `reports/test_confusion_matrix.png`
- `reports/train_curves.png`

### 4. Prediksi via CLI

```bash
uv run waste-predict foto.jpg
uv run waste-predict foto1.jpg foto2.jpg --checkpoint models/best.pt
```

Contoh output:

```text
foto.jpg	plastic	0.580	[organic=0.240, plastic=0.580, paper=0.180]
```

- Argumen pertama: satu atau beberapa path gambar.
- `--checkpoint`: default `models/best.pt`.
- `--device`: `cpu` (default), `mps`, atau `cuda`.

### 5. Ekspor ONNX

```bash
uv run waste-export
```

Perintah ini:

- Mengeskpor checkpoint ke `models/best.onnx` (opset 18, batch dinamis, satu file).
- Memeriksa kontrak input/output sesuai kebutuhan backend.
- Membandingkan logit ONNX dengan PyTorch pada gambar validasi (toleransi 1e-3).
- Mengukur latensi median CPU untuk PyTorch dan ONNX.
- Menulis `reports/parity_reference.json` untuk seluruh 31 gambar val.

Ekspor gagal jika kontrak berubah atau hasil ONNX tidak sesuai PyTorch.

### 6. REST API lokal

```bash
uv sync --extra api
uv run waste-api                    # http://127.0.0.1:8000, dokumentasi di /docs
uv run waste-api --host 0.0.0.0     # bisa diakses jaringan lain
```

Checkpoint dipilih lewat `--checkpoint` atau variabel lingkungan `WASTE_CHECKPOINT`
(default `models/best.pt`).

Endpoint:

- `GET /health` — status, nama model, epoch checkpoint, dan daftar kelas.
- `POST /predict` — satu file gambar (multipart, field `file`, maksimum 10 MB). Respons berisi
  `label`, `confidence`, dan `probabilities`.

```bash
curl -F "file=@foto.jpg" http://127.0.0.1:8000/predict
# {"label":"plastic","confidence":0.58,"probabilities":{"organic":0.24,"plastic":0.58,"paper":0.18}}
```

**Peringatan:** API ini alat uji lokal, bukan jalur produksi. Belum ada autentikasi, rate limit,
atau CORS. Jangan diekspos ke internet tanpa lapisan tambahan.

---

## Kontrak ONNX untuk Backend

Backend Node.js memakai ONNX Runtime (`onnxruntime-node`); tidak ada service Python atau
PyTorch saat runtime.

| Item | Nilai |
| --- | --- |
| File | `models/best.onnx` (sekitar 16 MB, opset 18) |
| Input | `image`, bentuk `[N, 3, 224, 224]`, `tensor(float)`, RGB ternormalisasi |
| Output | `logits`, bentuk `[N, 3]`, `tensor(float)`, belum softmax |
| Urutan kelas | index 0 `organic`, 1 `plastic`, 2 `paper` |
| Batch | Dinamis |

Probabilitas dihitung di backend dengan softmax atas logit.

### Preprocessing yang harus sama

Harus identik dengan `eval_transform` di `src/waste_classifier/data.py`:

1. Terapkan rotasi EXIF (foto HP sering menyimpan orientasi di metadata).
2. Buang channel alpha dan pastikan hasilnya RGB.
3. Resize sisi terpendek ke **256** dengan rasio dipertahankan.
4. Center crop **224×224**; offset kiri/atas = `round((ukuran − 224) / 2)`.
5. Ubah piksel ke rentang [0, 1], lalu normalisasi per channel:
   mean `(0.485, 0.456, 0.406)`, std `(0.229, 0.224, 0.225)`.

Jangan resize langsung ke 224×224 karena area gambar yang terlihat akan berbeda. Library
resize Node (`sharp`) juga tidak identik dengan PIL/torchvision; backend memakai resampler
bilinear bergaya PIL dan memverifikasi hasilnya lewat referensi paritas.

### Referensi paritas

`reports/parity_reference.json` berisi:

- `onnx_sha256` — hash file ONNX
- `weights_sha256` — hash bobot checkpoint (harus sama dengan `reports/train_meta.json`)
- `classes` dan `image_size`
- probabilitas PyTorch untuk seluruh 31 gambar val beserta path dan label

Gunakan file ini untuk tes paritas backend. Jalankan ulang `waste-export` setiap checkpoint
berubah. Validasi memakai `val.csv`, bukan `test.csv`, agar test set tetap bersih.

Artefak `models/best.onnx` tidak di-commit; salin ke `be/models/best.onnx` saat setup/deploy
dan pastikan hash-nya cocok dengan referensi.

---

## Reproducibility

- Semua hyperparameter dan path berasal dari `configs/train.yaml`; tidak ada nilai penting yang
  di-hardcode.
- Seed 42 diterapkan ke `random`, NumPy, dan PyTorch.
- Versi library dikunci di `uv.lock`; versi torch/torchvision juga dicatat di metadata.
- Setiap checkpoint menyimpan metadata:
  - waktu training,
  - commit git dan daftar file yang belum ter-commit,
  - versi torch dan torchvision,
  - sidik jari dataset (hash CSV split dan jumlah per kelas),
  - seed dan seluruh config,
  - `weights_sha256`.
- Salinan metadata checkpoint terbaik ada di `reports/train_meta.json`.
- `reports/train_log.csv` mencatat loss dan metrik setiap epoch.
- `reports/test_metrics.json` dibuat sekali dan tidak dipakai untuk memilih model.
- `reports/parity_reference.json` mengikat artefak ONNX ke bobot checkpoint dan hasil PyTorch.
- Dataset dan model tidak di-commit; lihat `.gitignore`. File PNG di `reports/` juga diabaikan,
  sedangkan metrik JSON/CSV tetap dilacak.

Catatan: metadata pada checkpoint saat ini ditambahkan setelah training (backfill). Bobot sudah
diverifikasi identik per tensor dengan checkpoint asli; backup ada di
`models/best_pre_meta.pt`. Logika training tidak berubah saat metadata ditambahkan.

---

## Testing dan Lint

```bash
uv run pytest
uv run ruff check .
```

Dengan seluruh extra terpasang: **33 tes lulus**. Cakupan tes meliputi transform dan EXIF,
freeze/unfreeze backbone, training end-to-end pada dataset kecil, logging, metadata checkpoint,
CLI prediksi, evaluasi dan guard `--force`, ekspor ONNX untuk batch dinamis, referensi paritas,
serta kontrak REST API.

Tes `test_export.py` dilewati jika `onnx`/`onnxruntime` tidak terpasang. Tes `test_api.py`
dilewati jika `fastapi`/`httpx2` tidak terpasang.

---

## Batasan dan Catatan

- **Test set kecil:** hanya 32 gambar, sehingga angka akurasi memiliki variansi yang besar.
  Test set sudah dipakai sekali; jangan dipakai lagi untuk memilih model atau hyperparameter.
- **Kelas `plastic` lemah:** recall 0.636; 4 dari 11 gambar plastik salah klasifikasi.
- **Hanya 3 kelas:** gambar kaca, logam, atau jenis sampah lain tetap akan diprediksi sebagai
  salah satu dari tiga kelas. Belum ada kelas `unknown`.
- **Domain data terbatas:** dataset berasal dari sumber publik dan belum tentu cocok dengan
  kondisi nyata.
- **API lokal tanpa keamanan:** tanpa autentikasi, rate limit, atau CORS.
- **Ambang `needsReview`:** backend menandai confidence di bawah 0.5 untuk ditinjau
  (lihat `../be/PLAN.md` §7.6). Nilai ini masih sementara.
- **Augmentasi hanya untuk train:** validasi, test, dan inferensi memakai transform
  deterministik.
- **`notebooks/`** belum berisi notebook; eksplorasi data dilakukan lewat
  `scripts/prepare_data.py`.

---

## Langkah Berikutnya (Opsional)

- Tambah data `plastic` dan `organic` untuk memperbaiki recall kelas plastik.
- Jika data ditambah, tetapkan test set baru; test set saat ini sudah terpakai.
- Salin `models/best.onnx` ke `be/models/` dan verifikasi `onnx_sha256`.
- Putuskan apakah `api.py` dipertahankan sebagai alat lokal atau dihapus setelah integrasi
  backend stabil.
- Setelah ada laporan nyata, bandingkan `predicted_category` dengan `category` untuk mengukur
  akurasi di lapangan.

---

## Atribusi

Model dilatih memakai **Custom Waste Classification Dataset** oleh `wasifmahmood01` (Kaggle),
berlisensi **CC BY-NC-SA 4.0**. Proyek ini hanya untuk tugas kuliah (non-komersial). Jika
menggunakan atau mendistribusikan turunan dataset/model, sertakan atribusi dan patuhi ketentuan
lisensi tersebut.

Terima kasih juga untuk TrashNet (Gary Thung) yang diperiksa sebagai kandidat dataset, meskipun
tidak dipakai pada fase ini.

---

## Referensi

- [PLAN.md](PLAN.md) — tujuan, ruang lingkup, keputusan, risiko, dan kontrak integrasi backend.
- [data/SOURCES.md](data/SOURCES.md) — sumber dataset, pemetaan kelas, dan lisensi.
- [../be/PLAN.md](../be/PLAN.md) — rencana backend Express/ONNX Runtime.

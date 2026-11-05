# PLAN: Klasifikasi Gambar Sampah (3 Kelas)

## 1. Tujuan

Membangun model machine learning yang menerima sebuah gambar sampah dan mengklasifikasikannya ke salah satu dari tiga kategori:

| Kelas     | Deskripsi singkat                                          |
| --------- | ---------------------------------------------------------- |
| `organic` | Sampah organik: sisa makanan, daun, sayur/buah, dll.       |
| `plastic` | Sampah plastik: botol, kantong, wadah, gelas plastik, dll. |
| `paper`   | Sampah kertas: kardus, koran, buku, kertas kantor, dll.    |

**Target awal:**

- Akurasi test di atas 80% dan macro F1 di atas 0.80 (target diturunkan dari 85% atas permintaan).
- Inferensi ≤ 200 ms per gambar pada CPU.
- Model dapat dijalankan lewat CLI dan API sederhana (opsional: aplikasi web/mobile).

## 2. Ruang Lingkup

**Termasuk (fase sekarang):**

- Pencarian dan pengumpulan dataset (dipandu step by step).
- Pembersihan dan pembagian dataset.
- Training model klasifikasi gambar (transfer learning).
- Evaluasi dan analisis kesalahan.
- Inferensi sederhana via CLI (`predict.py`) untuk uji model.
- Dokumentasi dan reproducibility.

**Ditunda ke fase berikutnya:**

- REST API dengan backend framework (FastAPI), karena model akan dijalankan di server. Dikerjakan setelah model selesai.
- Containerisasi dan deployment server.

**Tidak termasuk:**

- Deteksi objek (bounding box) dan segmentasi.
- Klasifikasi multi-objek dalam satu gambar.
- Deployment ke perangkat IoT / edge khusus.
- Klasifikasi kategori sampah lain (logam, kaca, B3, dll.).

## 3. Dataset

### 3.1 Sumber

Pengguna belum memiliki dataset. Pencarian dilakukan bertahap dengan panduan (lihat Tahap 2).

- **Kandidat publik:** _TrashNet_ (kertas, plastik, dll.) dan _Garbage Classification_ (Kaggle, termasuk kelas organik/biological). Perlu dipetakan ulang ke 3 kelas target dan dicek lisensinya.
- **Pelengkap:** Foto mandiri (kamera HP) untuk menambah kelas yang kurang, terutama organik, dan kondisi nyata.
- Setiap sumber dicatat di `data/SOURCES.md` beserta lisensinya.

### 3.2 Struktur Data

```
data/
├── raw/                 # Data asli, tidak diubah
│   ├── organic/
│   ├── plastic/
│   └── paper/
├── processed/           # Hasil resize & cleaning
└── splits/              # train / val / test (CSV berisi path + label)
```

### 3.3 Aturan Data

- Target awal minimal **1.000 gambar per kelas** (ideal 2.000+), dengan jumlah yang seimbang.
- **Keputusan fase ini: 70 gambar per kelas (210 total)**, atas permintaan. Target 1.000+ ditunda ke fase pengumpulan data berikutnya. Jumlahnya diatur di `configs/train.yaml` (`data.max_per_class`). Hasil split: train 147, val 31, test 32.
- Hapus duplikat (cek dengan hash atau perceptual hash).
- Hapus gambar rusak, tidak relevan, atau berisi lebih dari satu jenis sampah yang tidak jelas labelnya.
- Pembagian: **70% train / 15% val / 10–15% test**, dibagi sebelum augmentasi dan **stratified** per kelas.
- Test set tidak boleh bocor ke training (cek duplikat lintas split).

### 3.4 Lisensi & Etika

- Catat lisensi dan sumber setiap dataset di `data/SOURCES.md`.
- Jika memotret orang atau area pribadi, pastikan tidak ada identitas yang tampak atau ada persetujuan.

## 4. Pendekatan Model

- **Framework:** PyTorch (+ torchvision atau timm).
- **Arsitektur awal:** Transfer learning dengan **MobileNetV3-Small/Large** atau **EfficientNet-B0** (pretrained ImageNet). Ringan dan cukup akurat untuk dijalankan di CPU.
- **Input:** 224×224 RGB.
- **Strategi training:**
  1. Freeze backbone, latih classifier head beberapa epoch.
  2. Unfreeze sebagian/seluruh backbone dengan learning rate kecil (fine-tuning).
- **Augmentasi:** random resized crop, horizontal flip, rotasi kecil, color jitter ringan. Hindari flip vertikal jika tidak relevan.
- **Loss:** Cross-entropy (dengan label smoothing 0.1); gunakan class weights jika data tidak seimbang.
- **Optimizer:** AdamW + cosine learning rate schedule.
- **Early stopping** berdasarkan validation macro F1.

### Baseline

- Logistic regression di atas embedding pretrained (cepat, sebagai pembanding minimum).

## 5. Evaluasi

- **Metrik utama:** macro F1, akurasi, precision & recall per kelas.
- **Visualisasi:** confusion matrix, kurva loss/accuracy, daftar contoh salah klasifikasi.
- **Analisis error:** cek kelas mana yang sering tertukar (mis. kertas vs plastik yang mengilap) dan kondisi apa yang memicu kesalahan (latar ramai, pencahayaan gelap, sampah tertutup).
- **Test set** hanya dipakai **sekali** di akhir untuk laporan final.
- Lakukan uji robustness: gambar blur, rotasi, dan kondisi cahaya berbeda.

## 6. Struktur Project

```
ml/
├── PLAN.md
├── README.md
├── pyproject.toml          # atau requirements.txt
├── configs/
│   └── train.yaml          # hyperparameter & path
├── data/                   # (tidak di-commit; lihat .gitignore)
├── notebooks/
│   └── eda.ipynb           # eksplorasi data
├── src/
│   └── waste_classifier/
│       ├── __init__.py
│       ├── data.py         # dataset, split, augmentasi
│       ├── model.py        # definisi model
│       ├── train.py        # loop training
│       ├── evaluate.py     # metrik & confusion matrix
│       └── predict.py      # inferensi gambar tunggal/batch (CLI)
├── scripts/
│   ├── prepare_data.py     # dedup, resize, split
│   └── export_onnx.py      # opsional: ekspor model untuk server
├── models/                 # checkpoint terbaik (tidak di-commit)
├── reports/                # metrik, confusion matrix, gambar hasil
└── tests/
    ├── test_data.py
    ├── test_model.py
    └── test_predict.py
<!-- Fase lanjutan: api.py (FastAPI) dan test_api.py -->

```

## 7. Tahapan Kerja (Milestone)

| #   | Tahap                                                     | Output                                  | Estimasi              |
| --- | --------------------------------------------------------- | --------------------------------------- | --------------------- |
| 1   | Setup environment (venv, PyTorch, linter, git)            | Repo siap pakai                         | 0,5 hari              |
| 2   | Pencarian & pengumpulan dataset (dipandu)                 | Dataset mentah + `SOURCES.md`           | 2–3 hari              |
| 3   | EDA, preprocessing, dedup, split                          | `data/splits/*.csv`, laporan distribusi | 1–2 hari              |
| 4   | Baseline (embedding + logistic regression)                | Metrik baseline                         | 0,5 hari              |
| 5   | Training model transfer learning                          | Checkpoint terbaik                      | 2 hari                |
| 6   | Evaluasi & analisis error                                 | `reports/`                              | 1 hari                |
| 7   | Inferensi CLI (`predict.py`) & ekspor model               | Model siap dipakai                      | 0,5–1 hari            |
| 8   | Testing, dokumentasi, README                              | Test lulus, README lengkap              | 1 hari                |
| —   | **Fase lanjutan:** REST API (FastAPI) + deployment server | `api.py`, Dockerfile                    | setelah model selesai |

## 8. Reproducibility

- Seed tetap (`random`, `numpy`, `torch`) yang disimpan di `configs/train.yaml`.
- Semua hyperparameter berasal dari config, bukan hardcode.
- Simpan versi library di `requirements.txt` / `pyproject.toml` (lock file).
- Catat setiap eksperimen (MLflow atau Weights & Biases, atau CSV sederhana di `reports/`).
- Simpan metadata model: tanggal training, versi dataset, metrik, dan commit hash.

## 9. Deployment (Fase Lanjutan)

Model akan dijalankan di **server**. Bagian ini dikerjakan setelah model selesai dilatih.

- REST API dengan **FastAPI** (backend framework): endpoint `POST /predict` menerima file gambar, mengembalikan label + confidence per kelas.
- Containerisasi dengan **Docker**.
- Ekspor ke **ONNX** agar inferensi di server lebih cepat dan tidak bergantung pada PyTorch.

## 10. Risiko & Mitigasi

| Risiko                                         | Dampak                     | Mitigasi                                                              |
| ---------------------------------------------- | -------------------------- | --------------------------------------------------------------------- |
| Data organik sulit dikumpulkan                 | Kelas organik lemah        | Kumpulkan foto mandiri, gunakan augmentasi                            |
| Data tidak seimbang                            | Bias ke kelas mayoritas    | Class weights, oversampling, metrik macro F1                          |
| Kebocoran data antara train dan test           | Akurasi terlalu optimis    | Dedup hash, split sebelum augmentasi                                  |
| Lisensi dataset tidak jelas                    | Risiko hukum               | Catat sumber, pakai dataset berlisensi jelas                          |
| Kondisi nyata berbeda dari dataset             | Akurasi turun saat dipakai | Tambah data dari kondisi nyata, uji robustness                        |
| Gambar mengandung lebih dari satu jenis sampah | Label ambigu               | Tentukan aturan label (dominan) dan tambah kelas "unknown" bila perlu |

## 11. Keputusan

| Pertanyaan                | Keputusan                                                                    |
| ------------------------- | ---------------------------------------------------------------------------- |
| Punya dataset?            | Belum. Dicari bersama dengan panduan langkah demi langkah (Tahap 2).         |
| Tempat menjalankan model? | Server. Perlu backend API, tetapi dikerjakan setelah model selesai.          |
| Cakupan saat ini?         | Training model saja. REST API, antarmuka web/mobile, dan deployment ditunda. |
| Jumlah data fase ini?     | 70 gambar per kelas (210 total), subset acak dari data yang sudah dedup, seed 42. |
| Hasil test (sekali)?      | Akurasi 0.844, macro F1 0.839. Memenuhi target di atas 80%. Kelas plastik paling lemah (recall 0.64). |

## 12. Langkah Berikutnya

- [x] Setup repo dan environment (Tahap 1).
- [x] Pencarian dataset dengan panduan (Tahap 2): cek kandidat publik, lisensi, dan jumlah per kelas.
- [ ] (Opsional) Tambah data plastik dan organik untuk memperbaiki kelas plastik (recall 0.64). Target saat ini sudah tercapai.
- [ ] Jika data ditambah, tetapkan test set baru. Test set saat ini sudah terpakai sekali, jadi angkanya tidak bisa dipakai lagi untuk memilih model.
- [ ] Tentukan kebutuhan data tambahan (terutama organik dan plastik) setelah dataset awal terkumpul.

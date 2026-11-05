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
- Kategori laporan diisi otomatis dari foto oleh backend Node.js, memakai model ONNX ini (lihat §9).
- Model dapat dijalankan lewat CLI (`waste-predict`) untuk uji lokal.

## 2. Ruang Lingkup

**Termasuk (fase sekarang):**

- Pencarian dan pengumpulan dataset (dipandu step by step).
- Pembersihan dan pembagian dataset.
- Training model klasifikasi gambar (transfer learning).
- Evaluasi dan analisis kesalahan.
- Inferensi sederhana via CLI (`predict.py`) untuk uji model.
- Ekspor ONNX, kontrak model, dan referensi paritas untuk backend Node.js (§9).
- Dokumentasi dan reproducibility.

**Ditunda ke fase berikutnya:**

- Pengumpulan data tambahan (plastik dan organik) untuk memperbaiki recall kelas plastik (§12).

**Tidak termasuk:**

- Deteksi objek (bounding box) dan segmentasi.
- Klasifikasi multi-objek dalam satu gambar.
- Deployment ke perangkat IoT / edge khusus.
- Klasifikasi kategori sampah lain (logam, kaca, B3, dll.).
- REST API FastAPI dan deployment server Python. Inferensi produksi dijalankan di backend Node.js (§9). `api.py` hanya alat uji lokal.
- Containerisasi Python, karena inferensi tidak lagi berjalan di Python.

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
- Penggunaan model dan aplikasi terbatas pada **tugas kuliah (non-komersial)**. Dataset berlisensi CC BY-NC-SA 4.0, yang mewajibkan atribusi dan melarang penggunaan komersial. Atribusi dicantumkan di README proyek.

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
- **Paritas:** hasil ONNX dibandingkan dengan PyTorch (`waste-export`). Hasil backend Node.js dibandingkan dengan `reports/parity_reference.json` (§9.4).

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
│       ├── predict.py      # inferensi gambar tunggal/batch (CLI)
│       ├── export.py       # ekspor ONNX + verifikasi + latensi + referensi paritas (§9)
│       └── api.py          # REST API FastAPI, alat uji lokal (bukan jalur produksi)
├── scripts/
│   └── prepare_data.py     # dedup, resize, split
├── models/                 # checkpoint dan ONNX (tidak di-commit)
├── reports/                # metrik, confusion matrix, gambar hasil, parity_reference.json
└── tests/
    ├── test_data.py
    ├── test_model.py
    ├── test_predict.py
    ├── test_train.py
    ├── test_evaluate.py
    ├── test_export.py
    └── test_api.py
<!-- api.py dan test_api.py: alat uji lokal, bukan jalur produksi (§9) -->

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
| 9   | Integrasi backend Node.js (kontrak ONNX, referensi paritas) | `best.onnx`, `reports/parity_reference.json` | 0,5 hari (sisi ML) |

## 8. Reproducibility

- Seed tetap (`random`, `numpy`, `torch`) yang disimpan di `configs/train.yaml`.
- Semua hyperparameter berasal dari config, bukan hardcode.
- Simpan versi library di `requirements.txt` / `pyproject.toml` (lock file).
- Catat setiap eksperimen (MLflow atau Weights & Biases, atau CSV sederhana di `reports/`).
- Simpan metadata model: tanggal training, versi dataset, metrik, dan commit hash.

## 9. Integrasi ke Backend (Node.js)

Model dijalankan di dalam backend Express (`be/`) memakai **ONNX Runtime** (`onnxruntime-node`). Saat runtime tidak ada service Python dan tidak ada PyTorch. Bagian ini adalah kontrak antara `ml/` dan `be/`.

### 9.1 Artefak

- `models/best.onnx`: satu file (±17 MB), opset 18, dimensi batch dinamis. Dibuat oleh `waste-export`.
- Disalin ke `be/models/best.onnx` saat setup dan deploy. File ini tidak di-commit.
- Ekspor ulang setiap kali checkpoint berubah. `best.onnx` harus berasal dari `best.pt` yang sama (cek `weights_sha256` di `reports/train_meta.json`).
- Versi `onnxruntime-node` dan `sharp` dikunci di lock file `be/`.

### 9.2 Kontrak model

| Item         | Nilai                                                                       |
| ------------ | --------------------------------------------------------------------------- |
| Input        | Nama `image`, bentuk `[N, 3, 224, 224]`, float32, RGB, sudah dinormalisasi |
| Output       | Nama `logits`, bentuk `[N, 3]`, berupa logit (belum softmax)                |
| Urutan kelas | Index 0 `organic`, 1 `plastic`, 2 `paper` (sesuai `configs/train.yaml`)    |

Probabilitas dihitung di backend dengan softmax atas logit.

### 9.3 Preprocessing

Harus sama dengan `eval_transform` di `src/waste_classifier/data.py`:

1. Terapkan rotasi EXIF. Foto dari HP sering menyimpan orientasi di metadata, bukan di piksel.
2. Buang channel alpha, lalu pastikan hasilnya 3 channel RGB.
3. Resize sisi terpendek ke **256** dengan rasio dipertahankan.
4. Center crop **224×224**. Offset kiri dan atas = round((ukuran − 224) / 2).
5. Ubah piksel ke rentang [0, 1], lalu normalisasi per channel dengan mean (0.485, 0.456, 0.406) dan std (0.229, 0.224, 0.225).

Catatan:
- Jangan langsung resize ke 224×224. Cara itu mengubah area gambar yang terlihat, sehingga hasilnya berbeda.
- Library resize di Node (`sharp`) tidak sama persis dengan PIL/torchvision, jadi ada selisih kecil. Kernel bawaan `sharp` (termasuk `linear`) masih meleset untuk gambar yang diperbesar. Backend memakai resampler bilinear bergaya PIL setelah `sharp` men-decode gambar; paritas diukur dengan referensi §9.4.

### 9.4 Referensi paritas

- `waste-export` menulis `reports/parity_reference.json` untuk seluruh 31 gambar `data/splits/val.csv` (tanpa sampling). Isinya:
  - `onnx_sha256`: hash file `best.onnx`
  - `weights_sha256`: hash bobot checkpoint, harus sama dengan `reports/train_meta.json`
  - `classes` dan `image_size`
  - per gambar: `path` (relatif ke `ml/`), `label`, dan `probabilities` (softmax PyTorch)
- `waste-export` juga memeriksa kontrak §9.2 (nama, tipe `tensor(float)`, bentuk input `[N,3,224,224]`, output `[N,3]`, batch dinamis) dan gagal jika berubah.
- Tes di `be/tests/ml/parity.test.ts` memakai file ini. Target: label sama untuk semua gambar. Selisih probabilitas dicatat, dan toleransinya ditetapkan setelah tes pertama.
- Tes membaca gambar dari `ml/data/` secara lokal dan dilewati jika folder itu tidak ada. Gambar dataset tidak di-commit ke `be/`.
- Gunakan `val.csv`, bukan `test.csv`, supaya test set tetap bersih.

### 9.5 Batasan

- `api.py` (FastAPI) tidak dipakai untuk produksi. Keputusan untuk menghapusnya ditunda.
- Model hanya mengenal 3 kelas. Foto di luar 3 kelas tetap mendapat salah satu kelas. Backend menandai `needsReview` jika confidence di bawah 0.5 (lihat `be/PLAN.md` §7.6).
- Akurasi test 0.844 dan macro F1 0.839, diukur dari 32 gambar saja. Kelas plastik paling lemah (recall 0.64).
- Penggunaan hanya untuk tugas kuliah (lihat §3.4).

## 10. Risiko & Mitigasi

| Risiko                                         | Dampak                     | Mitigasi                                                              |
| ---------------------------------------------- | -------------------------- | --------------------------------------------------------------------- |
| Data organik sulit dikumpulkan                 | Kelas organik lemah        | Kumpulkan foto mandiri, gunakan augmentasi                            |
| Data tidak seimbang                            | Bias ke kelas mayoritas    | Class weights, oversampling, metrik macro F1                          |
| Kebocoran data antara train dan test           | Akurasi terlalu optimis    | Dedup hash, split sebelum augmentasi                                  |
| Lisensi dataset CC BY-NC-SA 4.0 membatasi penggunaan | Tidak boleh dipakai komersial | Hanya untuk tugas kuliah; atribusi dicantumkan                  |
| Kondisi nyata berbeda dari dataset             | Akurasi turun saat dipakai | Tambah data dari kondisi nyata, uji robustness                        |
| Gambar mengandung lebih dari satu jenis sampah | Label ambigu               | Tentukan aturan label (dominan) dan tambah kelas "unknown" bila perlu |
| Preprocessing di Node berbeda dari Python      | Label atau probabilitas tidak sama dengan evaluasi | Tes paritas dengan `parity_reference.json` (§9.4)     |
| Kategori otomatis sering salah (akurasi test 0.844, recall plastik 0.64) | Laporan masuk kategori yang keliru | Pengguna bisa mengubah kategori; `predicted_category` disimpan untuk memantau akurasi; peringatan saat confidence rendah |
| `best.onnx` di backend tidak sama dengan checkpoint terbaru | Hasil tidak sesuai evaluasi | Ekspor ulang setelah training; cocokkan `onnx_sha256` di referensi paritas |
| Foto di luar 3 kelas (mis. kaca, logam)        | Kategori terisi salah      | Hanya 3 kelas; peringatan saat confidence rendah; tambah kelas "unknown" bila perlu |

## 11. Keputusan

| Pertanyaan                | Keputusan                                                                    |
| ------------------------- | ---------------------------------------------------------------------------- |
| Punya dataset?            | Belum. Dicari bersama dengan panduan langkah demi langkah (Tahap 2).         |
| Tempat menjalankan model? | Di dalam backend Express (`be/`) memakai ONNX Runtime. Tidak ada service Python terpisah. |
| Cakupan saat ini?         | Model, ekspor ONNX, kontrak, dan referensi paritas. Implementasi backend ada di `be/PLAN.md`. |
| Jumlah data fase ini?     | 70 gambar per kelas (210 total), subset acak dari data yang sudah dedup, seed 42. |
| Hasil test (sekali)?      | Akurasi 0.844, macro F1 0.839. Memenuhi target di atas 80%. Kelas plastik paling lemah (recall 0.64). |
| Peran kategori?           | Diisi otomatis dari foto. Pengguna bisa mengubahnya sebelum mengirim.        |
| Penggunaan?               | Tugas kuliah saja (non-komersial). Atribusi dataset dicantumkan.             |
| Ambang peringatan?        | Confidence di bawah 0.5 ditandai `needsReview`. Nilai sementara, dikalibrasi dengan data val. |

## 12. Langkah Berikutnya

- [x] Setup repo dan environment (Tahap 1).
- [x] Pencarian dataset dengan panduan (Tahap 2): cek kandidat publik, lisensi, dan jumlah per kelas.
- [ ] (Opsional) Tambah data plastik dan organik untuk memperbaiki kelas plastik (recall 0.64). Target saat ini sudah tercapai.
- [ ] Jika data ditambah, tetapkan test set baru. Test set saat ini sudah terpakai sekali, jadi angkanya tidak bisa dipakai lagi untuk memilih model.
- [ ] Tentukan kebutuhan data tambahan (terutama organik dan plastik) setelah dataset awal terkumpul.
- [x] Ekspor ulang ONNX dengan `uv run waste-export` agar `best.onnx` sama dengan `best.pt` terbaru.
- [x] Tambahkan `reports/parity_reference.json` ke `waste-export` (31 gambar val, §9.4).
- [ ] Salin `best.onnx` ke `be/models/` dan pastikan `onnx_sha256` cocok dengan referensi.
- [ ] Putuskan nasib `api.py` (hapus atau simpan sebagai alat lokal) setelah integrasi Node berjalan.
- [ ] Perbarui `ml/README.md` (bagian REST API) sesuai keputusan ini.
- [ ] (Opsional) Setelah ada laporan nyata, bandingkan `predicted_category` dengan `category` untuk mengukur akurasi di lapangan.

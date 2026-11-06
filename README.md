# Lapor Sampah

Aplikasi pelaporan sampah berbasis web dengan **klasifikasi gambar otomatis**. Pengguna mengirim
laporan lengkap dengan foto dan titik lokasi; model machine learning menebak kategori sampah
(`organic`, `plastic`, `paper`), lalu admin memproses laporan tersebut.

Repository ini adalah monorepo dengan empat bagian:

| Folder         | Isi                                                              |
| -------------- | ---------------------------------------------------------------- |
| [`ml/`](ml/)   | Pipeline Python: persiapan data, training, evaluasi, ekspor ONNX |
| [`be/`](be/)   | REST API Express + TypeScript, PostgreSQL, dan inferensi ONNX    |
| [`web/`](web/) | Frontend React + Vite + TypeScript                               |
| [`mobile/`](mobile/) | Aplikasi mobile Expo + React Native (role `user`)          |

---

## Daftar Isi

- [Arsitektur](#arsitektur)
- [Fitur](#fitur)
- [Tech Stack](#tech-stack)
- [Struktur Repository](#struktur-repository)
- [Menjalankan Proyek](#menjalankan-proyek)
- [Konfigurasi Environment](#konfigurasi-environment)
- [Perintah Pengembangan](#perintah-pengembangan)
- [Model Machine Learning](#model-machine-learning)
- [Ringkasan API](#ringkasan-api)
- [CI](#ci)
- [Batasan dan Catatan](#batasan-dan-catatan)
- [Dokumentasi Lanjutan](#dokumentasi-lanjutan)
- [Lisensi dan Atribusi](#lisensi-dan-atribusi)

---

## Arsitektur

```text
┌─────────────────────┐        HTTP + cookie httpOnly        ┌─────────────────────────┐
│   web/ (React)      │ ───────────────────────────────────► │   be/ (Express)         │
│   Vite + TypeScript │ ◄─────────────────────────────────── │   TypeScript            │
└─────────────────────┘                                      └───────┬─────────┬───────┘
                                                                     │         │
                                                          SQL        │         │ ONNX Runtime
                                                                     ▼         ▼
                                                            ┌─────────────┐  ┌────────────┐
                                                            │ PostgreSQL  │  │ best.onnx  │
                                                            └─────────────┘  └─────▲──────┘
                                                                                     │
                                            ┌────────────────────────────────────────┴──┐
                                            │ ml/ (Python)                              │
                                            │ prepare data → train → evaluate → export │
                                            └───────────────────────────────────────────┘
```

Alur klasifikasi otomatis:

1. Pengguna memilih foto di frontend.
2. Frontend memanggil `POST /api/reports/classify`.
3. Backend memproses gambar (EXIF, resize, center crop, normalisasi ImageNet), lalu menjalankan
   `best.onnx` dengan ONNX Runtime.
4. Backend mengembalikan kategori, confidence, probabilitas per kelas, dan flag `needsReview`
   (confidence di bawah 0,5).
5. Pengguna dapat mengoreksi kategori sebelum mengirim laporan. Hasil model tetap disimpan di
   `predicted_category` dan `predicted_confidence`.

Tidak ada service Python saat runtime produksi; Python hanya dipakai untuk training dan ekspor
model.

---

## Fitur

### Pengguna

- Registrasi dan login (cookie JWT httpOnly), logout, dan ganti password.
- Membuat laporan dengan judul, deskripsi, foto opsional, kategori, dan titik lokasi di peta.
- Kategori otomatis dari foto beserta confidence; pengguna dapat mengubahnya.
- Melihat daftar laporan, detail, foto, peta, serta riwayat status.
- Dashboard ringkasan dan grafik untuk laporan miliknya.
- Edit/hapus laporan sendiri selama status masih `pending`.

### Admin

- Melihat dan mengelola seluruh laporan.
- Filter status/kategori/tanggal, pencarian, sorting, dan pagination.
- Mengubah status mengikuti alur yang valid; penolakan wajib menyertakan alasan.
- Dashboard seluruh pengguna: ringkasan, grafik status/kategori, tren harian, lokasi terbanyak.
- Manajemen pengguna: tambah, edit, aktif/nonaktif, reset password, dan soft delete.
- Proteksi agar admin tidak menonaktifkan, menghapus, atau menurunkan role dirinya sendiri.

### Machine Learning

- Klasifikasi 3 kelas: `organic`, `plastic`, `paper`.
- Transfer learning MobileNetV3-Large dua tahap (head → fine-tuning).
- Deduplikasi exact dan visual sebelum split, split stratified 70/15/15.
- Evaluasi test set sekali, confusion matrix, daftar error, dan kurva training.
- Ekspor ONNX terverifikasi, pengukuran latensi, dan referensi paritas untuk backend.

### Keamanan dan kualitas

- Validasi input dengan Zod di backend dan frontend.
- Role-based access control (`user` / `admin`), soft delete, dan transisi status tervalidasi.
- Helmet, CORS whitelist, rate limit pada endpoint auth dan klasifikasi.
- Upload foto dibatasi tipe dan ukuran, nama file diacak.
- Tes otomatis untuk ML, backend, dan frontend; E2E Playwright untuk alur utama.

---

## Tech Stack

| Bagian   | Teknologi                                                                                                            |
| -------- | -------------------------------------------------------------------------------------------------------------------- |
| ML       | Python 3.11+, PyTorch, torchvision, scikit-learn, ONNX / ONNX Runtime                                                |
| Backend  | Node.js 20+, Express 5, TypeScript, Drizzle ORM, PostgreSQL, Zod, JWT, Multer, sharp, onnxruntime-node               |
| Frontend | React 19, Vite 8, TypeScript, React Router, TanStack Query, React Hook Form + Zod, Tailwind CSS 4, Recharts, Leaflet |
| Mobile   | Expo SDK 58, React Native, TypeScript, Expo Router, TanStack Query, Zod, SecureStore, react-native-maps              |
| Testing  | pytest + ruff, Vitest + Supertest, Vitest + Testing Library, Playwright                                              |

---

## Struktur Repository

```text
.
├── ml/                          # Pipeline machine learning
│   ├── configs/train.yaml       # Hyperparameter dan path
│   ├── data/                    # Dataset lokal (tidak di-commit)
│   ├── models/                  # best.pt / best.onnx (tidak di-commit)
│   ├── reports/                 # Metrik, log, parity reference
│   ├── scripts/                 # prepare_data.py, baseline.py
│   ├── src/waste_classifier/    # data, model, train, evaluate, predict, export, api
│   ├── tests/
│   └── README.md                # Dokumentasi detail ML
├── be/                          # REST API
│   ├── drizzle/                 # Migrasi database
│   ├── models/                  # Salinan best.onnx (tidak di-commit)
│   ├── src/
│   │   ├── modules/             # auth, reports, users, dashboard
│   │   ├── ml/                  # classifier ONNX + preprocessing
│   │   ├── db/                  # schema, koneksi, seed admin, seed demo, cleanup QA
│   │   └── middleware/
│   ├── tests/
│   └── README.md                # Setup dan ringkasan API
├── web/                         # Frontend React
│   ├── src/
│   │   ├── pages/               # Halaman aplikasi
│   │   ├── features/            # auth, reports, dashboard, users
│   │   ├── components/          # UI, layout, peta, tabel
│   │   └── lib/                 # API client, konstanta, util
│   ├── e2e/                     # Playwright + mock API
│   └── PLAN.md                  # Rencana dan aturan frontend
├── mobile/                      # Aplikasi mobile Expo (role user)
│   ├── app/                     # Route Expo Router: login/register, (tabs)/, report/[id]
│   ├── src/                     # auth, lib/api, validasi Zod, tipe, UI dasar
│   ├── api.test.ts              # Tes API client (Node test runner)
│   └── README.md                # Setup dan ringkasan mobile
├── qa/                          # Laporan pengujian dan rencana perbaikan
├── scripts/check.sh             # CI lokal (backend + frontend, opsional ML/E2E)
├── .github/workflows/be.yml     # CI backend (opsional)
└── README.md
```

Tidak ada workspace tool di root; setiap folder memiliki dependency manager sendiri
(`uv` untuk `ml/`, `npm` untuk `be/`, `web/`, dan `mobile/`).

---

## Menjalankan Proyek

### Prasyarat

| Kebutuhan                        | Versi                          |
| -------------------------------- | ------------------------------ |
| Node.js                          | 20+ (CI memakai Node 24)       |
| Python                           | 3.11+                          |
| [uv](https://docs.astral.sh/uv/) | Versi terbaru                  |
| PostgreSQL                       | 14+ (lokal) atau database Neon |
| Git                              | Versi terbaru                  |

Port default: backend **4000**, frontend **5173**.

### 1. Clone repository

```bash
git clone https://github.com/ukisyauqi/blicode-test.git
cd blicode-test
```

### 2. Siapkan model ML

Dataset dan artefak model **tidak di-commit** ke repository. Jika belum punya `best.onnx`,
jalankan pipeline ML berikut.

Letakkan gambar dataset di `ml/data/raw/{organic,plastic,paper}/` terlebih dahulu (lihat
[`ml/data/SOURCES.md`](ml/data/SOURCES.md)), lalu:

```bash
cd ml
uv sync --extra dev --extra export --extra api

uv run python scripts/prepare_data.py   # validasi, dedup, split
uv run waste-train                      # models/best.pt
uv run waste-evaluate                   # metrik test set
uv run waste-export                     # models/best.onnx + parity reference
```

> `ml/reports/test_metrics.json` sudah ada di repository. Pada clone baru, `waste-evaluate`
> akan menolak menimpa file itu. Gunakan `--force` hanya jika Anda memang perlu mengevaluasi
> ulang; test set sebaiknya tetap dipakai sekali.

Jika sudah memiliki `ml/models/best.onnx`, langkah training dapat dilewati. Pastikan file
tersebut berasal dari checkpoint yang sama dengan `best.pt`.

### 3. Jalankan backend

```bash
cd be
npm install
cp .env.example .env

# Edit .env: DATABASE_URL, TEST_DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD.
# Untuk PostgreSQL lokal:
createdb waste_reports
createdb waste_reports_test

cp ../ml/models/best.onnx models/best.onnx
npm run db:migrate
npm run db:seed
npm run db:seed:demo   # opsional: 4 akun + 10 laporan demo
npm run dev
```

Backend berjalan di `http://localhost:4000`. Cek kesehatan dan status model:

```bash
curl http://localhost:4000/api/health
```

Jika memakai Neon, lewati `createdb` dan isi `DATABASE_URL` dengan connection string Neon
(disarankan yang pooled). Backend **gagal start** jika `ML_MODEL_PATH` tidak ada atau model
tidak dapat dimuat.

### 4. Jalankan frontend

```bash
cd web
npm install
cp .env.example .env
npm run dev
```

Buka `http://localhost:5173`. Akun admin dibuat dari `ADMIN_EMAIL` dan `ADMIN_PASSWORD` saat
`npm run db:seed`; pengguna biasa dapat mendaftar sendiri lewat halaman registrasi.

### 5. Jalankan aplikasi mobile (opsional)

```bash
cd mobile
npm install
cp .env.example .env   # isi EXPO_PUBLIC_API_URL dengan IP LAN agar device fisik terhubung
npx expo start         # buka lewat Expo Go (scan QR)
```

Mobile memakai backend yang sama (`EXPO_PUBLIC_API_URL` menunjuk port 4000).
Emulator Android pakai `http://10.0.2.2:4000/api`, simulator iOS bisa pakai
`http://localhost:4000/api`. Detail ada di [`mobile/README.md`](mobile/README.md).

### 6. Data demo (opsional)

Untuk demo atau pengujian manual, isi database dengan akun dan laporan contoh:

```bash
cd be
npm run db:seed:demo
```

Script ini membuat **4 akun demo** dan **10 laporan** dengan variasi status, kategori, tanggal,
dan riwayat status. Seed bersifat idempoten, jadi aman dijalankan berulang kali. Password akun
demo diambil dari env `DEMO_PASSWORD` (default `demo12345`).

| Email                    | Role  | Nama         |
| ------------------------ | ----- | ------------ |
| `demo.admin@example.com` | admin | Rina Admin   |
| `demo.budi@example.com`  | user  | Budi Santoso |
| `demo.siti@example.com`  | user  | Siti Rahma   |
| `demo.dewi@example.com`  | user  | Dewi Lestari |

Seed demo menolak berjalan jika `NODE_ENV=production`. Untuk membersihkan akun/laporan uji QA
berpola `browser.test.*`, `uji.*`, dan `qa.*` beserta file fotonya:

```bash
npm run db:cleanup:qa
```

---

## Konfigurasi Environment

### Backend (`be/.env`)

| Variabel             | Wajib      | Default                 | Keterangan                               |
| -------------------- | ---------- | ----------------------- | ---------------------------------------- |
| `PORT`               | Tidak      | `4000`                  | Port server                              |
| `NODE_ENV`           | Tidak      | `development`           | `development`, `test`, atau `production` |
| `DATABASE_URL`       | Ya         | —                       | Connection string PostgreSQL/Neon        |
| `TEST_DATABASE_URL`  | Untuk tes  | —                       | Database terpisah untuk tes              |
| `JWT_SECRET`         | Ya         | —                       | Minimal 32 karakter                      |
| `JWT_EXPIRES_IN`     | Tidak      | `7d`                    | Masa berlaku token                       |
| `CORS_ORIGIN`        | Tidak      | `http://localhost:5173` | Origin frontend yang diizinkan           |
| `UPLOAD_DIR`         | Tidak      | `./uploads`             | Folder penyimpanan foto                  |
| `MAX_UPLOAD_SIZE_MB` | Tidak      | `5`                     | Batas ukuran upload                      |
| `ML_MODEL_PATH`      | Tidak      | `./models/best.onnx`    | Path model ONNX                          |
| `BCRYPT_ROUNDS`      | Tidak      | `12`                    | Cost factor hash password                |
| `ADMIN_NAME`         | Tidak      | `Admin`                 | Nama akun admin saat seed                |
| `ADMIN_EMAIL`        | Untuk seed | —                       | Email admin                              |
| `ADMIN_PASSWORD`     | Untuk seed | —                       | Password admin, minimal 8 karakter       |
| `DEMO_PASSWORD`      | Tidak      | `demo12345`             | Password akun demo (`db:seed:demo`)      |

### Frontend (`web/.env`)

| Variabel       | Default                     | Keterangan           |
| -------------- | --------------------------- | -------------------- |
| `VITE_API_URL` | `http://localhost:4000/api` | Base URL API backend |

Variabel `VITE_*` dibaca saat build, jadi nilainya perlu disesuaikan juga di environment
deployment frontend.

### Mobile (`mobile/.env`)

| Variabel              | Contoh                       | Keterangan                                    |
| --------------------- | ---------------------------- | --------------------------------------------- |
| `EXPO_PUBLIC_API_URL` | `http://192.168.1.10:4000/api` | Base URL API backend (pakai IP LAN untuk device fisik) |

---

## Perintah Pengembangan

### ML (`ml/`)

| Perintah                                         | Fungsi                                              |
| ------------------------------------------------ | --------------------------------------------------- |
| `uv sync --extra dev --extra export --extra api` | Pasang semua dependensi                             |
| `uv run waste-train`                             | Training dua tahap                                  |
| `uv run waste-evaluate`                          | Evaluasi test set (menolak menimpa tanpa `--force`) |
| `uv run waste-predict foto.jpg`                  | Prediksi satu/beberapa gambar via CLI               |
| `uv run waste-export`                            | Ekspor ONNX dan tulis referensi paritas             |
| `uv run waste-api`                               | REST API FastAPI lokal (bukan jalur produksi)       |
| `uv run pytest`                                  | Jalankan tes                                        |
| `uv run ruff check .`                            | Lint                                                |

### Backend (`be/`)

| Perintah               | Fungsi                                     |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | Jalankan server dengan watch mode          |
| `npm test`             | Jalankan tes (memakai `TEST_DATABASE_URL`) |
| `npm run typecheck`    | Pemeriksaan tipe TypeScript                |
| `npm run lint`         | ESLint                                     |
| `npm run build`        | Compile ke `dist/`                         |
| `npm start`            | Jalankan hasil build                       |
| `npm run db:generate`  | Generate migrasi Drizzle                   |
| `npm run db:migrate`   | Terapkan migrasi                           |
| `npm run db:seed`      | Buat akun admin awal                       |
| `npm run db:seed:demo` | Isi 4 akun & 10 laporan demo (idempoten)   |
| `npm run db:cleanup:qa`| Hapus akun/laporan uji QA beserta fotonya  |

> Tes backend menjalankan migrasi dan **mengosongkan tabel** di database tes. Jangan arahkan
> `TEST_DATABASE_URL` ke database development atau produksi.

### Frontend (`web/`)

| Perintah             | Fungsi                                              |
| -------------------- | --------------------------------------------------- |
| `npm run dev`        | Development server di port 5173                     |
| `npm test`           | Unit/component test (Vitest)                        |
| `npm run test:watch` | Tes mode watch                                      |
| `npm run e2e`        | E2E Playwright (memakai mock API, tanpa backend/DB) |
| `npm run typecheck`  | Pemeriksaan tipe                                    |
| `npm run lint`       | ESLint                                              |
| `npm run build`      | Build production ke `dist/`                         |
| `npm run preview`    | Preview hasil build                                 |

> Sebelum menjalankan E2E pertama kali, pasang browser Playwright:
> `npx playwright install chromium`.

### Mobile (`mobile/`)

| Perintah            | Fungsi                              |
| ------------------- | ----------------------------------- |
| `npx expo start`    | Dev server + QR untuk Expo Go       |
| `npm test`          | Tes API client (Node test runner)   |
| `npm run typecheck` | Pemeriksaan tipe                    |

---

## Model Machine Learning

### Ringkasan

| Item               | Nilai                                                              |
| ------------------ | ------------------------------------------------------------------ |
| Tugas              | Klasifikasi gambar 3 kelas: `organic`, `plastic`, `paper`          |
| Arsitektur         | MobileNetV3-Large, pretrained ImageNet                             |
| Input              | RGB 224×224, normalisasi ImageNet                                  |
| Dataset            | 210 gambar (70 per kelas) dari Custom Waste Classification Dataset |
| Split              | 147 train / 31 val / 32 test                                       |
| Checkpoint terbaik | `best.pt` (`head:2`, val macro F1 0,936)                           |
| Hasil test         | Akurasi **0,844**, macro F1 **0,839**                              |
| Artefak produksi   | `best.onnx`, opset 18, batch dinamis                               |
| Latensi CPU        | Sekitar 4 ms per gambar (ONNX)                                     |
| Runtime produksi   | Express + ONNX Runtime di `be/`                                    |

Kelas `plastic` paling lemah: recall 0,636 (4 dari 11 gambar plastik salah klasifikasi pada test
set). Detail per kelas dan confusion matrix ada di [`ml/README.md`](ml/README.md).

### Kontrak ONNX

| Item         | Nilai                                                                        |
| ------------ | ---------------------------------------------------------------------------- |
| File         | `ml/models/best.onnx` (±16 MB), disalin ke `be/models/best.onnx`             |
| Input        | Nama `image`, bentuk `[N, 3, 224, 224]`, `tensor(float)`, RGB ternormalisasi |
| Output       | Nama `logits`, bentuk `[N, 3]`, `tensor(float)`, belum softmax               |
| Urutan kelas | `0 = organic`, `1 = plastic`, `2 = paper`                                    |
| Batch        | Dinamis                                                                      |

Preprocessing harus identik dengan `eval_transform` di
[`ml/src/waste_classifier/data.py`](ml/src/waste_classifier/data.py):

1. Terapkan rotasi EXIF.
2. Buang channel alpha dan pastikan RGB.
3. Resize sisi terpendek ke 256 dengan rasio dipertahankan.
4. Center crop 224×224.
5. Skala ke [0, 1], lalu normalisasi dengan mean `(0.485, 0.456, 0.406)` dan std
   `(0.229, 0.224, 0.225)`.

Backend memakai resampler bilinear bergaya PIL (bukan kernel bawaan `sharp`) agar hasilnya
mendekati torchvision.

### Referensi paritas

[`ml/reports/parity_reference.json`](ml/reports/parity_reference.json) berisi hash ONNX, hash
bobot checkpoint, kelas, ukuran input, dan probabilitas PyTorch untuk seluruh 31 gambar
validasi. File ini dipakai oleh [`be/tests/ml/parity.test.ts`](be/tests/ml/parity.test.ts) untuk
memastikan preprocessing Node.js tidak bergeser.

Setiap kali checkpoint berubah, jalankan ulang `uv run waste-export` dan salin `best.onnx`
terbaru ke `be/models/`. Cocokkan `onnx_sha256` dengan hasil:

```bash
shasum -a 256 be/models/best.onnx
```

---

## Ringkasan API

Semua endpoint (kecuali file upload statis) memakai prefix `/api`. Respons sukses berbentuk
`{ data, meta? }`; error berbentuk `{ error: { code, message, details? } }`. Autentikasi memakai
cookie httpOnly untuk web (frontend mengirim dengan `credentials: "include"`); aplikasi
mobile memakai `Authorization: Bearer <jwt>` dan menerima token di body `register`/`login`.

| Grup          | Endpoint                                                                                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Health        | `GET /api/health`                                                                                                                                         |
| Auth          | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `PATCH /api/auth/me/password`                             |
| Reports       | `GET/POST /api/reports`, `GET/PUT/DELETE /api/reports/:id`, `POST /api/reports/classify`, `PATCH /api/reports/:id/status`, `GET /api/reports/:id/history` |
| Dashboard     | `GET /api/dashboard/stats?from=&to=`                                                                                                                      |
| Users (admin) | `GET/POST /api/users`, `GET/PUT/DELETE /api/users/:id`, `PATCH /api/users/:id/status`, `PATCH /api/users/:id/password`                                    |
| Foto          | `GET /uploads/:file`                                                                                                                                      |

Alur status laporan:

```text
pending ──► in_progress ──► completed
   │             │
   └─────────────┴────────► rejected
```

Hanya admin yang dapat mengubah status. `rejected` wajib menyertakan alasan. Detail query,
body, dan aturan bisnis ada di [`be/README.md`](be/README.md) dan [`be/PLAN.md`](be/PLAN.md).

---

## CI

Ada dua cara menjalankan pemeriksaan kualitas, dan keduanya memakai perintah yang sama.

### CI lokal (didukung penuh)

Seluruh pemeriksaan bisa dijalankan tanpa GitHub Actions. Dari root repository:

```bash
./scripts/check.sh          # backend + frontend
RUN_ML=1 ./scripts/check.sh # tambah ruff + pytest ML
RUN_E2E=1 ./scripts/check.sh # tambah E2E Playwright
```

Script menjalankan `lint`, `typecheck`, `test`, dan `build` untuk backend dan frontend. Backend
memakai `TEST_DATABASE_URL` dari `be/.env`; pastikan database tes sudah dibuat dan **jangan**
mengarahkannya ke database development/produksi.

Perintah manual yang setara:

```bash
cd be && npm run lint && npm run typecheck && npm test && npm run build
cd web && npm run lint && npm run typecheck && npm test && npm run build
```

### GitHub Actions (opsional)

Workflow [`Backend`](.github/workflows/be.yml) berjalan pada push/PR yang menyentuh `be/`:

- PostgreSQL 16 sebagai service.
- `npm ci`, lint, typecheck, test, dan build.

Workflow ini tidak wajib. Jika ingin sepenuhnya lokal, cukup andalkan `scripts/check.sh` dan
hapus/nonaktifkan workflow. Repository ini publik, sehingga runner standar GitHub Actions tidak
memakan biaya; membiarkannya aktif tetap berguna sebagai pengaman saat push ke remote.

Saat ini belum ada workflow CI untuk `ml/` dan `web/`; gunakan `RUN_ML=1`/`RUN_E2E=1` pada
`scripts/check.sh` untuk memeriksanya secara lokal.

---

## Batasan dan Catatan

- **Dataset kecil dan test set sudah terpakai.** Hanya 32 gambar test, sehingga angka akurasi
  memiliki variansi besar. Jangan memakai test set lagi untuk memilih model/hyperparameter.
- **Hanya 3 kelas.** Gambar kaca, logam, atau sampah lain tetap diprediksi sebagai salah satu
  dari tiga kelas; belum ada kelas `unknown`.
- **Kelas plastik lemah** (recall 0,636) dan masih tertukar dengan organik/kertas.
- **Domain data terbatas.** Dataset publik belum tentu mewakili kondisi lapangan.
- **Model dan dataset tidak di-commit.** `best.onnx` harus disalin manual ke backend dan
  hash-nya diverifikasi terhadap referensi paritas.
- **Foto disajikan statis** melalui `/uploads`; URL foto yang diketahui dapat diakses tanpa
  pengecekan kepemilikan.
- **API FastAPI di `ml/` hanya alat uji lokal**, tanpa autentikasi/rate limit, dan bukan jalur
  produksi.
- **Deployment produksi belum dikonfigurasi.** Backend membutuhkan base image yang mendukung
  binary `sharp` dan `onnxruntime-node`.
- **Non-komersial.** Penggunaan dibatasi untuk tugas kuliah sesuai lisensi dataset.

---

## Dokumentasi Lanjutan

| Dokumen                                    | Isi                                                              |
| ------------------------------------------ | ---------------------------------------------------------------- |
| [`ml/README.md`](ml/README.md)             | Setup, training, hasil evaluasi, ekspor ONNX, CLI, dan API lokal |
| [`ml/PLAN.md`](ml/PLAN.md)                 | Tujuan, keputusan, risiko, dan kontrak integrasi ML              |
| [`ml/data/SOURCES.md`](ml/data/SOURCES.md) | Sumber dataset, pemetaan kelas, dan lisensi                      |
| [`be/README.md`](be/README.md)             | Setup backend dan ringkasan endpoint                             |
| [`be/PLAN.md`](be/PLAN.md)                 | Skema database, aturan bisnis, API, dan keamanan                 |
| [`web/PLAN.md`](web/PLAN.md)               | Rencana frontend, route, role, dan fitur UI                      |
| [`mobile/README.md`](mobile/README.md)       | Setup mobile, layar, API, permission, dan batasan                |
| [`mobile/PLAN.md`](mobile/PLAN.md)           | Rencana mobile, kontrak API, dan tahapan fase                    |

---

## Lisensi dan Atribusi

Model dilatih menggunakan **Custom Waste Classification Dataset** oleh
[`wasifmahmood01`](https://www.kaggle.com/datasets/wasifmahmood01/custom-waste-classification-dataset)
(Kaggle), dengan lisensi **CC BY-NC-SA 4.0**.

Konsekuensinya:

- Wajib mencantumkan atribusi ke sumber dataset.
- **Hanya untuk penggunaan non-komersial**; proyek ini dipakai untuk tugas kuliah.
- Distribusi turunan dataset/model wajib memakai lisensi yang sama.

Gambar dataset dan artefak model tidak disimpan di repository. Kode aplikasi belum memiliki file
lisensi tersendiri; hubungi pemilik repository untuk penggunaan di luar konteks tugas kuliah.

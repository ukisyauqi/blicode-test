# Lapor Sampah

Aplikasi pelaporan sampah dengan klasifikasi gambar otomatis (`organic`, `plastic`, `paper`).
Pengguna mengirim laporan + foto + titik lokasi, admin memproses laporan tersebut.

Monorepo: [`ml/`](ml/) (pipeline model) · [`be/`](be/) (REST API) ·
[`web/`](web/) (frontend) · [`mobile/`](mobile/) (Expo, role `user`).

> Panduan ini hanya untuk instalasi dan penggunaan.
> Detail endpoint ada di [`API.md`](API.md), skema database ada di [`ERD.md`](ERD.md).

## Prasyarat

| Kebutuhan | Versi |
| --- | --- |
| Node.js | 20+ |
| Python | 3.11+ |
| [uv](https://docs.astral.sh/uv/) | Terbaru |
| PostgreSQL | 14+ (lokal) atau Neon |
| Git | Terbaru |

Port default: backend **4000**, frontend **5173**.

## Instalasi

### 1. Clone

```bash
git clone https://github.com/ukisyauqi/blicode-test.git
cd blicode-test
```

### 2. Siapkan model ML

Dataset dan `best.onnx` tidak di-commit. Jika belum punya model:

```bash
cd ml
uv sync --extra dev --extra export --extra api
# taruh gambar di ml/data/raw/{organic,plastic,paper}/ dulu
uv run python scripts/prepare_data.py
uv run waste-train
uv run waste-evaluate
uv run waste-export
cd ..
```

Jika sudah punya `ml/models/best.onnx`, lewati training.

### 3. Jalankan backend

```bash
cd be
npm install
cp .env.example .env
# isi minimal: DATABASE_URL, TEST_DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD

# PostgreSQL lokal:
createdb waste_reports
createdb waste_reports_test

cp ../ml/models/best.onnx models/best.onnx
npm run db:migrate
npm run db:seed
npm run dev
cd ..
```

Cek: `curl http://localhost:4000/api/health`.
Backend gagal start jika `ML_MODEL_PATH` tidak ada.

### 4. Jalankan frontend

```bash
cd web
npm install
cp .env.example .env
npm run dev
cd ..
```

Buka `http://localhost:5173`.

### 5. Mobile (opsional)

```bash
cd mobile
npm install
cp .env.example .env   # isi EXPO_PUBLIC_API_URL dengan IP LAN untuk device fisik
npx expo start         # scan QR lewat Expo Go
cd ..
```

- Emulator Android: `http://10.0.2.2:4000/api`
- Simulator iOS: `http://localhost:4000/api`

## Konfigurasi minimal

### `be/.env`

```env
DATABASE_URL=postgres://user:pass@localhost:5432/waste_reports
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/waste_reports_test
JWT_SECRET=isi-minimal-32-karakter-acak
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin12345
```

Untuk Neon, pakai connection string pooled, lewati `createdb`.
Opsional: `PORT`, `CORS_ORIGIN`, `UPLOAD_DIR`, `MAX_UPLOAD_SIZE_MB`, `ML_MODEL_PATH`,
`APP_TIMEZONE` (default `Asia/Jakarta`). Daftar lengkap ada di `be/.env.example`.

### `web/.env`

```env
VITE_API_URL=http://localhost:4000/api
```

### `mobile/.env`

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000/api
```

## Penggunaan

### Akun demo

Buat data contoh (4 akun + 10 laporan, idempoten, tolak di `production`):

```bash
cd be
npm run db:seed:demo
```

Password demo: isi `DEMO_PASSWORD` (default `demo12345`).

| Email | Role |
| --- | --- |
| `demo.admin@example.com` | admin |
| `demo.budi@example.com` | user |
| `demo.siti@example.com` | user |
| `demo.dewi@example.com` | user |

Akun admin awal berasal dari `ADMIN_EMAIL` / `ADMIN_PASSWORD` saat `npm run db:seed`.
User biasa daftar sendiri di halaman registrasi.

Bersihkan akun uji QA (`browser.test.*`, `uji.*`, `qa.*`):

```bash
npm run db:cleanup:qa
```

### Alur pakai

1. Buka `http://localhost:5173`, login sebagai user.
2. Buat laporan di `/reports/new`: isi judul/deskripsi, pilih foto (kategori terisi otomatis),
   tentukan lokasi di peta, submit.
3. Pantau di `/reports` dan `/dashboard`; edit/hapus hanya bisa saat status `pending`.
4. Login sebagai admin untuk ubah status (`pending → in_progress → completed`, atau `rejected`
   wajib alasan) dan kelola user di `/users`.

## Dokumentasi lanjutan

| Dokumen | Isi |
| --- | --- |
| [`API.md`](API.md) | Referensi endpoint |
| [`ERD.md`](ERD.md) | Skema database |
| [`FEATURE_LIST.md`](FEATURE_LIST.md) | Daftar fitur per halaman |
| [`be/README.md`](be/README.md) | Detail backend |
| [`ml/README.md`](ml/README.md) | Detail training & evaluasi |
| [`web/PLAN.md`](web/PLAN.md) | Detail frontend |
| [`mobile/README.md`](mobile/README.md) | Detail mobile |

## Lisensi

Dataset: Custom Waste Classification Dataset (`wasifmahmood01`, Kaggle), lisensi
**CC BY-NC-SA 4.0** — non-komersial, wajib atribusi. Proyek ini untuk tugas kuliah.

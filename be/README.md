# Backend Aplikasi Laporan Sampah

REST API Express + TypeScript untuk aplikasi laporan sampah. Spesifikasi lengkap ada di `PLAN.md`.

## Setup

Butuh Node.js 20+ dan PostgreSQL 14+.

```sh
npm install
cp .env.example .env        # isi DATABASE_URL, TEST_DATABASE_URL, JWT_SECRET
createdb waste_reports
createdb waste_reports_test
npm run db:migrate
npm run db:seed             # butuh ADMIN_EMAIL dan ADMIN_PASSWORD di .env
npm run db:seed:demo        # opsional: 4 akun + 10 laporan demo
npm run dev
```

`DATABASE_URL` bisa memakai Neon atau PostgreSQL lokal. Driver `pg` mendukung keduanya; untuk Neon gunakan connection string pooled.

Filter tanggal (`from`/`to`) menerima dua bentuk:

- `YYYY-MM-DD` diartikan sebagai satu hari kalender penuh di zona `APP_TIMEZONE` (default `Asia/Jakarta`).
- Timestamp ISO lengkap (mis. `2026-11-05T10:00:00Z`) diartikan sebagai instant persis.

Zona waktu aplikasi dapat diubah lewat env `APP_TIMEZONE`.

## Data demo dan pembersihan QA

`npm run db:seed:demo` mengisi 4 akun demo dan 10 laporan dengan variasi status, kategori,
tanggal, dan riwayat. Script idempoten (tidak menduplikasi data) dan menolak berjalan saat
`NODE_ENV=production`.

| Email                    | Role  |
| ------------------------ | ----- |
| `demo.admin@example.com` | admin |
| `demo.budi@example.com`  | user  |
| `demo.siti@example.com`  | user  |
| `demo.dewi@example.com`  | user  |

Password akun demo memakai `DEMO_PASSWORD` (default `demo12345`). Laporan demo tidak memiliki
foto karena file upload tidak di-commit.

`npm run db:cleanup:qa` menghapus akun/laporan uji dengan pola email `browser.test.*@example.com`,
`uji.*@example.com`, dan `qa.*@example.com`, termasuk file fotonya. Akun lain tidak disentuh.

## Model klasifikasi

Model tidak di-commit. Salin dari folder ML:

```sh
cp ../ml/models/best.onnx models/best.onnx
shasum -a 256 models/best.onnx
```

Hash harus sama dengan `onnx_sha256` di `../ml/reports/parity_reference.json` (`7e8bef1f…` untuk checkpoint saat ini). Backend gagal start jika `ML_MODEL_PATH` tidak ada.

Endpoint:

- `POST /api/reports/classify` (login, multipart field `file`): saran kategori, tidak menyimpan data.
- `POST /api/reports` (login): kategori diisi dari foto jika tidak dikirim. `predictedCategory` dan `predictedConfidence` selalu menyimpan hasil model.

Preprocessing meniru `torchvision`: EXIF rotate, buang alpha, sisi pendek 256, center crop 224, normalisasi ImageNet. Resize memakai bilinear bergaya PIL karena kernel `sharp` menghasilkan selisih yang cukup besar pada gambar kecil.

## API

Semua endpoint memakai prefix `/api`. Sukses: `{ data, meta? }`. Error: `{ error: { code, message, details? } }`. Login memakai cookie httpOnly.

Auth:

- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`
- `GET /auth/me`, `PATCH /auth/me`, `PATCH /auth/me/password`

Reports (login):

- `GET /reports` dengan `search`, `status`, `category`, `from`, `to`, `reporter_id`, `sort`, `page`, `limit`
- `POST /reports` (JSON atau multipart, field foto `photo`)
- `POST /reports/classify` (multipart, field `file`)
- `GET /reports/:id`, `PUT /reports/:id`, `DELETE /reports/:id`
- `PATCH /reports/:id/status` (admin, body `status` dan `reason` untuk `rejected`)
- `GET /reports/:id/history`

Dashboard (login): `GET /dashboard/stats?from=&to=`.

Users (admin): CRUD di `/users`, plus `PATCH /users/:id/status` dan `PATCH /users/:id/password`.

Foto laporan disajikan di `GET /uploads/:file`.

## Tes

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Tes memakai `TEST_DATABASE_URL` dan folder upload sementara `uploads-test/`. Tes paritas membaca `../ml/reports/parity_reference.json` dan gambar dari `../ml/data/`; tes itu dilewati jika folder ML tidak ada.

## Lisensi dataset

Model dilatih dengan Custom Waste Classification Dataset (wasifmahmood01) dan TrashNet. Lisensi dataset CC BY-NC-SA 4.0. Proyek ini hanya untuk tugas kuliah, non-komersial. Atribusi lengkap ada di `../ml/data/SOURCES.md`.

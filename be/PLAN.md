# PLAN – Backend Aplikasi Laporan Sampah

Backend REST API untuk aplikasi laporan sampah. Dikonsumsi oleh frontend React di `web/`.

## 1. Ringkasan

- REST API berbasis **Express** (TypeScript)
- Database **PostgreSQL di Neon**, diakses dengan **Drizzle ORM**
- Autentikasi dengan **JWT di httpOnly cookie**, dengan dua role: `admin` dan `user`
- Tidak ada pengiriman email
- Kategori laporan diisi otomatis dari foto dengan model ONNX dari `ml/`, dijalankan di dalam proses Express (lihat §7.6 dan `ml/PLAN.md` §9)
- Proyek tugas kuliah, non-komersial

## 2. Tech Stack

| Kebutuhan       | Pilihan                                                   |
|-----------------|-----------------------------------------------------------|
| Runtime         | Node.js (LTS) + TypeScript                                |
| Framework       | Express                                                   |
| Database        | PostgreSQL di Neon (serverless)                           |
| ORM & migrasi   | Drizzle ORM + Drizzle Kit, driver `pg` (kompatibel Neon)  |
| Validasi        | Zod                                                       |
| Auth            | `jsonwebtoken` + `bcrypt` (atau `argon2`) + `cookie-parser` |
| Upload foto     | Multer (penyimpanan lokal pada tahap awal)                |
| Pemrosesan gambar | `sharp` (baca EXIF, resize, crop, ambil piksel RGB)     |
| Inferensi ML    | `onnxruntime-node` dengan model `best.onnx` dari `ml/`    |
| Keamanan        | `helmet`, `cors` (whitelist origin frontend), rate limit pada `/api/auth` |
| Logging         | `pino` (atau `morgan` untuk request log)                  |
| Testing         | Vitest + Supertest, database test terpisah di Neon branch |

Kredensial Neon disimpan di `be/.env` dan tidak di-commit. `.env.example` berisi nama variabel tanpa nilai.

## 3. Environment Variables

```
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://...        # dari Neon (gunakan pooled connection string)
TEST_DATABASE_URL=postgresql://...   # database terpisah untuk tes
JWT_SECRET=...                       # minimal 32 karakter
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173    # origin frontend React
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=5
ML_MODEL_PATH=./models/best.onnx     # salinan best.onnx dari ml/models/ (tidak di-commit)
BCRYPT_ROUNDS=12
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=...                   # dipakai seed, minimal 8 karakter
```

## 4. Struktur Folder

```
be/
├── PLAN.md
├── .env                     # tidak di-commit
├── .env.example
├── drizzle.config.ts
├── drizzle/                 # file migrasi hasil drizzle-kit
├── models/                  # best.onnx dari ml/ (tidak di-commit)
├── uploads/                 # foto laporan (tidak di-commit)
└── src/
    ├── server.ts            # bootstrap server
    ├── app.ts               # setup express, middleware global, router
    ├── config/              # baca & validasi env
    ├── db/
    │   ├── index.ts         # koneksi Neon + Drizzle
    │   ├── schema.ts        # tabel users, reports, report_status_history
    │   └── seed.ts          # seed akun admin awal
    ├── middleware/
    │   ├── auth.ts          # verifikasi JWT dari cookie
    │   ├── requireRole.ts   # cek role admin/user
    │   ├── validate.ts      # validasi body/query dengan Zod
    │   ├── upload.ts        # Multer, filter tipe & ukuran file
    │   └── errorHandler.ts  # format error seragam
    ├── modules/
    │   ├── auth/            # routes, controller, service, schema
    │   ├── reports/
    │   ├── users/
    │   └── dashboard/
    ├── lib/
    │   ├── errors.ts        # AppError (NotFound, Forbidden, dll.)
    │   ├── statusTransition.ts
    │   └── pagination.ts
    ├── ml/
    │   ├── classifier.ts    # muat sesi ONNX sekali; fungsi classify(buffer)
    │   └── preprocess.ts    # EXIF, resize, crop, normalisasi (kontrak di ml/PLAN.md §9)
    └── types/               # tipe Express (req.user)
```

Pola per modul: `route → controller → service → db`. Controller hanya menangani HTTP, logika bisnis ada di service.

Tes (Vitest + Supertest) ada di `tests/`. Tes paritas ML ada di `tests/ml/parity.test.ts`.

## 5. Skema Database

Semua tabel memakai `id` UUID, `created_at`, dan `updated_at`.

### `users`
| Kolom         | Tipe      | Keterangan                         |
|---------------|-----------|------------------------------------|
| id            | uuid PK   |                                    |
| name          | text      | wajib                              |
| email         | text      | unique, lowercase                  |
| password_hash | text      | bcrypt/argon2                      |
| role          | enum      | `admin`, `user` (default `user`)   |
| is_active     | boolean   | default `true`                     |
| created_at    | timestamptz |                                  |
| updated_at    | timestamptz |                                  |
| deleted_at    | timestamptz | nullable (soft delete)           |

Index: `unique(email)`, `index(role)`.

### `reports`
| Kolom         | Tipe        | Keterangan                                        |
|---------------|-------------|---------------------------------------------------|
| id            | uuid PK     |                                                   |
| user_id       | uuid FK users | pelapor, `on delete restrict`                   |
| title         | text        | wajib                                             |
| description   | text        | wajib                                             |
| category      | enum        | `organic`, `plastic`, `paper`                     |
| address       | text        | nullable, alamat teks hasil dari peta             |
| latitude      | numeric(9,6)  | wajib, -90 s/d 90                               |
| longitude     | numeric(9,6)  | wajib, -180 s/d 180                             |
| photo_path    | text        | nullable                                          |
| predicted_category | enum   | nullable, kategori hasil model dari foto          |
| predicted_confidence | numeric(5,4) | nullable, confidence model 0–1            |
| status        | enum        | `pending`, `in_progress`, `completed`, `rejected` (default `pending`) |
| reject_reason | text        | nullable, wajib jika status `rejected`            |
| created_at    | timestamptz |                                                   |
| updated_at    | timestamptz |                                                   |
| deleted_at    | timestamptz | nullable (soft delete)                            |

Index: `index(user_id)`, `index(status)`, `index(category)`, `index(created_at)`.

`category` adalah kategori akhir yang tersimpan. `predicted_*` adalah hasil model untuk foto dan tetap disimpan meskipun pengguna mengubah kategori. Kolom ini dipakai untuk memantau akurasi model di lapangan (§7.6).

### `report_status_history`
| Kolom       | Tipe            | Keterangan                       |
|-------------|-----------------|----------------------------------|
| id          | uuid PK         |                                  |
| report_id   | uuid FK reports | `on delete cascade`          |
| from_status | enum            | nullable (saat laporan dibuat)   |
| to_status   | enum            |                                  |
| changed_by  | uuid FK users   |                                |
| note        | text            | nullable                         |
| created_at  | timestamptz     |                                  |

Riwayat dibuat otomatis saat laporan dibuat (`from_status = null`, `to_status = pending`) dan setiap kali status berubah.

## 6. Autentikasi & Otorisasi

- **Register**: role selalu `user`, klien tidak boleh mengirim `role`.
- **Login**: verifikasi email & password, tolak jika `is_active = false` atau `deleted_at` terisi. Pesan error generik ("Email atau password salah").
- **Token**: JWT berisi `sub` (user id) dan `role`, dikirim lewat cookie `httpOnly`, `secure` di production, `sameSite=lax`.
- **Logout**: hapus cookie.
- **Middleware `auth`**: baca cookie, verifikasi JWT, lalu ambil user dari DB untuk memastikan user masih aktif. Jika tidak, respons 401.
- **Middleware `requireRole('admin')`**: respons 403 jika role tidak sesuai.
- **Kepemilikan data**: untuk laporan, user biasa hanya bisa mengakses laporan dengan `user_id` miliknya. Admin bisa mengakses semua. Akses ke laporan milik orang lain oleh user biasa dijawab 404 (agar tidak membocorkan keberadaan data).
- **Hash password**: bcrypt cost factor 12 atau argon2id.
- **Rate limit** pada `/api/auth/login` dan `/api/auth/register`.

## 7. Aturan Bisnis

### 7.1 Edit & hapus laporan
- User hanya boleh edit/hapus laporannya sendiri **dan** status masih `pending`. Selain itu → 409 Conflict.
- Admin boleh edit (kecuali mengubah status lewat endpoint status) dan hapus laporan apa pun.
- Hapus adalah soft delete (`deleted_at`). Laporan terhapus tidak muncul di daftar maupun statistik.
- Saat laporan diedit atau dihapus, file foto lama dihapus hanya jika laporan benar-benar dihapus permanen (tahap awal cukup soft delete tanpa hapus file).
- Jika foto diganti saat edit, klasifikasi dijalankan ulang dan `predicted_*` diperbarui. `category` hanya berubah jika klien mengirim `category` (lihat §7.6).

### 7.2 Transisi status
Diatur di `lib/statusTransition.ts` sebagai tabel yang eksplisit:

| Dari          | Ke yang diizinkan          |
|---------------|-----------------------------|
| `pending`     | `in_progress`, `rejected`   |
| `in_progress` | `completed`, `rejected`     |
| `completed`   | —  (final)                  |
| `rejected`    | —  (final)                  |

- Hanya admin yang boleh mengubah status. Transisi tidak valid → 422.
- Status `rejected` wajib menyertakan `reason` (disimpan di `reject_reason`).
- Setiap perubahan status dan insert ke `report_status_history` dilakukan dalam **satu transaksi**.
- Status yang sama dengan status saat ini → 422.

### 7.3 User management
- Admin tidak bisa mengubah role dirinya sendiri menjadi `user`.
- Admin tidak bisa menonaktifkan atau menghapus dirinya sendiri.
- Email harus unik (termasuk saat edit). Cek case-insensitive.
- Reset password oleh admin: admin mengirim password baru, backend men-hash dan menyimpannya. Tidak ada email.
- Menonaktifkan user tidak menghapus laporannya.
- Hapus user adalah soft delete. Laporan user tersebut tetap ada.

### 7.4 Koordinat
- Validasi `latitude` dan `longitude` dengan Zod (rentang nilai valid).
- Kategori hanya menerima tiga nilai tetap: `organic`, `plastic`, `paper`.

### 7.5 Upload foto
- Tipe yang diizinkan: `image/jpeg`, `image/png`, `image/webp`. Validasi berdasarkan MIME type dan ekstensi.
- Ukuran maksimal sesuai `MAX_UPLOAD_SIZE_MB`.
- Nama file dibuat acak (UUID), bukan dari nama asli.
- Foto diakses lewat `GET /uploads/:file` atau endpoint khusus yang tetap mengecek akses.
- Foto dibaca dengan `sharp` (EXIF, alpha, piksel RGB). File yang tidak bisa didekode sebagai gambar ditolak dengan 400. Batas piksel input `sharp` tetap aktif. Resize memakai resampler bilinear bergaya PIL karena kernel bawaan `sharp` terlalu berbeda dari torchvision pada gambar kecil.

### 7.6 Kategori otomatis dari foto
- Foto diklasifikasi oleh model ONNX di dalam proses Express. Kontrak model dan preprocessing ada di `ml/PLAN.md` §9.
- Saat laporan dibuat, atau fotonya diganti, hasil model disimpan di `predicted_category` dan `predicted_confidence`.
- Jika `category` tidak dikirim dan ada foto, `category` diisi dari `predicted_category`.
- Jika `category` dikirim, nilai itu yang disimpan. Pengguna boleh mengoreksi hasil model.
- Jika tidak ada foto, `category` wajib. Tanpa `category`, respons 422.
- Jika model gagal memproses foto:
  - `category` dikirim: laporan tetap dibuat dan `predicted_*` kosong.
  - `category` tidak dikirim: respons 422 dengan pesan agar kategori dipilih manual. Laporan tidak dibuat.
- `POST /reports/classify` hanya mengembalikan saran dan tidak menyimpan apa pun. Respons: `{ data: { category, confidence, probabilities, needsReview } }`. Frontend memakainya untuk mengisi kategori sebelum laporan dikirim.
- `needsReview` bernilai `true` jika confidence di bawah 0.5. Ambang ini sementara dan perlu dikalibrasi dengan data validasi.
- Urutan saat membuat laporan dengan foto: validasi input, klasifikasi, simpan foto, lalu simpan laporan dan riwayat status dalam satu transaksi.

## 8. API

Prefix: `/api`. Format sukses: `{ data, meta? }`. Format error: `{ error: { code, message, details? } }`. Field JSON memakai camelCase (`needsReview`, `predictedCategory`). Kolom database memakai snake_case.

### Auth
| Method | Endpoint              | Akses  | Keterangan                    |
|--------|-----------------------|--------|-------------------------------|
| POST   | `/auth/register`      | Publik | Body: name, email, password   |
| POST   | `/auth/login`         | Publik | Set cookie                    |
| POST   | `/auth/logout`        | Login  | Hapus cookie                  |
| GET    | `/auth/me`            | Login  | Data user yang login          |
| PATCH  | `/auth/me/password`   | Login  | Ganti password sendiri        |

### Reports
| Method | Endpoint                   | Akses                     |
|--------|----------------------------|---------------------------|
| GET    | `/reports`                 | Login (scope sesuai role) |
| POST   | `/reports`                 | Login (multipart/form-data jika ada foto) |
| POST   | `/reports/classify`        | Login (multipart, field `file`). Saran kategori dari foto, tidak menyimpan data |
| GET    | `/reports/:id`             | Pemilik / Admin           |
| PUT    | `/reports/:id`             | Pemilik (`pending`) / Admin |
| DELETE | `/reports/:id`             | Pemilik (`pending`) / Admin |
| PATCH  | `/reports/:id/status`      | Admin                     |
| GET    | `/reports/:id/history`     | Pemilik / Admin           |

Query `GET /reports`:
`?search=&status=&category=&from=&to=&reporter_id=&sort=&page=&limit=`

- `search`: pencarian `ILIKE` pada `title`, `description`, `address`.
- `sort`: `created_at_desc` (default), `created_at_asc`, `status`.
- `reporter_id`: hanya dipakai admin. User biasa selalu dibatasi ke laporannya sendiri.
- `limit` maksimal 100, default 10.
- Respons menyertakan `meta: { page, limit, total, totalPages }`.

Body `POST /reports`: `title`, `description`, `latitude`, `longitude`, `address` (opsional), `category` (wajib jika tanpa foto; opsional jika ada foto, lihat §7.6), dan `photo` (opsional).

Body `PATCH /reports/:id/status`: `{ "status": "in_progress" | "completed" | "rejected", "reason"?: string }`

### Dashboard
| Method | Endpoint           | Akses                          |
|--------|--------------------|--------------------------------|
| GET    | `/dashboard/stats` | Login (admin: semua, user: miliknya) |

Query: `?from=&to=` (default 30 hari terakhir).

Respons:
- `summary`: total, dan jumlah per status
- `byStatus`: array status dan jumlah
- `byCategory`: array kategori dan jumlah
- `trend`: jumlah laporan per hari dalam rentang
- `topLocations`: area terbanyak, dikelompokkan dengan pembulatan koordinat (misal 3 desimal)

Semua agregasi dilakukan di SQL, bukan di memori.

### Users (admin only)
| Method | Endpoint             | Keterangan                              |
|--------|----------------------|-----------------------------------------|
| GET    | `/users`             | Pencarian `search`, filter `role`, `is_active`, pagination |
| POST   | `/users`             | Buat user dengan role tertentu          |
| GET    | `/users/:id`         |                                         |
| PUT    | `/users/:id`         | Edit name, email, role                  |
| PATCH  | `/users/:id/status`  | Aktif / nonaktif                        |
| PATCH  | `/users/:id/password`| Reset password oleh admin               |
| DELETE | `/users/:id`         | Soft delete                             |

## 9. Kode Status HTTP

| Kode | Kapan                                                  |
|------|--------------------------------------------------------|
| 200  | Sukses                                                 |
| 201  | Resource dibuat                                        |
| 204  | Hapus / logout berhasil tanpa body                     |
| 400  | Format request salah                                   |
| 401  | Belum login / token tidak valid                        |
| 403  | Login tetapi role tidak sesuai                         |
| 404  | Data tidak ada, atau user tidak berhak melihatnya      |
| 409  | Konflik, misalnya email sudah dipakai atau edit saat status bukan `pending` |
| 422  | Validasi gagal atau transisi status tidak valid        |
| 429  | Rate limit                                             |
| 500  | Error tidak terduga (detail hanya di log)              |

## 10. Keamanan

- Helmet untuk header keamanan
- CORS hanya mengizinkan `CORS_ORIGIN`, dengan `credentials: true`
- Validasi semua input (body, query, params) dengan Zod
- Parameterized query lewat Drizzle, tidak ada string SQL manual dari input user
- Batas ukuran body JSON (misal 100kb)
- Error internal tidak dikirim ke klien
- Secret tidak pernah di-log
- Seed admin lewat env atau script, bukan hardcode di kode
- Rate limit juga berlaku untuk `POST /reports/classify`, karena setiap panggilan menjalankan inferensi di CPU
- Path model (`ML_MODEL_PATH`) hanya dari konfigurasi, tidak pernah dari input pengguna

## 11. Tahapan Pengerjaan

### Fase 1 – Fondasi
- [x] Inisialisasi project `be/` (TypeScript, ESLint, Prettier, script dev/build/start)
- [x] Setup config env & validasi env dengan Zod
- [x] Siapkan PostgreSQL (lokal untuk pengembangan, Neon untuk deploy) dan isi `DATABASE_URL` di `be/.env`
- [x] Setup koneksi Drizzle (driver `pg`, kompatibel Neon)
- [x] Schema & migrasi awal: `users`, `reports`, `report_status_history`
- [x] Seed akun admin
- [x] Setup Express: helmet, cors, cookie-parser, json, error handler, health check `GET /api/health` (termasuk status model ML)
- [x] Pasang `sharp` dan `onnxruntime-node`, muat `models/best.onnx` saat startup, dan gagal cepat jika file tidak ada

### Fase 2 – Autentikasi & Otorisasi
- [x] Register, login, logout, `/auth/me`, ganti password
- [x] Middleware `auth` dan `requireRole`
- [x] Rate limit pada endpoint auth
- [x] Test: login sukses/gagal, user nonaktif tidak bisa login, register tidak bisa set role

### Fase 3 – Manajemen Laporan
- [x] CRUD laporan dengan scope per role
- [x] Validasi koordinat & kategori
- [x] Upload foto (Multer, filter tipe & ukuran)
- [x] Klasifikasi otomatis: `POST /reports/classify`, pengisian kategori, dan penyimpanan `predicted_*` saat buat dan ganti foto
- [x] Aturan edit/hapus hanya saat `pending`
- [x] Soft delete
- [x] Test: user tidak bisa akses laporan orang lain, edit saat bukan pending ditolak
- [x] Test: kategori dari model saat tidak dikirim, aturan 422, dan paritas dengan `ml/reports/parity_reference.json`

### Fase 4 – Status & Riwayat
- [x] Endpoint `PATCH /reports/:id/status` dengan transisi tervalidasi
- [x] Wajib `reason` untuk `rejected`
- [x] Insert riwayat dalam transaksi
- [x] Endpoint `GET /reports/:id/history`
- [x] Test: semua kombinasi transisi (valid & tidak valid)

### Fase 5 – Filter, Pencarian, Pagination
- [x] Implementasi query `search`, `status`, `category`, `from`, `to`, `reporter_id`, `sort`, `page`, `limit`
- [x] Index database sesuai kolom filter
- [x] Test: kombinasi filter dan pagination

### Fase 6 – Dashboard
- [x] Endpoint `GET /dashboard/stats` dengan agregasi SQL
- [x] Scope per role
- [x] Filter rentang tanggal
- [x] Test: angka statistik sesuai data seed

### Fase 7 – Manajemen Pengguna
- [x] CRUD user (admin only)
- [x] Aktif/nonaktif, reset password, soft delete
- [x] Proteksi self-demotion dan self-deactivate
- [x] Email unik (case-insensitive)
- [x] Test: akses user biasa ke endpoint admin ditolak (403)

### Fase 8 – Finalisasi
- [x] Dokumentasi API (README atau OpenAPI/Swagger)
- [x] Atribusi dataset (CC BY-NC-SA 4.0), catatan penggunaan non-komersial, dan cara menyalin `best.onnx` di README
- [x] Logging & request ID
- [x] Review keamanan checklist bagian 10
- [ ] Setup deploy (misal Render/Railway/Fly.io) dengan env dari platform. `best.onnx` ikut dikirim ke server, dan base image harus mendukung binary `sharp` dan `onnxruntime-node`
- [x] Setup CI untuk lint, test, dan build

## 12. Keputusan Terkait Backend

| Topik            | Keputusan                                                    |
|------------------|--------------------------------------------------------------|
| Framework        | Express (TypeScript)                                         |
| Database         | PostgreSQL di Neon                                           |
| Driver DB        | `pg` (kompatibel Neon)                                       |
| ORM              | Drizzle ORM                                                  |
| Auth             | JWT di httpOnly cookie                                       |
| Hapus data       | Soft delete untuk `users` dan `reports`                      |
| Email            | Tidak digunakan                                              |
| Reset password   | Dilakukan admin                                              |
| Kategori         | Enum tetap: `organic`, `plastic`, `paper`. Diisi otomatis dari foto, bisa diubah pengguna |
| Klasifikasi kategori | Otomatis dari foto dengan ONNX di Express; pengguna bisa mengoreksi sebelum mengirim |
| Model ML         | `best.onnx` dari `ml/`, tidak di-commit, dimuat sekali saat startup |
| Lisensi dataset  | Tugas kuliah (non-komersial); atribusi dataset dicantumkan   |
| Lokasi           | `latitude` & `longitude` wajib, `address` opsional           |

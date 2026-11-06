# Dokumentasi API — Lapor Sampah

REST API backend (`be/` — Express + TypeScript). Sumber kebenaran: `be/src/app.ts` dan
`be/src/modules/*/routes.ts` + `schema.ts`.

- **Base URL lokal:** `http://localhost:4000`
- **Prefix API:** `/api` (kecuali file statis `/uploads`)
- **Frontend default:** `http://localhost:5173` (lihat `CORS_ORIGIN`)
- **Dokumen terkait:** [`be/README.md`](be/README.md), [`be/PLAN.md`](be/PLAN.md),
  [`README.md`](README.md)

## Daftar Isi

- [Konvensi umum](#konvensi-umum)
- [Autentikasi](#autentikasi)
- [Health](#health)
- [Auth](#auth)
- [Reports](#reports)
- [Dashboard](#dashboard)
- [Users (admin)](#users-admin)
- [File foto](#file-foto)
- [Alur status laporan](#alur-status-laporan)
- [Filter tanggal](#filter-tanggal)
- [Rate limit & upload](#rate-limit--upload)
- [Contoh cepat (curl)](#contoh-cepat-curl)

---

## Konvensi umum

### Format sukses

```json
{ "data": { "...": "..." } }
{ "data": [...], "meta": { "page": 1, "limit": 10, "total": 25, "totalPages": 3 } }
```

Pengecualian:

- `POST /api/auth/register` dan `POST /api/auth/login` mengembalikan
  `{ "data": {...user}, "token": "<jwt>" }` sekaligus `Set-Cookie: token`.
- `204 No Content` tidak punya body (logout, update/delete tertentu).

### Format error

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Validasi gagal", "details": [...] } }
```

| Status | `code`                                  | Kapan muncul                                                                            |
| ------ | --------------------------------------- | --------------------------------------------------------------------------------------- |
| 400    | `INVALID_FILE_TYPE`                     | MIME/ekstensi bukan JPEG/PNG/WebP, atau `sharp` menolak file                            |
| 400    | `INVALID_IMAGE`                         | File bukan gambar valid / gagal diproses                                                |
| 400    | `INVALID_JSON`                          | Body JSON tidak valid                                                                   |
| 400    | `MulterError` lain                      | Error upload selain batas ukuran                                                        |
| 401    | `UNAUTHORIZED`                          | Belum login, token invalid, email/password salah, akun nonaktif/dihapus                 |
| 401    | `INVALID_PASSWORD`                      | Password lama salah saat ganti password (status 422 di kode saat ini)                   |
| 403    | `FORBIDDEN`                             | Role tidak diizinkan (mis. endpoint admin diakses user)                                 |
| 404    | `NOT_FOUND`                             | Endpoint tidak ada, laporan/user tidak ditemukan (termasuk laporan milik orang lain)    |
| 409    | `CONFLICT`                              | Email sudah dipakai, edit/hapus laporan non-`pending` oleh user                         |
| 413    | `PAYLOAD_TOO_LARGE` / `LIMIT_FILE_SIZE` | Body JSON > 100 KB atau file > `MAX_UPLOAD_SIZE_MB`                                     |
| 422    | `VALIDATION_ERROR`                      | Validasi Zod gagal (body/query/params), transisi status ilegal, guard self-action admin |
| 429    | Rate limit                              | Terlalu banyak request auth/classify                                                    |
| 500    | `INTERNAL_ERROR`                        | Error tak terduga / model ML belum siap                                                 |

Validasi body gagal → `422` dengan `details: [{ path, message }]`.
Validasi query/params gagal → `422` juga.

### Enum

| Enum             | Nilai                                             |
| ---------------- | ------------------------------------------------- |
| `role`           | `admin`, `user`                                   |
| `category`       | `organic`, `plastic`, `paper`                     |
| `status`         | `pending`, `in_progress`, `completed`, `rejected` |
| `sort` (laporan) | `created_at_desc`, `created_at_asc`, `status`     |

---

## Autentikasi

Dua mekanisme, keduanya didukung di semua endpoint login:

1. **Cookie httpOnly** `token` — dipakai web (`fetch` dengan `credentials: "include"`).
2. **Header** `Authorization: Bearer <jwt>` — dipakai mobile. Prioritas lebih tinggi dari cookie.

Cara dapat token: `POST /api/auth/register` atau `POST /api/auth/login`.
Keduanya mengembalikan `token` di body **dan** `Set-Cookie`.

Label auth di dokumen ini:

| Label         | Arti                                               |
| ------------- | -------------------------------------------------- |
| `Publik`      | Tanpa token                                        |
| `Login`       | Wajib token valid + akun aktif & belum soft-delete |
| `Admin`       | Login + `role: "admin"`                            |
| `Owner/Admin` | Login + pemilik laporan, atau admin                |

Cookie yang di-set:

- `httpOnly: true`, `path: /`
- Dev: `secure: false`, `sameSite: lax`
- Production: `secure: true`, `sameSite: none`
- `logout` menghapus cookie `token`.

---

## Health

### `GET /api/health` — Publik

Cek server + status model ONNX.

**Respons `200`:**

```json
{
  "data": {
    "status": "ok",
    "model": { "loaded": true, "classes": ["organic", "plastic", "paper"] }
  }
}
```

---

## Auth

Prefix: `/api/auth`. Rate limit register/login: **20 request / 15 menit** (di-skip saat `NODE_ENV=test`).

### `POST /api/auth/register` — Publik

Body JSON:

| Field      | Wajib | Aturan                          |
| ---------- | ----- | ------------------------------- |
| `name`     | Ya    | string, non-kosong setelah trim |
| `email`    | Ya    | email valid, otomatis lowercase |
| `password` | Ya    | 8–72 karakter                   |

Respons `201`:

```json
{
  "data": {
    "id": "uuid",
    "name": "Budi",
    "email": "budi@example.com",
    "role": "user"
  },
  "token": "<jwt>"
}
```

Error: `422` validasi, `409 CONFLICT "Email sudah dipakai"`.

### `POST /api/auth/login` — Publik

Body JSON:

| Field      | Wajib | Aturan                                  |
| ---------- | ----- | --------------------------------------- |
| `email`    | Ya    | email valid, lowercase otomatis         |
| `password` | Ya    | string min 1 (tanpa batas max di login) |

Respons `200`: sama seperti register (`data` user + `token` + cookie).

Error: `401 UNAUTHORIZED "Email atau password salah"` (juga untuk akun nonaktif/dihapus),
`422` validasi.

### `POST /api/auth/logout` — Login

Tanpa body. Respons `204` + hapus cookie `token`. Error: `401` jika belum login.

### `GET /api/auth/me` — Login

Tanpa body/query. Respons `200`:

```json
{ "data": { "id": "uuid", "name": "...", "email": "...", "role": "user" } }
```

### `PATCH /api/auth/me` — Login

Ubah nama sendiri. Body JSON:

| Field  | Wajib | Aturan                                           |
| ------ | ----- | ------------------------------------------------ |
| `name` | Ya    | string trim, 1–100 karakter (satu-satunya field) |

Respons `200`: user terbaru. Error: `401`, `422`.

### `PATCH /api/auth/me/password` — Login

Body JSON:

| Field             | Wajib | Aturan        |
| ----------------- | ----- | ------------- |
| `currentPassword` | Ya    | min 1         |
| `newPassword`     | Ya    | 8–72 karakter |

Respons `204`. Error: `401` belum login, `422` validasi atau password lama salah
(`INVALID_PASSWORD "Password saat ini salah"`).

---

## Reports

Prefix: `/api/reports`. **Semua endpoint wajib login.**
Field foto: `photo` (create/update) atau `file` (classify), tipe `multipart/form-data`.

### Objek Report

```json
{
  "id": "uuid",
  "userId": "uuid",
  "reporter": { "id": "uuid", "name": "...", "email": "...", "role": "user" },
  "title": "Tumpukan sampah",
  "description": "...",
  "category": "plastic",
  "address": "Jl. Mawar 1",
  "postalCode": "40111",
  "latitude": -6.9,
  "longitude": 107.6,
  "photoUrl": "/uploads/<uuid>.jpg",
  "predictedCategory": "plastic",
  "predictedConfidence": 0.87,
  "status": "pending",
  "rejectReason": null,
  "createdAt": "2026-11-06T10:00:00.000Z",
  "updatedAt": "2026-11-06T10:00:00.000Z"
}
```

`reporter` bisa `null` jika user pelapor sudah dihapus.
`photoUrl` / `address` / `postalCode` / `predicted*` / `rejectReason` bisa `null`.

### `POST /api/reports/classify` — Login

Saran kategori dari foto **tanpa menyimpan**. Dipakai frontend saat user memilih foto.

- Content-Type: `multipart/form-data`, field tunggal `file` (wajib).
- Rate limit khusus: **30 request / menit**.

Respons `200`:

```json
{
  "data": {
    "category": "plastic",
    "confidence": 0.87,
    "probabilities": { "organic": 0.05, "plastic": 0.87, "paper": 0.08 },
    "needsReview": false
  }
}
```

`needsReview = true` jika `confidence < 0.5`.

Error: `401`, `422 FILE_REQUIRED "File foto wajib dikirim"`,
`400 INVALID_FILE_TYPE`, `400 INVALID_IMAGE`, `413` file kebesaran, `429`, `500` jika model gagal load.

### `POST /api/reports` — Login

Buat laporan. Terima **JSON atau multipart**. Jika multipart, foto di field `photo` (opsional).

Body/field teks:

| Field         | Wajib       | Aturan                                                            |
| ------------- | ----------- | ----------------------------------------------------------------- |
| `title`       | Ya          | string trim min 1                                                 |
| `description` | Ya          | string trim min 1                                                 |
| `address`     | Tidak       | string trim                                                       |
| `postalCode`  | Tidak       | string trim, max 10                                               |
| `latitude`    | Ya          | number (coerce), -90–90                                           |
| `longitude`   | Ya          | number (coerce), -180–180                                         |
| `category`    | Kondisional | `organic`/`plastic`/`paper`; string kosong dianggap tidak dikirim |

Logika kategori:

- Jika `category` dikirim manual → dipakai, hasil model tetap disimpan di `predictedCategory`/`predictedConfidence`.
- Jika tidak dikirim + ada foto → diisi dari hasil klasifikasi model.
- Tanpa foto + tanpa kategori → `422 "Kategori wajib diisi jika laporan tanpa foto"`.
- Klasifikasi gagal + ada kategori manual → laporan tetap dibuat, `predicted_* = null` + warning.
- Klasifikasi gagal + tanpa kategori manual → `422 "Kategori tidak dapat ditentukan..."`.

Setiap laporan baru otomatis punya satu riwayat `{ toStatus: "pending" }`.

Respons `201`: `{ "data": Report }`.

### `GET /api/reports` — Login (scoped)

Daftar laporan dengan search/filter/sort/pagination.

- **User:** selalu hanya laporannya sendiri (`reporter_id` diabaikan).
- **Admin:** semua laporan, atau filter `reporter_id`.

Query:

| Param         | Default           | Aturan                                                          |
| ------------- | ----------------- | --------------------------------------------------------------- |
| `search`      | —                 | cocokkan `title`/`description`/`address`/`postalCode` (`ilike`) |
| `status`      | —                 | `pending`/`in_progress`/`completed`/`rejected`                  |
| `category`    | —                 | `organic`/`plastic`/`paper`                                     |
| `from`        | —                 | tanggal, lihat [Filter tanggal](#filter-tanggal)                |
| `to`          | —                 | tanggal                                                         |
| `reporter_id` | —                 | UUID (hanya efektif untuk admin)                                |
| `sort`        | `created_at_desc` | `created_at_desc`/`created_at_asc`/`status`                     |
| `page`        | `1`               | int ≥ 1                                                         |
| `limit`       | `10`              | int 1–100                                                       |

Respons `200`:

```json
{
  "data": [{ "...": "Report" }],
  "meta": { "page": 1, "limit": 10, "total": 25, "totalPages": 3 }
}
```

Error: `401`, `422` (sort/page/limit/UUID/tanggal invalid, atau `from` > `to` untuk input date-only).

### `GET /api/reports/:id` — Owner/Admin

Param `:id` harus UUID. User hanya bisa akses laporannya sendiri; selain itu `404`.

Respons `200`: `{ "data": Report }`.

### `PUT /api/reports/:id` — Owner/Admin + aturan status

Edit laporan. Terima **JSON atau multipart** (foto baru di field `photo`, opsional).

Semua field opsional, tapi minimal satu perubahan:

| Field         | Aturan                 |
| ------------- | ---------------------- |
| `title`       | trim min 1             |
| `description` | trim min 1             |
| `address`     | trim, nullable         |
| `postalCode`  | trim max 10, nullable  |
| `latitude`    | -90–90                 |
| `longitude`   | -180–180               |
| `category`    | enum, `""` → undefined |

Aturan:

- **User non-admin** hanya boleh edit saat `status == pending`, selain itu
  `409 CONFLICT "Laporan hanya bisa diubah saat status pending"`.
- **Admin** boleh edit status apa pun.
- Ganti foto → klasifikasi ulang, `predicted_*` diperbarui, file lama **tidak** dihapus otomatis.
- Body kosong tanpa perubahan → `422 "Tidak ada perubahan yang dikirim"`.

Respons `200`: `{ "data": Report }`.

### `DELETE /api/reports/:id` — Owner/Admin + aturan status

Soft delete (`deletedAt` di-set). Tanpa body.

- User non-admin hanya saat `pending`, selain itu `409`.
- Admin bebas hapus.

Respons `204`. Error: `401`, `404`, `409`, `422` (id bukan UUID).

### `PATCH /api/reports/:id/status` — Admin

Ubah status. Hanya admin (`403` untuk user).

Body JSON:

| Field    | Wajib           | Aturan                                                                              |
| -------- | --------------- | ----------------------------------------------------------------------------------- |
| `status` | Ya              | `pending`/`in_progress`/`completed`/`rejected`                                      |
| `reason` | Jika `rejected` | string trim min 1; error `422 "Alasan wajib diisi saat menolak laporan"` jika absen |

Efek: update `status`, set `rejectReason` (`reason` atau `null`), tambah baris riwayat
`{ fromStatus, toStatus, changedBy, note }`.

Respons `200`: `{ "data": Report }`.
Error: `401`, `403`, `404`, `422` (validasi, status sama, atau transisi ilegal).

### `GET /api/reports/:id/history` — Owner/Admin

Riwayat status terurut `createdAt` menaik. Respons `200`:

```json
{
  "data": [
    {
      "id": "uuid",
      "reportId": "uuid",
      "fromStatus": null,
      "toStatus": "pending",
      "changedBy": "uuid",
      "changedByUser": {
        "id": "uuid",
        "name": "...",
        "email": "...",
        "role": "user"
      },
      "note": null,
      "createdAt": "2026-11-06T10:00:00.000Z"
    }
  ]
}
```

`fromStatus` `null` untuk entri pertama. `changedByUser` bisa `null`.

---

## Dashboard

### `GET /api/dashboard/stats?from=&to=` — Login (scoped)

Statistik agregat. Scope sama seperti list laporan: user → miliknya, admin → semua.

Query (keduanya opsional, format lihat [Filter tanggal](#filter-tanggal)):

| Param  | Default                                           |
| ------ | ------------------------------------------------- |
| `from` | awal hari (zona `APP_TIMEZONE`) dari 29 hari lalu |
| `to`   | sekarang                                          |

Rentang default = 30 hari terakhir. `from > to` → `422`.

Respons `200` (`data`):

```json
{
  "summary": {
    "total": 10,
    "pending": 3,
    "in_progress": 2,
    "completed": 4,
    "rejected": 1
  },
  "byStatus": [{ "status": "pending", "count": 3 }],
  "byCategory": [{ "category": "plastic", "count": 5 }],
  "trend": [{ "date": "2026-11-06", "count": 2 }],
  "topLocations": [
    {
      "postalCode": "40111",
      "address": "Jl. Mawar 1",
      "latitude": -6.9,
      "longitude": 107.6,
      "count": 4
    }
  ]
}
```

Catatan:

- `trend` grup harian di zona `APP_TIMEZONE`, urut tanggal menaik, format `YYYY-MM-DD`.
- `topLocations` grup per `postalCode` (yang tidak null), urut `count` desc, max 5,
  `latitude`/`longitude` = rata-rata dibulatkan 3 desimal.

---

## Users (admin)

Prefix: `/api/users`. **Semua endpoint wajib Admin** (`401` belum login, `403` bukan admin).

### Objek UserPublic

```json
{
  "id": "uuid",
  "name": "...",
  "email": "...",
  "role": "user",
  "isActive": true,
  "createdAt": "2026-11-06T10:00:00.000Z",
  "updatedAt": "2026-11-06T10:00:00.000Z"
}
```

Tanpa `passwordHash`/`deletedAt`. List hanya menampilkan yang belum soft-delete, urut `name` asc.

### `GET /api/users` — Admin

Query:

| Param       | Default | Aturan                             |
| ----------- | ------- | ---------------------------------- |
| `search`    | —       | `ilike` ke `name`/`email`          |
| `role`      | —       | `admin`/`user`                     |
| `is_active` | —       | `"true"` → true, `"false"` → false |
| `page`      | `1`     | int ≥ 1                            |
| `limit`     | `10`    | int 1–100                          |

Respons `200`: `{ "data": UserPublic[], "meta": { page, limit, total, totalPages } }`.

### `POST /api/users` — Admin

Body JSON:

| Field      | Wajib | Aturan                         |
| ---------- | ----- | ------------------------------ |
| `name`     | Ya    | trim min 1                     |
| `email`    | Ya    | email, lowercase otomatis      |
| `password` | Ya    | 8–72                           |
| `role`     | Tidak | `admin`/`user`, default `user` |

Respons `201`: `{ "data": UserPublic }`. Error: `409 "Email sudah dipakai"`, `422`.

### `GET /api/users/:id` — Admin

Respons `200`: `{ "data": UserPublic }`. Error: `404 "User tidak ditemukan"`, `422` id bukan UUID.

### `PUT /api/users/:id` — Admin

Semua field opsional, minimal satu:

| Field   | Aturan         |
| ------- | -------------- |
| `name`  | trim min 1     |
| `email` | email valid    |
| `role`  | `admin`/`user` |

Guard: admin **tidak bisa menurunkan role dirinya sendiri** →
`422 "Admin tidak bisa menurunkan role dirinya sendiri"`.
Email duplikat → `409`.

Respons `200`: `{ "data": UserPublic }`.

### `PATCH /api/users/:id/status` — Admin

Body JSON: `{ "isActive": boolean }` — harus boolean strict (bukan string).

Guard: `422 "Admin tidak bisa menonaktifkan dirinya sendiri"`.
Respons `200`: `{ "data": UserPublic }`.

### `PATCH /api/users/:id/password` — Admin

Reset password user. Body: `{ "password": "8–72 karakter" }` (wajib).
Respons `204`. Error: `404`, `422`.

### `DELETE /api/users/:id` — Admin

Soft delete (`deletedAt = now`, `isActive = false`). Tanpa body.
Guard: `422 "Admin tidak bisa menghapus dirinya sendiri"`.
Respons `204`.

---

## File foto

### `GET /uploads/:file` — Publik (statis)

Menyajikan file dari `UPLOAD_DIR` via `express.static`. **Tanpa cek kepemilikan** —
siapa pun yang tahu URL bisa akses. Contoh: `GET /uploads/<uuid>.jpg`.

Upload diterima hanya jika:

- MIME `image/jpeg`, `image/png`, `image/webp` **dan** ekstensi `.jpg`/`.jpeg`/`.png`/`.webp`
- Lolos `sharp().metadata()` (gambar valid)
- Ukuran ≤ `MAX_UPLOAD_SIZE_MB` (default 5 MB)
- Nama file disimpan acak: `randomUUID() + ext`

---

## Alur status laporan

```
pending ──► in_progress ──► completed
   │             │
   └─────────────┴────────► rejected
```

| Dari          | Ke yang diizinkan               |
| ------------- | ------------------------------- |
| `pending`     | `in_progress`, `rejected`       |
| `in_progress` | `completed`, `rejected`         |
| `completed`   | (terminal — tidak bisa berubah) |
| `rejected`    | (terminal — tidak bisa berubah) |

- Status tujuan sama dengan saat ini → `422 "Status tujuan sama dengan status saat ini"`.
- Selain itu → `422 "Transisi status {from} ke {to} tidak diizinkan"`.
- Hanya admin via `PATCH /api/reports/:id/status`; `rejected` wajib `reason`.

---

## Filter tanggal

Berlaku untuk `GET /api/reports` (`from`/`to`) dan `GET /api/dashboard/stats`.

| Bentuk                                              | Arti                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| `YYYY-MM-DD` (date-only)                            | Satu hari kalender penuh di zona `APP_TIMEZONE` (default `Asia/Jakarta`) |
| Timestamp ISO lengkap (mis. `2026-11-05T10:00:00Z`) | Instant persis                                                           |

Zona bisa diubah via env `APP_TIMEZONE`. Untuk list reports, `from` date-only yang lebih besar
dari `to` date-only → `422 "Tanggal awal tidak boleh setelah tanggal akhir"`.

---

## Rate limit & upload

| Aturan                                            | Nilai                                                                            |
| ------------------------------------------------- | -------------------------------------------------------------------------------- |
| `POST /api/auth/register`, `POST /api/auth/login` | 20 req / 15 menit / IP                                                           |
| `POST /api/reports/classify`                      | 30 req / menit / IP                                                              |
| Body JSON                                         | max 100 KB                                                                       |
| File upload (memory)                              | max `MAX_UPLOAD_SIZE_MB` MB (default 5), max 20 fields / 25 parts / field 100 KB |
| Tipe file                                         | JPEG, PNG, WebP saja                                                             |

Env terkait (`be/.env`): `PORT`, `JWT_SECRET` (min 32 char), `JWT_EXPIRES_IN` (default `7d`),
`CORS_ORIGIN`, `APP_TIMEZONE`, `UPLOAD_DIR`, `MAX_UPLOAD_SIZE_MB`, `ML_MODEL_PATH`, `BCRYPT_ROUNDS`.

---

## Contoh cepat (curl)

```bash
BASE=http://localhost:4000/api

# health
curl $BASE/health

# register (simpan cookie)
curl -c cookie.txt -X POST $BASE/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Budi","email":"budi@example.com","password":"demo12345"}'

# login
curl -c cookie.txt -X POST $BASE/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"budi@example.com","password":"demo12345"}'

# profil
curl -b cookie.txt $BASE/auth/me

# klasifikasi foto (tanpa simpan)
curl -b cookie.txt -X POST $BASE/reports/classify \
  -F file=@foto.jpg

# buat laporan dengan foto
curl -b cookie.txt -X POST $BASE/reports \
  -F title='Tumpukan sampah' -F description='Di pinggir jalan' \
  -F latitude=-6.9 -F longitude=107.6 -F photo=@foto.jpg

# list + filter
curl -b cookie.txt "$BASE/reports?status=pending&sort=created_at_desc&page=1&limit=10"

# ubah status (admin)
curl -b cookie.txt -X PATCH $BASE/reports/<id>/status \
  -H 'Content-Type: application/json' \
  -d '{"status":"in_progress"}'

# tolak (wajib reason)
curl -b cookie.txt -X PATCH $BASE/reports/<id>/status \
  -H 'Content-Type: application/json' \
  -d '{"status":"rejected","reason":"Foto tidak jelas"}'

# dashboard
curl -b cookie.txt "$BASE/dashboard/stats?from=2026-10-01&to=2026-11-06"

# mobile (tanpa cookie, pakai Bearer)
curl $BASE/reports -H 'Authorization: Bearer <jwt>'
```

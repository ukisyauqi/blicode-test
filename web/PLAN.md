# PLAN – Frontend Aplikasi Laporan Sampah (React)

Frontend aplikasi web untuk mencatat, memantau, dan menangani laporan sampah. Backend ada di folder `be/` (lihat `be/PLAN.md`).

## 1. Ringkasan

Dua role:

- **Admin**: mengelola seluruh laporan, mengubah status, dan mengelola pengguna.
- **User**: membuat laporan, melihat laporan miliknya, dan memantau statusnya.

## 2. Tech Stack

- **React** + **Vite** + **TypeScript**
- **React Router** untuk routing
- **TanStack Query** untuk data fetching dan cache
- **React Hook Form** + **Zod** untuk form dan validasi
- **Tailwind CSS** untuk styling
- **Recharts** untuk grafik dashboard
- **Leaflet** + **React-Leaflet** (OpenStreetMap) untuk peta
- **Vitest** + **Testing Library** untuk test komponen, **Playwright** untuk E2E

API dipanggil ke backend Express (`VITE_API_URL`). Autentikasi memakai cookie httpOnly, sehingga request memakai `credentials: 'include'`.

## 3. Struktur Folder

```
web/
├── PLAN.md
├── .env                     # VITE_API_URL (tidak di-commit)
├── index.html
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── routes/              # definisi route & guard per role
    ├── pages/               # satu file per halaman
    ├── features/
    │   ├── auth/            # form login/register, hook useAuth
    │   ├── reports/         # daftar, form, detail, filter, status, klasifikasi foto
    │   ├── dashboard/       # kartu & grafik
    │   └── users/           # manajemen pengguna (admin)
    ├── components/          # komponen umum (layout, tabel, badge status, peta)
    ├── lib/
    │   ├── api.ts           # fetch wrapper (credentials, error handling)
    │   ├── constants.ts     # kategori & status beserta label
    │   └── utils.ts
    └── types/               # tipe data sesuai response API
```

## 4. Halaman / Route

| Route               | Akses                     | Fungsi                               |
| ------------------- | ------------------------- | ------------------------------------ |
| `/login`            | Publik                    | Login                                |
| `/register`         | Publik                    | Registrasi user                      |
| `/dashboard`        | User & Admin              | Statistik laporan                    |
| `/reports`          | User & Admin              | Daftar laporan, filter, pencarian    |
| `/reports/new`      | User & Admin              | Form buat laporan (dengan peta)      |
| `/reports/:id`      | User & Admin              | Detail laporan, peta, riwayat status |
| `/reports/:id/edit` | Pemilik (pending) / Admin | Form edit laporan                    |
| `/users`            | Admin                     | Daftar & pencarian pengguna          |
| `/users/:id`        | Admin                     | Detail & edit pengguna               |
| `/profile`          | User & Admin              | Profil & ganti password              |
| `/403`, `/404`      | Publik                    | Halaman error                        |

Route guard: belum login → redirect ke `/login`. Role tidak sesuai → `/403`.

## 5. Fitur Frontend

### 5.1 Login & Registrasi

- [x] Form login (email, password) dan registrasi (nama, email, password, konfirmasi password)
- [x] Setelah login, redirect ke `/dashboard`
- [x] Logout dari navbar
- [x] Menu navigasi berbeda untuk admin dan user
- [x] Tampilkan error dari server di form (misal email sudah dipakai, kredensial salah)
- [x] Session dicek lewat `GET /api/auth/me` saat aplikasi dibuka

### 5.2 Dashboard

- [x] Kartu ringkasan: total, Pending, In Progress, Completed, Rejected
- [x] Grafik donut laporan per status
- [x] Grafik batang per kategori (`organic`, `plastic`, `paper`)
- [x] Grafik tren laporan per hari
- [x] Daftar lokasi terbanyak
- [x] Filter periode: 7 hari, 30 hari, dan rentang custom
- [x] Admin melihat data semua laporan; user melihat data laporannya sendiri

### 5.3 Manajemen Laporan

- [x] **Buat laporan**: judul, deskripsi, kategori (diisi otomatis dari foto, bisa diubah), foto opsional, dan lokasi
- [x] **Kategori otomatis**: saat foto dipilih, panggil `POST /api/reports/classify` dan isi kategori dengan hasilnya, misalnya "Plastik (87%)". Jika `needsReview` bernilai `true`, tampilkan peringatan "Periksa kategori". Jika panggilan gagal, pengguna memilih kategori manual. Tombol kirim menunggu klasifikasi selesai atau gagal.
- [x] **Peta lokasi**: klik peta atau geser marker untuk mengisi latitude & longitude; tombol "Gunakan lokasi saya"; alamat teks opsional
- [x] **Daftar laporan**: tabel/kartu dengan status, kategori, dan tanggal
- [x] **Detail laporan**: informasi lengkap, foto, peta, dan riwayat status
- [x] **Edit laporan**: tampil hanya jika user adalah pemilik dan status `pending`, atau user adalah admin. Jika foto diganti, kategori diisi ulang dengan hasil klasifikasi dan tetap bisa diubah.
- [x] **Hapus laporan**: tombol dengan konfirmasi; tampil sesuai aturan yang sama dengan edit
- [x] Validasi form di client sesuai aturan backend (kategori wajib jika tidak ada foto)
- [x] Preview foto sebelum upload, dengan batas ukuran dan tipe file

### 5.4 Filter & Pencarian

- [x] Input pencarian (judul, deskripsi, alamat) dengan debounce
- [x] Filter status, kategori, dan rentang tanggal
- [x] Filter pelapor (hanya tampil untuk admin)
- [x] Sorting: terbaru, terlama, status
- [x] Pagination
- [x] Semua filter tersimpan di URL query string agar bisa dibagikan dan tidak hilang saat refresh

### 5.5 Update Status (Admin)

- [x] Tombol aksi status pada halaman detail, hanya tampil sesuai transisi yang valid
- [x] Tombol "Tolak" membuka dialog yang mewajibkan alasan
- [x] Setelah perubahan, riwayat dan data laporan diperbarui otomatis

Alur status yang ditampilkan:

```
Pending ──► In Progress ──► Completed
   │             │
   └──────┬──────┘
          ▼
      Rejected
```

- [x] Badge warna berbeda untuk setiap status
- [x] Status `completed` dan `rejected` tidak menampilkan tombol aksi

### 5.6 Manajemen Pengguna (Admin)

- [x] Tabel pengguna dengan pencarian, filter role & status, dan pagination
- [x] Form tambah pengguna (nama, email, password, role)
- [x] Form edit pengguna (nama, email, role)
- [x] Toggle aktif/nonaktif
- [x] Reset password oleh admin
- [x] Hapus pengguna dengan konfirmasi
- [x] Tombol untuk mengubah role atau menonaktifkan diri sendiri dinonaktifkan dengan keterangan

### 5.7 Profil

- [x] Lihat dan ubah nama
- [x] Ganti password sendiri (password lama + baru)

### 5.8 UI & UX Umum

- [x] Layout dengan sidebar/navbar responsif (mobile-friendly)
- [x] Loading state dan skeleton
- [x] Empty state (misal belum ada laporan)
- [x] Notifikasi toast untuk sukses dan error
- [x] Halaman 403 dan 404

## 6. Role & Hak Akses (Tampilan)

| Aksi                        | User                   | Admin      |
| --------------------------- | ---------------------- | ---------- |
| Login / Registrasi          | ✅                     | ✅         |
| Lihat dashboard             | ✅ (miliknya)          | ✅ (semua) |
| Buat laporan                | ✅                     | ✅         |
| Kategori otomatis dari foto | ✅                     | ✅         |
| Lihat laporan               | ✅ (miliknya)          | ✅ (semua) |
| Edit laporan                | ✅ (miliknya, pending) | ✅         |
| Hapus laporan               | ✅ (miliknya, pending) | ✅         |
| Ubah status laporan         | ❌                     | ✅         |
| Kelola pengguna             | ❌                     | ✅         |

Catatan: pembatasan di UI hanya untuk pengalaman pengguna. Backend tetap memvalidasi setiap aksi.

## 7. Tahapan Pengerjaan

### Fase 1 – Fondasi

- [x] Inisialisasi project Vite + React + TypeScript
- [x] Setup Tailwind, ESLint, Prettier
- [x] Setup React Router, TanStack Query, `lib/api.ts`
- [x] Layout dasar dan halaman placeholder

### Fase 2 – Autentikasi

- [x] Halaman login & registrasi
- [x] Context/hook auth dan route guard per role
- [x] Halaman profil & ganti password
- [x] Halaman 403 & 404

### Fase 3 – Manajemen Laporan

- [x] Form buat laporan dengan upload foto dan kategori otomatis (panggil `/api/reports/classify`)
- [x] Integrasi peta Leaflet untuk memilih lokasi
- [x] Daftar laporan & halaman detail
- [x] Edit & hapus laporan dengan aturan akses

### Fase 4 – Status & Riwayat

- [x] Tombol aksi status (admin)
- [x] Dialog penolakan dengan alasan
- [x] Komponen riwayat status

### Fase 5 – Filter & Pencarian

- [x] Search, filter, sorting, pagination
- [x] Sinkronisasi dengan URL query string

### Fase 6 – Dashboard

- [x] Kartu ringkasan & grafik (Recharts)
- [x] Filter periode

### Fase 7 – Manajemen Pengguna

- [x] Tabel, pencarian, dan pagination pengguna
- [x] Form tambah & edit pengguna
- [x] Aktif/nonaktif, reset password, hapus

### Fase 8 – Finalisasi

- [x] Responsif dan pengecekan aksesibilitas dasar
- [x] Test komponen (Vitest) dan E2E alur utama (Playwright), termasuk alur foto ke kategori otomatis dengan API tiruan
- [x] Build production (konfigurasi SPA untuk Vercel/Netlify tersedia)
- [ ] Deploy ke hosting (Vercel/Netlify) — memerlukan akses akun hosting

## 8. Keputusan Terkait Frontend

| Topik            | Keputusan                                                                              |
| ---------------- | -------------------------------------------------------------------------------------- |
| Framework        | React (Vite + TypeScript)                                                              |
| Peta             | Leaflet + OpenStreetMap                                                                |
| Registrasi       | User boleh mendaftar sendiri (role default `user`)                                     |
| Lokasi laporan   | Pilih lewat peta (latitude & longitude), alamat teks opsional                          |
| Kategori         | Tiga nilai tetap: `organic`, `plastic`, `paper`. Diisi otomatis dari foto, bisa diubah |
| Klasifikasi foto | Lewat backend (`/api/reports/classify`), bukan langsung dari browser                   |
| Notifikasi email | Tidak diperlukan                                                                       |

Backend: lihat `be/PLAN.md`.

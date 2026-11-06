# Daftar Fitur — Lapor Sampah

## Cara Jalan

```bash
cd be && npm run dev      # http://localhost:4000
cd web && npm run dev     # http://localhost:5173
cd mobile && npx expo start  # opsional, role user saja
```

## Akun Demo

Seed awal (`npm run db:seed`): `ADMIN_EMAIL` / `ADMIN_PASSWORD` dari `be/.env`
(default lokal: `admin@example.com` / `admin12345`).

Data demo (`npm run db:seed:demo`, password `demo12345`):

| Email                    | Role  | Nama         |
| ------------------------ | ----- | ------------ |
| `demo.admin@example.com` | admin | Rina Admin   |
| `demo.budi@example.com`  | user  | Budi Santoso |
| `demo.siti@example.com`  | user  | Siti Rahma   |
| `demo.dewi@example.com`  | user  | Dewi Lestari |

# List Fitur/Halaman

## 1. Auth

- Register sebagai user
- Login sebagai admin
- Login sebagai user
- Logout dari sidebar/navbar

## 2. Dashboard (`/dashboard`)

- Kartu ringkasan: total, Pending, In Progress, Completed, Rejected
- Grafik Donut laporan per status
- Grafik Batang per kategori (`organic`, `plastic`, `paper`)
- Tren laporan per hari
- Daftar lokasi terbanyak
- Filter periode: 7 hari, 30 hari, rentang custom
- Login sebagai user → hanya data miliknya; login admin → semua data

## 3. Buat Laporan (`/reports/new`)

- Isi judul + deskripsi + kategori manual tanpa foto → terkirim
- Pilih foto → kategori terisi otomatis (mis. "Plastik (87%)") via `POST /api/reports/classify`
- Foto low-confidence → muncul peringatan "Periksa kategori" (`needsReview`)
- Matikan backend / upload file bukan gambar → form tetap bisa dikirim dengan kategori manual
- Ganti foto → preview berubah, kategori diisi ulang (tetap bisa diubah manual)
- Peta: klik peta / geser marker → lat-long terisi; tombol "Gunakan lokasi saya"; alamat teks opsional
- Upload > 5MB atau tipe selain gambar → ditolak dengan pesan error
- Submit → masuk ke `/reports`, toast sukses muncul

## 4. Daftar Laporan (`/reports`)

- Tampil sebagai tabel/kartu: status, kategori, tanggal
- Pencarian judul/deskripsi/alamat (debounce)
- Filter status, kategori, rentang tanggal
- Filter pelapor (hanya tampil untuk admin)
- Sorting: terbaru, terlama, status
- Pagination
- Copy URL hasil filter → refresh / buka di tab baru → filter tetap sama (query string)

## 5. Detail Laporan (`/reports/:id`)

- Info lengkap + foto + peta + riwayat status
- Foto disajikan via `/uploads/:file`
- User hanya bisa buka laporannya sendiri; admin bisa buka semua

## 6. Edit / Hapus (`/reports/:id/edit`)

- User pemilik + status `pending` → bisa edit/hapus (dengan konfirmasi hapus)
- User buka laporan orang lain / status bukan `pending` → tombol edit/hapus tidak ada
- Admin → bisa edit/hapus laporan apa pun
- Edit + ganti foto → kategori diisi ulang otomatis

## 7. Status Laporan (admin, di halaman detail)

Alur: `pending → in_progress → completed`, `pending/in_progress → rejected`.

- Tombol aksi hanya tampil untuk transisi valid
- `pending` → "Proses" dan "Tolak" tampil
- "Tolak" wajib isi alasan (dialog, tanpa alasan → error)
- `completed` / `rejected` → tidak ada tombol aksi
- Setelah ubah status → riwayat + data laporan ter-update otomatis
- Login sebagai user → tidak ada tombol aksi status

## 8. Kelola Pengguna (admin, `/users`, `/users/:id`)

- Tabel + pencarian + filter role/status + pagination
- Tambah pengguna: nama, email, password, role
- Edit pengguna: nama, email, role
- Toggle aktif/nonaktif
- Reset password
- Hapus pengguna dengan konfirmasi (soft delete)
- Coba nonaktifkan/hapus/ubah role diri sendiri → tombol disabled + keterangan

## 9. Profil (`/profile`)

- Lihat + ubah nama
- Ganti password (password lama + baru, lama salah → error)

## 10. Mobile (Expo, role `user`)

Route: login, register, `(tabs)/` index, reports, new, profile, `report/[id]`.

- Login/register via `EXPO_PUBLIC_API_URL`
- Lihat daftar laporan milik sendiri
- Buat laporan + foto + lokasi
- Lihat detail laporan
- Lihat/ubah profil + ganti password

## 11. ML (cek cepat)

- `curl http://localhost:4000/api/health` → `classes: ["organic","plastic","paper"]`
- Buka Network tab saat pilih foto di `/reports/new` → ada request ke `/api/reports/classify` dengan respons `category`, `confidence`, `probabilities`, `needsReview`

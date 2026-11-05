# Hasil Pengujian Manual (QA) — Lapor Sampah

**Tanggal pengujian:** 5 November 2026  
**Commit:** `c6f05f0` (`main`)  
**Metode:** pengujian end-to-end melalui browser Chromium pada aplikasi yang berjalan lokal, dilengkapi verifikasi DOM, console, network, dan database.

## Lingkungan

| Item       | Nilai                                                  |
| ---------- | ------------------------------------------------------ |
| OS         | macOS (Apple Silicon)                                  |
| Browser    | Chromium di OpenCode Desktop                           |
| Node.js    | v24.19.0                                               |
| npm        | 11.17.0                                                |
| PostgreSQL | 16.15 (`localhost:5432`)                               |
| Backend    | `http://localhost:4000`                                |
| Frontend   | `http://localhost:5173`                                |
| Model      | `best.onnx`, hash cocok dengan `parity_reference.json` |

## Ringkasan

- **45 skenario** diuji.
- **39 lulus** ✅
- **3 bug** ditemukan dan **sudah diperbaiki** ✅ (branch `fix/qa-bugs`)
- **3 skenario belum diuji mendalam** ⚠️

Tiga bug utama:

1. **Ubah nama profil selalu gagal** — endpoint `PATCH /api/auth/me` tidak ada. → diperbaiki di `fe85dc5`.
2. **Data pelapor dan aktor riwayat tidak tampil** — respons laporan tidak menyertakan data `users`. → diperbaiki di `9e85dd5`.
3. **Filter tanggal `to` dan dashboard memotong laporan hari berjalan** — tanggal `YYYY-MM-DD` dianggap `00:00:00Z`. → diperbaiki di `83268c1`.

---

## Matriks Pengujian

| No  | Area      | Skenario                              | Hasil | Catatan                                                    |
| --- | --------- | ------------------------------------- | ----- | ---------------------------------------------------------- |
| 1   | Auth      | Registrasi user baru                  | ✅    | Otomatis login dan redirect ke dashboard                   |
| 2   | Auth      | Login kredensial valid                | ✅    |                                                            |
| 3   | Auth      | Login password salah                  | ✅    | Pesan "Email atau password salah"                          |
| 4   | Auth      | Registrasi email duplikat             | ✅    | Pesan "Email sudah dipakai"                                |
| 5   | Auth      | Logout                                | ✅    | Kembali ke halaman login                                   |
| 6   | Auth      | Ganti password sendiri                | ✅    | `password123` → `password456`, lalu login ulang berhasil   |
| 7   | Auth      | Ubah nama profil                      | ✅    | Fixed `fe85dc5`: toast sukses dan nama persisten           |
| 8   | Auth      | Perubahan role di DB terbaca frontend | ✅    | `GET /auth/me` mengambil role terbaru                      |
| 9   | Dashboard | Dashboard user tanpa data             | ✅    | Empty state semua kartu/grafik                             |
| 10  | Dashboard | Dashboard admin periode custom        | ✅    | Total 2, status, kategori, lokasi, tren terisi             |
| 11  | Laporan   | Buat laporan tanpa foto               | ✅    | Kategori manual tersimpan                                  |
| 12  | Laporan   | Buat laporan dengan foto              | ✅    | Klasifikasi ONNX berjalan                                  |
| 13  | Laporan   | Peringatan confidence < 50%           | ✅    | "Periksa kategori…" tampil                                 |
| 14  | Laporan   | Koreksi kategori manual               | ✅    | Kategori akhir berubah, prediksi model tetap tersimpan     |
| 15  | Laporan   | Upload tipe file tidak didukung       | ✅    | GIF ditolak di frontend                                    |
| 16  | Laporan   | Upload file JPEG rusak                | ✅    | "Klasifikasi otomatis gagal", aplikasi tidak crash         |
| 17  | Laporan   | Detail laporan (foto, peta, riwayat)  | ✅    | Foto & Leaflet tampil                                      |
| 18  | Laporan   | Klik peta mengubah koordinat          | ✅    | Lat/lng form ikut berubah                                  |
| 19  | Laporan   | Edit laporan                          | ✅    | Judul berubah dan tersimpan                                |
| 20  | Laporan   | Hapus laporan + konfirmasi            | ✅    | Soft delete, hilang dari daftar                            |
| 21  | Laporan   | Daftar laporan user                   | ✅    | Hanya laporan milik sendiri                                |
| 22  | Laporan   | Pencarian laporan                     | ✅    | URL query tersinkron                                       |
| 23  | Laporan   | Filter status                         | ✅    |                                                            |
| 24  | Laporan   | Filter kategori                       | ✅    |                                                            |
| 25  | Laporan   | Filter pelapor (admin)                | ✅    | Filter bekerja; kolom pelapor menampilkan nama             |
| 26  | Laporan   | Filter rentang tanggal                | ✅    | Fixed `83268c1`: laporan hari yang sama muncul             |
| 27  | Laporan   | Sorting & pagination                  | ⚠️    | Kontrol tampil; halaman 2 belum teruji karena data < limit |
| 28  | Laporan   | Nama pelapor & aktor riwayat          | ✅    | Fixed `9e85dd5`: nama/email tampil di tabel & riwayat      |
| 29  | Admin     | Status `pending` → `in_progress`      | ✅    | Riwayat bertambah                                          |
| 30  | Admin     | Status `in_progress` → `completed`    | ✅    | Status final                                               |
| 31  | Admin     | Tolak laporan wajib alasan            | ✅    | Validasi alasan berjalan                                   |
| 32  | Admin     | Status final tidak punya aksi         | ✅    | Pesan "bersifat final"                                     |
| 33  | Admin     | Daftar & pencarian user               | ✅    | Filter role/status tersedia                                |
| 34  | Admin     | Tambah user                           | ✅    |                                                            |
| 35  | Admin     | Edit nama & role user                 | ✅    |                                                            |
| 36  | Admin     | Aktif/nonaktif user                   | ✅    | Dua arah berhasil                                          |
| 37  | Admin     | Reset password user                   | ✅    |                                                            |
| 38  | Admin     | Hapus user                            | ✅    | Soft delete, hilang dari daftar                            |
| 39  | Admin     | Proteksi akun sendiri                 | ✅    | Role/status/hapus disabled                                 |
| 40  | Guard     | User biasa akses `/users`             | ✅    | Redirect ke `/403`                                         |
| 41  | Guard     | Route tidak dikenal                   | ✅    | Halaman `/404`                                             |
| 42  | Guard     | Akses halaman privat tanpa sesi       | ✅    | Redirect ke `/login?redirect=…`                            |
| 43  | Lainnya   | Tombol "Gunakan lokasi saya"          | ⚠️    | Belum diuji (permission prompt geolocation)                |
| 44  | Lainnya   | Tampilan mobile/responsif             | ⚠️    | Belum diuji (viewport tool tidak tersedia)                 |
| 45  | Lainnya   | Grafik dashboard                      | ✅    | Sector donut, bar, dan titik tren ter-render               |

---

## Temuan Bug

### BUG-01 — Ubah nama profil gagal (Medium)

**Langkah reproduksi**

1. Login.
2. Buka `/profile`.
3. Ubah "Nama lengkap", klik **Simpan nama**.

**Hasil yang diharapkan:** nama tersimpan dan toast sukses muncul.  
**Hasil aktual:** toast **"Endpoint tidak ditemukan"**, nama tidak berubah.

**Bukti:** `screenshots/09-bug-profil-endpoint.jpeg`

**Penyebab**

- Frontend memanggil `PATCH /api/auth/me` di `web/src/features/auth/api.ts:31-34`.
- Backend tidak mendaftarkan route tersebut. `be/src/modules/auth/routes.ts` hanya memiliki:
  - `POST /register`
  - `POST /login`
  - `POST /logout`
  - `GET /me`
  - `PATCH /me/password`

**Saran perbaikan**

Tambahkan route `PATCH /me` + schema `{ name: string }`, update `users.name`, kembalikan user publik. Alternatif lain: hapus form ubah nama dari UI jika fitur memang tidak diinginkan. Tambahkan tes regresi.

---

### BUG-02 — Data pelapor & aktor riwayat tidak tampil (Medium)

**Langkah reproduksi**

1. Login sebagai admin.
2. Buka `/reports`.
3. Lihat kolom **Pelapor**.
4. Buka detail laporan dan bagian **Riwayat status**.

**Hasil yang diharapkan:** nama/email pelapor dan nama admin yang mengubah status.  
**Hasil aktual:** kolom pelapor `-`, bagian **PELAPOR** `-`, dan riwayat menampilkan **"Pengguna"**.

**Bukti**

- `screenshots/05-daftar-laporan-admin.jpeg`
- `screenshots/03-detail-laporan.jpeg`
- `screenshots/06-status-selesai.jpeg`

**Penyebab**

- `toReport()` di `be/src/modules/reports/service.ts:270-288` hanya mengembalikan kolom tabel `reports`.
- Query `list`, `get`, dan `history` tidak melakukan join ke `users`.
- Frontend sudah siap menampilkan `report.user` / `reporter` dan `changedByUser` (`web/src/features/reports/display.ts`), tetapi datanya tidak pernah dikirim backend.
- E2E mock (`web/e2e/support/mock-api.ts`) menyertakan data pelapor, sehingga masalah ini tidak terdeteksi oleh E2E.

**Saran perbaikan**

- Join `users` pada query laporan dan sertakan `{ id, name, email }` sebagai `reporter`.
- Join `users` pada query riwayat berdasarkan `changed_by`.
- Tambahkan tes backend yang memastikan `reporter` dan `changedByUser` ada di respons.

---

### BUG-03 — Filter tanggal & dashboard memotong laporan hari berjalan (High)

**Langkah reproduksi**

1. Buat laporan pada 5 November 2026 pukul 18:16.
2. Buka `/reports`.
3. Isi **Sampai tanggal** = `05/11/2026`.
4. Bandingkan dengan dashboard periode default 30 hari.

**Hasil yang diharapkan:** laporan pada 5 November ikut tampil.  
**Hasil aktual:**

- Daftar laporan kosong untuk `to=2026-11-05`.
- Dashboard default 30 hari menampilkan **0 laporan**, padahal user punya 1 laporan hari itu.
- Dengan `to=2026-11-06`, laporan muncul.

**Bukti:** `screenshots/10-bug-filter-tanggal.jpeg`

**Penyebab**

- Frontend mengirim tanggal saja (`YYYY-MM-DD`) di `web/src/features/reports/filters.ts:95-107` dan `web/src/features/dashboard/period.ts`.
- Backend memakai `z.coerce.date()` (`be/src/modules/reports/schema.ts:28-38`, `be/src/modules/dashboard/schema.ts:3-11`), sehingga `2026-11-05` menjadi `2026-11-05T00:00:00Z`.
- Query memakai `lte(reports.createdAt, to)` (`be/src/modules/reports/service.ts:99-102`, `be/src/modules/dashboard/service.ts:16-19`), sehingga laporan setelah tengah malam hari itu tidak ikut.

**Saran perbaikan**

- Untuk `to`, gunakan akhir hari: `lte(createdAt, endOfDay(to))` atau `createdAt < awalHariBerikutnya`.
- Terapkan perbaikan yang sama pada filter laporan dan dashboard.
- Pertimbangkan zona waktu eksplisit (mis. `Asia/Jakarta`) agar konsisten dengan tanggal yang dipilih pengguna.
- Tambahkan tes regresi untuk laporan yang dibuat pada hari `to`.

---

## Status Perbaikan

Ketiga bug sudah diperbaiki pada branch `fix/qa-bugs` dan diverifikasi ulang di browser pada 5 November 2026.

| Bug    | Commit     | Perubahan utama                                                                     | Verifikasi                                                                                    |
| ------ | ---------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| BUG-01 | `fe85dc5`  | Route `PATCH /api/auth/me`, schema `{ name }`, service `updateProfile`              | Ubah nama menampilkan toast **"Profil diperbarui"**, nama sidebar berubah dan tetap setelah reload |
| BUG-02 | `9e85dd5`  | Left join `users` untuk `reporter` dan `changedByUser`; user soft-delete tetap tampil | Kolom **Pelapor**, bagian **PELAPOR**, dan riwayat menampilkan nama/email                      |
| BUG-03 | `83268c1`  | `APP_TIMEZONE=Asia/Jakarta`, helper `dateRange`, batas `to` eksklusif, tren per hari lokal | `from=to=2026-11-05` menampilkan laporan hari itu; dashboard default/custom menghitung 1 laporan |

Tes regresi yang ditambahkan:

- `be/tests/auth.test.ts` — 6 tes untuk ubah profil, validasi, dan pencegahan eskalasi role.
- `be/tests/date-filters.test.ts` — batas tengah malam `Asia/Jakarta`, dashboard, tren, dan kompatibilitas ISO timestamp.
- `be/tests/reports-relations.test.ts` — `reporter`, `changedByUser`, akses 404, dan user soft-delete.
- `web/src/features/reports/display.test.ts` — prioritas dan fallback data pelapor/aktor.
- `web/e2e/admin.spec.ts` — kolom Pelapor dan aktor riwayat pada UI.

Hasil verifikasi otomatis:

- Backend: **59 tes lulus**, `typecheck` dan `lint` bersih.
- Frontend: **36 tes lulus**, `typecheck` dan `lint` bersih.
- E2E Playwright: **13 tes lulus**.

Catatan perilaku tanggal: `to=YYYY-MM-DD` kini berarti `< awal hari berikutnya` di zona `APP_TIMEZONE`; timestamp ISO lengkap tetap memakai perbandingan inklusif `lte` seperti sebelumnya.

---

## Data Uji yang Dibuat

### Akun admin uji (masih aktif)

| Field    | Nilai                                    |
| -------- | ---------------------------------------- |
| Email    | `browser.test.1793877354535@example.com` |
| Password | `password456`                            |
| Role     | `admin`                                  |

> Akun ini hanya untuk pengujian lokal. Jangan dipakai di lingkungan produksi.

### Data lain

| Data                                                | Status                                              |
| --------------------------------------------------- | --------------------------------------------------- |
| Laporan "Tumpukan sampah plastik di Monas (diedit)" | Tampil, status **Selesai**, memiliki foto & riwayat |
| Laporan "Laporan uji penolakan"                     | Sudah dihapus (soft delete)                         |
| User "Uji Hapus"                                    | Sudah dihapus (soft delete)                         |
| User "Uji Edit"                                     | Sudah dihapus (soft delete)                         |
| Admin asli `admin@example.com`                      | Tetap ada                                           |
| User `uki@example.com`                              | Tetap ada                                           |

Setelah pengujian, data yang terlihat di aplikasi: **3 user** (Admin, Browser Test, uki) dan **1 laporan**.

---

## Batasan Pengujian

- Pagination halaman 2 dan sorting multi-data belum teruji karena hanya tersisa 1 laporan setelah pembersihan.
- Tombol **"Gunakan lokasi saya"** belum diuji karena memerlukan izin geolocation; pemilihan lokasi lewat klik peta sudah teruji.
- Tampilan mobile/responsif belum diuji karena tool browser tidak menyediakan pengaturan viewport.
- Snapshot aksesibilitas browser tidak menghasilkan `ref`, sehingga interaksi dilakukan melalui DOM API pada halaman asli. Semua perubahan tetap melewati UI, React state, dan API backend yang sebenarnya.

---

## Rekomendasi

1. ✅ Perbaiki **BUG-01**, **BUG-02**, dan **BUG-03** beserta tes regresinya (lihat **Status Perbaikan**).
2. Tambahkan tes backend untuk:
   - `PATCH /api/auth/me`
   - join pelapor pada daftar/detail laporan
   - join aktor pada riwayat status
   - inklusivitas tanggal `to`
3. Tambahkan CI untuk `web/` dan `ml/` (saat ini CI hanya backend).
4. Bersihkan akun dan laporan uji sebelum demo/deploy.

---

## Indeks Screenshot

| File                                         | Isi                                       |
| -------------------------------------------- | ----------------------------------------- |
| `screenshots/01-login.jpeg`                  | Halaman login                             |
| `screenshots/02-dashboard-user.jpeg`         | Dashboard user (empty state)              |
| `screenshots/03-detail-laporan.jpeg`         | Detail laporan dengan foto, peta, riwayat |
| `screenshots/04-daftar-laporan-user.jpeg`    | Daftar laporan user                       |
| `screenshots/05-daftar-laporan-admin.jpeg`   | Daftar laporan admin, kolom pelapor "-"   |
| `screenshots/06-status-selesai.jpeg`         | Status berubah menjadi Selesai            |
| `screenshots/07-detail-pengguna.jpeg`        | Detail pengguna (admin)                   |
| `screenshots/08-dashboard-admin-custom.jpeg` | Dashboard admin periode custom            |
| `screenshots/09-bug-profil-endpoint.jpeg`    | BUG-01: "Endpoint tidak ditemukan"        |
| `screenshots/10-bug-filter-tanggal.jpeg`     | BUG-03: filter tanggal mengosongkan hasil |

# Mobile – Lapor Sampah (Expo)

Aplikasi mobile untuk **pengguna (role `user`)**: registrasi/login, dashboard miliknya,
buat laporan sampah dengan foto + GPS + deskripsi, lihat riwayat/status laporan,
dan klasifikasi foto otomatis (AI Image Detection) lewat backend yang sudah ada.

Scope mobile = role `user` saja. Fitur admin (ubah status, kelola pengguna,
dashboard semua laporan) tetap lewat web. Rencana lengkap: [`PLAN.md`](PLAN.md).

## Tech Stack

| Kebutuhan       | Pilihan                                              |
| --------------- | ---------------------------------------------------- |
| Framework       | Expo (Managed, SDK ~58) + React Native + TypeScript  |
| Navigasi        | Expo Router (file-based) + bottom tabs               |
| Data fetching   | TanStack Query v5                                    |
| Validasi        | Zod (skema disalin dari `be/`, tanpa React Hook Form)|
| HTTP client     | `fetch` + wrapper `src/lib/api.ts`                   |
| Foto            | `expo-image-picker` (kamera / galeri)                |
| Lokasi          | `expo-location` (GPS otomatis + tombol "Perbarui lokasi" + input manual) |
| Peta            | Tanpa peta native (butuh Google Maps API key); koordinat teks + tautan Google Maps |
| Sesi            | `expo-secure-store` (token Bearer; `localStorage` di web)    |
| Grafik          | Bar digambar manual dengan `View` (tanpa lib chart)  |
| Ikon & hero     | `@expo/vector-icons`, `expo-linear-gradient`         |
| Web             | `react-native-web` + `react-dom` via `expo start --web` |
| Testing         | Node test runner (`node --test`, tanpa Vitest)       |

## Prasyarat

- Node.js 20+ dan backend `be/` yang sudah berjalan (butuh `best.onnx` + migrasi + seed,
  lihat README root).
- Backend wajib mendukung auth Bearer (sudah ada): `authenticate` menerima
  `Authorization: Bearer <jwt>` dan `register`/`login` mengembalikan `{ data, token }`.

## Menjalankan

```bash
cd mobile
npm install
cp .env.example .env   # lalu isi EXPO_PUBLIC_API_URL dengan IP LAN kamu
npx expo start         # buka lewat Expo Go (scan QR)
npx expo start --web   # alternatif: jalan di browser (lihat "Jalan di web")
```

| Perintah            | Fungsi                                      |
| ------------------- | ------------------------------------------- |
| `npm test`          | Tes API client (Node test runner)           |
| `npm run typecheck` | Pemeriksaan tipe TypeScript                 |
| `npx expo start`    | Dev server + QR untuk Expo Go               |
| `npx expo start --web` | Dev server web di `http://localhost:8081` |

## Jalan di web

`npx expo start --web` membuka aplikasi yang sama di browser — berguna untuk
verifikasi cepat tanpa HP. Penyesuaian khusus web (otomatis, tanpa config):

- Token sesi memakai `localStorage` (SecureStore tidak ada di browser).
- Lokasi diambil otomatis saat layar Lapor dibuka (`expo-location`, tanpa API key);
  tampil sebagai teks koordinat + tombol "Perbarui lokasi" + input manual +
  tautan "Buka di Google Maps" (`MapPicker.tsx`, `ReportMap.tsx`).
- Tombol Kamera disembunyikan di web; Galeri memakai file picker browser.
  Upload foto di web dikirim sebagai `Blob` asli (`photoForm` async).
- Browser menegakkan CORS: untuk uji lokal, `CORS_ORIGIN` di `be/.env` harus
  mencakup origin web (`http://localhost:8081`). Jangan commit perubahan itu
  bila origin normalnya `http://localhost:5173` (untuk `web/`).

Tidak ada script `lint` di mobile; sebelum merge cukup `npm test` + `npm run typecheck`
plus uji melawan backend lokal + data demo (`npm run db:seed:demo` di `be/`).

## Konfigurasi Environment

```
EXPO_PUBLIC_API_URL=http://<IP-LAN>:4000/api
```

- Pakai **IP LAN** (bukan `localhost`) saat uji di device fisik agar satu jaringan
  dengan backend. Emulator Android pakai `http://10.0.2.2:4000/api`,
  simulator iOS bisa pakai `http://localhost:4000/api`.
- `CORS_ORIGIN` backend tidak relevan untuk mobile (bukan browser origin).
- Batas upload ikut backend: `MAX_UPLOAD_SIZE_MB` default 5; tipe `jpeg/png/webp`.

## Struktur

```text
mobile/
├── app/
│   ├── _layout.tsx          # QueryClient + AuthProvider + guard login
│   ├── login.tsx            # Masuk
│   ├── register.tsx         # Daftar (+ konfirmasi password di client)
│   ├── +not-found.tsx       # Halaman 404
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Bottom tabs
│   │   ├── index.tsx        # Dashboard (kartu + bar + tren + lokasi)
│   │   ├── reports.tsx      # Riwayat: search/filter/sort/infinite scroll
│   │   ├── new.tsx          # Form laporan: foto + AI + peta + GPS
│   │   └── profile.tsx      # Profil + ganti password + tentang + keluar
│   └── report/[id].tsx      # Detail + peta read-only + timeline riwayat
├── src/
│   ├── auth.tsx             # Session provider (user, login, register, logout)
│   ├── lib/api.ts           # fetch wrapper, token Bearer, error backend, fileUrl
│   ├── lib/constants.ts     # Label kategori & status (Indonesia)
│   ├── lib/validation.ts    # Skema Zod (login, register, laporan, password)
│   ├── types.ts             # Tipe respons API
│   └── ui.tsx               # Komponen dasar (Screen, Field, Btn, Badge, ...)
├── test/                    # Stub SecureStore + loader untuk tes di Node
├── api.test.ts              # Tes auth header, 401, dan error jaringan
└── app.json                 # Nama, scheme, permission kamera/galeri/lokasi
```

## Autentikasi

- Setelah login/register, token disimpan di SecureStore (dengan cache memori)
  dan dikirim sebagai `Authorization: Bearer <jwt>` di setiap request.
- Respons `401` membersihkan token dan memicu callback `onUnauthorized` ke
  `AuthProvider`, yang mengosongkan user → guard melempar ke `/login`.
  Masa berlaku token ikut `JWT_EXPIRES_IN` backend (default 7 hari).
- Logout: `POST /auth/logout` + hapus token + reset cache Query.

## Layar & API

Base URL = `EXPO_PUBLIC_API_URL` + prefix `/api`. Sukses `{ data, meta? }`,
error `{ error: { code, message } }` (pesan backend berbahasa Indonesia,
ditampilkan apa adanya).

| Layar              | Endpoint |
| ------------------ | -------- |
| Login / Register   | `POST /api/auth/login`, `POST /api/auth/register` |
| Dashboard          | `GET /api/dashboard/stats?from=&to=` (preset 7/30/custom, ter-scope miliknya) |
| Buat laporan       | `POST /api/reports` (multipart, field foto **`photo`**) |
| AI Image Detection | `POST /api/reports/classify` (multipart, field **`file`** → `{ category, confidence, needsReview }`) |
| Riwayat            | `GET /api/reports` (search, filter status/kategori, sort, `page`/`limit`) |
| Detail + riwayat   | `GET /api/reports/:id`, `GET /api/reports/:id/history` |
| Profil             | `GET /api/auth/me`, `PATCH /api/auth/me/password` |

Perilaku form laporan:

1. Pilih foto (kamera/galeri) → klasifikasi otomatis jalan, chip
   "Plastik (87%)" + banner kuning bila `needsReview` (`confidence < 0,5`).
   Jawaban basi diabaikan bila pengguna cepat ganti foto (guard `latest` ref).
2. Kategori terisi dari AI tapi tetap bisa diubah manual. Tanpa foto + tanpa
   kategori → `422` (backend menolak).
3. Titik lokasi: otomatis dari GPS saat layar dibuka, bisa "Perbarui lokasi"
   atau isi manual.
4. Kirim multipart → invalidasi cache `stats` → navigasi ke detail laporan.
   Form tidak dihapus saat error; pesan backend ditampilkan inline.

`photoUrl` backend berbentuk relatif (`/uploads/...`); `fileUrl()` menggabungkannya
dengan origin API.

## Permission Native (`app.json`)

- Kamera/galeri (`expo-image-picker`): pesan izin Indonesia.
- Lokasi saat dipakai (`expo-location`): izin ditolak → isi manual.

## Batasan

- Mobile = role `user`; tidak ada ubah status, manajemen pengguna, edit/hapus laporan.
- Tidak ada antrean upload offline (kirim butuh koneksi); cache terakhir TanStack tetap tampil.
- Grafik dashboard sederhana (tanpa interaksi); naikkan ke `victory-native` bila butuh.
- Belum diuji di device/emulator fisik — kamera, GPS, dan peta wajib uji manual.
- Belum ada EAS build; jalan via Expo Go.
- Foto disajikan statis via `/uploads` tanpa cek kepemilikan (bawaan backend);
  scope user mencegah tampilnya foto orang lain.

## Lisensi dan Atribusi

Model dilatih dengan **Custom Waste Classification Dataset** oleh
[wasifmahmood01](https://www.kaggle.com/datasets/wasifmahmood01/custom-waste-classification-dataset)
(Kaggle), lisensi **CC BY-NC-SA 4.0** — non-komersial, untuk tugas kuliah.
Atribusi yang sama tampil di layar Profil → Tentang.

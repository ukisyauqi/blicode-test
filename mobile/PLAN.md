# PLAN – Mobile App Laporan Sampah

Aplikasi mobile untuk **pengguna (role `user`)**: registrasi/login, dashboard miliknya,
buat laporan sampah dengan foto + GPS + deskripsi, lihat riwayat/status laporan,
dan klasifikasi foto otomatis (AI Image Detection) lewat backend yang sudah ada.

Backend: lihat `be/PLAN.md`. Web (pembanding UX/API): lihat `web/PLAN.md`.
Mobile memakai ulang **API dan aturan bisnis yang sama** — tidak ada logika baru di mobile.

> Scope mobile = role `user` saja. Fitur admin (ubah status, kelola pengguna,
> dashboard semua laporan) tetap lewat web.

---

## 1. Ringkasan & Scope

Fitur yang harus ada (sesuai permintaan):

| # | Fitur | Endpoint backend |
|---|-------|------------------|
| 1 | Register & login (+ logout, sesi, ganti password) | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `PATCH /api/auth/me/password` |
| 2 | Dashboard pengguna | `GET /api/dashboard/stats?from=&to=` (otomatis ter-scope ke laporan miliknya) |
| 3 | Buat laporan (foto, GPS, deskripsi) | `POST /api/reports` (multipart, field foto `photo`) |
| 4 | Riwayat & status laporan | `GET /api/reports`, `GET /api/reports/:id`, `GET /api/reports/:id/history` |
| 5 | AI Image Detection | `POST /api/reports/classify` (multipart, field `file`), + klasifikasi otomatis saat `POST /api/reports` |

Di luar scope v1 mobile: ubah status laporan, manajemen pengguna, edit/hapus laporan
(opsional fase akhir — aturannya sama dengan web: pemilik + status `pending`).

---

## 2. Tech Stack (rekomendasi)

| Kebutuhan | Pilihan | Alasan |
|-----------|---------|--------|
| Framework | **Expo (Managed) + React Native + TypeScript** | Satu bahasa dengan `web/`/`be/` (TS + Zod bisa dipakai ulang), build tanpa native toolchain, akses kamera/GPS mudah |
| Navigasi | **Expo Router** (file-based) | Mirip React Router di `web/`, guard per auth state sederhana |
| Data fetching | **TanStack Query** | Sama seperti web; cache dashboard & daftar laporan, invalidasi otomatis setelah buat laporan |
| Form + validasi | **React Hook Form + Zod** | Skema validasi disalin dari `be/` (email, password ≥ 8, lat/long, kategori) |
| HTTP client | `fetch` + wrapper `lib/api.ts` | Satu tempat untuk base URL, cookie/token, dan format error `{ error: { code, message } }` |
| Foto | `expo-image-picker` (+ `expo-camera` bila butuh capture langsung) | Pilih dari galeri / ambil foto, kompres sebelum upload |
| Lokasi | `expo-location` | GPS device + reverse-geocode opsional untuk `address` |
| Peta | `react-native-maps` | Tampil marker laporan; pilih lokasi dengan tap/drag (paritas Leaflet di web) |
| Penyimpanan sesi | `expo-secure-store` | Simpan token/cookie (lihat §3) |
| Grafik dashboard | `victory-native` atau `react-native-gifted-charts` | Donut status, bar kategori, tren harian |
| Testing | Vitest (unit) + Maestro atau Detox (E2E opsional) | Selaras dengan standar repo (`scripts/check.sh`) |

Alternatif yang ditolak: Flutter/native Kotlin-Swift — tim sudah React/TS,
duplikasi validasi dan API client akan lebih mahal.

---

## 3. Keputusan Kritis: Autentikasi Mobile vs Cookie httpOnly

Backend saat ini (`be/src/middleware/auth.ts`, `be/src/modules/auth/controller.ts`):

- Token JWT **hanya dibaca dari `req.cookies.token`**.
- `POST /auth/register` dan `POST /auth/login` mengembalikan `{ data: user }` dan
  token **hanya lewat `Set-Cookie: token=...`**, tidak ada di body.

React Native tidak mengelola cookie httpOnly seperti browser. Maka sebelum
atau bersamaan fase 1 mobile, backend perlu perubahan kecil yang **backward-compatible**:

1. **Opsi A (disarankan):** `authenticate` juga menerima `Authorization: Bearer <jwt>`,
   dan `register`/`login` ikut mengembalikan `{ data, token }` (selain tetap set cookie).
   Web tidak berubah (tetap pakai cookie).
2. **Opsi B (tanpa ubah backend):** mobile parse `Set-Cookie` dari response login,
   simpan di SecureStore, lalu kirim manual sebagai header `Cookie: token=...`
   di setiap request. Rapuh (redirect, expiry, `secure` di prod) — hanya fallback.

**Definisi selesai §3:** mobile bisa `login → GET /auth/me → logout` melawan backend
lokal maupun staging tanpa mengandalkan WebView. Pilih Opsi A kecuali ada alasan kuat
menolak perubahan backend.

Implikasi lain:

- `CORS_ORIGIN` tidak relevan untuk mobile (bukan browser origin), tidak perlu diubah.
- Rate limit auth & classify tetap berlaku — mobile harus menangani `429` (lihat §9).
- Foto disajikan publik di `GET /uploads/:file`; mobile cukup gabung
  `API_URL` + `photoUrl` dari response. Tidak ada perubahan backend.

---

## 4. Struktur Folder

```
mobile/
├── PLAN.md
├── app.json / app.config.ts      # nama, bundle id, permission kamera/lokasi
├── .env / .env.example           # EXPO_PUBLIC_API_URL
├── src/
│   ├── app/                      # route Expo Router: (auth)/, (tabs)/, reports/
│   ├── features/
│   │   ├── auth/                 # form login/register, hook useAuth/session
│   │   ├── dashboard/            # kartu ringkasan + grafik
│   │   └── reports/              # form lapor, daftar, detail, riwayat, classify
│   ├── components/               # tombol, input, badge status/kategori, map picker
│   ├── lib/
│   │   ├── api.ts                # fetch wrapper + auth header/cookie
│   │   ├── constants.ts          # label kategori & status (id)
│   │   ├── validation.ts         # skema Zod (salin dari be/)
│   │   └── upload.ts             # kompresi foto + batas tipe/ukuran
│   └── types/                    # tipe respons API (camelCase)
├── assets/
└── tests/ / e2e/
```

Aturan: satu file per layar di `app/`, logika di `features/`; tidak ada URL/secret hardcode.

---

## 5. Environment

```
EXPO_PUBLIC_API_URL=http://<IP-LAN>:4000/api
```

- Pakai IP LAN (bukan `localhost`) saat uji di device fisik; emulator Android pakai
  `http://10.0.2.2:4000/api`.
- `VITE_API_URL` (web) dan `EXPO_PUBLIC_API_URL` (mobile) menunjuk backend yang sama.
- Batas upload ikut backend: `MAX_UPLOAD_SIZE_MB` default 5; tipe `jpeg/png/webp`.

---

## 6. Navigasi / Layar

```
(auth)
├── /login                  # email + password → redirect /(tabs)/dashboard
└── /register               # nama + email + password + konfirmasi

(tabs) — bottom tabs, hanya jika sudah login (cek GET /auth/me)
├── /dashboard              # §7.2
├── /reports                # daftar + search/filter/sort (§7.4)
├── /reports/new            # form buat laporan (§7.3) — bisa jadi FAB tengah
├── /profile                # profil + ganti password
└── stack (tanpa tab)
    ├── /reports/:id        # detail + peta + riwayat status
    └── /reports/:id/edit   # OPSIONAL v1.1 (pemilik + pending)
```

Guard: belum login → `/login`. Session dicek saat splash via `GET /auth/me`
(pola sama dengan web `useAuth`).

---

## 7. Detail Fitur

### 7.1 Register & Login

- Form register: `name`, `email`, `password`, konfirmasi password (cek di client saja).
  Body ke backend: `{ name, email, password }`. Role selalu `user` (jangan kirim `role`).
- Form login: `email`, `password`. Error generik backend ("Email atau password salah")
  ditampilkan apa adanya; `409` (email dipakai) dan `429` (rate limit) punya pesan sendiri.
- Setelah sukses: simpan token/cookie ke SecureStore (§3), set header auth global,
  prefetch `GET /auth/me`, redirect ke dashboard.
- Logout: `POST /auth/logout` + hapus penyimpanan lokal + reset cache Query.
- Profil: tampil nama/email; ganti password butuh `currentPassword` + `newPassword`
  (`PATCH /auth/me/password`, 204). Password baru min 8, max 72 (ikut `be/`).
- Validasi client (Zod, salin dari `be/src/modules/auth/schema.ts`):
  email valid + lowercase, password register ≥ 8.

### 7.2 Dashboard Pengguna

- Sumber: `GET /api/dashboard/stats?from=&to=`, default 30 hari terakhir.
- Komponen: kartu ringkasan (total, pending, in_progress, completed, rejected),
  donut per status, bar per kategori (`organic`, `plastic`, `paper`),
  tren harian, lokasi terbanyak.
- Filter periode: 7 hari / 30 hari / custom (date picker) → param `from`/`to`.
  Format tanggal ikut backend: `YYYY-MM-DD` (zona `APP_TIMEZONE`) atau ISO penuh.
- Catatan: backend otomatis me-scope ke laporan milik user login; mobile tidak perlu
  filter `reporter_id`. Pull-to-refresh + cache TanStack Query.
- Empty state jika belum ada laporan ("Belum ada laporan — buat laporan pertama").

### 7.3 Buat Laporan (foto + GPS + deskripsi)

Field (ikut `POST /api/reports`): `title*`, `description*`, `latitude*`, `longitude*`,
`address` (opsional), `category` (wajib jika tanpa foto; opsional jika ada foto —
backend mengisi dari model), `photo` (opsional, multipart field `photo`).

Alur layar:

1. Ambil foto: pilihan kamera / galeri (`expo-image-picker`, `allowsEditing`,
   kualitas ~0.7, max dimension 2048 agar < 5 MB). Preview + tombol hapus/ganti.
   Validasi tipe `jpeg/png/webp` sebelum upload.
2. AI detect otomatis (lihat §8): segera setelah foto dipilih, panggil classify,
   tampilkan chip "Plastik (87%)" + warning bila `needsReview`. Isi dropdown kategori,
   tetap bisa diubah manual.
3. Isi judul + deskripsi + kategori (dropdown 3 nilai tetap).
4. Lokasi: peta `react-native-maps` (tap/drag marker) + tombol "Gunakan lokasi saya"
   (`expo-location`, `requestForegroundPermissionsAsync`). Tampilkan lat/long 6 desimal.
   `address` opsional (reverse-geocode atau isi manual).
5. Kirim: `multipart/form-data` ke `POST /api/reports`. Tampilkan progress upload.
   Sukses (201) → invalidasi `reports` + `dashboard/stats` → navigasi ke detail laporan.
6. Gagal: tampilkan pesan backend (`422` validasi/koordinat/kategori, `400` foto rusak,
   `429` rate limit). Jangan hilangkan form saat error.

### 7.4 Riwayat & Status Laporan

- Daftar (`GET /api/reports`): kartu dengan thumbnail foto, judul, badge status &
  kategori, tanggal relatif. Search (debounce ~400 ms), filter status/kategori,
  rentang tanggal, sort (`created_at_desc` default), pagination/infinite scroll
  (`page`, `limit`, max 100; pakai `meta.totalPages`). Filter cukup yang relevan
  untuk user (tanpa `reporter_id` — backend sudah me-scope).
- Detail (`GET /api/reports/:id`): info lengkap + foto (full-screen viewer) +
  peta read-only + `predictedCategory`/`predictedConfidence` bila ada
  (label "Deteksi AI: Plastik 87% • dikoreksi pengguna" jika `category ≠ predictedCategory`).
- Riwayat (`GET /api/reports/:id/history`): timeline vertikal
  `null → pending → in_progress → completed/rejected` + tanggal + catatan/alasan tolak.
- Alur status untuk referensi (read-only di mobile, aksi ubah hanya admin di web):
  `pending → in_progress → completed`, `pending/in_progress → rejected` (wajib alasan).
- Badge warna konsisten dengan web (pending kuning, in_progress biru,
  completed hijau, rejected merah).

### 7.5 AI Image Detection (integrasi)

Kontrak backend (jangan diubah): `POST /api/reports/classify`, multipart field **`file`**,
respons `{ data: { category, confidence, probabilities, needsReview } }`,
`needsReview = confidence < 0.5`. Kelas: `organic | plastic | paper`.

Perilaku mobile (paritas web §5.3 `web/PLAN.md`):

- Trigger: otomatis saat foto dipilih/diambil + tombol "Deteksi ulang" manual.
- Selama classify berjalan: chip loading ("Menganalisis foto…"), tombol Kirim disabled
  sampai classify selesai **atau** gagal (jangan deadlock).
- Sukses: isi kategori + tampilkan confidence; jika `needsReview` → banner kuning
  "Keyakinan rendah — periksa kategori".
- Gagal (network/429/400): fallback ke pilih kategori manual + toast non-blocking.
  Laporan tetap bisa dikirim tanpa foto (kategori wajib) atau dengan foto +
  kategori manual (backend menyimpan `predicted_*` kosong bila model gagal — tetap valid).
- `POST /api/reports` tanpa `category` + ada foto → backend mengisi dari model;
  tanpa foto + tanpa `category` → `422` (minta user pilih manual).

Batasan model yang wajib dikomunikasikan di UI/catatan (dari README):
hanya 3 kelas (kaca/logam ikut terpaksa ke salah satunya), recall plastik lemah (0,636),
confidence bukan jaminan benar — pengguna selalu bisa mengoreksi.

---

## 8. Kontrak API (ringkas, mobile pakai yang ini)

Base: `EXPO_PUBLIC_API_URL` + prefix `/api`. Sukses `{ data, meta? }`,
error `{ error: { code, message, details? } }`. Field JSON camelCase.

| Method | Endpoint | Body / Query |
|--------|----------|--------------|
| POST | `/auth/register` | `{ name, email, password }` → 201 |
| POST | `/auth/login` | `{ email, password }` (+ terima token, lihat §3) |
| POST | `/auth/logout` | — → 204 |
| GET | `/auth/me` | cek sesi saat splash |
| PATCH | `/auth/me/password` | `{ currentPassword, newPassword }` → 204 |
| GET | `/dashboard/stats?from=&to=` | kartu + grafik |
| GET | `/reports?search=&status=&category=&from=&to=&sort=&page=&limit=` | daftar miliknya |
| POST | `/reports` | multipart: `title, description, latitude, longitude, address?, category?, photo?` |
| POST | `/reports/classify` | multipart field **`file`** → saran AI, tidak menyimpan |
| GET | `/reports/:id` | detail |
| GET | `/reports/:id/history` | timeline status |
| PUT/DELETE | `/reports/:id` | OPSIONAL v1.1, hanya pemilik + `pending` → 409 bila tidak |

Kode status: `201` dibuat, `204` tanpa body, `400` request salah, `401` sesi habis
(→ paksa logout ke `/login`), `404` tidak ada/tidak berhak, `409` konflik
(email dipakai / edit bukan pending), `422` validasi/transisi, `429` rate limit
(→ pesan "terlalu sering, coba lagi"), `500` generic.

---

## 9. Permission & Native Config

`app.json` (Expo):

- `expo-location`: `NSLocationWhenInUseUsageDescription` (iOS) + `ACCESS_FINE_LOCATION` (Android).
  Alur: tombol lokasi → minta izin → jika ditolak, arahkan ke pengaturan + tetap
  izinkan pilih manual di peta.
- Kamera/galeri: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`.
- Android: `INTERNET`, blokir `http` cleartext kecuali dev LAN bila perlu.
- Peta: `react-native-maps` butuh API key Google Maps untuk Android release
  (iOS pakai Apple Maps default). Siapkan di `app.config.ts` via env, bukan hardcode.

---

## 10. State, Error & UX Umum

- Auth state (Context + SecureStore + `GET /auth/me`); Query keys:
  `["me"]`, `["dashboard", from, to]`, `["reports", filters]`, `["report", id]`, `["history", id]`.
- Loading: skeleton dashboard/daftar, shimmer detail; upload & classify punya indikator sendiri.
- Error global: interceptor `lib/api.ts` — `401` → logout; tampilkan `error.message`
  backend (bahasa Indonesia) di toast/inline, bukan pesan teknis.
- Offline: minimal — cache terakhir TanStack Query tetap tampil + banner offline
  (`@react-native-community/netinfo`); kirim laporan butuh koneksi (jangan antrean
  upload di v1).
- Aksesibilitas: label tiap input, kontras badge, target sentuh ≥ 44pt.

---

## 11. Tahapan Pengerjaan

### Fase 0 – Persiapan + backend auth (§3)
- [ ] Putuskan Opsi A (Bearer) vs B (Cookie manual); buat issue/PR kecil di `be/`
- [ ] Tambah `EXPO_PUBLIC_API_URL`, jalankan backend + mobile satu LAN, verifikasi
  `GET /api/health` dari device
- [ ] Inisialisasi Expo + TypeScript + ESLint + router + Query + Zod

### Fase 1 – Fondasi
- [ ] `lib/api.ts` (base URL, auth header/cookie, parser error seragam)
- [ ] Splash + guard + storage sesi (SecureStore)
- [ ] Tema, komponen dasar, bottom tabs, layar 403/404

### Fase 2 – Auth
- [ ] Login, register, logout, `GET /auth/me`, profil + ganti password
- [ ] Test: login salah, email duplikat, sesi kedaluwarsa → redirect login

### Fase 3 – Buat Laporan
- [ ] Form + image picker + kompresi + preview + validasi ukuran/tipe
- [ ] Map picker + "lokasi saya" + alur izin ditolak
- [ ] `POST /reports` multipart + progress + error `422/400/429`

### Fase 4 – AI Detection
- [ ] `POST /reports/classify` otomatis + manual, chip confidence + `needsReview`
- [ ] Tombol kirim menunggu classify selesai/gagal; fallback manual
- [ ] Tampilkan `predictedCategory` di detail

### Fase 5 – Daftar, Detail & Riwayat
- [ ] Daftar + search/filter/sort/pagination (infinite scroll)
- [ ] Detail + foto viewer + peta read-only + timeline `history`

### Fase 6 – Dashboard
- [ ] Kartu + donut/bar/tren/lokasi + filter 7/30/custom + pull-to-refresh + empty state

### Fase 7 – Finalisasi
- [ ] Ikon, splash, nama paket (`app.json`), EAS build Android APK/AAB + iOS bila perlu
- [ ] Test unit validasi & api client; E2E opsional (Maestro) untuk alur foto→kirim
- [ ] Atribusi dataset CC BY-NC-SA 4.0 di layar Tentang (wajib, ikut README root)
- [ ] Update README root + `scripts/check.sh` (tambah `mobile/` bila disepakati)

### Backlog v1.1
- Edit/hapus laporan (pemilik + `pending`), ganti foto → klasifikasi ulang
- Push notification status laporan (butuh backend baru — belum ada)

---

## 12. Testing & Quality Gate

- Unit: skema Zod, mapper kategori/status, `lib/api.ts` (mock fetch).
- Manual wajib per fase: device Android + iOS (atau satu + emulator satunya),
  foto besar (> 5 MB), GPS mati/izin ditolak, classify confidence rendah,
  backend mati (error ramah), token kedaluwarsa.
- Sebelum merge: `tsc`, lint, dan uji melawan backend lokal + data demo
  (`npm run db:seed:demo` di `be/`).

---

## 13. Keputusan

| Topik | Keputusan |
|-------|-----------|
| Framework | Expo + React Native + TS (reuse TS/Zod, satu backend) |
| Navigasi | Expo Router + bottom tabs (Dashboard, Lapor, Riwayat, Profil) |
| Auth mobile | Perlu dukungan Bearer di backend (Opsi A); Cookie manual hanya fallback |
| Scope role | Mobile = `user`; admin tetap web |
| Kategori | Enum tetap `organic/plastic/paper`; AI hanya saran, user bisa koreksi |
| Lokasi | GPS device + map picker; `address` opsional |
| Klasifikasi | Selalu lewat backend (`/reports/classify`); tidak ada inferensi on-device di v1 |
| Grafik | Victory/Gifted-charts (riingan, cukup untuk 5 visual dashboard) |
| Lisensi | Non-komersial + atribusi dataset di aplikasi |

---

## 14. Risiko & Batasan

- **§3 belum dikerjakan → mobile tidak bisa login.** Kerjakan dulu sebelum Fase 2.
- Model hanya 3 kelas, plastik lemah — jangan tampilkan hasil AI sebagai kebenaran mutlak.
- Foto publik via `/uploads/:file` tanpa cek kepemilikan (bawaan backend) — jangan
  tampilkan foto laporan orang lain di mobile (scope user sudah mencegahnya).
- Upload gagal di jaringan buruk — batasi kompresi + timeout + retry manual, tanpa antrean offline di v1.
- Google Maps key Android & bundle id iOS butuh akun pemilik — siapkan sebelum Fase 7.

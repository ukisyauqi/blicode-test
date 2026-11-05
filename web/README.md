# Lapor Sampah – Frontend

Frontend React untuk mencatat, memantau, dan menangani laporan sampah. Terhubung ke REST API Express di folder [`../be`](../be) dan memakai model klasifikasi foto dari [`../ml`](../ml).

## Fitur

- Login, registrasi, logout, dan proteksi route berdasarkan role (`admin` / `user`).
- Dashboard statistik dengan kartu ringkasan, donut status, batang kategori, tren harian, lokasi terbanyak, dan filter periode 7/30 hari atau rentang kustom.
- Daftar laporan dengan pencarian debounce, filter status/kategori/tanggal/pelapor, sorting, pagination, dan sinkronisasi URL.
- Form laporan dengan pemilihan lokasi Leaflet/OpenStreetMap, geolokasi, unggah foto + pratinjau, serta kategori otomatis dari `POST /api/reports/classify`.
- Detail laporan, peta, riwayat status, edit/hapus sesuai aturan akses, serta aksi transisi status untuk admin (termasuk alasan wajib saat menolak).
- Manajemen pengguna untuk admin: tambah, edit, aktif/nonaktif, reset password, dan hapus dengan proteksi akun sendiri.
- Profil dan ganti password.
- Layout responsif, skeleton/loading, empty state, toast, serta halaman 403 dan 404.

## Tech Stack

React 19, Vite, TypeScript, React Router, TanStack Query, React Hook Form + Zod, Tailwind CSS, Recharts, Leaflet + React-Leaflet, Vitest + Testing Library, dan Playwright.

## Menjalankan

Prasyarat: Node.js 20+ dan backend yang berjalan.

```bash
cd web
cp .env.example .env
npm install
npm run dev
```

Isi `.env`:

```env
VITE_API_URL=http://localhost:4000/api
```

Backend perlu mengizinkan origin frontend (`CORS_ORIGIN=http://localhost:5173`) dan mengirim cookie `httpOnly`. Semua request memakai `credentials: "include"`.

## Script

| Perintah                | Fungsi                                  |
| ----------------------- | --------------------------------------- |
| `npm run dev`           | Jalankan dev server Vite (port 5173)    |
| `npm run build`         | Typecheck + build production ke `dist/` |
| `npm run preview`       | Pratinjau hasil build                   |
| `npm run typecheck`     | Cek tipe TypeScript                     |
| `npm run lint`          | ESLint                                  |
| `npm run format`        | Format Prettier                         |
| `npm test`              | Test komponen/unit (Vitest)             |
| `npm run test:watch`    | Vitest mode watch                       |
| `npm run e2e`           | E2E Playwright dengan API tiruan        |
| `npm run test:coverage` | Test unit dengan coverage               |

E2E memakai Chromium Playwright. Jalankan sekali `npx playwright install chromium` bila browser belum tersedia.

## Route

| Route               | Akses                     |
| ------------------- | ------------------------- |
| `/login`            | Publik                    |
| `/register`         | Publik                    |
| `/dashboard`        | User & Admin              |
| `/reports`          | User & Admin              |
| `/reports/new`      | User & Admin              |
| `/reports/:id`      | Pemilik / Admin           |
| `/reports/:id/edit` | Pemilik `pending` / Admin |
| `/users`            | Admin                     |
| `/users/:id`        | Admin                     |
| `/profile`          | User & Admin              |
| `/403`, `/404`      | Publik                    |

## Struktur

```
src/
├── components/     # UI, layout, peta, komponen laporan
├── features/       # auth, reports, dashboard, users (API, hook, form)
├── lib/            # api fetch wrapper, konstanta, util
├── pages/          # satu file per halaman
├── routes/         # route guard
└── types/          # tipe response API
```

## Catatan Integrasi Backend

Kontrak API mengikuti `be/PLAN.md` §8. Beberapa hal yang perlu dipastikan di backend:

- Halaman profil mengubah nama melalui `PATCH /api/auth/me` dengan body `{ "name": "..." }`. Endpoint ini belum tercantum di `be/PLAN.md`; perlu ditambahkan di backend.
- Daftar laporan untuk admin idealnya menyertakan data pelapor pada field `user` atau `reporter` agar kolom pelapor dan filter terisi. Frontend tetap menampilkan `-` bila tidak ada.
- `photoUrl` relatif (mis. `/uploads/abc.jpg`) di-resolve ke origin `VITE_API_URL`.
- Query daftar laporan memakai `reporter_id`, `sort`, `page`, `limit`; daftar pengguna memakai `is_active=true|false`.

## Deployment

Build production:

```bash
npm run build
```

Folder `dist/` dapat diunggah ke Vercel/Netlify. Konfigurasi SPA sudah tersedia di `vercel.json` dan `public/_redirects`. Set `VITE_API_URL` ke URL API production saat build.

Catatan cookie: backend memakai cookie `httpOnly` dengan `SameSite=Lax`. Agar cookie terkirim, frontend dan API sebaiknya berada pada site yang sama (misalnya subdomain dari domain yang sama) atau di-proxy melalui domain frontend. Untuk domain yang benar-benar berbeda, backend perlu mengubah konfigurasi cookie menjadi `SameSite=None; Secure`.

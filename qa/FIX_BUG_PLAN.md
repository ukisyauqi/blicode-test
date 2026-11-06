# Rencana Perbaikan Bug — Lapor Sampah

**Sumber temuan:** `qa/HASIL-PENGUJIAN.md`
**Tanggal disusun:** 5 November 2026
**Basis commit:** `c6f05f0` (`main`)
**Status:** **selesai** — ketiga bug sudah diperbaiki, di-merge, dan terverifikasi

---

## 0. Status Implementasi

Perbaikan dikerjakan di branch `fix/qa-bugs`, di-merge melalui
[PR #1](https://github.com/ukisyauqi/blicode-test/pull/1) ke `main`, lalu branch lokal dan remote
dihapus.

| Item | Commit | Keterangan |
| --- | --- | --- |
| BUG-01 — `PATCH /api/auth/me` | `fe85dc5` | Route, schema, service, dan 6 tes regresi |
| BUG-03 — filter tanggal lokal | `83268c1` | `APP_TIMEZONE`, helper `dateRange`, laporan + dashboard, tes batas hari |
| BUG-02 — reporter & aktor riwayat | `9e85dd5` | Left join `users`, `reporter`, `changedByUser`, tes relasi |
| Dokumentasi QA | `f9b4db8` | `qa/HASIL-PENGUJIAN.md` dan rencana ini |
| Perbaikan CI | `6601009` | `JWT_SECRET` di-quote agar tetap string |
| Merge PR #1 | `571e927` | `main` setelah merge |

**Verifikasi otomatis (lokal):**

- Backend: **59 tes lulus**, `typecheck` dan `lint` bersih, `build` berhasil.
- Frontend: **36 tes lulus**, `typecheck` dan `lint` bersih.
- E2E Playwright: **13 tes lulus**.
- CI `Backend` di `main` hijau (run `42034038078`).

**Verifikasi manual (browser):**

- Ubah nama profil berhasil, persisten setelah reload.
- Kolom **Pelapor**, bagian **PELAPOR**, dan aktor riwayat menampilkan nama/email.
- Filter `from=to=<hari ini>` menampilkan laporan hari itu.
- Dashboard default 30 hari dan periode custom menghitung laporan dengan benar.

**Data demo & pembersihan QA (post-merge):**

- `npm run db:seed:demo` menambahkan 4 akun demo dan 10 laporan lintas status/kategori/tanggal.
- `npm run db:cleanup:qa` menghapus akun/laporan uji berpola `browser.test.*`, `uji.*`, dan `qa.*`
  beserta file fotonya.
- Akun `admin@example.com` dan `uki@example.com` dipertahankan.

---

## 1. Ringkasan

Ada 3 bug yang ditemukan, semuanya terverifikasi lewat browser dan inspection kode, dan kini sudah diperbaiki:

| ID | Bug | Dampak | Prioritas | Estimasi |
| --- | --- | --- | --- | --- |
| BUG-01 | `PATCH /api/auth/me` tidak ada, ubah nama profil selalu gagal | Fitur profil rusak total | Medium | ±30 menit |
| BUG-02 | Respons laporan & riwayat tidak menyertakan data pelapor/aktor | Informasi penting tidak tampil, admin sulit audit | Medium | ±1,5 jam |
| BUG-03 | Filter `to` dan dashboard memotong laporan di hari yang sama | Data hilang dari daftar & statistik | **High** | ±2–3 jam |

Tidak ada perubahan skema database dan tidak ada migrasi. Semua perbaikan bersifat kode aplikasi + tes.

### Prinsip

1. **Backend sebagai sumber kebenaran.** Frontend sudah siap menampilkan data pelapor/aktor; perbaiki kontrak API, bukan menambah fallback di UI.
2. **Tambah tes regresi untuk setiap bug.** Bug tidak dianggap selesai jika hanya diperbaiki manual.
3. **Jangan mengubah perilaku yang sudah benar.** Format respons lama (`userId`, `changedBy`) tetap dipertahankan agar kompatibel.
4. **Satu commit per bug** agar mudah di-review dan di-revert.

### Branch & alur kerja

Branch `fix/qa-bugs` sudah dibuat, di-merge, lalu dihapus (lokal dan remote):

```bash
# Historis
git checkout -b fix/qa-bugs
```

Urutan pengerjaan yang dipakai: **BUG-01 → BUG-03 → BUG-02**.

---

## 2. BUG-01 — Ubah nama profil gagal

### Kondisi saat ini

- UI `web/src/pages/ProfilePage.tsx` → `updateProfile()` di `web/src/features/auth/AuthProvider.tsx`.
- Frontend memanggil `PATCH /auth/me` (`web/src/features/auth/api.ts`, fungsi `updateProfileRequest`).
- Backend hanya mendaftarkan `PATCH /me/password` (`be/src/modules/auth/routes.ts`), sehingga request jatuh ke handler 404 dan UI menampilkan **"Endpoint tidak ditemukan"**.

### Perubahan

**`be/src/modules/auth/schema.ts`** — tambah schema:

```ts
export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
```

Catatan: `z.object` membuang key yang tidak dikenal, jadi payload `{ name, role: "admin" }` tidak bisa dipakai untuk eskalasi role. Tetap tambahkan tes untuk memastikannya.

**`be/src/modules/auth/service.ts`** — tambah service:

```ts
export async function updateProfile(userId: string, input: { name: string }) {
  const [user] = await db
    .update(users)
    .set({ name: input.name, updatedAt: new Date() })
    .where(and(eq(users.id, userId), eq(users.isActive, true), isNull(users.deletedAt)))
    .returning(publicUser);

  if (!user) throw unauthorized("Sesi tidak valid");
  return user;
}
```

Import `and` dan `isNull` dari `drizzle-orm`. Jika user sudah dinonaktifkan/dihapus di tengah sesi, respons 401 lebih aman daripada mengembalikan data.

**`be/src/modules/auth/controller.ts`**:

```ts
export async function updateProfile(req: Request, res: Response) {
  const user = await service.updateProfile(req.user!.id, req.body);
  res.json({ data: user });
}
```

**`be/src/modules/auth/routes.ts`**:

```ts
authRouter.patch(
  "/me",
  authenticate,
  validateBody(updateProfileSchema),
  controller.updateProfile,
);
```

Letakkan setelah `GET /me`. Tidak bentrok dengan `PATCH /me/password` karena Express mencocokkan path secara eksplisit.

### Tes regresi (`be/tests/auth.test.ts`)

1. `PATCH /api/auth/me` tanpa cookie → **401**.
2. Dengan cookie, body `{ name: "Nama Baru" }` → **200**, `data.name === "Nama Baru"`.
3. `GET /api/auth/me` setelah update → nama baru ikut terbaca.
4. Body `{ name: "" }` → **422**.
5. Body `{ name: "X", role: "admin" }` → role tetap `user` (tidak ada eskalasi).
6. User dinonaktifkan setelah login → `PATCH /me` → **401**.

### Kriteria selesai

- [x] Klik **Simpan nama** di `/profile` menampilkan toast sukses dan nama di sidebar langsung berubah.
- [x] Setelah reload, nama baru tetap ada.
- [x] Tes auth lama + 6 tes baru lulus.

---

## 3. BUG-03 — Filter tanggal memotong laporan hari berjalan

### Akar masalah

1. Frontend mengirim tanggal saja (`YYYY-MM-DD`) dari `web/src/features/reports/filters.ts` dan `web/src/features/dashboard/period.ts`.
2. `z.coerce.date()` mengubah `"2026-11-05"` menjadi `2026-11-05T00:00:00.000Z`.
3. Query memakai `lte(createdAt, to)`, sehingga laporan pukul 00:00:01–23:59:59 pada tanggal tersebut **tidak ikut**.
4. Dashboard punya masalah yang sama di `be/src/modules/dashboard/service.ts`, diperparah default `to = new Date()` yang hanya mencakup sampai detik berjalan.

Efek yang terlihat saat QA: laporan 5 Nov 2026 18:16 hilang saat filter `to=2026-11-05`, dan dashboard 30 hari menampilkan **0**.

### Keputusan desain: tanggal = hari kalender lokal

Aplikasi ini dipakai di Indonesia. `YYYY-MM-DD` harus diartikan sebagai **satu hari penuh di zona waktu aplikasi**, bukan tengah malam UTC.

- Tambah env `APP_TIMEZONE` dengan default `Asia/Jakarta` di `be/src/config/env.ts`:

```ts
APP_TIMEZONE: z.string().default("Asia/Jakarta"),
```

- Tambahkan `APP_TIMEZONE=Asia/Jakarta` ke `be/.env.example` dan dokumentasi `be/README.md`.
- Nilai default membuat deployment lama tetap berjalan tanpa perubahan `.env`.

### Helper baru: `be/src/lib/dateRange.ts`

Helper harus mendukung dua bentuk input agar tes lama yang mengirim ISO timestamp tetap jalan:

| Input | Interpretasi |
| --- | --- |
| `2026-11-05` | Awal hari 5 Nov s/d sebelum awal hari 6 Nov, di `APP_TIMEZONE` |
| `2026-11-05T10:00:00Z` | Instant persis, Perbandingan inklusif (`lte`) seperti sebelumnya |

Sketsa:

```ts
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export type DateBound =
  | { kind: "dateOnly"; dateOnly: string }
  | { kind: "instant"; instant: Date };

export function parseDateBound(raw: string | undefined): DateBound | undefined {
  if (!raw) return undefined;
  if (DATE_ONLY.test(raw)) {
    return isValidDateOnly(raw) ? { kind: "dateOnly", dateOnly: raw } : undefined;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : { kind: "instant", instant: parsed };
}

/** Awal hari kalender `YYYY-MM-DD` di zona waktu tertentu, sebagai UTC instant. */
export function startOfDayInZone(date: string, timeZone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const utcMidnight = Date.UTC(year!, month! - 1, day!);
  // Iterasi dua kali agar aman terhadap DST (Asia/Jakarta tidak memakai DST).
  let guess = utcMidnight;
  for (let i = 0; i < 2; i += 1) {
    const offset = timeZoneOffsetMinutes(new Date(guess), timeZone);
    guess = utcMidnight - offset * 60_000;
  }
  return new Date(guess);
}

export function startOfNextDayInZone(date: string, timeZone: string): Date {
  const start = startOfDayInZone(date, timeZone);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

function timeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return (asUTC - date.getTime()) / 60_000;
}
```

Helper final juga menyediakan `isValidDateOnly`, `startOfDayInZone`, `startOfNextDayInZone`,
`formatDateInZone`, dan `addDaysToDateOnly` agar perhitungan periode dashboard tidak bergantung
pada aritmetika 24 jam mentah.

> Alternatif tanpa helper: bandingkan di SQL dengan `(created_at AT TIME ZONE $tz)::date >= $from::date`. Lebih singkat, tetapi membuat index `reports_created_at_idx` tidak terpakai. Untuk skala data saat ini masih aman; helper JS dipilih agar query tetap sargable.

### Perubahan schema

**`be/src/modules/reports/schema.ts`**

```ts
from: z.string().trim().optional(),
to: z.string().trim().optional(),
```

Validasi format tanggal dipindahkan ke service/helper. Jika tetap ingin validasi di schema, gunakan `z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), ...)` yang menerima date-only maupun ISO.

**`be/src/modules/dashboard/schema.ts`** — sama: `from`/`to` menjadi string opsional, lalu validasi `from <= to` dilakukan setelah parsing.

### Perubahan query

**`be/src/modules/reports/service.ts`** (fungsi `list`):

```ts
const timeZone = env.APP_TIMEZONE;
const from = parseDateBound(query.from);
const to = parseDateBound(query.to);
const fromDateOnly = from?.kind === "dateOnly" ? from.dateOnly : undefined;
const toDateOnly = to?.kind === "dateOnly" ? to.dateOnly : undefined;

if (fromDateOnly && toDateOnly && fromDateOnly > toDateOnly) {
  throw unprocessable("Tanggal awal tidak boleh setelah tanggal akhir");
}

if (from) {
  conditions.push(
    gte(
      reports.createdAt,
      from.kind === "dateOnly"
        ? startOfDayInZone(from.dateOnly, timeZone)
        : from.instant,
    ),
  );
}
if (to) {
  conditions.push(
    to.kind === "dateOnly"
      ? lt(reports.createdAt, startOfNextDayInZone(to.dateOnly, timeZone))
      : lte(reports.createdAt, to.instant),
  );
}
```

Tambahkan `lt` ke import `drizzle-orm`.

**`be/src/modules/dashboard/service.ts`**:

```ts
const timeZone = env.APP_TIMEZONE;
const toBound = parseDateBound(query.to);
const fromBound = parseDateBound(query.from);
const toDateOnly = toBound?.kind === "dateOnly" ? toBound.dateOnly : undefined;

const to = toBound
  ? toBound.kind === "dateOnly"
    ? startOfNextDayInZone(toBound.dateOnly, timeZone) // exclusive
    : toBound.instant
  : new Date();

const from = fromBound
  ? fromBound.kind === "dateOnly"
    ? startOfDayInZone(fromBound.dateOnly, timeZone)
    : fromBound.instant
  : startOfDayInZone(
      addDaysToDateOnly(toDateOnly ?? formatDateInZone(to, timeZone), -29),
      timeZone,
    );

if (from > to) throw unprocessable("Tanggal awal tidak boleh setelah tanggal akhir");
```

Lalu:

```ts
gte(reports.createdAt, from),
toBound?.kind === "dateOnly" ? lt(reports.createdAt, to) : lte(reports.createdAt, to),
```

Default tanpa query mencakup **30 hari kalender termasuk hari ini**, bukan 30×24 jam dari detik sekarang.

**Tren harian** juga konsisten dengan zona waktu:

```ts
const day = sql<string>`to_char(date_trunc('day', ${reports.createdAt} AT TIME ZONE ${timeZone}), 'YYYY-MM-DD')`;
const trend = db
  .select({ date: day, count: counts })
  .from(reports)
  .where(where)
  .groupBy(sql`1`)
  .orderBy(sql`1`);
```

Tanpa `AT TIME ZONE`, laporan pukul 00:00–06:59 WIB akan masuk ke tanggal sebelumnya di grafik.
`GROUP BY 1` dipakai karena PostgreSQL menganggap ekspresi `date_trunc` berbeda dari alias select.

### Tes regresi (`be/tests/status-dashboard.test.ts` dan/atau file baru)

Gunakan `db.update(reports).set({ createdAt })` untuk membuat laporan di batas hari, karena API selalu memakai waktu sekarang.

1. Laporan dibuat sekarang → `GET /api/reports?to=<hari ini>` → **total 1**.
2. `?from=<hari ini>&to=<hari ini>` → **total 1**.
3. Laporan di `2026-11-05T16:59:00Z` (23:59 WIB) dan `2026-11-05T17:01:00Z` (00:01 WIB 6 Nov):
   - `?to=2026-11-05` → hanya laporan pertama.
   - `?from=2026-11-06` → hanya laporan kedua.
4. `GET /api/dashboard/stats?from=2026-11-05&to=2026-11-05` → `summary.total` sesuai laporan hari itu.
5. `GET /api/dashboard/stats` tanpa query → laporan hari ini ikut terhitung.
6. ISO timestamp penuh tetap bekerja: `?to=<now+60s>` → laporan ikut tampil (tes lama di `reports-crud.test.ts` harus tetap lulus).
7. `from` setelah `to` → **422**.
8. `trend[].date` untuk laporan 23:59 WIB menunjukkan `2026-11-05`, bukan `2026-11-06`.

### Kriteria selesai

- [x] Filter `to=hari ini` menampilkan laporan yang dibuat hari ini.
- [x] Filter `from=to=hari ini` menampilkan laporan hari ini.
- [x] Dashboard default 30 hari menghitung laporan hari ini.
- [x] Dashboard custom dengan tanggal yang sama mengembalikan data yang sama dengan daftar laporan.
- [x] Tes batas tengah malam lulus untuk `Asia/Jakarta`.
- [x] Tidak ada regresi pada filter ISO timestamp.

---

## 4. BUG-02 — Data pelapor & aktor riwayat tidak tampil

### Akar masalah

- `toReport()` hanya memetakan kolom tabel `reports`; tidak ada `reporter`.
- Query `list`, `findReport`, dan `history` tidak join ke `users`.
- Frontend sudah mendukung `report.reporter`, `report.user`, dan `entry.changedByUser` (`web/src/features/reports/display.ts`), tetapi datanya tidak pernah dikirim.
- E2E mock sudah menyertakan data ini, sehingga E2E tidak menangkap masalah.

### Kontrak respons yang disepakati

Tetap kompatibel dengan bentuk lama, tambahkan field baru:

```jsonc
// GET /api/reports, GET /api/reports/:id, POST/PUT/PATCH
{
  "id": "...",
  "userId": "...",              // tetap ada
  "reporter": {                 // BARU
    "id": "...",
    "name": "Budi",
    "email": "budi@example.com",
    "role": "user"
  },
  "title": "..."
}

// GET /api/reports/:id/history
{
  "id": "...",
  "changedBy": "...",           // tetap ada (UUID)
  "changedByUser": {            // BARU
    "id": "...",
    "name": "Admin",
    "email": "admin@example.com",
    "role": "admin"
  },
  "fromStatus": "pending",
  "toStatus": "in_progress"
}
```

`reporter` dan `changedByUser` bernilai `null` hanya jika relasi benar-benar tidak ditemukan. User yang sudah soft-delete **tetap ditampilkan** karena baris `users` masih ada dan riwayat audit harus tetap terbaca; jangan tambahkan `isNull(users.deletedAt)` pada join ini.

### Perubahan `be/src/modules/reports/service.ts`

1. Tambah kolom publik yang reusable:

```ts
const reporterColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
};
```

2. Ubah `toReport` agar menerima reporter opsional:

```ts
type Reporter = { id: string; name: string; email: string; role: "admin" | "user" } | null;

export function toReport(row: ReportRow, reporter: Reporter = null) {
  return {
    ...existingFields,
    reporter,
  };
}
```

3. `list` — join dan petakan:

```ts
const [rows, totalRows] = await Promise.all([
  db
    .select({ report: reports, reporter: reporterColumns })
    .from(reports)
    .leftJoin(users, eq(reports.userId, users.id))
    .where(where)
    .orderBy(...order)
    .limit(query.limit)
    .offset(offset),
  db.select({ count: sql<number>`count(*)::int` }).from(reports).where(where),
]);

data: rows.map(({ report, reporter }) => toReport(report, reporter)),
```

4. `findReport` — ubah menjadi `findReportWithReporter` yang mengembalikan `{ report, reporter }`, lalu sesuaikan pemanggil (`get`, `update`, `remove`, `changeStatus`, `history`).

5. `create` — ubah signature dari `create(userId, ...)` menjadi `create(user: AuthUser, ...)` agar reporter bisa diisi tanpa query tambahan; controller mengirim `req.user!`. Jika tidak ingin mengubah signature, ambil ulang lewat `findReportWithReporter` setelah insert.

6. `update` dan `changeStatus` — gunakan reporter dari hasil `findReportWithReporter` saat membentuk respons, sehingga respons tetap konsisten.

7. `history` — join aktor:

```ts
return db
  .select({
    id: reportStatusHistory.id,
    reportId: reportStatusHistory.reportId,
    fromStatus: reportStatusHistory.fromStatus,
    toStatus: reportStatusHistory.toStatus,
    changedBy: reportStatusHistory.changedBy,
    changedByUser: reporterColumns,
    note: reportStatusHistory.note,
    createdAt: reportStatusHistory.createdAt,
  })
  .from(reportStatusHistory)
  .leftJoin(users, eq(reportStatusHistory.changedBy, users.id))
  .where(eq(reportStatusHistory.reportId, id))
  .orderBy(asc(reportStatusHistory.createdAt));
```

### Dampak tipe

- `be/src/modules/reports/service.ts`: tambah tipe `Reporter`, ubah signature internal. Tidak ada perubahan schema DB.
- `web/src/types/index.ts`: tidak perlu diubah; `reporter` dan `changedByUser` sudah ada.
- `web/src/features/reports/display.ts`: tidak perlu diubah; prioritaskan `report.reporter` sudah benar. Tambahkan unit test untuk memastikan bentuk baru terbaca.

### Tes regresi

Buat `be/tests/reports-relations.test.ts` (atau tambahkan ke `reports-crud.test.ts`):

1. `POST /api/reports` → `data.reporter` berisi `{ id, name, email, role }` milik pembuat.
2. `GET /api/reports` sebagai admin → setiap item punya `reporter.name`; filter `reporter_id` tetap bekerja.
3. `GET /api/reports/:id` sebagai pemilik dan sebagai admin → `reporter.name` benar.
4. User lain membuka laporan → tetap **404** (tidak ada kebocoran data).
5. `PATCH /:id/status` oleh admin → `GET /:id/history`:
   - entri pertama `changedByUser.name` = nama pelapor,
   - entri kedua `changedByUser.name` = nama admin.
6. Soft-delete user → laporan & riwayat tetap menampilkan nama user tersebut (admin masih bisa audit).
7. `PUT /:id` dan `PATCH /:id/status` → respons juga menyertakan `reporter`.

### Tes frontend

- Tambah `web/src/features/reports/display.test.ts`:
  - `getReportReporter({ reporter: {...} })` → objek reporter.
  - fallback ke `user`, `reporterName`, lalu `null`.
  - `getHistoryActor` dengan `changedByUser` → nama; `changedBy` string tanpa data → `"Pengguna"`; tanpa aktor → `"Sistem"`.
- E2E `admin.spec.ts`/`reports.spec.ts`: pastikan kolom **Pelapor** dan riwayat menampilkan nama, bukan `-`/`Pengguna`. Mock sudah menyediakan data, jadi tes ini mengunci perilaku UI.

### Kriteria selesai

- [x] Kolom **Pelapor** di `/reports` menampilkan nama.
- [x] Bagian **PELAPOR** di detail menampilkan nama & email.
- [x] Riwayat status menampilkan nama aktor (pelapor/admin), bukan "Pengguna".
- [x] Data pelapor tetap tampil meskipun akun sudah di-soft-delete.
- [x] Tidak ada perubahan pada aturan akses (user tetap hanya melihat laporannya sendiri).

---

## 5. Urutan Implementasi

| Langkah | Pekerjaan | Output | Status |
| --- | --- | --- | --- |
| 1 | Buat branch `fix/qa-bugs` | — | ✅ selesai, branch dihapus |
| 2 | BUG-01: schema, service, controller, route, tes | `fe85dc5` | ✅ |
| 3 | BUG-03: helper `dateRange`, env, reports, dashboard, tes | `83268c1` | ✅ |
| 4 | BUG-02: join reporter & history actor, tes backend + web | `9e85dd5` | ✅ |
| 5 | Jalankan seluruh tes & QA manual | Laporan verifikasi | ✅ |
| 6 | Update `qa/HASIL-PENGUJIAN.md` dengan status perbaikan | `f9b4db8` | ✅ |
| 7 | Merge PR #1 dan rapikan branch | `571e927` | ✅ |
| 8 | Bersihkan data QA + seed demo + dokumentasi | Post-merge | ✅ |

Estimasi total: **±1 hari kerja** termasuk tes dan verifikasi.

---

## 6. Verifikasi yang Dijalankan

### Otomatis

```bash
# Backend
cd be
npm run typecheck
npm run lint
npm test

# Frontend
cd web
npm run typecheck
npm run lint
npm test
npm run e2e
```

Semua tes backend membutuhkan `TEST_DATABASE_URL` di `be/.env` dan akan men-truncate tabel test. Jangan arahkan ke database development.

### Manual (browser)

Verifikasi ulang memakai akun demo dari `npm run db:seed:demo`:

| No | Skenario | Ekspektasi |
| --- | --- | --- |
| 1 | `/profile` → ubah nama → Simpan | Toast sukses, nama sidebar & header berubah |
| 2 | Reload `/profile` | Nama baru persisten |
| 3 | `/reports?to=<hari ini>` | Laporan hari ini muncul |
| 4 | `/reports?from=<hari ini>&to=<hari ini>` | Laporan hari ini muncul |
| 5 | Dashboard user default 30 hari | Total laporan hari ini ikut dihitung |
| 6 | Dashboard admin periode custom 1 hari | Angka sama dengan daftar laporan |
| 7 | `/reports` sebagai admin | Kolom Pelapor berisi nama |
| 8 | Detail laporan | PELAPOR berisi nama/email |
| 9 | Riwayat status | Nama admin/pelapor tampil, bukan "Pengguna" |
| 10 | Filter ISO timestamp via API | Perilaku lama tidak berubah |

### Cek regresi cepat

- Login/logout, register duplikat, ganti password.
- Buat laporan dengan/tanpa foto, klasifikasi ONNX, koreksi kategori.
- Edit/hapus laporan saat `pending`.
- Transisi status `pending → in_progress → completed` dan `rejected`.
- Filter status/kategori/pelapor/search/sort/pagination.
- Manajemen user: tambah, edit, aktif/nonaktif, reset password, hapus.

---

## 7. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Perubahan tipe `from`/`to` memecahkan tes lama yang mengirim ISO | Tes gagal | Helper menerima date-only **dan** ISO; jalankan tes lama sebelum merge |
| Perhitungan offset zona waktu salah saat DST | Tanggal bergeser 1 jam | Default `Asia/Jakarta` tanpa DST; helper iterasi dua kali; tambah tes batas hari |
| Join `users` memperlambat daftar laporan | Query lebih lambat | `users.id` primary key; volume data kecil; pantau `EXPLAIN` bila perlu |
| User soft-delete hilang dari riwayat | Audit rusak | Jangan filter `deletedAt` pada join reporter/aktor |
| Respons baru membocorkan data user | Privasi | Hanya kirim `id`, `name`, `email`, `role`; jangan kirim `passwordHash`/`isActive` |
| Perubahan `create` signature memengaruhi pemanggil lain | Compile error | Cari semua pemanggil `service.create` dan `toReport`; `npm run typecheck` |
| Filter tanggal mengabaikan index | Query lambat saat data besar | Bandingkan dengan kolom `created_at` (bukan hasil fungsi); jangan pakai `AT TIME ZONE` di `WHERE` |

---

## 8. Rollback

- Tidak ada migrasi DB, sehingga rollback cukup `git revert` per commit.
- Jika hanya BUG-03 yang bermasalah, revert commit BUG-03 tanpa menyentuh perbaikan lain.
- Tidak ada file upload/data yang perlu dibersihkan akibat perbaikan ini.
- `APP_TIMEZONE` memiliki default, jadi menghapus env tidak memecahkan aplikasi.

---

## 9. Definition of Done

- [x] Ketiga bug tidak bisa direproduksi lagi lewat langkah di `qa/HASIL-PENGUJIAN.md`.
- [x] Tes regresi baru ada dan lulus di CI backend.
- [x] `npm run typecheck` dan `npm run lint` bersih di `be/` dan `web/`.
- [x] E2E frontend lulus.
- [x] Dokumentasi `APP_TIMEZONE` ditambahkan ke README backend.
- [x] `qa/HASIL-PENGUJIAN.md` diperbarui: status bug menjadi **Fixed** dengan commit hash.
- [x] Tidak ada perubahan pada data produksi/development selain data uji QA (yang kemudian dibersihkan) dan data demo baru.

---

## 10. Di Luar Scope

Hal berikut **tidak** dikerjakan dalam rencana perbaikan bug ini dan sebaiknya menjadi tiket terpisah:

- Uji pagination halaman 2 dan sorting multi-data (butuh seed data lebih banyak).
- Uji tombol "Gunakan lokasi saya" (butuh izin geolocation).
- Uji tampilan mobile/responsif.
- Workflow CI khusus untuk `web/` dan `ml/` (sudah tersedia pengganti berupa `scripts/check.sh` lokal).
- Perbaikan infrastruktur deployment dan observability.

Pembersihan akun/laporan uji QA dan penambahan data demo **sudah dikerjakan** setelah PR di-merge
(lihat bagian 12).

---

## 11. Checklist PR

```markdown
## Ringkasan
- fix(auth): tambah PATCH /api/auth/me untuk ubah nama profil
- fix(reports): filter tanggal date-only menjadi satu hari penuh (APP_TIMEZONE)
- fix(reports): sertakan reporter dan changedByUser pada respons

## Tes
- [x] be: npm test
- [x] be: npm run typecheck && npm run lint
- [x] web: npm run typecheck && npm run lint && npm test
- [x] web: npm run e2e

## Catatan
- Tidak ada migrasi DB.
- Env baru: APP_TIMEZONE (default Asia/Jakarta).
- Menutup BUG-01, BUG-02, BUG-03 dari qa/HASIL-PENGUJIAN.md.
```

---

## 12. Pekerjaan Lanjutan Setelah Merge

| Pekerjaan | Perintah | Hasil |
| --- | --- | --- |
| Hapus data uji QA | `cd be && npm run db:cleanup:qa` | 3 akun, 2 laporan, 1 file foto dihapus |
| Isi data demo | `cd be && npm run db:seed:demo` | 4 akun demo + 10 laporan |
| Verifikasi browser | — | Dashboard, daftar laporan, detail, filter tanggal |
| Dokumentasi | — | README root, README backend, dokumen QA |

Data demo bersifat idempoten: menjalankan `db:seed:demo` berulang kali tidak menduplikasi laporan.
Script menolak berjalan jika `NODE_ENV=production`. Akun demo memakai password dari
`DEMO_PASSWORD` (default `demo12345`):

| Email | Role |
| --- | --- |
| `demo.admin@example.com` | admin |
| `demo.budi@example.com` | user |
| `demo.siti@example.com` | user |
| `demo.dewi@example.com` | user |

Akun `admin@example.com` dan `uki@example.com` tidak disentuh oleh cleanup.

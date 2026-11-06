import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { db, pool } from "./index.js";
import { reportStatusHistory, reports, users } from "./schema.js";

/**
 * Seed data demo yang idempoten.
 *
 * Jalankan setelah `db:migrate` dan `db:seed`:
 *   npm run db:seed:demo
 *
 * Script ini membuat 4 akun demo dan 10 laporan dengan status, kategori,
 * tanggal, serta riwayat yang bervariasi. Data yang sudah ada tidak diduplikasi.
 */

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "demo12345";

if (env.NODE_ENV === "production") {
  throw new Error("Seed demo tidak boleh dijalankan dengan NODE_ENV=production");
}

if (DEMO_PASSWORD.length < 8) {
  throw new Error("DEMO_PASSWORD minimal 8 karakter");
}

type Category = "organic" | "plastic" | "paper";
type Status = "pending" | "in_progress" | "completed" | "rejected";

type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
};

type DemoReport = {
  id: string;
  reporterEmail: string;
  title: string;
  description: string;
  category: Category;
  status: Status;
  address: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  hoursAgo: number;
  rejectReason?: string;
  predictedCategory?: Category;
  predictedConfidence?: number;
};

const demoUsers: DemoUser[] = [
  {
    id: "d0000000-0000-4000-8000-000000000001",
    name: "Budi Santoso",
    email: "demo.budi@example.com",
    role: "user",
  },
  {
    id: "d0000000-0000-4000-8000-000000000002",
    name: "Siti Rahma",
    email: "demo.siti@example.com",
    role: "user",
  },
  {
    id: "d0000000-0000-4000-8000-000000000003",
    name: "Dewi Lestari",
    email: "demo.dewi@example.com",
    role: "user",
  },
  {
    id: "d0000000-0000-4000-8000-000000000004",
    name: "Rina Admin",
    email: "demo.admin@example.com",
    role: "admin",
  },
];

const demoReports: DemoReport[] = [
  {
    id: "d1000000-0000-4000-8000-000000000001",
    reporterEmail: "demo.budi@example.com",
    title: "Tumpukan sampah plastik di halte bus",
    description:
      "Tumpukan botol dan kemasan plastik menutupi sebagian trotoar di dekat halte. Sudah dua hari tidak diangkut.",
    category: "plastic",
    status: "completed",
    address: "Halte TransJakarta Bundaran HI, Jakarta Pusat",
    postalCode: "10350",
    latitude: -6.1944,
    longitude: 106.8229,
    hoursAgo: 12 * 24,
    predictedCategory: "plastic",
    predictedConfidence: 0.9142,
  },
  {
    id: "d1000000-0000-4000-8000-000000000002",
    reporterEmail: "demo.siti@example.com",
    title: "Sampah organik menumpuk di pasar",
    description:
      "Sisa sayur dan buah dibiarkan di belakang kios pasar. Bau menyengat dan mulai mengundang lalat.",
    category: "organic",
    status: "completed",
    address: "Pasar Tanah Abang Blok A, Jakarta Pusat",
    postalCode: "10250",
    latitude: -6.1856,
    longitude: 106.8119,
    hoursAgo: 10 * 24,
    predictedCategory: "organic",
    predictedConfidence: 0.8871,
  },
  {
    id: "d1000000-0000-4000-8000-000000000003",
    reporterEmail: "demo.dewi@example.com",
    title: "Kardus bekas di trotoar",
    description:
      "Kardus dan kertas packing bekas dibuang di pinggir trotoar sehingga menghalangi pejalan kaki.",
    category: "paper",
    status: "completed",
    address: "Jl. Jenderal Sudirman, Jakarta Pusat",
    postalCode: "10220",
    latitude: -6.2088,
    longitude: 106.8211,
    hoursAgo: 8 * 24,
    predictedCategory: "paper",
    predictedConfidence: 0.9025,
  },
  {
    id: "d1000000-0000-4000-8000-000000000004",
    reporterEmail: "demo.budi@example.com",
    title: "Botol plastik di taman kota",
    description:
      "Banyak botol minuman bekas berserakan di area bangku taman dan sebagian masuk ke selokan.",
    category: "plastic",
    status: "in_progress",
    address: "Taman Suropati, Jakarta Pusat",
    postalCode: "10310",
    latitude: -6.1994,
    longitude: 106.8331,
    hoursAgo: 6 * 24,
    predictedCategory: "plastic",
    predictedConfidence: 0.836,
  },
  {
    id: "d1000000-0000-4000-8000-000000000005",
    reporterEmail: "demo.siti@example.com",
    title: "Kertas dan koran berserakan",
    description:
      "Tumpukan koran bekas basah menempel di lantai peron dan sulit dibersihkan petugas.",
    category: "paper",
    status: "in_progress",
    address: "Stasiun Gondangdia, Jakarta Pusat",
    postalCode: "10340",
    latitude: -6.1857,
    longitude: 106.8326,
    hoursAgo: 5 * 24,
    predictedCategory: "paper",
    predictedConfidence: 0.7543,
  },
  {
    id: "d1000000-0000-4000-8000-000000000006",
    reporterEmail: "demo.dewi@example.com",
    title: "Sisa makanan di dekat kantin",
    description:
      "Wadah makanan dan sisa nasi dibiarkan di meja luar kantin sejak pagi. Mohon segera dibersihkan.",
    category: "organic",
    status: "pending",
    address: "Kantin kampus, Jl. Salemba Raya, Jakarta Pusat",
    postalCode: "10270",
    latitude: -6.225,
    longitude: 106.8,
    hoursAgo: 4 * 24,
  },
  {
    id: "d1000000-0000-4000-8000-000000000007",
    reporterEmail: "demo.budi@example.com",
    title: "Plastik kemasan di saluran air",
    description:
      "Kantong plastik dan sedotan menyumbat saluran air. Air mulai menggenang saat hujan.",
    category: "plastic",
    status: "pending",
    address: "Jl. Kebon Sirih, Jakarta Pusat",
    postalCode: "10110",
    latitude: -6.182,
    longitude: 106.832,
    hoursAgo: 3 * 24,
  },
  {
    id: "d1000000-0000-4000-8000-000000000008",
    reporterEmail: "demo.dewi@example.com",
    title: "Sampah daun di taman kota",
    description: "Daun kering menumpuk di jalur lari taman setelah pemangkasan pohon kemarin.",
    category: "organic",
    status: "rejected",
    address: "Taman Menteng, Jakarta Pusat",
    postalCode: "10350",
    latitude: -6.195,
    longitude: 106.833,
    hoursAgo: 2 * 24,
    rejectReason: "Lokasi sudah ditangani petugas taman pada hari yang sama.",
    predictedCategory: "organic",
    predictedConfidence: 0.6732,
  },
  {
    id: "d1000000-0000-4000-8000-000000000009",
    reporterEmail: "demo.siti@example.com",
    title: "Kemasan kertas di halte",
    description: "Kotak makanan dan bungkus kertas menumpuk di kursi tunggu halte.",
    category: "paper",
    status: "pending",
    address: "Halte Bus Kota, Jl. Thamrin, Jakarta Pusat",
    postalCode: "10110",
    latitude: -6.175,
    longitude: 106.827,
    hoursAgo: 1 * 24,
  },
  {
    id: "d1000000-0000-4000-8000-000000000010",
    reporterEmail: "demo.budi@example.com",
    title: "Tumpukan plastik di pinggir jalan",
    description:
      "Karung berisi sampah plastik diletakkan di pinggir jalan sejak pagi dan mulai berbau.",
    category: "plastic",
    status: "pending",
    address: "Jl. Wahid Hasyim, Jakarta Pusat",
    postalCode: "10350",
    latitude: -6.19,
    longitude: 106.83,
    hoursAgo: 0,
  },
];

function historySteps(status: Status, rejectReason?: string) {
  const steps: { from: Status | null; to: Status; note: string | null }[] = [
    { from: null, to: "pending", note: null },
  ];

  if (status === "in_progress" || status === "completed") {
    steps.push({ from: "pending", to: "in_progress", note: null });
  }
  if (status === "completed") {
    steps.push({ from: "in_progress", to: "completed", note: null });
  }
  if (status === "rejected") {
    steps.push({
      from: "pending",
      to: "rejected",
      note: rejectReason ?? "Laporan ditolak oleh admin.",
    });
  }

  return steps;
}

const passwordHash = await bcrypt.hash(DEMO_PASSWORD, env.BCRYPT_ROUNDS);

try {
  const userIdByEmail = new Map<string, string>();

  for (const user of demoUsers) {
    await db
      .insert(users)
      .values({
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
      })
      .onConflictDoNothing({ target: users.email });

    const [row] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, user.email))
      .limit(1);

    if (!row) throw new Error(`Gagal membuat user demo ${user.email}`);
    userIdByEmail.set(user.email, row.id);
  }

  const adminId = userIdByEmail.get("demo.admin@example.com")!;
  let insertedReports = 0;

  for (const [index, report] of demoReports.entries()) {
    const reporterId = userIdByEmail.get(report.reporterEmail);
    if (!reporterId) throw new Error(`Pelapor demo tidak ditemukan: ${report.reporterEmail}`);

    const createdAt = new Date(Date.now() - report.hoursAgo * 60 * 60 * 1000);
    const steps = historySteps(report.status, report.rejectReason);
    const stepMinutes = 15;
    const history = steps.map((step, stepIndex) => ({
      id: `d2000000-0000-4000-8000-${String(index + 1).padStart(6, "0")}${String(stepIndex + 1).padStart(6, "0")}`,
      reportId: report.id,
      fromStatus: step.from,
      toStatus: step.to,
      changedBy: stepIndex === 0 ? reporterId : adminId,
      note: step.note,
      createdAt: new Date(createdAt.getTime() + stepIndex * stepMinutes * 60 * 1000),
    }));

    const [inserted] = await db
      .insert(reports)
      .values({
        id: report.id,
        userId: reporterId,
        title: report.title,
        description: report.description,
        category: report.category,
        address: report.address,
        postalCode: report.postalCode,
        latitude: report.latitude,
        longitude: report.longitude,
        predictedCategory: report.predictedCategory ?? null,
        predictedConfidence: report.predictedConfidence ?? null,
        status: report.status,
        rejectReason: report.rejectReason ?? null,
        createdAt,
        updatedAt: history[history.length - 1]!.createdAt,
      })
      .onConflictDoNothing({ target: reports.id })
      .returning({ id: reports.id });

    if (!inserted) continue;

    insertedReports += 1;
    await db.insert(reportStatusHistory).values(history).onConflictDoNothing();
  }

  const existingReports = demoReports.length - insertedReports;
  logger.info(
    `Seed demo selesai: ${demoUsers.length} akun demo tersedia, ${insertedReports} laporan baru, ${existingReports} laporan sudah ada.`,
  );
  logger.info(`Login demo: demo.admin@example.com / ${DEMO_PASSWORD} (role admin)`);
  logger.info(`Login demo: demo.budi@example.com / ${DEMO_PASSWORD} (role user)`);
} finally {
  await pool.end();
}

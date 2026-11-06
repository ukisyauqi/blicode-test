import type { Page, Route } from "@playwright/test";

type Role = "admin" | "user";
type ReportStatus = "pending" | "in_progress" | "completed" | "rejected";
type ReportCategory = "organic" | "plastic" | "paper";

export type MockUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MockReport = {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: ReportCategory;
  address: string | null;
  postalCode: string | null;
  latitude: number;
  longitude: number;
  photoUrl: string | null;
  predictedCategory: ReportCategory | null;
  predictedConfidence: number | null;
  status: ReportStatus;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
};

type HistoryEntry = {
  id: string;
  reportId: string;
  fromStatus: ReportStatus | null;
  toStatus: ReportStatus;
  changedBy: string;
  note: string | null;
  createdAt: string;
};

export type MockState = {
  currentUser: MockUser | null;
  users: MockUser[];
  reports: MockReport[];
  history: HistoryEntry[];
};

const ADMIN: MockUser = {
  id: "user-admin",
  name: "Admin Demo",
  email: "admin@example.com",
  password: "password123",
  role: "admin",
  isActive: true,
  createdAt: "2026-01-05T08:00:00.000Z",
  updatedAt: "2026-01-05T08:00:00.000Z",
};

const BUDI: MockUser = {
  id: "user-budi",
  name: "Budi Santoso",
  email: "budi@example.com",
  password: "password123",
  role: "user",
  isActive: true,
  createdAt: "2026-02-11T09:30:00.000Z",
  updatedAt: "2026-02-11T09:30:00.000Z",
};

const SITI: MockUser = {
  id: "user-siti",
  name: "Siti Aminah",
  email: "siti@example.com",
  password: "password123",
  role: "user",
  isActive: false,
  createdAt: "2026-03-02T10:15:00.000Z",
  updatedAt: "2026-03-02T10:15:00.000Z",
};

function createReports(): MockReport[] {
  return [
    {
      id: "report-1",
      userId: BUDI.id,
      title: "Tumpukan sampah plastik di pasar",
      description: "Sampah plastik menumpuk di dekat pintu masuk pasar sejak tiga hari lalu.",
      category: "plastic",
      address: "Pasar Baru, Jakarta Pusat",
      postalCode: "10110",
      latitude: -6.1667,
      longitude: 106.8333,
      photoUrl: null,
      predictedCategory: "plastic",
      predictedConfidence: 0.87,
      status: "pending",
      rejectReason: null,
      createdAt: "2026-11-03T08:15:00.000Z",
      updatedAt: "2026-11-03T08:15:00.000Z",
    },
    {
      id: "report-2",
      userId: BUDI.id,
      title: "Sampah organik di taman kota",
      description: "Daun dan sisa makanan menumpuk di sudut taman dekat area bermain anak.",
      category: "organic",
      address: "Taman Suropati, Jakarta",
      postalCode: "10310",
      latitude: -6.2,
      longitude: 106.833,
      photoUrl: null,
      predictedCategory: "organic",
      predictedConfidence: 0.62,
      status: "in_progress",
      rejectReason: null,
      createdAt: "2026-11-02T10:40:00.000Z",
      updatedAt: "2026-11-04T09:00:00.000Z",
    },
    {
      id: "report-3",
      userId: SITI.id,
      title: "Kertas bekas di pinggir jalan",
      description: "Kardus dan kertas bekas berserakan di trotoar dan mengganggu pejalan kaki.",
      category: "paper",
      address: "Jl. Sudirman, Jakarta",
      postalCode: "10220",
      latitude: -6.2146,
      longitude: 106.8211,
      photoUrl: null,
      predictedCategory: "paper",
      predictedConfidence: 0.55,
      status: "completed",
      rejectReason: null,
      createdAt: "2026-11-01T07:20:00.000Z",
      updatedAt: "2026-11-04T11:30:00.000Z",
    },
  ];
}

function createHistory(): HistoryEntry[] {
  return [
    {
      id: "hist-1",
      reportId: "report-1",
      fromStatus: null,
      toStatus: "pending",
      changedBy: BUDI.id,
      note: null,
      createdAt: "2026-11-03T08:15:00.000Z",
    },
    {
      id: "hist-2",
      reportId: "report-2",
      fromStatus: null,
      toStatus: "pending",
      changedBy: BUDI.id,
      note: null,
      createdAt: "2026-11-02T10:40:00.000Z",
    },
    {
      id: "hist-3",
      reportId: "report-2",
      fromStatus: "pending",
      toStatus: "in_progress",
      changedBy: ADMIN.id,
      note: null,
      createdAt: "2026-11-04T09:00:00.000Z",
    },
    {
      id: "hist-4",
      reportId: "report-3",
      fromStatus: null,
      toStatus: "pending",
      changedBy: SITI.id,
      note: null,
      createdAt: "2026-11-01T07:20:00.000Z",
    },
    {
      id: "hist-5",
      reportId: "report-3",
      fromStatus: "pending",
      toStatus: "in_progress",
      changedBy: ADMIN.id,
      note: null,
      createdAt: "2026-11-02T09:00:00.000Z",
    },
    {
      id: "hist-6",
      reportId: "report-3",
      fromStatus: "in_progress",
      toStatus: "completed",
      changedBy: ADMIN.id,
      note: "Sudah dibersihkan petugas.",
      createdAt: "2026-11-04T11:30:00.000Z",
    },
  ];
}

export function createMockState(): MockState {
  return {
    currentUser: null,
    users: [ADMIN, BUDI, SITI].map((user) => ({ ...user })),
    reports: createReports(),
    history: createHistory(),
  };
}

async function json(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

async function fail(route: Route, status: number, code: string, message: string) {
  await json(route, status, { error: { code, message } });
}

function publicUser(user: MockUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function reportWithReporter(state: MockState, report: MockReport) {
  const reporter = state.users.find((user) => user.id === report.userId);
  return {
    ...report,
    user: reporter ? publicUser(reporter) : null,
  };
}

function parseMultipartField(body: string, name: string): string | undefined {
  const marker = `name="${name}"`;
  const fieldStart = body.indexOf(marker);
  if (fieldStart === -1) return undefined;
  const valueStart = body.indexOf("\r\n\r\n", fieldStart);
  if (valueStart === -1) return undefined;
  const start = valueStart + 4;
  const end = body.indexOf("\r\n--", start);
  return body.slice(start, end === -1 ? undefined : end);
}

function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  return {
    data: items.slice((page - 1) * limit, page * limit),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

function requireUser(route: Route, state: MockState): MockUser | null {
  if (!state.currentUser) {
    void fail(route, 401, "UNAUTHORIZED", "Belum login");
    return null;
  }
  return state.currentUser;
}

export async function installMockApi(page: Page): Promise<MockState> {
  const state = createMockState();

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");

    if (method === "POST" && path === "/auth/login") {
      const body = request.postDataJSON() as { email?: string; password?: string };
      const user = state.users.find(
        (candidate) =>
          candidate.email === body.email?.toLowerCase() && candidate.password === body.password,
      );
      if (!user || !user.isActive) {
        return fail(route, 401, "UNAUTHORIZED", "Email atau password salah");
      }
      state.currentUser = user;
      return json(route, 200, { data: publicUser(user) });
    }

    if (method === "POST" && path === "/auth/register") {
      const body = request.postDataJSON() as { name: string; email: string; password: string };
      const user: MockUser = {
        id: `user-${state.users.length + 1}`,
        name: body.name,
        email: body.email.toLowerCase(),
        password: body.password,
        role: "user",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.users.push(user);
      state.currentUser = user;
      return json(route, 201, { data: publicUser(user) });
    }

    if (method === "GET" && path === "/auth/me") {
      if (!state.currentUser) return fail(route, 401, "UNAUTHORIZED", "Belum login");
      return json(route, 200, { data: publicUser(state.currentUser) });
    }

    if (method === "POST" && path === "/auth/logout") {
      state.currentUser = null;
      return route.fulfill({ status: 204 });
    }

    if (method === "PATCH" && path === "/auth/me") {
      const user = requireUser(route, state);
      if (!user) return;
      const body = request.postDataJSON() as { name?: string };
      if (body.name) user.name = body.name;
      user.updatedAt = new Date().toISOString();
      return json(route, 200, { data: publicUser(user) });
    }

    if (method === "PATCH" && path === "/auth/me/password") {
      const user = requireUser(route, state);
      if (!user) return;
      return route.fulfill({ status: 204 });
    }

    if (method === "GET" && path === "/dashboard/stats") {
      const user = requireUser(route, state);
      if (!user) return;
      const scoped = state.reports.filter(
        (report) => user.role === "admin" || report.userId === user.id,
      );
      const statuses: ReportStatus[] = ["pending", "in_progress", "completed", "rejected"];
      const categories: ReportCategory[] = ["organic", "plastic", "paper"];
      const summary = {
        total: scoped.length,
        pending: scoped.filter((report) => report.status === "pending").length,
        in_progress: scoped.filter((report) => report.status === "in_progress").length,
        completed: scoped.filter((report) => report.status === "completed").length,
        rejected: scoped.filter((report) => report.status === "rejected").length,
      };
      const trendMap = new Map<string, number>();
      for (const report of scoped) {
        const day = report.createdAt.slice(0, 10);
        trendMap.set(day, (trendMap.get(day) ?? 0) + 1);
      }
      const locationMap = new Map<
        string,
        {
          postalCode: string;
          address: string | null;
          latitude: number;
          longitude: number;
          count: number;
        }
      >();
      for (const report of scoped) {
        if (!report.postalCode) continue;
        const current = locationMap.get(report.postalCode);
        locationMap.set(report.postalCode, {
          postalCode: report.postalCode,
          address: report.address ?? current?.address ?? null,
          latitude: report.latitude,
          longitude: report.longitude,
          count: (current?.count ?? 0) + 1,
        });
      }
      return json(route, 200, {
        data: {
          summary,
          byStatus: statuses.map((status) => ({
            status,
            count: scoped.filter((report) => report.status === status).length,
          })),
          byCategory: categories.map((category) => ({
            category,
            count: scoped.filter((report) => report.category === category).length,
          })),
          trend: [...trendMap.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count })),
          topLocations: [...locationMap.values()]
            .sort((a, b) => b.count - a.count)
            .slice(0, 5),
        },
      });
    }

    if (method === "POST" && path === "/reports/classify") {
      const user = requireUser(route, state);
      if (!user) return;
      return json(route, 200, {
        data: {
          category: "plastic",
          confidence: 0.87,
          probabilities: { organic: 0.05, plastic: 0.87, paper: 0.08 },
          needsReview: false,
        },
      });
    }

    if (method === "GET" && path === "/reports") {
      const user = requireUser(route, state);
      if (!user) return;
      const params = url.searchParams;
      let filtered = state.reports.filter(
        (report) => user.role === "admin" || report.userId === user.id,
      );
      const search = (params.get("search") ?? "").toLowerCase();
      if (search) {
        filtered = filtered.filter((report) =>
          [report.title, report.description, report.address ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(search),
        );
      }
      const status = params.get("status");
      if (status) filtered = filtered.filter((report) => report.status === status);
      const category = params.get("category");
      if (category) filtered = filtered.filter((report) => report.category === category);
      const reporterId = params.get("reporter_id");
      if (reporterId && user.role === "admin") {
        filtered = filtered.filter((report) => report.userId === reporterId);
      }
      const from = params.get("from");
      if (from) filtered = filtered.filter((report) => report.createdAt.slice(0, 10) >= from);
      const to = params.get("to");
      if (to) filtered = filtered.filter((report) => report.createdAt.slice(0, 10) <= to);

      const sort = params.get("sort") ?? "created_at_desc";
      filtered = [...filtered].sort((a, b) => {
        if (sort === "created_at_asc") return a.createdAt.localeCompare(b.createdAt);
        if (sort === "status") return a.status.localeCompare(b.status);
        return b.createdAt.localeCompare(a.createdAt);
      });

      const page = Number(params.get("page") ?? 1);
      const limit = Number(params.get("limit") ?? 10);
      const result = paginate(filtered, page, limit);
      return json(route, 200, {
        data: result.data.map((report) => reportWithReporter(state, report)),
        meta: result.meta,
      });
    }

    if (method === "POST" && path === "/reports") {
      const user = requireUser(route, state);
      if (!user) return;
      const body = request.postDataBuffer()?.toString("latin1") ?? "";
      const now = new Date().toISOString();
      const report: MockReport = {
        id: `report-${state.reports.length + 1}`,
        userId: user.id,
        title: parseMultipartField(body, "title") ?? "Laporan baru",
        description: parseMultipartField(body, "description") ?? "",
        category:
          (parseMultipartField(body, "category") as ReportCategory | undefined) ?? "plastic",
        address: parseMultipartField(body, "address") ?? null,
        postalCode: parseMultipartField(body, "postalCode") ?? null,
        latitude: Number(parseMultipartField(body, "latitude") ?? -6.2),
        longitude: Number(parseMultipartField(body, "longitude") ?? 106.8),
        photoUrl: body.includes('name="photo"') ? "/uploads/mock-photo.png" : null,
        predictedCategory: "plastic",
        predictedConfidence: 0.87,
        status: "pending",
        rejectReason: null,
        createdAt: now,
        updatedAt: now,
      };
      state.reports.push(report);
      state.history.push({
        id: `hist-${state.history.length + 1}`,
        reportId: report.id,
        fromStatus: null,
        toStatus: "pending",
        changedBy: user.id,
        note: null,
        createdAt: now,
      });
      return json(route, 201, { data: reportWithReporter(state, report) });
    }

    const reportMatch = path.match(/^\/reports\/([^/]+)$/);
    if (reportMatch) {
      const user = requireUser(route, state);
      if (!user) return;
      const report = state.reports.find((item) => item.id === reportMatch[1]);
      if (!report || (user.role !== "admin" && report.userId !== user.id)) {
        return fail(route, 404, "NOT_FOUND", "Laporan tidak ditemukan");
      }

      if (method === "GET") return json(route, 200, { data: reportWithReporter(state, report) });

      if (method === "PUT") {
        const body = request.postDataBuffer()?.toString("latin1") ?? "";
        report.title = parseMultipartField(body, "title") ?? report.title;
        report.description = parseMultipartField(body, "description") ?? report.description;
        report.address = parseMultipartField(body, "address") ?? report.address;
        report.postalCode = parseMultipartField(body, "postalCode") ?? report.postalCode;
        const category = parseMultipartField(body, "category");
        if (category) report.category = category as ReportCategory;
        if (body.includes('name="photo"')) {
          report.photoUrl = "/uploads/mock-photo.png";
          report.predictedCategory = "plastic";
          report.predictedConfidence = 0.87;
        }
        report.updatedAt = new Date().toISOString();
        return json(route, 200, { data: reportWithReporter(state, report) });
      }

      if (method === "DELETE") {
        state.reports = state.reports.filter((item) => item.id !== report.id);
        return route.fulfill({ status: 204 });
      }
    }

    const statusMatch = path.match(/^\/reports\/([^/]+)\/status$/);
    if (method === "PATCH" && statusMatch) {
      const user = requireUser(route, state);
      if (!user) return;
      if (user.role !== "admin") return fail(route, 403, "FORBIDDEN", "Akses ditolak");
      const report = state.reports.find((item) => item.id === statusMatch[1]);
      if (!report) return fail(route, 404, "NOT_FOUND", "Laporan tidak ditemukan");
      const body = request.postDataJSON() as { status: ReportStatus; reason?: string };
      if (body.status === "rejected" && !body.reason?.trim()) {
        return fail(route, 422, "VALIDATION_ERROR", "Alasan penolakan wajib diisi");
      }
      const now = new Date().toISOString();
      state.history.push({
        id: `hist-${state.history.length + 1}`,
        reportId: report.id,
        fromStatus: report.status,
        toStatus: body.status,
        changedBy: user.id,
        note: body.reason ?? null,
        createdAt: now,
      });
      report.status = body.status;
      report.rejectReason = body.status === "rejected" ? (body.reason ?? null) : null;
      report.updatedAt = now;
      return json(route, 200, { data: reportWithReporter(state, report) });
    }

    const historyMatch = path.match(/^\/reports\/([^/]+)\/history$/);
    if (method === "GET" && historyMatch) {
      const user = requireUser(route, state);
      if (!user) return;
      const report = state.reports.find((item) => item.id === historyMatch[1]);
      if (!report || (user.role !== "admin" && report.userId !== user.id)) {
        return fail(route, 404, "NOT_FOUND", "Laporan tidak ditemukan");
      }
      const entries = state.history
        .filter((entry) => entry.reportId === report.id)
        .slice()
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((entry) => {
          const actor = state.users.find((candidate) => candidate.id === entry.changedBy);
          return { ...entry, changedByUser: actor ? publicUser(actor) : null };
        });
      return json(route, 200, { data: entries });
    }

    if (method === "GET" && path === "/users") {
      const user = requireUser(route, state);
      if (!user) return;
      if (user.role !== "admin") return fail(route, 403, "FORBIDDEN", "Akses ditolak");
      const params = url.searchParams;
      let filtered = state.users.slice();
      const search = (params.get("search") ?? "").toLowerCase();
      if (search) {
        filtered = filtered.filter((candidate) =>
          `${candidate.name} ${candidate.email}`.toLowerCase().includes(search),
        );
      }
      const role = params.get("role");
      if (role) filtered = filtered.filter((candidate) => candidate.role === role);
      const isActive = params.get("is_active");
      if (isActive) {
        filtered = filtered.filter((candidate) => String(candidate.isActive) === isActive);
      }
      const page = Number(params.get("page") ?? 1);
      const limit = Number(params.get("limit") ?? 10);
      const result = paginate(filtered, page, limit);
      return json(route, 200, {
        data: result.data.map(publicUser),
        meta: result.meta,
      });
    }

    if (method === "POST" && path === "/users") {
      const user = requireUser(route, state);
      if (!user) return;
      if (user.role !== "admin") return fail(route, 403, "FORBIDDEN", "Akses ditolak");
      const body = request.postDataJSON() as {
        name: string;
        email: string;
        password: string;
        role: Role;
      };
      if (state.users.some((candidate) => candidate.email === body.email.toLowerCase())) {
        return fail(route, 409, "CONFLICT", "Email sudah dipakai");
      }
      const created: MockUser = {
        id: `user-${state.users.length + 1}`,
        name: body.name,
        email: body.email.toLowerCase(),
        password: body.password,
        role: body.role,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.users.push(created);
      return json(route, 201, { data: publicUser(created) });
    }

    const userMatch = path.match(/^\/users\/([^/]+)$/);
    if (userMatch) {
      const current = requireUser(route, state);
      if (!current) return;
      if (current.role !== "admin") return fail(route, 403, "FORBIDDEN", "Akses ditolak");
      const target = state.users.find((candidate) => candidate.id === userMatch[1]);
      if (!target) return fail(route, 404, "NOT_FOUND", "Pengguna tidak ditemukan");

      if (method === "GET") return json(route, 200, { data: publicUser(target) });

      if (method === "PUT") {
        const body = request.postDataJSON() as { name: string; email: string; role: Role };
        if (target.id === current.id && body.role !== current.role) {
          return fail(route, 422, "VALIDATION_ERROR", "Tidak dapat mengubah role sendiri");
        }
        target.name = body.name;
        target.email = body.email.toLowerCase();
        target.role = body.role;
        target.updatedAt = new Date().toISOString();
        return json(route, 200, { data: publicUser(target) });
      }

      if (method === "DELETE") {
        if (target.id === current.id) {
          return fail(route, 422, "VALIDATION_ERROR", "Tidak dapat menghapus akun sendiri");
        }
        state.users = state.users.filter((candidate) => candidate.id !== target.id);
        return route.fulfill({ status: 204 });
      }
    }

    const userStatusMatch = path.match(/^\/users\/([^/]+)\/status$/);
    if (method === "PATCH" && userStatusMatch) {
      const current = requireUser(route, state);
      if (!current) return;
      if (current.role !== "admin") return fail(route, 403, "FORBIDDEN", "Akses ditolak");
      const target = state.users.find((candidate) => candidate.id === userStatusMatch[1]);
      if (!target) return fail(route, 404, "NOT_FOUND", "Pengguna tidak ditemukan");
      if (target.id === current.id) {
        return fail(route, 422, "VALIDATION_ERROR", "Tidak dapat menonaktifkan akun sendiri");
      }
      const body = request.postDataJSON() as { isActive: boolean };
      target.isActive = body.isActive;
      target.updatedAt = new Date().toISOString();
      return json(route, 200, { data: publicUser(target) });
    }

    const userPasswordMatch = path.match(/^\/users\/([^/]+)\/password$/);
    if (method === "PATCH" && userPasswordMatch) {
      const current = requireUser(route, state);
      if (!current) return;
      if (current.role !== "admin") return fail(route, 403, "FORBIDDEN", "Akses ditolak");
      const target = state.users.find((candidate) => candidate.id === userPasswordMatch[1]);
      if (!target) return fail(route, 404, "NOT_FOUND", "Pengguna tidak ditemukan");
      const body = request.postDataJSON() as { password: string };
      target.password = body.password;
      return route.fulfill({ status: 204 });
    }

    return fail(route, 404, "NOT_FOUND", `Endpoint mock tidak ditemukan: ${method} ${path}`);
  });

  return state;
}

export async function loginAs(page: Page, email = "budi@example.com", password = "password123") {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.getByRole("heading", { name: /dashboard/i }).waitFor();
}

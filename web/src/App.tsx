import { lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { ForbiddenPage, NotFoundPage } from "@/pages/ErrorPages";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { PublicOnly, RequireAuth, RequireRole } from "@/routes/guards";

const DashboardPage = lazy(async () => ({
  default: (await import("@/pages/DashboardPage")).DashboardPage,
}));
const ReportsPage = lazy(async () => ({
  default: (await import("@/pages/ReportsPage")).ReportsPage,
}));
const NewReportPage = lazy(async () => ({
  default: (await import("@/pages/NewReportPage")).NewReportPage,
}));
const ReportDetailPage = lazy(async () => ({
  default: (await import("@/pages/ReportDetailPage")).ReportDetailPage,
}));
const EditReportPage = lazy(async () => ({
  default: (await import("@/pages/EditReportPage")).EditReportPage,
}));
const UsersPage = lazy(async () => ({
  default: (await import("@/pages/UsersPage")).UsersPage,
}));
const UserDetailPage = lazy(async () => ({
  default: (await import("@/pages/UserDetailPage")).UserDetailPage,
}));
const ProfilePage = lazy(async () => ({
  default: (await import("@/pages/ProfilePage")).ProfilePage,
}));

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnly>
              <LoginPage />
            </PublicOnly>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnly>
              <RegisterPage />
            </PublicOnly>
          }
        />

        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/reports/new" element={<NewReportPage />} />
          <Route path="/reports/:id" element={<ReportDetailPage />} />
          <Route path="/reports/:id/edit" element={<EditReportPage />} />
          <Route
            path="/users"
            element={
              <RequireRole role="admin">
                <UsersPage />
              </RequireRole>
            }
          />
          <Route
            path="/users/:id"
            element={
              <RequireRole role="admin">
                <UserDetailPage />
              </RequireRole>
            }
          />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

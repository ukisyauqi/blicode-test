import { Navigate, useLocation } from "react-router-dom";

import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/features/auth/auth-context";
import { safeRedirect } from "@/lib/utils";

export function FullPageLoader({ label = "Memuat…" }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-50 text-slate-500">
      <Spinner className="h-8 w-8" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <FullPageLoader label="Memeriksa sesi…" />;
  if (!user) {
    const redirect = `${window.location.pathname}${window.location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }
  return children;
}

export function RequireRole({ role, children }: { role: "admin"; children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <FullPageLoader label="Memeriksa akses…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/403" replace />;
  return children;
}

export function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageLoader label="Memeriksa sesi…" />;
  if (user) {
    const redirect = safeRedirect(new URLSearchParams(location.search).get("redirect"));
    return <Navigate to={redirect} replace />;
  }
  return children;
}

import { Suspense, useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu, Recycle, X } from "lucide-react";

import { SidebarContent } from "@/components/layout/Sidebar";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/toast-context";
import { useAuth } from "@/features/auth/auth-context";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  async function handleLogout() {
    try {
      await logout();
      success("Berhasil keluar", "Sesi Anda telah diakhiri.");
      navigate("/login", { replace: true });
    } catch {
      error("Gagal keluar", "Silakan coba lagi.");
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-lg focus:bg-emerald-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Lewati ke konten utama
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200 bg-white lg:block">
        <SidebarContent onLogout={handleLogout} />
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
      >
        <div
          className={cn(
            "absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 w-[86%] max-w-xs bg-white shadow-2xl transition-transform duration-200",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
          aria-label="Menu navigasi"
        >
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="absolute top-4 right-3 z-10 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <SidebarContent onNavigate={() => setMobileOpen(false)} onLogout={handleLogout} />
        </aside>
      </div>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Recycle className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <span className="text-sm font-bold tracking-tight text-slate-900">Lapor Sampah</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Buka menu navigasi"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <main
          id="main-content"
          className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          <Suspense
            fallback={
              <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500">
                <Spinner className="h-7 w-7" />
                <p className="text-sm font-medium">Memuat halaman…</p>
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

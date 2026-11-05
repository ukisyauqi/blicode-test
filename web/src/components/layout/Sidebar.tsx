import { NavLink } from "react-router-dom";
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Recycle,
  UserCircle,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/features/auth/auth-context";
import { cn, getInitials } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { to: "/reports", label: "Laporan", icon: ClipboardList, adminOnly: false },
  { to: "/reports/new", label: "Buat Laporan", icon: PlusCircle, adminOnly: false },
  { to: "/users", label: "Pengguna", icon: Users, adminOnly: true },
  { to: "/profile", label: "Profil", icon: UserCircle, adminOnly: false },
];

export function SidebarContent({
  onNavigate,
  onLogout,
}: {
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const { user, isAdmin } = useAuth();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-20 shrink-0 items-center px-6">
        <NavLink to="/dashboard" onClick={onNavigate} className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <Recycle className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-base leading-tight font-bold text-slate-900">
              Lapor Sampah
            </span>
            <span className="block text-[11px] font-medium tracking-wide text-slate-400 uppercase">
              Jaga lingkungan
            </span>
          </span>
        </NavLink>
      </div>

      <nav aria-label="Navigasi utama" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              end={item.to === "/dashboard" || item.to === "/reports/new"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  item.to === "/reports/new" && !isActive && "text-emerald-700",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn("h-4.5 w-4.5", isActive ? "text-emerald-700" : "text-slate-400")}
                    aria-hidden="true"
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        {user && (
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                {getInitials(user.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
              <Badge tone={isAdmin ? "violet" : "emerald"}>{isAdmin ? "Admin" : "User"}</Badge>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Keluar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

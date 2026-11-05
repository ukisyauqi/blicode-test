import { Link } from "react-router-dom";
import { ArrowLeft, SearchX, ShieldX } from "lucide-react";

import { buttonClassName } from "@/components/ui/button-styles";
import { useAuth } from "@/features/auth/auth-context";

function ErrorPage({
  icon,
  code,
  title,
  description,
}: {
  icon: React.ReactNode;
  code: string;
  title: string;
  description: string;
}) {
  const { user } = useAuth();
  const home = user ? "/dashboard" : "/login";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60 sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          {icon}
        </div>
        <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-slate-400 uppercase">
          Error {code}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">{description}</p>
        <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
          <Link to={home} className={buttonClassName({ size: "md" })}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {user ? "Kembali ke dashboard" : "Ke halaman masuk"}
          </Link>
          {user && (
            <Link to="/reports" className={buttonClassName({ variant: "outline", size: "md" })}>
              Lihat laporan
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function ForbiddenPage() {
  return (
    <ErrorPage
      icon={<ShieldX className="h-8 w-8" aria-hidden="true" />}
      code="403"
      title="Akses ditolak"
      description="Anda tidak memiliki izin untuk membuka halaman ini. Jika Anda merasa ini keliru, hubungi administrator."
    />
  );
}

export function NotFoundPage() {
  return (
    <ErrorPage
      icon={<SearchX className="h-8 w-8" aria-hidden="true" />}
      code="404"
      title="Halaman tidak ditemukan"
      description="Alamat yang Anda buka tidak tersedia atau sudah dipindahkan. Periksa kembali tautan Anda."
    />
  );
}

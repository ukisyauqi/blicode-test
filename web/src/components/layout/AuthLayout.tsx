import { Link } from "react-router-dom";
import { CheckCircle2, MapPin, Recycle } from "lucide-react";

export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const features = [
    "Laporkan sampah dengan foto dan titik lokasi",
    "Pantau status penanganan secara transparan",
    "Kategori sampah terdeteksi otomatis dari foto",
  ];

  return (
    <div className="grid min-h-dvh bg-slate-50 lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-emerald-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(16,185,129,0.35),transparent_45%),radial-gradient(circle_at_100%_100%,rgba(6,78,59,0.9),transparent_55%)]" />
        <div className="relative">
          <Link to="/login" className="inline-flex items-center gap-3 text-white">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 ring-1 ring-emerald-400/30">
              <Recycle className="h-6 w-6 text-emerald-300" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold tracking-tight">Lapor Sampah</span>
          </Link>

          <div className="mt-20 max-w-md">
            <p className="text-xs font-semibold tracking-[0.2em] text-emerald-300 uppercase">
              Bersama menjaga lingkungan
            </p>
            <h2 className="mt-4 text-4xl leading-tight font-bold text-white">
              Sampah terlihat?
              <br />
              Laporkan. Kami tangani.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-emerald-100/80">
              Satu laporan kecil bisa memulai perubahan besar. Catat lokasi, unggah foto, dan pantau
              penanganannya dalam satu tempat.
            </p>
          </div>

          <ul className="mt-10 space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm text-emerald-100/90">
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                  aria-hidden="true"
                />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-emerald-100/80 backdrop-blur">
          <MapPin className="h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />
          Peta OpenStreetMap membantu warga menandai lokasi sampah dengan tepat.
        </div>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Recycle className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900">Lapor Sampah</span>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
            <div className="mb-7">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
              <p className="mt-2 text-sm text-slate-500">{description}</p>
            </div>
            {children}
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Aplikasi pelaporan sampah · Data lokasi digunakan untuk penanganan laporan
          </p>
        </div>
      </main>
    </div>
  );
}

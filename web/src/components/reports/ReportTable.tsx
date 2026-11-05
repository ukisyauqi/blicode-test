import { Link } from "react-router-dom";
import { ArrowUpRight, MapPin } from "lucide-react";

import { CategoryBadge, StatusBadge } from "@/components/reports/StatusBadge";
import { getReportReporter } from "@/features/reports/display";
import { formatDate, truncate } from "@/lib/utils";
import type { Report } from "@/types";

function ReporterCell({ report }: { report: Report }) {
  const reporter = getReportReporter(report);
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-slate-700">{reporter?.name ?? "-"}</p>
      {reporter?.email && <p className="truncate text-xs text-slate-400">{reporter.email}</p>}
    </div>
  );
}

export function ReportTable({ reports, isAdmin }: { reports: Report[]; isAdmin: boolean }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-100 text-left">
          <thead className="bg-slate-50/70">
            <tr className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <th scope="col" className="px-5 py-3.5">
                Laporan
              </th>
              <th scope="col" className="px-5 py-3.5">
                Kategori
              </th>
              <th scope="col" className="px-5 py-3.5">
                Status
              </th>
              {isAdmin && (
                <th scope="col" className="px-5 py-3.5">
                  Pelapor
                </th>
              )}
              <th scope="col" className="px-5 py-3.5">
                Tanggal
              </th>
              <th scope="col" className="px-5 py-3.5 text-right">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {reports.map((report) => (
              <tr key={report.id} className="transition hover:bg-slate-50/70">
                <td className="max-w-xs px-5 py-4">
                  <Link
                    to={`/reports/${report.id}`}
                    className="line-clamp-1 font-semibold text-slate-900 hover:text-emerald-700"
                  >
                    {report.title}
                  </Link>
                  <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      {report.address ? truncate(report.address, 56) : "Lokasi pada peta"}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <CategoryBadge category={report.category} />
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={report.status} />
                </td>
                {isAdmin && (
                  <td className="max-w-[12rem] px-5 py-4">
                    <ReporterCell report={report} />
                  </td>
                )}
                <td className="px-5 py-4 text-sm whitespace-nowrap text-slate-600">
                  {formatDate(report.createdAt)}
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    to={`/reports/${report.id}`}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    Lihat
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 md:hidden">
        {reports.map((report) => (
          <Link
            key={report.id}
            to={`/reports/${report.id}`}
            className="block px-5 py-4 transition hover:bg-slate-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="line-clamp-1 font-semibold text-slate-900">{report.title}</p>
                <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    {report.address ? truncate(report.address, 48) : "Lokasi pada peta"}
                  </span>
                </div>
              </div>
              <StatusBadge status={report.status} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <CategoryBadge category={report.category} />
              <span aria-hidden="true">·</span>
              <span>{formatDate(report.createdAt)}</span>
              {isAdmin && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{getReportReporter(report)?.name ?? "-"}</span>
                </>
              )}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

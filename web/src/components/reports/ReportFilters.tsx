import { Filter, RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { type ReportFilters } from "@/features/reports/filters";
import {
  CATEGORY_META,
  REPORT_CATEGORIES,
  REPORT_SORT_OPTIONS,
  REPORT_STATUSES,
  STATUS_META,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

export function ReportFiltersPanel({
  filters,
  searchInput,
  onSearchChange,
  onFilterChange,
  onReset,
  isAdmin,
  reporters = [],
  reportersLoading = false,
  activeFilterCount,
}: {
  filters: ReportFilters;
  searchInput: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (patch: Partial<ReportFilters>) => void;
  onReset: () => void;
  isAdmin: boolean;
  reporters?: User[];
  reportersLoading?: boolean;
  activeFilterCount: number;
}) {
  return (
    <Card className="overflow-visible">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Filter className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          Filter laporan
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
              {activeFilterCount} aktif
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={activeFilterCount === 0 && !searchInput}
          className="self-start sm:self-auto"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset filter
        </Button>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <label
            htmlFor="report-search"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Cari laporan
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="report-search"
              type="search"
              value={searchInput}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Judul, deskripsi, atau alamat…"
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-9 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none"
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <Select
            label="Status"
            value={filters.status}
            onChange={(event) =>
              onFilterChange({ status: event.target.value as ReportFilters["status"] })
            }
          >
            <option value="">Semua</option>
            {REPORT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_META[status].label}
              </option>
            ))}
          </Select>
        </div>

        <div className="lg:col-span-2">
          <Select
            label="Kategori"
            value={filters.category}
            onChange={(event) =>
              onFilterChange({ category: event.target.value as ReportFilters["category"] })
            }
          >
            <option value="">Semua</option>
            {REPORT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_META[category].label}
              </option>
            ))}
          </Select>
        </div>

        {isAdmin && (
          <div className="lg:col-span-2">
            <Select
              label="Pelapor"
              value={filters.reporterId}
              onChange={(event) => onFilterChange({ reporterId: event.target.value })}
              disabled={reportersLoading}
            >
              <option value="">Semua</option>
              {reporters.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className={cn("lg:col-span-2", !isAdmin && "lg:col-span-2")}>
          <Select
            label="Urutkan"
            value={filters.sort}
            onChange={(event) =>
              onFilterChange({ sort: event.target.value as ReportFilters["sort"] })
            }
          >
            {REPORT_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:col-span-4">
          <Input
            label="Dari tanggal"
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(event) => onFilterChange({ from: event.target.value })}
          />
          <Input
            label="Sampai tanggal"
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(event) => onFilterChange({ to: event.target.value })}
          />
        </div>
      </div>
    </Card>
  );
}

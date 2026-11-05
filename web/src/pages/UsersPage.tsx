import { useState } from "react";
import { Filter, RotateCcw, Search, UserPlus, Users as UsersIcon, UserX } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Input";
import { Skeleton, Spinner } from "@/components/ui/Spinner";
import { CreateUserDialog } from "@/features/users/CreateUserDialog";
import { UserTable } from "@/features/users/UserTable";
import { useUsers } from "@/features/users/api";
import { useUsersFilters } from "@/features/users/filters";
import { getErrorMessage } from "@/lib/utils";
import type { Role } from "@/types";

function UsersSkeleton() {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="mt-2 h-3 w-1/4" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}

export function UsersPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const {
    filters,
    searchInput,
    setSearchInput,
    update,
    setPage,
    setLimit,
    reset,
    activeFilterCount,
  } = useUsersFilters();
  const usersQuery = useUsers(filters);
  const users = usersQuery.data?.users ?? [];
  const meta = usersQuery.data?.meta;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Administrasi"
        title="Manajemen pengguna"
        description="Kelola akun admin dan user, atur status aktif, reset password, dan hapus pengguna."
        actions={
          <Button
            onClick={() => setCreateOpen(true)}
            leftIcon={<UserPlus className="h-4 w-4" aria-hidden="true" />}
          >
            Tambah pengguna
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Filter className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            Filter pengguna
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                {activeFilterCount} aktif
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            disabled={activeFilterCount === 0 && !searchInput}
            className="self-start sm:self-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset filter
          </Button>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
          <div>
            <label
              htmlFor="user-search"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Cari pengguna
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="user-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Nama atau email…"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-9 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none"
              />
            </div>
          </div>

          <Select
            label="Role"
            value={filters.role}
            onChange={(event) => update({ role: event.target.value as Role | "" })}
          >
            <option value="">Semua role</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </Select>

          <Select
            label="Status"
            value={filters.status}
            onChange={(event) => update({ status: event.target.value as typeof filters.status })}
          >
            <option value="all">Semua status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </Select>

          <div className="flex items-end">
            <span className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
              {meta ? `${meta.total} pengguna ditemukan` : "Memuat…"}
            </span>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5 sm:px-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <UsersIcon className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            Daftar pengguna
          </div>
          {usersQuery.isFetching && !usersQuery.isPending && (
            <span className="inline-flex items-center gap-2 text-xs text-slate-500" role="status">
              <Spinner className="h-4 w-4" />
              Memperbarui…
            </span>
          )}
        </div>

        {usersQuery.isPending ? (
          <UsersSkeleton />
        ) : usersQuery.isError ? (
          <div className="p-5">
            <ErrorState
              message={getErrorMessage(usersQuery.error)}
              onRetry={() => void usersQuery.refetch()}
            />
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={<UserX className="h-6 w-6" />}
            title="Tidak ada pengguna"
            description={
              activeFilterCount > 0
                ? "Tidak ada pengguna yang cocok dengan filter. Coba ubah atau reset filter."
                : "Belum ada pengguna terdaftar."
            }
            action={
              activeFilterCount > 0 ? (
                <Button variant="outline" onClick={reset}>
                  Reset filter
                </Button>
              ) : (
                <Button
                  onClick={() => setCreateOpen(true)}
                  leftIcon={<UserPlus className="h-4 w-4" />}
                >
                  Tambah pengguna
                </Button>
              )
            }
          />
        ) : (
          <>
            <UserTable users={users} />
            {meta && <Pagination meta={meta} onPageChange={setPage} onLimitChange={setLimit} />}
          </>
        )}
      </Card>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

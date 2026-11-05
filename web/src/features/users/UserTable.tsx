import { Link } from "react-router-dom";
import { ArrowUpRight, Power } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/toast-context";
import { useAuth } from "@/features/auth/auth-context";
import { useUpdateUserStatus } from "@/features/users/api";
import { formatDate, getErrorMessage, getInitials } from "@/lib/utils";
import type { User } from "@/types";

function RoleBadge({ role }: { role: User["role"] }) {
  return (
    <Badge tone={role === "admin" ? "violet" : "emerald"}>
      {role === "admin" ? "Admin" : "User"}
    </Badge>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return <Badge tone={active ? "emerald" : "rose"}>{active ? "Aktif" : "Nonaktif"}</Badge>;
}

function UserStatusToggle({ user }: { user: User }) {
  const { user: currentUser } = useAuth();
  const mutation = useUpdateUserStatus(user.id);
  const { success, error: showError } = useToast();
  const isSelf = currentUser?.id === user.id;
  const active = user.isActive ?? true;

  function handleToggle() {
    mutation.mutate(!active, {
      onSuccess: () => {
        success(
          active ? "Pengguna dinonaktifkan" : "Pengguna diaktifkan",
          `${user.name} sekarang ${active ? "nonaktif" : "aktif"}.`,
        );
      },
      onError: (mutationError) => {
        showError("Gagal mengubah status", getErrorMessage(mutationError));
      },
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      loading={mutation.isPending}
      disabled={isSelf}
      title={isSelf ? "Tidak dapat menonaktifkan akun sendiri" : undefined}
      aria-label={active ? `Nonaktifkan ${user.name}` : `Aktifkan ${user.name}`}
      className="px-2 text-slate-500"
    >
      {!mutation.isPending && <Power className="h-4 w-4" aria-hidden="true" />}
    </Button>
  );
}

function UserIdentity({ user }: { user: User }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
        {getInitials(user.name)}
      </span>
      <div className="min-w-0">
        <Link
          to={`/users/${user.id}`}
          className="block truncate text-sm font-semibold text-slate-900 hover:text-emerald-700"
        >
          {user.name}
        </Link>
        <p className="truncate text-xs text-slate-500">{user.email}</p>
      </div>
    </div>
  );
}

export function UserTable({ users }: { users: User[] }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-100 text-left">
          <thead className="bg-slate-50/70">
            <tr className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <th scope="col" className="px-5 py-3.5">
                Pengguna
              </th>
              <th scope="col" className="px-5 py-3.5">
                Role
              </th>
              <th scope="col" className="px-5 py-3.5">
                Status
              </th>
              <th scope="col" className="px-5 py-3.5">
                Dibuat
              </th>
              <th scope="col" className="px-5 py-3.5 text-right">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {users.map((user) => (
              <tr key={user.id} className="transition hover:bg-slate-50/70">
                <td className="max-w-xs px-5 py-4">
                  <UserIdentity user={user} />
                </td>
                <td className="px-5 py-4">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-5 py-4">
                  <StatusBadge active={user.isActive ?? true} />
                </td>
                <td className="px-5 py-4 text-sm whitespace-nowrap text-slate-600">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <UserStatusToggle user={user} />
                    <Link
                      to={`/users/${user.id}`}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      Detail
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 md:hidden">
        {users.map((user) => (
          <div key={user.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <UserIdentity user={user} />
              <StatusBadge active={user.isActive ?? true} />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <RoleBadge role={user.role} />
                <span className="text-xs text-slate-500">{formatDate(user.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <UserStatusToggle user={user} />
                <Link
                  to={`/users/${user.id}`}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Detail
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

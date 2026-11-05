import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  KeyRound,
  Power,
  Save,
  ShieldAlert,
  Trash2,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input, Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/toast-context";
import { useAuth } from "@/features/auth/auth-context";
import {
  useDeleteUser,
  useResetUserPassword,
  useUpdateUser,
  useUpdateUserStatus,
  useUser,
} from "@/features/users/api";
import {
  editUserSchema,
  resetPasswordSchema,
  type EditUserValues,
  type ResetPasswordValues,
} from "@/features/users/schemas";
import { ApiError } from "@/lib/api";
import { formatDate, formatDateTime, getErrorMessage, getInitials } from "@/lib/utils";

function ResetPasswordDialog({
  userId,
  userName,
  open,
  onOpenChange,
}: {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useResetUserPassword(userId);
  const { success, error: showError } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ password: "", confirmPassword: "" });
      setServerError(null);
    }
  }, [open, form]);

  async function onSubmit(values: ResetPasswordValues) {
    setServerError(null);
    try {
      await mutation.mutateAsync(values.password);
      success("Password direset", `Password ${userName} berhasil diperbarui.`);
      onOpenChange(false);
    } catch (error) {
      const message = getErrorMessage(error);
      setServerError(message);
      showError("Gagal reset password", message);
    }
  }

  const { errors } = form.formState;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Reset password"
      description={`Tetapkan password baru untuk ${userName}.`}
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Batal
          </Button>
          <Button
            loading={mutation.isPending}
            onClick={() => void form.handleSubmit(onSubmit)()}
            leftIcon={
              !mutation.isPending ? <KeyRound className="h-4 w-4" aria-hidden="true" /> : undefined
            }
          >
            Reset password
          </Button>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && (
          <div role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
            {serverError}
          </div>
        )}
        <Input
          label="Password baru"
          type="password"
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          error={errors.password?.message}
          required
          {...form.register("password")}
        />
        <Input
          label="Konfirmasi password"
          type="password"
          autoComplete="new-password"
          placeholder="Ulangi password baru"
          error={errors.confirmPassword?.message}
          required
          {...form.register("confirmPassword")}
        />
      </form>
    </Dialog>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-1/2" />
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card className="space-y-4 p-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-11 w-full" />
          ))}
        </Card>
        <Card className="space-y-4 p-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </Card>
      </div>
    </div>
  );
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const userQuery = useUser(id);
  const updateMutation = useUpdateUser(id ?? "");
  const statusMutation = useUpdateUserStatus(id ?? "");
  const deleteMutation = useDeleteUser();
  const { success, error: showError } = useToast();
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<EditUserValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { name: "", email: "", role: "user" },
  });

  const targetUser = userQuery.data;
  const isSelf = currentUser?.id === targetUser?.id;

  useEffect(() => {
    if (targetUser) {
      form.reset({ name: targetUser.name, email: targetUser.email, role: targetUser.role });
    }
  }, [targetUser, form]);

  if (userQuery.isPending) return <DetailSkeleton />;

  if (userQuery.isError) {
    if (userQuery.error instanceof ApiError && userQuery.error.status === 404) {
      return (
        <div className="space-y-6">
          <PageHeader title="Detail pengguna" backTo="/users" />
          <EmptyState
            icon={<UserRound className="h-6 w-6" />}
            title="Pengguna tidak ditemukan"
            description="Pengguna mungkin sudah dihapus atau tidak tersedia."
          />
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <PageHeader title="Detail pengguna" backTo="/users" />
        <ErrorState
          message={getErrorMessage(userQuery.error)}
          onRetry={() => void userQuery.refetch()}
        />
      </div>
    );
  }

  const user = userQuery.data;
  const active = user.isActive ?? true;

  async function onSubmit(values: EditUserValues) {
    setServerError(null);
    try {
      await updateMutation.mutateAsync(values);
      if (isSelf) await refreshUser();
      success("Pengguna diperbarui", `Data ${values.name} berhasil disimpan.`);
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [path, message] of Object.entries(error.fieldErrors)) {
          if (path === "name" || path === "email" || path === "role") {
            form.setError(path, { message });
          }
        }
        setServerError(error.message);
      } else {
        setServerError(getErrorMessage(error));
      }
    }
  }

  function handleStatusToggle() {
    statusMutation.mutate(!active, {
      onSuccess: () => {
        success(
          active ? "Pengguna dinonaktifkan" : "Pengguna diaktifkan",
          `${user.name} sekarang ${active ? "nonaktif" : "aktif"}.`,
        );
      },
      onError: (error) => {
        showError("Gagal mengubah status", getErrorMessage(error));
      },
    });
  }

  function handleDelete() {
    deleteMutation.mutate(user.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        success("Pengguna dihapus", `${user.name} telah dihapus.`);
        navigate("/users", { replace: true });
      },
      onError: (error) => {
        showError("Gagal menghapus pengguna", getErrorMessage(error));
      },
    });
  }

  const { errors } = form.formState;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Detail pengguna"
        title={user.name}
        description={user.email}
        backTo="/users"
        backLabel="Kembali ke daftar pengguna"
        actions={
          <>
            <Badge tone={user.role === "admin" ? "violet" : "emerald"}>
              {user.role === "admin" ? "Admin" : "User"}
            </Badge>
            <Badge tone={active ? "emerald" : "rose"}>{active ? "Aktif" : "Nonaktif"}</Badge>
          </>
        }
      />

      {isSelf && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Ini adalah akun Anda sendiri. Role, status aktif, dan penghapusan akun sendiri tidak dapat
          diubah untuk mencegah kehilangan akses.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader
            title="Informasi akun"
            description="Perbarui nama, email, dan role pengguna."
          />
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {serverError && (
                <div
                  role="alert"
                  className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
                >
                  {serverError}
                </div>
              )}

              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                  {getInitials(user.name)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500">Bergabung {formatDate(user.createdAt)}</p>
                </div>
              </div>

              <Input
                label="Nama lengkap"
                error={errors.name?.message}
                required
                {...form.register("name")}
              />
              <Input
                label="Email"
                type="email"
                error={errors.email?.message}
                required
                {...form.register("email")}
              />
              <Select
                label="Role"
                error={errors.role?.message}
                disabled={isSelf}
                hint={isSelf ? "Anda tidak dapat mengubah role akun sendiri." : undefined}
                required
                {...form.register("role")}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </Select>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  loading={updateMutation.isPending}
                  leftIcon={
                    !updateMutation.isPending ? (
                      <Save className="h-4 w-4" aria-hidden="true" />
                    ) : undefined
                  }
                >
                  Simpan perubahan
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Status akun" description="Aktif atau nonaktifkan akses pengguna." />
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
                <span
                  className={
                    active
                      ? "flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                      : "flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-700"
                  }
                >
                  {active ? (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {active ? "Akun aktif" : "Akun nonaktif"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {active
                      ? "Pengguna dapat masuk dan membuat laporan."
                      : "Pengguna tidak dapat masuk, tetapi laporannya tetap tersimpan."}
                  </p>
                </div>
              </div>
              <Button
                variant={active ? "outline" : "primary"}
                className="w-full"
                onClick={handleStatusToggle}
                loading={statusMutation.isPending}
                disabled={isSelf}
                title={isSelf ? "Tidak dapat mengubah status akun sendiri" : undefined}
                leftIcon={
                  !statusMutation.isPending ? (
                    <Power className="h-4 w-4" aria-hidden="true" />
                  ) : undefined
                }
              >
                {active ? "Nonaktifkan pengguna" : "Aktifkan pengguna"}
              </Button>
              {isSelf && (
                <p className="text-xs text-slate-500">Tidak dapat menonaktifkan akun sendiri.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Reset password" description="Tetapkan password baru tanpa email." />
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setResetOpen(true)}
                leftIcon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
              >
                Reset password
              </Button>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                Terakhir diperbarui {formatDateTime(user.updatedAt)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-rose-200">
            <CardHeader
              title="Hapus pengguna"
              description="Soft delete; laporan tetap tersimpan."
            />
            <CardContent>
              <div className="flex items-start gap-2 text-xs text-slate-500">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" aria-hidden="true" />
                Pengguna tidak akan bisa masuk lagi. Riwayat laporan tetap tersedia untuk admin.
              </div>
              <Button
                variant="danger"
                className="mt-4 w-full"
                disabled={isSelf}
                onClick={() => setDeleteOpen(true)}
                title={isSelf ? "Tidak dapat menghapus akun sendiri" : undefined}
                leftIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
              >
                Hapus pengguna
              </Button>
              {isSelf && (
                <p className="mt-2 text-xs text-slate-500">Tidak dapat menghapus akun sendiri.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ResetPasswordDialog
        userId={user.id}
        userName={user.name}
        open={resetOpen}
        onOpenChange={setResetOpen}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus pengguna?"
        description={`${user.name} tidak akan dapat masuk lagi. Laporan yang pernah dibuat tetap tersimpan.`}
        confirmLabel="Hapus pengguna"
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
        destructive
      />
    </div>
  );
}

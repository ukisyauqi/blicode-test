import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, LockKeyhole, Save, ShieldCheck, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/toast-context";
import { useAuth } from "@/features/auth/auth-context";
import { changePasswordRequest } from "@/features/auth/api";
import {
  changePasswordSchema,
  profileSchema,
  type ChangePasswordValues,
  type ProfileValues,
} from "@/features/auth/schemas";
import { ApiError } from "@/lib/api";
import { getErrorMessage, getInitials } from "@/lib/utils";

export function ProfilePage() {
  const { user, isAdmin, updateProfile } = useAuth();
  const { success } = useToast();
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? "" },
  });
  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (user?.name) profileForm.reset({ name: user.name });
  }, [user?.name, profileForm]);

  async function onSubmitProfile(values: ProfileValues) {
    setProfileError(null);
    try {
      await updateProfile(values);
      success("Profil diperbarui", "Nama Anda berhasil diubah.");
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [path, message] of Object.entries(error.fieldErrors)) {
          if (path === "name") profileForm.setError("name", { message });
        }
        setProfileError(error.message);
      } else {
        setProfileError(getErrorMessage(error));
      }
    }
  }

  async function onSubmitPassword(values: ChangePasswordValues) {
    setPasswordError(null);
    try {
      await changePasswordRequest({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      passwordForm.reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
      success("Password diubah", "Password baru Anda sudah aktif.");
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [path, message] of Object.entries(error.fieldErrors)) {
          if (path === "currentPassword" || path === "newPassword") {
            passwordForm.setError(path, { message });
          }
        }
        setPasswordError(error.message);
      } else {
        setPasswordError(getErrorMessage(error));
      }
    }
  }

  if (!user) return null;

  const profileErrors = profileForm.formState.errors;
  const passwordErrors = passwordForm.formState.errors;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Akun"
        title="Profil saya"
        description="Kelola informasi akun dan keamanan password Anda."
      />

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-bold text-white shadow-sm">
            {getInitials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold text-slate-900">{user.name}</h2>
            <p className="mt-0.5 truncate text-sm text-slate-500">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone={isAdmin ? "violet" : "emerald"}>{isAdmin ? "Admin" : "User"}</Badge>
              <Badge tone="emerald">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                Sesi aktif
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Informasi profil"
            description="Nama tampilan dapat Anda ubah sendiri."
            action={<UserRound className="h-5 w-5 text-slate-400" aria-hidden="true" />}
          />
          <CardContent>
            <form
              onSubmit={profileForm.handleSubmit(onSubmitProfile)}
              className="space-y-4"
              noValidate
            >
              {profileError && (
                <div
                  role="alert"
                  className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
                >
                  {profileError}
                </div>
              )}

              <Input
                label="Nama lengkap"
                error={profileErrors.name?.message}
                required
                {...profileForm.register("name")}
              />

              <Input
                label="Email"
                value={user.email}
                readOnly
                disabled
                hint="Email hanya dapat diubah oleh admin."
              />
              <Input
                label="Role"
                value={isAdmin ? "Admin" : "User"}
                readOnly
                disabled
                hint="Role diatur oleh administrator."
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  loading={profileForm.formState.isSubmitting}
                  leftIcon={
                    !profileForm.formState.isSubmitting ? (
                      <Save className="h-4 w-4" aria-hidden="true" />
                    ) : undefined
                  }
                >
                  Simpan nama
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Ganti password"
            description="Gunakan password lama untuk memverifikasi perubahan."
            action={<LockKeyhole className="h-5 w-5 text-slate-400" aria-hidden="true" />}
          />
          <CardContent>
            <form
              onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
              className="space-y-4"
              noValidate
            >
              {passwordError && (
                <div
                  role="alert"
                  className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
                >
                  {passwordError}
                </div>
              )}

              <Input
                label="Password saat ini"
                type="password"
                autoComplete="current-password"
                error={passwordErrors.currentPassword?.message}
                required
                {...passwordForm.register("currentPassword")}
              />
              <Input
                label="Password baru"
                type="password"
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
                error={passwordErrors.newPassword?.message}
                required
                {...passwordForm.register("newPassword")}
              />
              <Input
                label="Konfirmasi password baru"
                type="password"
                autoComplete="new-password"
                error={passwordErrors.confirmPassword?.message}
                required
                {...passwordForm.register("confirmPassword")}
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  loading={passwordForm.formState.isSubmitting}
                  leftIcon={
                    !passwordForm.formState.isSubmitting ? (
                      <KeyRound className="h-4 w-4" aria-hidden="true" />
                    ) : undefined
                  }
                >
                  Ubah password
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

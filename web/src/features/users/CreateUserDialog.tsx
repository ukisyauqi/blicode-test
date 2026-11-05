import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/toast-context";
import { useCreateUser } from "@/features/users/api";
import { createUserSchema, type CreateUserValues } from "@/features/users/schemas";
import { ApiError } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";

export function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const mutation = useCreateUser();
  const { success, error: showError } = useToast();
  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", email: "", password: "", role: "user" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: "", email: "", password: "", role: "user" });
      setServerError(null);
    }
  }, [open, form]);

  async function onSubmit(values: CreateUserValues) {
    setServerError(null);
    try {
      await mutation.mutateAsync(values);
      success("Pengguna dibuat", `${values.name} berhasil ditambahkan.`);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [path, message] of Object.entries(error.fieldErrors)) {
          if (path === "name" || path === "email" || path === "password" || path === "role") {
            form.setError(path, { message });
          }
        }
        showError("Gagal membuat pengguna", error.message);
      } else {
        const message = getErrorMessage(error);
        showError("Gagal membuat pengguna", message);
        setServerError(message);
      }
    }
  }

  const { errors } = form.formState;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Tambah pengguna"
      description="Buat akun baru dengan role admin atau user."
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
              !mutation.isPending ? <UserPlus className="h-4 w-4" aria-hidden="true" /> : undefined
            }
          >
            Simpan pengguna
          </Button>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {serverError}
          </div>
        )}

        <Input
          label="Nama lengkap"
          placeholder="Nama pengguna"
          error={errors.name?.message}
          required
          {...form.register("name")}
        />
        <Input
          label="Email"
          type="email"
          placeholder="nama@email.com"
          error={errors.email?.message}
          required
          {...form.register("email")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Password"
            type="password"
            placeholder="Minimal 8 karakter"
            error={errors.password?.message}
            hint="Password awal dapat direset nanti oleh admin."
            required
            {...form.register("password")}
          />
          <Select label="Role" error={errors.role?.message} required {...form.register("role")}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
      </form>
    </Dialog>
  );
}

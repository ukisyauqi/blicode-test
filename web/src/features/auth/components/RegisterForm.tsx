import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/features/auth/auth-context";
import { registerSchema, type RegisterValues } from "@/features/auth/schemas";
import { ApiError } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";

export function RegisterForm({ redirectTo = "/dashboard" }: { redirectTo?: string }) {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: RegisterValues) {
    setServerError(null);
    try {
      await registerUser(values);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldErrors = error.fieldErrors;
        let applied = false;
        for (const [path, message] of Object.entries(fieldErrors)) {
          if (path === "name" || path === "email" || path === "password") {
            form.setError(path, { message });
            applied = true;
          }
        }
        if (!applied) setServerError(error.message);
      } else {
        setServerError(getErrorMessage(error));
      }
    }
  }

  const { errors, isSubmitting } = form.formState;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{serverError}</span>
        </div>
      )}

      <Input
        label="Nama lengkap"
        autoComplete="name"
        placeholder="Nama Anda"
        error={errors.name?.message}
        required
        {...form.register("name")}
      />

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="nama@email.com"
        error={errors.email?.message}
        required
        {...form.register("email")}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          error={errors.password?.message}
          hint="Gunakan minimal 8 karakter."
          required
          {...form.register("password")}
        />
        <Input
          label="Konfirmasi password"
          type="password"
          autoComplete="new-password"
          placeholder="Ulangi password"
          error={errors.confirmPassword?.message}
          required
          {...form.register("confirmPassword")}
        />
      </div>

      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Daftar
        {!isSubmitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
      </Button>

      <p className="text-center text-sm text-slate-500">
        Sudah punya akun?{" "}
        <Link
          to="/login"
          className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
        >
          Masuk
        </Link>
      </p>
    </form>
  );
}

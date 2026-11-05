import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/features/auth/auth-context";
import { loginSchema, type LoginValues } from "@/features/auth/schemas";
import { ApiError } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";

export function LoginForm({ redirectTo = "/dashboard" }: { redirectTo?: string }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    try {
      await login(values);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldErrors = error.fieldErrors;
        let applied = false;
        for (const [path, message] of Object.entries(fieldErrors)) {
          if (path === "email" || path === "password") {
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
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="nama@email.com"
        error={errors.email?.message}
        required
        {...form.register("email")}
      />

      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        placeholder="Masukkan password"
        error={errors.password?.message}
        required
        {...form.register("password")}
      />

      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Masuk
        {!isSubmitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
      </Button>

      <p className="text-center text-sm text-slate-500">
        Belum punya akun?{" "}
        <Link
          to="/register"
          className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
        >
          Daftar sekarang
        </Link>
      </p>
    </form>
  );
}

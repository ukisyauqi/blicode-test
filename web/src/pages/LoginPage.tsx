import { AuthLayout } from "@/components/layout/AuthLayout";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { useSearchParams } from "react-router-dom";
import { safeRedirect } from "@/lib/utils";

export function LoginPage() {
  const [params] = useSearchParams();
  const redirectTo = safeRedirect(params.get("redirect"));

  return (
    <AuthLayout
      title="Selamat datang kembali"
      description="Masuk untuk memantau dan mengelola laporan sampah Anda."
    >
      <LoginForm redirectTo={redirectTo} />
    </AuthLayout>
  );
}

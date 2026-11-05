import { useSearchParams } from "react-router-dom";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { safeRedirect } from "@/lib/utils";

export function RegisterPage() {
  const [params] = useSearchParams();
  const redirectTo = safeRedirect(params.get("redirect"));

  return (
    <AuthLayout
      title="Buat akun baru"
      description="Daftar untuk mulai melaporkan sampah di sekitar Anda."
    >
      <RegisterForm redirectTo={redirectTo} />
    </AuthLayout>
  );
}

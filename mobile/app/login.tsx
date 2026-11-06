import { useState } from "react";
import { Text } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "../src/auth";
import { loginSchema } from "../src/lib/validation";
import { ApiError } from "../src/lib/api";
import { Btn, Field, Screen, Title, c } from "../src/ui";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const v = loginSchema.safeParse({ email, password });
    if (!v.success) return setErr(v.error.issues[0]?.message ?? "Input tidak valid");
    setBusy(true);
    setErr(null);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Login gagal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>Masuk</Title>
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      {err ? <Text style={{ color: "#b91c1c", marginBottom: 8 }}>{err}</Text> : null}
      <Btn label={busy ? "Memproses..." : "Masuk"} onPress={submit} disabled={busy} />
      <Link href="/register" style={{ color: c.primary, marginTop: 12, textAlign: "center" }}>
        Belum punya akun? Daftar
      </Link>
    </Screen>
  );
}

import { useState } from "react";
import { Text } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "../src/auth";
import { registerSchema } from "../src/lib/validation";
import { ApiError } from "../src/lib/api";
import { Btn, Field, Screen, Title, c } from "../src/ui";

export default function Register() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (password !== confirm) return setErr("Konfirmasi password tidak sama");
    const v = registerSchema.safeParse({ name, email, password });
    if (!v.success) return setErr(v.error.issues[0]?.message ?? "Input tidak valid");
    setBusy(true);
    setErr(null);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Registrasi gagal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>Daftar</Title>
      <Field label="Nama" value={name} onChangeText={setName} autoCapitalize="words" />
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Field label="Password (min. 8 karakter)" value={password} onChangeText={setPassword} secureTextEntry />
      <Field label="Konfirmasi password" value={confirm} onChangeText={setConfirm} secureTextEntry />
      {err ? <Text style={{ color: "#b91c1c", marginBottom: 8 }}>{err}</Text> : null}
      <Btn label={busy ? "Memproses..." : "Daftar"} onPress={submit} disabled={busy} />
      <Link href="/login" style={{ color: c.primary, marginTop: 12, textAlign: "center" }}>
        Sudah punya akun? Masuk
      </Link>
    </Screen>
  );
}

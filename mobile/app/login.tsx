import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/auth";
import { loginSchema } from "../src/lib/validation";
import { ApiError } from "../src/lib/api";
import { Btn, Card, Field, Hero, Screen, c } from "../src/ui";

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
      <Hero>
        <View style={s.brand}>
          <View style={s.icon}>
            <Ionicons name="leaf" size={30} color={c.primaryDeep} />
          </View>
          <Text style={s.brandName}>Lapor Sampah</Text>
          <Text style={s.brandTag}>Laporkan sampah, AI mengklasifikasikan.</Text>
        </View>
      </Hero>
      <Card>
        <Text style={s.h}>Masuk</Text>
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="nama@email.com" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
        {err ? <Text style={s.err}>{err}</Text> : null}
        <Btn label={busy ? "Memproses..." : "Masuk"} onPress={submit} disabled={busy} />
      </Card>
      <Link href="/register" style={s.link}>
        Belum punya akun? Daftar
      </Link>
    </Screen>
  );
}

const s = StyleSheet.create({
  brand: { alignItems: "center", paddingVertical: 8 },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  brandName: { fontSize: 26, fontWeight: "800", color: "#ffffff", letterSpacing: -0.5 },
  brandTag: { fontSize: 14, color: "#d1fae5", marginTop: 2 },
  h: { fontSize: 20, fontWeight: "800", color: c.ink, marginBottom: 10 },
  err: { color: "#b91c1c", marginBottom: 8 },
  link: { color: c.primary, marginTop: 12, textAlign: "center", fontWeight: "600" },
});

import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/auth";
import { registerSchema } from "../src/lib/validation";
import { ApiError } from "../src/lib/api";
import { Btn, Card, Field, Hero, Screen, c } from "../src/ui";

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
      <ScrollView>
        <Hero>
          <View style={s.brand}>
            <View style={s.icon}>
              <Ionicons name="leaf" size={30} color={c.primaryDeep} />
            </View>
            <Text style={s.brandName}>Buat akun</Text>
            <Text style={s.brandTag}>Gratis, cukup email dan nama.</Text>
          </View>
        </Hero>
        <Card>
          <Field label="Nama" value={name} onChangeText={setName} autoCapitalize="words" placeholder="Nama lengkap" />
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="nama@email.com" />
          <Field label="Password (min. 8 karakter)" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
          <Field label="Konfirmasi password" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="••••••••" />
          {err ? <Text style={s.err}>{err}</Text> : null}
          <Btn label={busy ? "Memproses..." : "Daftar"} onPress={submit} disabled={busy} />
        </Card>
        <Link href="/login" style={s.link}>
          Sudah punya akun? Masuk
        </Link>
      </ScrollView>
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
  err: { color: "#b91c1c", marginBottom: 8 },
  link: { color: c.primary, marginTop: 12, textAlign: "center", fontWeight: "600" },
});

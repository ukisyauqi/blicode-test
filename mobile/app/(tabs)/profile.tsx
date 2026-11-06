import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../src/auth";
import { api, ApiError } from "../../src/lib/api";
import { passwordSchema } from "../../src/lib/validation";
import { Btn, Field, Screen, Title, c } from "../../src/ui";

export default function Profile() {
  const { user, logout } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function changePassword() {
    if (next !== confirm) return setMsg({ ok: false, text: "Konfirmasi password baru tidak sama" });
    const v = passwordSchema.safeParse({ current, next });
    if (!v.success) return setMsg({ ok: false, text: v.error.issues[0]?.message ?? "Input tidak valid" });
    setBusy(true);
    try {
      await api("/auth/me/password", { method: "PATCH", json: { currentPassword: current, newPassword: next } });
      setCurrent("");
      setNext("");
      setConfirm("");
      setMsg({ ok: true, text: "Password berhasil diganti" });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : "Gagal ganti password" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView>
        <Title>Profil</Title>
        <Text style={s.name}>{user?.name}</Text>
        <Text style={s.sub}>{user?.email}</Text>
        <Text style={s.h}>Ganti password</Text>
        <Field label="Password lama" value={current} onChangeText={setCurrent} secureTextEntry />
        <Field label="Password baru (min. 8 karakter)" value={next} onChangeText={setNext} secureTextEntry />
        <Field label="Konfirmasi password baru" value={confirm} onChangeText={setConfirm} secureTextEntry />
        {msg ? <Text style={{ color: msg.ok ? c.primary : "#b91c1c", marginBottom: 8 }}>{msg.text}</Text> : null}
        <Btn label={busy ? "Memproses..." : "Ganti password"} onPress={changePassword} disabled={busy} />
        <View style={s.about}>
          <Text style={s.h}>Tentang</Text>
          <Text style={s.sub}>
            Lapor Sampah — pelaporan sampah dengan klasifikasi gambar otomatis (organik, plastik, kertas).
            Model dilatih dengan Custom Waste Classification Dataset oleh wasifmahmood01 (Kaggle),
            lisensi CC BY-NC-SA 4.0. Penggunaan non-komersial untuk tugas kuliah.
          </Text>
        </View>
        <Btn label="Keluar" tone="danger" onPress={logout} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  name: { fontSize: 18, fontWeight: "700", color: c.ink },
  sub: { color: c.sub, fontSize: 14, marginBottom: 4 },
  h: { fontSize: 16, fontWeight: "700", color: c.ink, marginTop: 16, marginBottom: 8 },
  about: { marginTop: 16, marginBottom: 16, backgroundColor: c.bg, borderRadius: 10, padding: 12 },
});

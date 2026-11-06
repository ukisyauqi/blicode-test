import { useRef, useState } from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { api, photoForm, ApiError } from "../../src/lib/api";
import { CATEGORY_LABEL } from "../../src/lib/constants";
import { reportSchema } from "../../src/lib/validation";
import { Btn, Card, Field, Screen, Sub, Title, c } from "../../src/ui";
import { Ionicons } from "@expo/vector-icons";
import { MapPicker } from "../../src/components/MapPicker";
import type { Category, ClassifyResult } from "../../src/types";

const isWeb = Platform.OS === "web";

const CATS: Category[] = ["organic", "plastic", "paper"];

export default function NewReport() {
  const router = useRouter();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [address, setAddress] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [lat, setLat] = useState(-6.2);
  const [lng, setLng] = useState(106.8);
  const [pred, setPred] = useState<ClassifyResult | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [classifyErr, setClassifyErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const latest = useRef<string | null>(null);

  async function classify(uri: string) {
    latest.current = uri;
    setClassifying(true);
    setClassifyErr(null);
    try {
      const r = await api<ClassifyResult>("/reports/classify", { method: "POST", form: await photoForm(uri, "file") });
      if (latest.current !== uri) return;
      setPred(r.data);
      setCategory((prev) => prev || r.data.category);
    } catch (e) {
      if (latest.current !== uri) return;
      setClassifyErr(e instanceof ApiError ? e.message : "Deteksi AI gagal — pilih kategori manual");
    } finally {
      if (latest.current === uri) setClassifying(false);
    }
  }

  async function pick(fromCamera: boolean) {
    if (isWeb && fromCamera) return setErr("Kamera tidak tersedia di web — pakai Galeri.");
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setErr("Izin kamera/galeri ditolak. Ubah di pengaturan lalu coba lagi.");
    let res: ImagePicker.ImagePickerResult;
    try {
      res = fromCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.7 });
    } catch {
      return setErr("Gagal membuka pemilih foto di perangkat ini.");
    }
    if (res.canceled || !res.assets[0]) return;
    const uri = res.assets[0].uri;
    setPhotoUri(uri);
    setPred(null);
    classify(uri);
  }

  async function useMyLocation() {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return setErr("Izin lokasi ditolak. Tandai titik manual di peta.");
    try {
      const pos = await Location.getCurrentPositionAsync({});
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);
    } catch {
      setErr("Gagal membaca GPS. Tandai titik manual di peta.");
    }
  }

  async function submit() {
    const v = reportSchema.safeParse({ title, description, latitude: lat, longitude: lng });
    if (!v.success) return setErr(v.error.issues[0]?.message ?? "Input tidak valid");
    if (!photoUri && !category) return setErr("Tambahkan foto atau pilih kategori manual");
    setSending(true);
    setErr(null);
    try {
      const form = photoUri ? await photoForm(photoUri, "photo") : new FormData();
      form.append("title", title.trim());
      form.append("description", description.trim());
      form.append("latitude", String(lat));
      form.append("longitude", String(lng));
      if (address.trim()) form.append("address", address.trim());
      if (category) form.append("category", category);
      const r = await api<{ id: string }>("/reports", { method: "POST", form });
      qc.invalidateQueries({ queryKey: ["stats"] });
      router.replace(`/report/${r.data.id}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Gagal mengirim laporan");
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen>
      <ScrollView>
        <Title>Laporan Baru</Title>
        <Sub>Foto, lokasi, dan deskripsi — AI membantu kategorinya.</Sub>
        <Card>
          <Text style={s.sec}>📷 Foto</Text>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={s.preview} />
          ) : (
            <View style={[s.preview, s.previewEmpty]}>
              <Ionicons name="image-outline" size={36} color={c.sub} />
              <Text style={{ color: c.sub }}>Belum ada foto</Text>
            </View>
          )}
        <View style={s.row}>
          {isWeb ? null : <Btn label="Kamera" tone="plain" onPress={() => pick(true)} />}
          <Btn label="Galeri" tone="plain" onPress={() => pick(false)} />
          {photoUri ? <Btn label="Deteksi ulang" tone="plain" onPress={() => classify(photoUri)} disabled={classifying} /> : null}
        </View>
        {classifying ? <Text style={s.info}>✨ Menganalisis foto...</Text> : null}
        {pred ? (
          <View style={s.ai}>
            <Ionicons name="sparkles" size={18} color={c.primaryDeep} />
            <Text style={s.aiText}>
              Deteksi AI: {CATEGORY_LABEL[pred.category]} ({Math.round(pred.confidence * 100)}%)
            </Text>
          </View>
        ) : null}
        {pred?.needsReview ? (
          <Text style={s.warn}>Keyakinan rendah — periksa kategori sebelum kirim.</Text>
        ) : null}
        {classifyErr ? <Text style={s.warn}>{classifyErr}</Text> : null}
        </Card>
        <Card>
        <Text style={s.sec}>📝 Detail</Text>
        <Field label="Judul" value={title} onChangeText={setTitle} placeholder="cth. Tumpukan sampah pasar" />
        <Field label="Deskripsi" value={description} onChangeText={setDescription} multiline placeholder="Ciri, lokasi patokan, ..." />
        <Text style={s.label}>Kategori</Text>
        <View style={s.row}>
          {CATS.map((k) => (
            <Pressable key={k} onPress={() => setCategory(k)} style={[s.cat, category === k && s.catOn]}>
              <Text style={category === k ? s.catTextOn : s.catText}>{CATEGORY_LABEL[k]}</Text>
            </Pressable>
          ))}
        </View>
        </Card>
        <Card>
        <Text style={s.sec}>📍 Titik lokasi</Text>
        <MapPicker lat={lat} lng={lng} onChange={(a, b) => { setLat(a); setLng(b); }} />
        <Text style={s.coords}>
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </Text>
        <Btn label="Gunakan lokasi saya" tone="plain" onPress={useMyLocation} />
        <Field label="Alamat (opsional)" value={address} onChangeText={setAddress} placeholder="cth. Jl. Mawar No. 10" />
        </Card>
        {err ? <Text style={{ color: "#b91c1c", marginBottom: 8 }}>{err}</Text> : null}
        <Btn label={sending ? "Mengirim..." : "Kirim laporan"} onPress={submit} disabled={sending || classifying} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  preview: { width: "100%", height: 200, borderRadius: 12, marginBottom: 8 },
  previewEmpty: { backgroundColor: c.bg, alignItems: "center", justifyContent: "center", gap: 6 },
  row: { flexDirection: "row", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  sec: { fontSize: 16, fontWeight: "800", color: c.ink, marginBottom: 10 },
  info: { color: c.primary, marginBottom: 4, fontWeight: "600" },
  ai: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: c.primarySoft,
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  aiText: { color: c.primaryDeep, fontWeight: "700" },
  warn: { backgroundColor: c.warnBg, color: c.warnFg, padding: 10, borderRadius: 12, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: "700", color: c.ink, marginBottom: 6 },
  cat: {
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: c.white,
  },
  catOn: { backgroundColor: c.primary, borderColor: c.primary },
  catText: { color: c.ink, fontWeight: "600" },
  catTextOn: { color: c.white, fontWeight: "700" },
  coords: { color: c.sub, fontSize: 13, marginBottom: 6, fontWeight: "600" },
});

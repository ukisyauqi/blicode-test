import { useRef, useState } from "react";
import { Image, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
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
import type { ClassifyResult } from "../../src/types";

const isWeb = Platform.OS === "web";

function titleFromDescription(description: string): string {
  return description.trim().replace(/\s+/g, " ").slice(0, 60);
}

/** Nama daerah/kota dari koordinat, diam-diam. Gagal -> kosong, submit tetap jalan. */
async function resolveLocation(lat: number, lng: number): Promise<{ address?: string; postalCode?: string }> {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (!place) return {};
    const street = [place.street, place.streetNumber].filter(Boolean).join(" ");
    const parts = [street || place.name, place.district, place.city || place.subregion, place.region]
      .map((part) => part?.trim())
      .filter((part): part is string => Boolean(part));
    const unique = [...new Set(parts)];
    const result: { address?: string; postalCode?: string } = {};
    if (unique.length > 0) result.address = unique.join(", ");
    const postalCode = place.postalCode?.trim();
    if (postalCode) result.postalCode = postalCode;
    return result;
  } catch {
    return {};
  }
}

export default function NewReport() {
  const router = useRouter();
  const qc = useQueryClient();
  const [description, setDescription] = useState("");
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
    } catch (e) {
      if (latest.current !== uri) return;
      setClassifyErr(e instanceof Error ? e.message : "Deteksi AI gagal — coba kirim ulang");
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

  async function submit() {
    const v = reportSchema.safeParse({ description, latitude: lat, longitude: lng });
    if (!v.success) return setErr(v.error.issues[0]?.message ?? "Input tidak valid");
    if (!photoUri) return setErr("Foto wajib diunggah untuk membuat laporan");
    if (classifying) return setErr("Tunggu hasil deteksi kategori dari foto sebelum mengirim");
    // Catatan: kalau deteksi client gagal (mis. jaringan putus sesaat),
    // tetap lanjut — backend mengklasifikasi ulang foto saat submit.
    setSending(true);
    setErr(null);
    try {
      const location = await resolveLocation(lat, lng);
      const form = photoUri ? await photoForm(photoUri, "photo") : new FormData();
      form.append("title", titleFromDescription(description));
      form.append("description", description.trim());
      form.append("latitude", String(lat));
      form.append("longitude", String(lng));
      if (location.address) form.append("address", location.address);
      if (location.postalCode) form.append("postalCode", location.postalCode);
      if (pred) form.append("category", pred.category);
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
      <ScrollView contentContainerStyle={s.scrollContent}>
        <Title>Laporan Baru</Title>
        <Sub>Foto, lokasi, dan deskripsi — AI membantu kategorinya.</Sub>
        <Card>
          <Text style={s.sec}>📷 Foto <Text style={s.req}>*</Text></Text>
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
              Kategori: {CATEGORY_LABEL[pred.category]} ({Math.round(pred.confidence * 100)}%)
            </Text>
          </View>
        ) : null}
        {classifyErr ? <Text style={s.warn}>{classifyErr}</Text> : null}
        </Card>
        <Card>
        <Text style={s.sec}>📝 Deskripsi</Text>
        <Field label="Deskripsi" value={description} onChangeText={setDescription} multiline placeholder="Ciri, lokasi patokan, ..." />
        </Card>
        <Card>
        <Text style={s.sec}>📍 Titik lokasi</Text>
        <MapPicker lat={lat} lng={lng} onChange={(a, b) => { setLat(a); setLng(b); }} />
        </Card>
        {err ? <Text style={{ color: "#b91c1c", marginBottom: 8 }}>{err}</Text> : null}
        <Btn label={sending ? "Mengirim..." : "Kirim laporan"} onPress={submit} disabled={sending || classifying} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  scrollContent: { paddingHorizontal: 2, paddingTop: 2, paddingBottom: 16 },
  preview: { width: "100%", height: 200, borderRadius: 12, marginBottom: 8 },
  previewEmpty: { backgroundColor: c.bg, alignItems: "center", justifyContent: "center", gap: 6 },
  row: { flexDirection: "row", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  sec: { fontSize: 16, fontWeight: "800", color: c.ink, marginBottom: 10 },
  req: { color: "#b91c1c" },
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
});

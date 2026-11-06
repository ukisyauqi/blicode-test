import { useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";
import { api, photoForm, ApiError } from "../../src/lib/api";
import { CATEGORY_LABEL } from "../../src/lib/constants";
import { reportSchema } from "../../src/lib/validation";
import { Btn, Field, Screen, Title, c } from "../../src/ui";
import type { Category, ClassifyResult } from "../../src/types";

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
      const r = await api<ClassifyResult>("/reports/classify", { method: "POST", form: photoForm(uri, "file") });
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
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setErr("Izin kamera/galeri ditolak. Ubah di pengaturan lalu coba lagi.");
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.7 });
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
      const form = photoUri ? photoForm(photoUri, "photo") : new FormData();
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
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={s.preview} />
        ) : (
          <View style={[s.preview, s.previewEmpty]}>
            <Text style={{ color: c.sub }}>Belum ada foto</Text>
          </View>
        )}
        <View style={s.row}>
          <Btn label="Kamera" tone="plain" onPress={() => pick(true)} />
          <Btn label="Galeri" tone="plain" onPress={() => pick(false)} />
          {photoUri ? <Btn label="Deteksi ulang" tone="plain" onPress={() => classify(photoUri)} disabled={classifying} /> : null}
        </View>
        {classifying ? <Text style={s.info}>Menganalisis foto...</Text> : null}
        {pred ? (
          <Text style={s.info}>
            Deteksi AI: {CATEGORY_LABEL[pred.category]} ({Math.round(pred.confidence * 100)}%)
          </Text>
        ) : null}
        {pred?.needsReview ? (
          <Text style={s.warn}>Keyakinan rendah — periksa kategori sebelum kirim.</Text>
        ) : null}
        {classifyErr ? <Text style={s.warn}>{classifyErr}</Text> : null}
        <Field label="Judul" value={title} onChangeText={setTitle} />
        <Field label="Deskripsi" value={description} onChangeText={setDescription} multiline />
        <Text style={s.label}>Kategori</Text>
        <View style={s.row}>
          {CATS.map((k) => (
            <Pressable key={k} onPress={() => setCategory(k)} style={[s.cat, category === k && s.catOn]}>
              <Text style={category === k ? s.catTextOn : s.catText}>{CATEGORY_LABEL[k]}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.label}>Titik lokasi</Text>
        <MapView
          key={`${lat},${lng}`}
          style={s.map}
          initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
          onPress={(e) => {
            setLat(e.nativeEvent.coordinate.latitude);
            setLng(e.nativeEvent.coordinate.longitude);
          }}
        >
          <Marker
            coordinate={{ latitude: lat, longitude: lng }}
            draggable
            onDragEnd={(e) => {
              setLat(e.nativeEvent.coordinate.latitude);
              setLng(e.nativeEvent.coordinate.longitude);
            }}
          />
        </MapView>
        <Text style={s.coords}>
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </Text>
        <Btn label="Gunakan lokasi saya" tone="plain" onPress={useMyLocation} />
        <Field label="Alamat (opsional)" value={address} onChangeText={setAddress} />
        {err ? <Text style={{ color: "#b91c1c", marginBottom: 8 }}>{err}</Text> : null}
        <Btn label={sending ? "Mengirim..." : "Kirim laporan"} onPress={submit} disabled={sending || classifying} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  preview: { width: "100%", height: 200, borderRadius: 10, marginBottom: 8 },
  previewEmpty: { backgroundColor: c.bg, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  info: { color: c.primary, marginBottom: 4, fontWeight: "600" },
  warn: { backgroundColor: c.warnBg, color: c.warnFg, padding: 8, borderRadius: 8, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: "600", color: c.ink, marginBottom: 4 },
  cat: { borderWidth: 1, borderColor: c.line, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  catOn: { backgroundColor: c.primary, borderColor: c.primary },
  catText: { color: c.ink },
  catTextOn: { color: c.white, fontWeight: "700" },
  map: { width: "100%", height: 220, borderRadius: 10, marginBottom: 4 },
  coords: { color: c.sub, fontSize: 13, marginBottom: 4 },
});

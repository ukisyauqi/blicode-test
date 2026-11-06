import { useEffect, useRef, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import { Btn, Field, c } from "../ui";

// Tanpa peta native (react-native-maps di Android wajib Google Maps API key):
// lokasi diambil otomatis saat layar dibuka, tampil sebagai teks,
// bisa dimuat ulang atau diisi manual.
export function MapPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const [busy, setBusy] = useState(true);
  const [note, setNote] = useState("Mendapatkan lokasi otomatis…");
  const [latT, setLatT] = useState(String(lat));
  const [lngT, setLngT] = useState(String(lng));
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => setLatT(String(lat)), [lat]);
  useEffect(() => setLngT(String(lng)), [lng]);

  async function locate() {
    setBusy(true);
    setNote("Mendapatkan lokasi otomatis…");
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setNote("Izin lokasi ditolak — isi koordinat manual di bawah.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      onChangeRef.current(pos.coords.latitude, pos.coords.longitude);
      setNote("Lokasi otomatis dari GPS.");
    } catch {
      setNote("Gagal membaca GPS — isi manual atau muat ulang.");
    } finally {
      setBusy(false);
    }
  }

  // Sekali saat layar dibuka; selanjutnya lewat tombol.
  useEffect(() => {
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function commitLat(t: string) {
    setLatT(t);
    const v = parseFloat(t);
    if (t.trim() !== "" && !Number.isNaN(v)) onChange(v, lng);
  }

  function commitLng(t: string) {
    setLngT(t);
    const v = parseFloat(t);
    if (t.trim() !== "" && !Number.isNaN(v)) onChange(lat, v);
  }

  const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <View style={s.box}>
      <Text style={s.coords}>
        📍 {lat.toFixed(6)}, {lng.toFixed(6)}
      </Text>
      <Text style={s.note}>{note}</Text>
      <Btn label={busy ? "Mencari lokasi…" : "Perbarui lokasi"} tone="plain" onPress={locate} disabled={busy} />
      <Field label="Latitude" value={latT} onChangeText={commitLat} keyboardType="numeric" placeholder="-6.2" />
      <Field label="Longitude" value={lngT} onChangeText={commitLng} keyboardType="numeric" placeholder="106.8" />
      <Text style={s.link} onPress={() => Linking.openURL(mapsUrl)} accessibilityRole="link">
        Buka di Google Maps
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: c.bg, borderRadius: 10, padding: 12, marginBottom: 4 },
  coords: { color: c.ink, fontSize: 15, fontWeight: "800", marginBottom: 2 },
  note: { color: c.sub, fontSize: 13, marginBottom: 8 },
  link: { color: c.primary, fontWeight: "700", marginTop: 4 },
});

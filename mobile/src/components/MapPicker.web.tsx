import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Field, c } from "../ui";

// Fallback web: react-native-maps tidak jalan di browser, jadi koordinat diisi manual.
// Dipilih otomatis oleh bundler karena akhiran .web.tsx.
export function MapPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const [latT, setLatT] = useState(String(lat));
  const [lngT, setLngT] = useState(String(lng));

  useEffect(() => setLatT(String(lat)), [lat]);
  useEffect(() => setLngT(String(lng)), [lng]);

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

  return (
    <View style={s.box}>
      <Text style={s.note}>Peta tidak tersedia di web — isi koordinat manual atau pakai tombol lokasi.</Text>
      <Field label="Latitude" value={latT} onChangeText={commitLat} keyboardType="numeric" placeholder="-6.2" />
      <Field label="Longitude" value={lngT} onChangeText={commitLng} keyboardType="numeric" placeholder="106.8" />
    </View>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: c.bg, borderRadius: 10, padding: 12, marginBottom: 4 },
  note: { color: c.sub, fontSize: 13, marginBottom: 8 },
});

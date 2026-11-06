import { Linking, StyleSheet, Text, View } from "react-native";
import { c } from "../ui";

// Tanpa peta native (react-native-maps di Android wajib Google Maps API key):
// tampilkan koordinat + tautan Google Maps.
export function ReportMap({ lat, lng }: { lat: number; lng: number }) {
  const url = `https://www.google.com/maps?q=${lat},${lng}`;
  return (
    <View style={s.box}>
      <Text style={s.coords}>
        📍 {lat.toFixed(6)}, {lng.toFixed(6)}
      </Text>
      <Text style={s.link} onPress={() => Linking.openURL(url)} accessibilityRole="link">
        Buka di Google Maps
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: c.bg, borderRadius: 10, padding: 12, marginVertical: 8 },
  coords: { color: c.ink, fontSize: 14, fontWeight: "700", marginBottom: 4 },
  link: { color: c.primary, fontWeight: "700" },
});

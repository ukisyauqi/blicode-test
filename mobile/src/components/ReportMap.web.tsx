import { Linking, StyleSheet, Text, View } from "react-native";
import { c } from "../ui";

// Fallback web: ganti peta read-only dengan tautan Google Maps.
export function ReportMap({ lat, lng }: { lat: number; lng: number }) {
  const url = `https://www.google.com/maps?q=${lat},${lng}`;
  return (
    <View style={s.box}>
      <Text style={s.coords}>
        {lat.toFixed(6)}, {lng.toFixed(6)}
      </Text>
      <Text style={s.link} onPress={() => Linking.openURL(url)}>
        Buka di Google Maps
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: c.bg, borderRadius: 10, padding: 12, marginVertical: 8 },
  coords: { color: c.ink, fontSize: 14, marginBottom: 4 },
  link: { color: c.primary, fontWeight: "700" },
});

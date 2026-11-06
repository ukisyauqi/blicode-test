import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

export default function NotFound() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}>
      <Stack.Screen options={{ title: "Tidak ditemukan" }} />
      <Text>Halaman tidak ditemukan.</Text>
      <Link href="/">Kembali ke Dashboard</Link>
    </View>
  );
}

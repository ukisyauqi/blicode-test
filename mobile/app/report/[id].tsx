import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import MapView, { Marker } from "react-native-maps";
import { api, fileUrl, ApiError } from "../../src/lib/api";
import { CATEGORY_LABEL, STATUS_META } from "../../src/lib/constants";
import { Badge, Err, Loader, Screen, Title, c } from "../../src/ui";
import type { HistoryItem, Report } from "../../src/types";

export default function ReportDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({
    queryKey: ["report", id],
    queryFn: async () => {
      const [r, h] = await Promise.all([api<Report>(`/reports/${id}`), api<HistoryItem[]>(`/reports/${id}/history`)]);
      return { report: r.data, history: h.data };
    },
  });

  if (query.isLoading) return <Screen><Loader /></Screen>;
  if (query.isError || !query.data)
    return (
      <Screen>
        <Err message={query.error instanceof ApiError ? query.error.message : "Gagal memuat laporan"} onRetry={() => query.refetch()} />
      </Screen>
    );

  const { report, history } = query.data;
  const uri = fileUrl(report.photoUrl);
  const lat = Number(report.latitude);
  const lng = Number(report.longitude);
  const corrected =
    report.predictedCategory && report.category !== report.predictedCategory;

  return (
    <Screen>
      <ScrollView>
        <Title>{report.title}</Title>
        <View style={s.badges}>
          <Badge kind="status" value={report.status} />
          <Badge kind="category" value={report.category} />
        </View>
        {uri ? <Image source={{ uri }} style={s.photo} /> : null}
        <Text style={s.desc}>{report.description}</Text>
        {report.address ? <Text style={s.sub}>{report.address}</Text> : null}
        <Text style={s.sub}>
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </Text>
        <MapView
          style={s.map}
          scrollEnabled={false}
          zoomEnabled={false}
          region={{ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
        >
          <Marker coordinate={{ latitude: lat, longitude: lng }} />
        </MapView>
        {report.predictedCategory ? (
          <Text style={s.ai}>
            Deteksi AI: {CATEGORY_LABEL[report.predictedCategory]} (
            {Math.round(Number(report.predictedConfidence) * 100)}%)
            {corrected ? " • dikoreksi pengguna" : ""}
          </Text>
        ) : null}
        {report.status === "rejected" && report.rejectReason ? (
          <Text style={s.reject}>Alasan penolakan: {report.rejectReason}</Text>
        ) : null}
        <Text style={s.h}>Riwayat status</Text>
        {history.map((h, i) => (
          <View key={i} style={s.tlRow}>
            <View style={s.dot} />
            <View>
              <Text style={s.tlText}>
                {h.fromStatus ? `${STATUS_META[h.fromStatus].label} → ` : ""}
                {STATUS_META[h.toStatus].label}
              </Text>
              <Text style={s.sub}>{new Date(h.createdAt).toLocaleString("id-ID")}</Text>
              {h.note ? <Text style={s.sub}>{h.note}</Text> : null}
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  badges: { flexDirection: "row", gap: 6, marginBottom: 8 },
  photo: { width: "100%", height: 240, borderRadius: 10, marginBottom: 8 },
  desc: { fontSize: 15, color: c.ink, marginBottom: 4 },
  sub: { color: c.sub, fontSize: 13, marginBottom: 2 },
  map: { width: "100%", height: 180, borderRadius: 10, marginVertical: 8 },
  ai: { color: c.primary, fontWeight: "600", marginBottom: 4 },
  reject: { backgroundColor: "#fee2e2", color: "#b91c1c", padding: 8, borderRadius: 8, marginBottom: 4 },
  h: { fontSize: 16, fontWeight: "700", color: c.ink, marginTop: 12, marginBottom: 6 },
  tlRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary, marginTop: 4 },
  tlText: { fontWeight: "700", color: c.ink },
});

import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api, fileUrl, ApiError } from "../../src/lib/api";
import { CATEGORY_LABEL, STATUS_META } from "../../src/lib/constants";
import { Badge, Card, Err, Loader, Screen, Title, c } from "../../src/ui";
import { ReportMap } from "../../src/components/ReportMap";
import { Ionicons } from "@expo/vector-icons";
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
        <Card>
          <Text style={s.desc}>{report.description}</Text>
          {report.address ? (
            <View style={s.addrRow}>
              <Ionicons name="location-outline" size={15} color={c.sub} />
              <Text style={s.sub}>{report.address}</Text>
            </View>
          ) : null}
          <Text style={s.sub}>
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </Text>
          <ReportMap lat={lat} lng={lng} />
          {report.predictedCategory ? (
            <View style={s.ai}>
              <Ionicons name="sparkles" size={16} color={c.primaryDeep} />
              <Text style={s.aiText}>
                Deteksi AI: {CATEGORY_LABEL[report.predictedCategory]} (
                {Math.round(Number(report.predictedConfidence) * 100)}%)
                {corrected ? " • dikoreksi pengguna" : ""}
              </Text>
            </View>
          ) : null}
          {report.status === "rejected" && report.rejectReason ? (
            <Text style={s.reject}>Alasan penolakan: {report.rejectReason}</Text>
          ) : null}
        </Card>
        <Card>
          <Text style={s.h}>Riwayat status</Text>
          {history.map((h, i) => (
            <View key={i} style={s.tlRow}>
              <View style={s.dot} />
              <View style={{ flex: 1 }}>
                <Text style={s.tlText}>
                  {h.fromStatus ? `${STATUS_META[h.fromStatus].label} → ` : ""}
                  {STATUS_META[h.toStatus].label}
                </Text>
                <Text style={s.sub}>{new Date(h.createdAt).toLocaleString("id-ID")}</Text>
                {h.note ? <Text style={s.sub}>{h.note}</Text> : null}
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  badges: { flexDirection: "row", gap: 6, marginBottom: 10 },
  photo: { width: "100%", height: 250, borderRadius: 16, marginBottom: 12 },
  desc: { fontSize: 16, color: c.ink, marginBottom: 6, lineHeight: 23 },
  addrRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  sub: { color: c.sub, fontSize: 13, marginBottom: 2 },
  ai: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: c.primarySoft,
    padding: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  aiText: { color: c.primaryDeep, fontWeight: "700", flex: 1 },
  reject: { backgroundColor: "#fee2e2", color: "#b91c1c", padding: 10, borderRadius: 12, marginTop: 8 },
  h: { fontSize: 16, fontWeight: "800", color: c.ink, marginBottom: 8 },
  tlRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary, marginTop: 4 },
  tlText: { fontWeight: "700", color: c.ink },
});

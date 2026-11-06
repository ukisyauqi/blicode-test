import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { api, fileUrl, ApiError } from "../../src/lib/api";
import { STATUS_META } from "../../src/lib/constants";
import { Badge, Btn, Field, Screen, Title, c } from "../../src/ui";
import type { Report, Status } from "../../src/types";

const STATUS_OPTS: (Status | "")[] = ["", "pending", "in_progress", "completed", "rejected"];
const CAT_OPTS = ["", "organic", "plastic", "paper"] as const;

export default function Reports() {
  const router = useRouter();
  const [items, setItems] = useState<Report[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("created_at_desc");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(
    async (p: number, reset: boolean) => {
      setLoading(true);
      setErr(null);
      try {
        const qs = new URLSearchParams({
          search: appliedQ,
          status,
          category,
          sort,
          page: String(p),
          limit: "10",
        }).toString();
        const r = await api<Report[]>(`/reports?${qs}`);
        setItems((prev) => (reset ? r.data : [...prev, ...r.data]));
        setTotalPages(r.meta?.totalPages ?? 1);
        setPage(p);
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : "Gagal memuat laporan");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [appliedQ, status, category, sort],
  );

  useEffect(() => {
    load(1, true);
  }, [load]);

  function renderItem({ item }: { item: Report }) {
    const uri = fileUrl(item.photoUrl);
    return (
      <Pressable style={s.card} onPress={() => router.push(`/report/${item.id}`)}>
        {uri ? <Image source={{ uri }} style={s.thumb} /> : <View style={[s.thumb, s.thumbEmpty]} />}
        <View style={s.cardBody}>
          <Text style={s.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={s.badges}>
            <Badge kind="status" value={item.status} />
            <Badge kind="category" value={item.category} />
          </View>
          <Text style={s.date}>{new Date(item.createdAt).toLocaleDateString("id-ID")}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Screen>
      <Title>Riwayat Laporan</Title>
      <View style={s.searchRow}>
        <View style={{ flex: 1 }}>
          <Field label="" value={q} onChangeText={setQ} placeholder="Cari judul, deskripsi, alamat..." onSubmitEditing={() => setAppliedQ(q)} />
        </View>
        <Pressable style={s.go} onPress={() => setAppliedQ(q)}>
          <Text style={s.goText}>Cari</Text>
        </Pressable>
      </View>
      <View style={s.chipRow}>
        {STATUS_OPTS.map((o) => (
          <Pressable key={o || "all"} onPress={() => setStatus(o)} style={[s.chip, status === o && s.chipOn]}>
            <Text style={status === o ? s.chipTextOn : s.chipText}>{o ? STATUS_META[o].label : "Semua"}</Text>
          </Pressable>
        ))}
      </View>
      <View style={s.chipRow}>
        {CAT_OPTS.map((o) => (
          <Pressable key={o || "all"} onPress={() => setCategory(o)} style={[s.chip, category === o && s.chipOn]}>
            <Text style={category === o ? s.chipTextOn : s.chipText}>
              {o === "" ? "Semua" : o === "organic" ? "Organik" : o === "plastic" ? "Plastik" : "Kertas"}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => setSort(sort === "created_at_desc" ? "created_at_asc" : "created_at_desc")}
          style={s.chip}
        >
          <Text style={s.chipText}>{sort === "created_at_desc" ? "Terbaru ↓" : "Terlama ↑"}</Text>
        </Pressable>
      </View>
      {err ? (
        <View style={{ marginTop: 16 }}>
          <Text style={{ color: "#b91c1c", marginBottom: 8 }}>{err}</Text>
          <Btn label="Coba lagi" tone="plain" onPress={() => load(1, true)} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          onEndReached={() => {
            if (!loading && page < totalPages) load(page + 1, false);
          }}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(1, true); }} />}
          ListEmptyComponent={
            loading ? undefined : (
              <Text style={{ color: c.sub, textAlign: "center", marginTop: 24 }}>Belum ada laporan.</Text>
            )
          }
          ListFooterComponent={loading ? <Text style={{ textAlign: "center", color: c.sub }}>Memuat...</Text> : undefined}
        />
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  searchRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  go: { backgroundColor: c.ink, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 12 },
  goText: { color: c.white, fontWeight: "700" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: c.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: c.ink, borderColor: c.ink },
  chipText: { color: c.ink, fontSize: 13 },
  chipTextOn: { color: c.white, fontWeight: "700", fontSize: 13 },
  card: { flexDirection: "row", gap: 10, borderWidth: 1, borderColor: c.line, borderRadius: 10, padding: 8, marginBottom: 8 },
  thumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: c.bg },
  thumbEmpty: { backgroundColor: c.bg },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontWeight: "700", color: c.ink, fontSize: 15 },
  badges: { flexDirection: "row", gap: 6 },
  date: { color: c.sub, fontSize: 12 },
});

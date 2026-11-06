import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/auth";
import { api, ApiError } from "../../src/lib/api";
import { CATEGORY_LABEL, STATUS_META } from "../../src/lib/constants";
import { Btn, Card, Err, Field, Hero, Loader, Screen, c } from "../../src/ui";
import type { Stats } from "../../src/types";

function day(n: number) {
  return new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
}

function Bar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  return (
    <View style={s.barRow}>
      <Text style={s.barLabel}>{label}</Text>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${max ? (count / max) * 100 : 0}%`, backgroundColor: color }]} />
      </View>
      <Text style={s.barCount}>{count}</Text>
    </View>
  );
}

const TILE_ICON = {
  pending: "hourglass",
  in_progress: "sync",
  completed: "checkmark-circle",
  rejected: "close-circle",
} as const;

export default function Dashboard() {
  const { user } = useAuth();
  const [preset, setPreset] = useState<"7" | "30" | "custom">("30");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState<{ from: string; to: string } | null>(null);

  const q = applied ?? (preset === "7" ? { from: day(6), to: day(0) } : { from: day(29), to: day(0) });
  const qs = `?from=${q.from}&to=${q.to}`;
  const query = useQuery({
    queryKey: ["stats", q.from, q.to],
    queryFn: () => api<Stats>(`/dashboard/stats${qs}`).then((r) => r.data),
  });

  const stats = query.data;
  const maxStatus = Math.max(1, ...(stats?.byStatus.map((b) => b.count) ?? [0]));
  const maxCat = Math.max(1, ...(stats?.byCategory.map((b) => b.count) ?? [0]));
  const trend = (stats?.trend ?? []).slice(-14);
  const maxTrend = Math.max(1, ...trend.map((t) => t.count));

  return (
    <Screen>
      <Hero>
        <Text style={s.hi}>Halo, {user?.name?.split(" ")[0] ?? "Pelapor"} 👋</Text>
        <Text style={s.total}>{stats?.summary.total ?? "–"}</Text>
        <Text style={s.totalLabel}>laporan periode ini</Text>
      </Hero>
      <View style={s.presetRow}>
        {(["7", "30", "custom"] as const).map((p) => (
          <Pressable key={p} onPress={() => { setPreset(p); setApplied(null); }} style={[s.preset, preset === p && s.presetOn]}>
            <Text style={preset === p ? s.presetTextOn : s.presetText}>
              {p === "7" ? "7 hari" : p === "30" ? "30 hari" : "Custom"}
            </Text>
          </Pressable>
        ))}
      </View>
      {preset === "custom" && !applied ? (
        <Card>
          <Field label="Dari (YYYY-MM-DD)" value={from} onChangeText={setFrom} placeholder="2026-10-01" />
          <Field label="Sampai (YYYY-MM-DD)" value={to} onChangeText={setTo} placeholder="2026-11-06" />
          <Btn label="Terapkan" onPress={() => from && to && setApplied({ from, to })} tone="plain" />
        </Card>
      ) : null}
      {preset === "custom" && applied ? (
        <Btn label={`Periode ${applied.from} – ${applied.to} (ubah)`} tone="plain" onPress={() => setApplied(null)} />
      ) : null}
      {query.isLoading ? (
        <Loader />
      ) : query.isError || !stats ? (
        <Err
          message={query.error instanceof ApiError ? query.error.message : "Gagal memuat dashboard"}
          onRetry={() => query.refetch()}
        />
      ) : stats.summary.total === 0 ? (
        <ScrollView contentContainerStyle={s.scrollContent} refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => { query.refetch(); }} />}>
          <Card>
            <View style={s.empty}>
              <Ionicons name="file-tray-outline" size={40} color={c.sub} />
              <Text style={s.emptyText}>Belum ada laporan pada periode ini. Buat laporan pertama lewat tab Lapor.</Text>
            </View>
          </Card>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={s.scrollContent}
          refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => { query.refetch(); }} />}>
          <View style={s.tiles}>
            {(Object.keys(STATUS_META) as (keyof typeof STATUS_META)[]).map((k) => (
              <View key={k} style={[s.tile, { backgroundColor: STATUS_META[k].bg }]}>
                <View style={s.tileText}>
                  <Text style={[s.tileNum, { color: STATUS_META[k].fg }]}>{stats.summary[k]}</Text>
                  <Text style={s.tileLabel}>{STATUS_META[k].label}</Text>
                </View>
                <Ionicons name={TILE_ICON[k]} size={20} color={STATUS_META[k].fg} style={s.tileIcon} />
              </View>
            ))}
          </View>
          <Card>
            <Text style={s.h}>Per status</Text>
            {stats.byStatus.map((b) => (
              <Bar key={b.status} label={STATUS_META[b.status].label} count={b.count} max={maxStatus} color={STATUS_META[b.status].fg} />
            ))}
          </Card>
          <Card>
            <Text style={s.h}>Per kategori</Text>
            {stats.byCategory.map((b) => (
              <Bar key={b.category} label={CATEGORY_LABEL[b.category]} count={b.count} max={maxCat} color={c.primary} />
            ))}
          </Card>
          <Card>
            <Text style={s.h}>Tren harian</Text>
            {trend.map((t) => (
              <Bar key={t.date} label={t.date.slice(5)} count={t.count} max={maxTrend} color="#1d4ed8" />
            ))}
          </Card>
          <Card>
            <Text style={s.h}>Lokasi terbanyak</Text>
            {stats.topLocations.map((l, i) => {
              return (
                <View key={i} style={s.locRow}>
                  <Ionicons name="location" size={16} color={c.primary} />
                  <View style={s.locText}>
                    <Text style={s.loc} numberOfLines={1}>
                      {`${l.address ?? "Lokasi tanpa alamat"} — ${l.count} laporan`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>
        </ScrollView>
      )}
    </Screen>
  );
}

// shortcut: grafik digambar manual dengan View (tanpa dep chart), upgrade ke victory-native bila butuh interaksi.
const s = StyleSheet.create({
  hi: { fontSize: 16, color: "#d1fae5", fontWeight: "600" },
  total: { fontSize: 52, fontWeight: "800", color: "#ffffff", letterSpacing: -1 },
  totalLabel: { fontSize: 14, color: "#d1fae5" },
  presetRow: { flexDirection: "row", gap: 8, marginBottom: 12 },  preset: {
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: c.white,
  },
  presetOn: { backgroundColor: c.ink, borderColor: c.ink },
  presetText: { color: c.ink, fontWeight: "600" },
  presetTextOn: { color: c.white, fontWeight: "700" },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  scrollContent: { paddingHorizontal: 2, paddingTop: 2, paddingBottom: 16 },
  tile: { flexBasis: "48%", flexGrow: 1, borderRadius: 16, padding: 14, flexDirection: "row", justifyContent: "space-between", shadowColor: c.shadow, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  tileText: { gap: 2 },
  tileIcon: { alignSelf: "flex-start" },
  tileNum: { fontSize: 28, fontWeight: "800" },
  tileLabel: { color: c.sub, fontSize: 13, fontWeight: "600" },
  h: { fontSize: 16, fontWeight: "800", color: c.ink, marginBottom: 8 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  barLabel: { width: 72, fontSize: 13, color: c.ink, fontWeight: "600" },
  barTrack: { flex: 1, height: 12, backgroundColor: c.bg, borderRadius: 6, overflow: "hidden" },
  barFill: { height: 12, borderRadius: 6 },
  barCount: { width: 32, textAlign: "right", fontWeight: "800", color: c.ink },
  locRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  locText: { flex: 1 },
  loc: { fontSize: 14, color: c.ink, fontWeight: "600" },
  locSub: { fontSize: 12, color: c.sub },
  empty: { alignItems: "center", gap: 10, paddingVertical: 20 },
  emptyText: { color: c.sub, textAlign: "center", fontSize: 14 },
});

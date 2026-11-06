import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../../src/lib/api";
import { CATEGORY_LABEL, STATUS_META } from "../../src/lib/constants";
import { Btn, Err, Field, Loader, Screen, Title, c } from "../../src/ui";
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

export default function Dashboard() {
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
      <Title>Dashboard</Title>
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
        <View>
          <Field label="Dari (YYYY-MM-DD)" value={from} onChangeText={setFrom} placeholder="2026-10-01" />
          <Field label="Sampai (YYYY-MM-DD)" value={to} onChangeText={setTo} placeholder="2026-11-06" />
          <Btn label="Terapkan" onPress={() => from && to && setApplied({ from, to })} tone="plain" />
        </View>
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
        <ScrollView refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => { query.refetch(); }} />}>
          <Text style={{ color: c.sub, marginTop: 24, textAlign: "center" }}>
            Belum ada laporan pada periode ini. Buat laporan pertama lewat tab Lapor.
          </Text>
        </ScrollView>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => { query.refetch(); }} />}>
          <View style={s.cards}>
            <View style={[s.card, s.cardFull]}>
              <Text style={s.cardNum}>{stats.summary.total}</Text>
              <Text style={s.cardLabel}>Total laporan</Text>
            </View>
            {(Object.keys(STATUS_META) as (keyof typeof STATUS_META)[]).map((k) => (
              <View key={k} style={[s.card, { backgroundColor: STATUS_META[k].bg }]}>
                <Text style={[s.cardNum, { color: STATUS_META[k].fg }]}>{stats.summary[k]}</Text>
                <Text style={s.cardLabel}>{STATUS_META[k].label}</Text>
              </View>
            ))}
          </View>
          <Text style={s.h}>Per status</Text>
          {stats.byStatus.map((b) => (
            <Bar key={b.status} label={STATUS_META[b.status].label} count={b.count} max={maxStatus} color={STATUS_META[b.status].fg} />
          ))}
          <Text style={s.h}>Per kategori</Text>
          {stats.byCategory.map((b) => (
            <Bar key={b.category} label={CATEGORY_LABEL[b.category]} count={b.count} max={maxCat} color={c.primary} />
          ))}
          <Text style={s.h}>Tren harian</Text>
          {trend.map((t) => (
            <Bar key={t.date} label={t.date.slice(5)} count={t.count} max={maxTrend} color="#1d4ed8" />
          ))}
          <Text style={s.h}>Lokasi terbanyak</Text>
          {stats.topLocations.map((l, i) => (
            <Text key={i} style={s.loc}>
              {l.latitude.toFixed(3)}, {l.longitude.toFixed(3)} — {l.count} laporan
            </Text>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

// shortcut: grafik digambar manual dengan View (tanpa dep chart), upgrade ke victory-native bila butuh interaksi.
const s = StyleSheet.create({
  presetRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  preset: { borderWidth: 1, borderColor: c.line, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  presetOn: { backgroundColor: c.ink, borderColor: c.ink },
  presetText: { color: c.ink },
  presetTextOn: { color: c.white, fontWeight: "700" },
  cards: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: { flexBasis: "48%", flexGrow: 1, backgroundColor: c.bg, borderRadius: 10, padding: 12 },
  cardFull: { flexBasis: "100%" },
  cardNum: { fontSize: 24, fontWeight: "800", color: c.ink },
  cardLabel: { color: c.sub, fontSize: 13 },
  h: { fontSize: 16, fontWeight: "700", color: c.ink, marginTop: 16, marginBottom: 6 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  barLabel: { width: 72, fontSize: 13, color: c.ink },
  barTrack: { flex: 1, height: 12, backgroundColor: c.bg, borderRadius: 6, overflow: "hidden" },
  barFill: { height: 12, borderRadius: 6 },
  barCount: { width: 32, textAlign: "right", fontWeight: "700", color: c.ink },
  loc: { fontSize: 14, color: c.ink, marginBottom: 4 },
});

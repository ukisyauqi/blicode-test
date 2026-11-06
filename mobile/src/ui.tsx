import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { CATEGORY_BG, CATEGORY_LABEL, STATUS_META } from "./lib/constants";
import type { Category, Status } from "./types";

export const c = {
  ink: "#0f172a",
  sub: "#64748b",
  line: "#e2e8f0",
  bg: "#eef4f1",
  white: "#ffffff",
  primary: "#047857",
  primaryDeep: "#065f46",
  primarySoft: "#d1fae5",
  danger: "#b91c1c",
  dangerSoft: "#fee2e2",
  warnBg: "#fef3c7",
  warnFg: "#92400e",
  shadow: "#0f172a",
};

export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.wrap}>{children}</View>
    </SafeAreaView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={s.title}>{children}</Text>;
}

export function Sub({ children }: { children: ReactNode }) {
  return <Text style={s.sub}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Hero({
  children,
  colors = ["#059669", "#065f46"],
}: {
  children: ReactNode;
  colors?: [string, string];
}) {
  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
      {children}
    </LinearGradient>
  );
}

export function Btn({
  label,
  onPress,
  disabled,
  tone = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "primary" | "plain" | "danger";
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[s.btn, tone === "plain" && s.btnPlain, tone === "danger" && s.btnDanger, disabled && s.btnOff]}
    >
      <Text style={[s.btnText, tone === "plain" && s.btnPlainText]}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  error,
  ...props
}: {
  label: string;
  error?: string | null;
} & TextInputProps) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, props.multiline && s.inputMulti]}
        placeholderTextColor={c.sub}
        autoCapitalize="none"
        {...props}
      />
      {error ? <Text style={s.err}>{error}</Text> : null}
    </View>
  );
}

export function Badge({ kind, value }: { kind: "status" | "category"; value: Status | Category }) {
  const meta =
    kind === "status"
      ? STATUS_META[value as Status]
      : { label: CATEGORY_LABEL[value as Category], fg: "#111827", bg: CATEGORY_BG[value as Category] };
  return (
    <View style={[s.badge, { backgroundColor: meta.bg }]}>
      <Text style={[s.badgeText, { color: meta.fg }]}>{meta.label}</Text>
    </View>
  );
}

export function Loader() {
  return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={c.primary} />
    </View>
  );
}

export function Err({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={s.center}>
      <Text style={s.err}>{message}</Text>
      {onRetry ? <Btn label="Coba lagi" tone="plain" onPress={onRetry} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  wrap: { flex: 1, width: "100%", maxWidth: 640, alignSelf: "center", padding: 16 },
  title: { fontSize: 26, fontWeight: "800", color: c.ink, marginBottom: 4, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: c.sub, marginBottom: 12 },
  card: {
    backgroundColor: c.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: c.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  hero: { borderRadius: 20, padding: 20, marginBottom: 12 },
  field: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "700", color: c.ink, marginBottom: 6 },
  input: {
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: c.ink,
  },
  inputMulti: { minHeight: 90, textAlignVertical: "top" },
  err: { color: "#b91c1c", marginTop: 4, fontSize: 14 },
  btn: {
    backgroundColor: c.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
    shadowColor: c.primaryDeep,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  btnPlain: { backgroundColor: "#e2e8f0", shadowOpacity: 0 },
  btnDanger: { backgroundColor: "#b91c1c", shadowOpacity: 0 },
  btnOff: { opacity: 0.5 },
  btnText: { color: c.white, fontWeight: "700", fontSize: 16 },
  btnPlainText: { color: c.ink },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  badgeText: { fontSize: 12, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 16 },
});

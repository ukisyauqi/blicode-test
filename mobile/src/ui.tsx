import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { CATEGORY_BG, CATEGORY_LABEL, STATUS_META } from "./lib/constants";
import type { Category, Status } from "./types";

export const c = {
  ink: "#111827",
  sub: "#6b7280",
  line: "#e5e7eb",
  bg: "#f9fafb",
  white: "#ffffff",
  primary: "#15803d",
  warnBg: "#fef3c7",
  warnFg: "#92400e",
};

export function Screen({ children }: { children: ReactNode }) {
  return <SafeAreaView style={s.screen}>{children}</SafeAreaView>;
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={s.title}>{children}</Text>;
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
}: { label: string; error?: string | null } & TextInputProps) {
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
      <ActivityIndicator size="large" />
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
  screen: { flex: 1, backgroundColor: c.white, padding: 16 },
  title: { fontSize: 22, fontWeight: "700", color: c.ink, marginBottom: 12 },
  field: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "600", color: c.ink, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 10, fontSize: 16, color: c.ink },
  inputMulti: { minHeight: 90, textAlignVertical: "top" },
  err: { color: "#b91c1c", marginTop: 4, fontSize: 14 },
  btn: { backgroundColor: c.primary, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 4 },
  btnPlain: { backgroundColor: "#e5e7eb" },
  btnDanger: { backgroundColor: "#b91c1c" },
  btnOff: { opacity: 0.5 },
  btnText: { color: c.white, fontWeight: "700", fontSize: 16 },
  btnPlainText: { color: c.ink },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  badgeText: { fontSize: 12, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 16 },
});

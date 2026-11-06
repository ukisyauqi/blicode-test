import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { c } from "../../src/ui";

function icon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color?: unknown; size?: unknown }) => (
    <Ionicons
      name={name}
      color={typeof color === "string" ? color : c.sub}
      size={typeof size === "number" ? size : 24}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.sub,
        tabBarStyle: { height: 62, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: icon("grid"),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Riwayat",
          tabBarIcon: icon("time"),
        }}
      />
      <Tabs.Screen
        name="new"
        options={{
          title: "Lapor",
          tabBarIcon: icon("add-circle"),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: icon("person"),
        }}
      />
    </Tabs>
  );
}

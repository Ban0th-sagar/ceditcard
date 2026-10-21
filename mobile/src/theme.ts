import { StyleSheet } from "react-native";
export const color = {
  bg: "#0B1017",
  surface: "#141D28",
  raised: "#1B2835",
  line: "#2C3D4C",
  ink: "#F4F4EB",
  muted: "#A4B2C0",
  accent: "#D6F58A",
  teal: "#81DDD0",
  danger: "#FFA5AC",
};
export const money = (value: number) =>
  `₹${Math.round(value).toLocaleString("en-IN")}`;
export const due = (value: string) =>
  new Date(`${value}T12:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
export const ui = StyleSheet.create({
  stack: { gap: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  flex: { flex: 1, minWidth: 0 },
  label: { color: color.muted, fontSize: 12, lineHeight: 18 },
  body: { color: color.muted, fontSize: 14, lineHeight: 22 },
  title: {
    color: color.ink,
    fontSize: 32,
    lineHeight: 39,
    fontWeight: "800",
    letterSpacing: -1,
  },
  h2: {
    color: color.ink,
    fontSize: 21,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  value: { color: color.ink, fontSize: 16, fontWeight: "700" },
  eyebrow: {
    color: color.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.6,
    lineHeight: 18,
  },
  surface: {
    backgroundColor: color.surface,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: color.line,
    gap: 14,
  },
  divider: { height: 1, backgroundColor: color.line },
});

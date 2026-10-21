import React, { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "../types";
import { color, due, money, ui } from "../theme";

export function Surface({ children }: PropsWithChildren) {
  return <View style={ui.surface}>{children}</View>;
}
export function Badge({ label }: { label: string }) {
  return (
    <View style={s.badge}>
      <Text style={s.badgeText}>{label}</Text>
    </View>
  );
}
export function Heading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={ui.title}>
        {title}
      </Text>
      {subtitle && <Text style={ui.body}>{subtitle}</Text>}
    </View>
  );
}
export function Button({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: color.ink }]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 5, flexShrink: 1 }}>
      <Text style={ui.label}>{label}</Text>
      <Text style={ui.value}>{value}</Text>
    </View>
  );
}
export function Meter({ value }: { value: number }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Credit utilization"
      accessibilityValue={{ min: 0, max: 100, now: value }}
      style={s.track}
    >
      <View
        style={[s.fill, { width: `${Math.max(0, Math.min(100, value))}%` }]}
      />
    </View>
  );
}
export function State({
  title,
  message,
  action,
  onAction,
}: {
  title: string;
  message: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <Surface>
      <Text style={ui.h2}>{title}</Text>
      <Text style={ui.body}>{message}</Text>
      {action && onAction && <Button label={action} onPress={onAction} />}
    </Surface>
  );
}
export function CardVisual({ card }: { card: Card }) {
  return (
    <View style={s.cardFace}>
      <View style={s.orbit} />
      <View style={ui.row}>
        <View style={ui.flex}>
          <Text style={ui.eyebrow}>RELAY / MOCK CARD</Text>
          <Text style={s.issuer}>{card.issuer}</Text>
          <Text style={ui.body}>{card.name}</Text>
        </View>
        <Text style={s.network}>{card.network.toUpperCase()}</Text>
      </View>
      <View style={s.chip}>
        <View style={s.chipLine} />
      </View>
      <Text style={s.digits}>•••• •••• •••• {card.last_four}</Text>
      <Text style={ui.label}>SIMULATION ONLY</Text>
    </View>
  );
}
export function CardTile({
  card,
  onPress,
}: {
  card: Card;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${card.issuer} ${card.name}`}
      onPress={onPress}
      style={({ pressed }) => [ui.surface, { opacity: pressed ? 0.8 : 1 }]}
    >
      <View style={ui.row}>
        <View style={s.issuerMark}>
          <Text style={s.markText}>{card.issuer.slice(0, 1)}</Text>
        </View>
        <View style={ui.flex}>
          <Text style={ui.value}>
            {card.issuer} {card.name}
          </Text>
          <Text style={ui.label}>
            {card.network} · •••• {card.last_four}
          </Text>
        </View>
        <Text style={{ color: color.accent, fontSize: 24 }}>↗</Text>
      </View>
      <View style={ui.row}>
        <Stat label="Outstanding" value={money(card.outstanding)} />
        <Stat label="Available credit" value={money(card.available_limit)} />
      </View>
      <Meter value={card.utilization} />
      <View style={ui.row}>
        <Text style={ui.label}>
          {card.utilization}% utilized · Limit {money(card.credit_limit)}
        </Text>
        <Text style={ui.label}>Due {due(card.due_date)}</Text>
      </View>
    </Pressable>
  );
}
export function ActivityRow({
  title,
  detail,
  time,
}: {
  title: string;
  detail: string;
  time: string;
}) {
  return (
    <View style={s.activity}>
      <View style={s.activityDot}>
        <Text style={{ color: color.teal }}>↗</Text>
      </View>
      <View style={ui.flex}>
        <Text style={ui.value}>{title}</Text>
        <Text style={ui.body}>{detail}</Text>
        <Text style={ui.label}>{time} · Simulated</Text>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#26352C",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    color: color.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  button: {
    minHeight: 54,
    backgroundColor: color.accent,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  buttonText: { color: "#172014", fontSize: 15, fontWeight: "800" },
  secondary: {
    backgroundColor: color.raised,
    borderWidth: 1,
    borderColor: color.line,
  },
  track: {
    height: 5,
    backgroundColor: "#334351",
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: color.teal, borderRadius: 4 },
  cardFace: {
    boxShadow: "0 10px 28px rgba(0, 0, 0, 0.22)",
    backgroundColor: "#203D48",
    padding: 24,
    borderRadius: 24,
    borderColor: "#4E6972",
    borderWidth: 1,
    overflow: "hidden",
    gap: 16,
  },
  orbit: {
    position: "absolute",
    width: 270,
    height: 270,
    borderRadius: 180,
    borderWidth: 45,
    borderColor: "#2C4A54",
    right: -90,
    top: 40,
  },
  issuer: { color: color.ink, fontSize: 26, fontWeight: "800", marginTop: 10 },
  network: {
    color: color.ink,
    fontSize: 15,
    fontWeight: "800",
    fontStyle: "italic",
  },
  digits: { color: color.ink, fontSize: 17, letterSpacing: 2 },
  chip: {
    width: 34,
    height: 26,
    borderColor: "#B7BAA2",
    borderWidth: 1,
    backgroundColor: "#8F977D",
    borderRadius: 6,
    justifyContent: "center",
  },
  chipLine: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#56644F",
    height: 10,
  },
  issuerMark: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#2C4448",
    alignItems: "center",
    justifyContent: "center",
  },
  markText: { color: color.teal, fontSize: 20, fontWeight: "800" },
  activity: { flexDirection: "row", gap: 12, paddingVertical: 12 },
  activityDot: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#253C3C",
    alignItems: "center",
    justifyContent: "center",
  },
});

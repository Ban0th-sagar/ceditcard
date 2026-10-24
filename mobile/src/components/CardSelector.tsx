import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Card } from "../types";
import { color, money, ui } from "../theme";
export function CardSelector({
  cards,
  value,
  onChange,
  purpose,
  label,
  disabled = false,
}: {
  cards: Card[];
  value: string;
  onChange: (id: string) => void;
  purpose: "source" | "destination";
  label?: string;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const selected = cards.find((card) => card.id === value);
  return (
    <View style={{ gap: 8 }}>
      <Text style={ui.eyebrow}>
        {label ?? (purpose === "source" ? "FROM" : "TO")}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Choose ${purpose} card`}
        aria-expanded={expanded}
        disabled={disabled}
        onPress={() => setExpanded(!expanded)}
        style={[ui.surface, { gap: 5, padding: 16 }]}
      >
        <View style={ui.row}>
          <View style={ui.flex}>
            <Text style={ui.value}>
              {selected
                ? `${selected.issuer} ${selected.name}`
                : "Choose a demo card"}
            </Text>
            <Text style={ui.label}>
              {selected
                ? `•••• ${selected.last_four} · ${purpose === "source" ? "Available" : "Outstanding"} ${money(purpose === "source" ? selected.available_limit : selected.outstanding)}`
                : "Mock cards only"}
            </Text>
          </View>
          <Text style={{ color: color.accent, fontSize: 20 }}>
            {expanded ? "−" : "+"}
          </Text>
        </View>
      </Pressable>
      {expanded && (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={`${purpose} card options`}
          style={{ gap: 6 }}
        >
          {cards.map((card) => (
            <Pressable
              key={card.id}
              accessibilityRole="radio"
              accessibilityLabel={`${purpose}: ${card.issuer} ${card.name}`}
              aria-checked={card.id === value}
              disabled={disabled}
              onPress={() => {
                onChange(card.id);
                setExpanded(false);
              }}
              style={[
                ui.surface,
                {
                  padding: 14,
                  borderColor: card.id === value ? color.accent : color.line,
                },
              ]}
            >
              <Text style={ui.value}>
                {card.issuer} {card.name}
              </Text>
              <Text style={ui.label}>
                {card.network} · •••• {card.last_four}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

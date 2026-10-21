import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Card, OptimizeResult } from "../types";
import { Badge, Button, Heading, Stat, Surface } from "../components/UI";
import { color, money, ui } from "../theme";
function CardChoice({
  card,
  selected,
  onPress,
  purpose,
}: {
  card: Card;
  selected: boolean;
  onPress: () => void;
  purpose: "source" | "destination";
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${purpose}: ${card.issuer} ${card.name}`}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={({ pressed }) => [
        {
          padding: 14,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: selected ? color.accent : color.line,
          backgroundColor: selected ? "#24322B" : color.surface,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={ui.row}>
        <View style={ui.flex}>
          <Text style={ui.value}>
            {card.issuer} {card.name}
          </Text>
          <Text style={ui.label}>
            •••• {card.last_four} ·{" "}
            {purpose === "source"
              ? `Available ${money(card.available_limit)}`
              : `Outstanding ${money(card.outstanding)}`}
          </Text>
        </View>
        <Text
          style={{ color: selected ? color.accent : color.muted, fontSize: 22 }}
        >
          {selected ? "◉" : "○"}
        </Text>
      </View>
    </Pressable>
  );
}
type Props = {
  cards: Card[];
  sourceId: string;
  destinationId: string;
  amount: string;
  setSource: (id: string) => void;
  setDestination: (id: string) => void;
  setAmount: (amount: string) => void;
  busy: boolean;
  error: string;
  onRun: () => void;
};
export function OptimizeScreen({
  cards,
  sourceId,
  destinationId,
  amount,
  setSource,
  setDestination,
  setAmount,
  busy,
  error,
  onRun,
}: Props) {
  return (
    <View style={ui.stack}>
      <Heading
        title="Find a clearer route."
        subtitle="Compare your options, with eligibility before everything."
      />
      <Badge label="MOCK ELIGIBILITY · SIMULATION ONLY" />
      <Text style={ui.eyebrow}>01 / SOURCE CARD</Text>
      <Text style={ui.h2}>Where from?</Text>
      {cards.map((card) => (
        <CardChoice
          key={card.id}
          card={card}
          selected={sourceId === card.id}
          onPress={() => setSource(card.id)}
          purpose="source"
        />
      ))}
      <Text style={ui.eyebrow}>02 / DESTINATION CARD</Text>
      <Text style={ui.h2}>Which balance?</Text>
      {cards.map((card) => (
        <CardChoice
          key={card.id}
          card={card}
          selected={destinationId === card.id}
          onPress={() => setDestination(card.id)}
          purpose="destination"
        />
      ))}
      <Text style={ui.eyebrow}>03 / AMOUNT TO EXPLORE</Text>
      <Surface>
        <Text style={ui.value}>Amount</Text>
        <View style={ui.row}>
          <Text style={{ color: color.accent, fontSize: 30 }}>₹</Text>
          <TextInput
            accessibilityLabel="Amount"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            placeholder="10000"
            placeholderTextColor={color.muted}
            style={{
              color: color.ink,
              fontSize: 34,
              fontWeight: "700",
              flex: 1,
              minWidth: 0,
              paddingVertical: 12,
            }}
          />
        </View>
        <Text style={ui.label}>Estimates only. No money will move.</Text>
      </Surface>
      {error ? (
        <Text
          accessibilityRole="alert"
          style={{ color: color.danger, lineHeight: 22 }}
        >
          {error}
        </Text>
      ) : null}
      <Button
        label={busy ? "Checking routes…" : "Check eligibility & optimize"}
        onPress={onRun}
        disabled={busy}
      />
      <Text style={ui.body}>
        Six simulated checks. Four possible routes. One recommendation based on
        eligible mock quotes.
      </Text>
    </View>
  );
}
export function ResultScreen({
  result,
  onChange,
  onHome,
}: {
  result: OptimizeResult;
  onChange: () => void;
  onHome: () => void;
}) {
  const [why, setWhy] = useState(false);
  return (
    <View style={ui.stack}>
      <Button label="‹ Change route" onPress={onChange} secondary />
      <Heading
        title="Route analysis"
        subtitle={`${result.source.issuer} → ${result.destination.issuer} · ${money(result.amount)}`}
      />
      <Badge label="SIMULATION COMPLETE · NO MONEY MOVED" />
      <Surface>
        <Text style={ui.eyebrow}>RELAY RECOMMENDATION</Text>
        <Text style={ui.h2}>{result.recommendation.label}</Text>
        <Text style={{ color: color.accent, fontSize: 24, fontWeight: "800" }}>
          Estimated total: {money(result.recommendation.total_cost)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: why }}
          aria-expanded={why}
          onPress={() => setWhy(!why)}
          style={{ paddingVertical: 12, minHeight: 44 }}
        >
          <Text style={{ color: color.teal, fontWeight: "700" }}>
            Why this recommendation?
          </Text>
        </Pressable>
        {why && (
          <View testID="recommendation-explanation" style={{ gap: 8 }}>
            <Text style={ui.body}>
              This is the lowest-total-cost eligible route returned by the
              simulated engine for your selected cards and amount. Ineligible
              routes are excluded from the recommendation.
            </Text>
            <Text style={ui.body}>{result.recommendation.explanation}</Text>
            <Text style={ui.label}>
              Total includes the amount, processing fee, and estimated interest
              shown below. This is not a live offer or financial advice.
            </Text>
          </View>
        )}
      </Surface>
      <Text style={ui.h2}>Eligibility</Text>
      {result.checks.map((check, index) => (
        <Surface key={check.key}>
          <View style={ui.row}>
            <Text style={{ color: color.muted, fontSize: 12 }}>
              {String(index + 1).padStart(2, "0")}
            </Text>
            <View style={ui.flex}>
              <Text style={ui.value}>{check.label}</Text>
              <Text style={ui.body}>{check.message}</Text>
            </View>
            <Text
              style={{
                color: check.passed ? color.teal : color.danger,
                fontSize: 11,
                fontWeight: "800",
              }}
            >
              {check.passed ? "PASS" : "FAIL"}
            </Text>
          </View>
        </Surface>
      ))}
      <Text style={ui.h2}>Compare routes</Text>
      {result.quotes.map((quote) => (
        <Surface key={quote.route}>
          <Text style={ui.h2}>{quote.label}</Text>
          {quote.route === result.recommendation.route && (
            <Badge label="RECOMMENDED" />
          )}
          <Text style={ui.body}>{quote.explanation}</Text>
          <View style={ui.wrap}>
            <Stat label="Fee" value={money(quote.processing_fee)} />
            <Stat
              label="Est. interest"
              value={money(quote.estimated_interest)}
            />
            <Stat label="Total" value={money(quote.total_cost)} />
          </View>
          {!quote.eligible && (
            <Text style={{ color: color.danger }}>
              Not eligible in this simulation
            </Text>
          )}
        </Surface>
      ))}
      <Button label="Back to portfolio" onPress={onHome} secondary />
      <Text style={ui.body}>{result.disclaimer}</Text>
    </View>
  );
}

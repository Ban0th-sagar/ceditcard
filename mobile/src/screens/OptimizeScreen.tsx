import { CostBreakdown } from "../components/RouteCosts";
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Card, RoutingQuoteResult, RouteOption } from "../types";
import { Badge, Button, Heading, Surface } from "../components/UI";
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
function BlockingReasons({ route }: { route: RouteOption }) {
  return (
    <View style={{ gap: 8 }}>
      {route.blocking_reasons.map((reason) => (
        <Text key={reason.code} style={{ color: color.danger, lineHeight: 21 }}>
          {reason.code}: {reason.message}
        </Text>
      ))}
    </View>
  );
}
function RouteDetails({
  route,
  onBack,
}: {
  route: RouteOption;
  onBack: () => void;
}) {
  return (
    <View style={ui.stack}>
      <Button label="‹ Back to comparison" onPress={onBack} secondary />
      <Heading title="Route Details" subtitle={route.display_name} />
      <Badge
        label={
          route.eligible ? "SIMULATED · ELIGIBLE" : "SIMULATED · NOT ELIGIBLE"
        }
      />
      <Surface>
        <Text style={ui.eyebrow}>{route.route_type}</Text>
        <Text style={ui.body}>{route.explanation}</Text>
        <Text style={ui.body}>{route.processing_time_label}</Text>
        <CostBreakdown route={route} />
      </Surface>
      <Text style={ui.h2}>Simulated eligibility checks</Text>
      {route.checks.map((check) => (
        <Surface key={check.key}>
          <Text style={ui.value}>{check.label}</Text>
          <Text style={{ color: check.passed ? color.teal : color.danger }}>
            {check.passed ? "Passed" : "Blocked"} · {check.code}
          </Text>
          <Text style={ui.body}>{check.message}</Text>
        </Surface>
      ))}
      <Text style={ui.h2}>Blocking reasons</Text>
      {route.blocking_reasons.length ? (
        <BlockingReasons route={route} />
      ) : (
        <Text style={ui.body}>No blocking reasons in this simulation.</Text>
      )}
      <Surface>
        <Text style={ui.h2}>Trade-offs & assumptions</Text>
        {route.pros.map((text) => (
          <Text key={text} style={{ color: color.teal }}>
            + {text}
          </Text>
        ))}
        {route.cons.map((text) => (
          <Text key={text} style={ui.body}>
            − {text}
          </Text>
        ))}
        {route.assumptions.map((text) => (
          <Text key={text} style={ui.body}>
            {text}
          </Text>
        ))}
        {route.warnings.map((text) => (
          <Text key={text} style={ui.body}>
            {text}
          </Text>
        ))}
      </Surface>
      <Text style={ui.body}>{route.disclaimer}</Text>
    </View>
  );
}
export function ResultScreen({
  result,
  onChange,
  onHome,
  onTop,
  onSelect,
}: {
  result: RoutingQuoteResult;
  onChange: () => void;
  onHome: () => void;
  onTop: () => void;
  onSelect: (route: RouteOption) => void;
}) {
  const [why, setWhy] = useState(false);
  const [selected, setSelected] = useState<RouteOption | null>(null);
  if (selected)
    return (
      <RouteDetails
        route={selected}
        onBack={() => {
          setSelected(null);
          onTop();
        }}
      />
    );
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
        <Text style={ui.h2}>
          {result.recommendation?.display_name ?? "No eligible route"}
        </Text>
        {result.recommendation ? (
          <Text
            style={{ color: color.accent, fontSize: 24, fontWeight: "800" }}
          >
            Estimated total: {money(result.recommendation.estimated_total_cost)}
          </Text>
        ) : (
          <Text style={ui.body}>
            Adjust the selected cards or amount. No route is recommended.
          </Text>
        )}
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
          <View testID="recommendation-explanation">
            <Text style={ui.body}>{result.recommendation_explanation}</Text>
          </View>
        )}
      </Surface>
      <Text style={ui.h2}>Eligibility</Text>
      {result.checks.map((check, index) => (
        <Surface key={check.key}>
          <View style={ui.row}>
            <Text style={ui.label}>{String(index + 1).padStart(2, "0")}</Text>
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
      {result.routes.map((route) => (
        <View
          key={route.id}
          testID={`route-${route.id}`}
          style={[
            ui.surface,
            route.id === result.recommended_route_id && {
              borderColor: color.accent,
            },
          ]}
        >
          <Text style={ui.h2}>{route.display_name}</Text>
          <View style={ui.wrap}>
            <Badge label={route.eligible ? "Eligible" : "Not eligible"} />
            {route.id === result.recommended_route_id && (
              <Badge label="RECOMMENDED" />
            )}
          </View>
          <Text style={ui.body}>{route.explanation}</Text>
          <CostBreakdown route={route} />
          <Text style={ui.label}>{route.processing_time_label}</Text>
          {route.pros.slice(0, 1).map((text) => (
            <Text key={text} style={{ color: color.teal }}>
              + {text}
            </Text>
          ))}
          {route.cons.slice(0, 1).map((text) => (
            <Text key={text} style={ui.body}>
              − {text}
            </Text>
          ))}
          {!route.eligible && (
            <>
              <Text style={{ color: color.danger }}>
                Not eligible in this simulation
              </Text>
              <BlockingReasons route={route} />
            </>
          )}
          {route.eligible && (
            <Button
              label={`Select ${route.display_name}`}
              onPress={() => onSelect(route)}
            />
          )}
          <Button
            label={`View ${route.display_name} details`}
            onPress={() => {
              setSelected(route);
              onTop();
            }}
            secondary
          />
        </View>
      ))}
      <Button label="Back to portfolio" onPress={onHome} secondary />
      <Text style={ui.body}>{result.disclaimer}</Text>
    </View>
  );
}

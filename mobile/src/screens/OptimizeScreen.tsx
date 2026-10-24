import { CardSelector } from "../components/CardSelector";
import { ErrorNotice } from "../components/ErrorNotice";
import type { OfferType } from "../offerTypes";
import { CostBreakdown } from "../components/RouteCosts";
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Card, RoutingQuoteResult, RouteOption } from "../types";
import { Badge, Button, Heading, Surface, Stat } from "../components/UI";
import { color, money, ui } from "../theme";
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
  onMarketplace: () => void;
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
  onMarketplace,
}: Props) {
  return (
    <View style={ui.stack}>
      <Heading
        title="Optimize your credit."
        subtitle="Choose two demo cards. Let Relay compare the options."
      />
      <Badge label="Simulation Mode" />
      <CardSelector
        cards={cards}
        value={sourceId}
        onChange={setSource}
        purpose="source"
        disabled={busy}
      />
      <CardSelector
        cards={cards}
        value={destinationId}
        onChange={setDestination}
        purpose="destination"
        disabled={busy}
      />
      <Text style={ui.eyebrow}>AMOUNT</Text>
      <View style={[ui.surface, { padding: 16 }]}>
        <View style={ui.row}>
          <Text style={{ color: color.accent, fontSize: 30 }}>₹</Text>
          <TextInput
            accessibilityLabel="Amount"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            editable={!busy}
            placeholder="10000"
            placeholderTextColor={color.muted}
            style={{
              color: color.ink,
              fontSize: 34,
              fontWeight: "700",
              flex: 1,
              minWidth: 0,
              paddingVertical: 5,
            }}
          />
        </View>
      </View>
      {error ? <ErrorNotice message={error} /> : null}
      <Button
        label={busy ? "Finding routes…" : "Find Best Route"}
        onPress={onRun}
        disabled={busy}
      />
      <Text style={ui.body}>
        Relay checks eligibility, estimated cost and available simulated
        alternatives.
      </Text>
      <Button
        label="Open Marketplace"
        onPress={onMarketplace}
        secondary
        disabled={busy}
      />
      <Text style={ui.label}>
        Illustrative data · No money moved · No live issuer/network integration
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
  onSelect,
}: {
  route: RouteOption;
  onSelect: (route: RouteOption) => void;
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
      {route.route_type === "card_to_card" && (
        <Text style={ui.body}>
          This is a prototype simulation and does not confirm that an issuer,
          card network or payment provider supports this transaction in
          production.
        </Text>
      )}
      {route.eligible && (
        <Button
          label={`Select ${route.display_name}`}
          onPress={() => onSelect(route)}
        />
      )}
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
  onMarketplace,
}: {
  result: RoutingQuoteResult;
  onChange: () => void;
  onHome: () => void;
  onTop: () => void;
  onSelect: (route: RouteOption) => void;
  onMarketplace: (type: OfferType) => void;
}) {
  const [why, setWhy] = useState(false);
  const [selected, setSelected] = useState<RouteOption | null>(null);
  if (selected)
    return (
      <RouteDetails
        route={selected}
        onSelect={onSelect}
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
      {!result.routes.find((route) => route.id === "card_to_card")
        ?.eligible && (
        <View style={[ui.surface, { borderColor: "#613E41" }]}>
          <Text style={ui.value}>
            Card-to-Card is unavailable for this simulated card pair.
          </Text>
          <Text style={ui.body}>
            {
              result.routes.filter(
                (route) => route.eligible && route.id !== "card_to_card",
              ).length
            }{" "}
            alternative routes available.
          </Text>
        </View>
      )}
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
          <View style={ui.wrap}>
            <Stat
              label="Total estimated cost"
              value={money(route.estimated_total_cost)}
            />
            <Stat label="Fee" value={money(route.estimated_fee)} />
            <Stat
              label="Est. interest"
              value={money(route.estimated_interest)}
            />
          </View>
          {(route.id === "balance_transfer" || route.id === "refinancing") && (
            <>
              {result.marketplace_offers
                .filter((ref) => ref.offer_type === route.id)
                .map((ref) => (
                  <Text key={ref.offer_id} style={ui.body}>
                    Best fictional marketplace quote: {ref.headline} · Total{" "}
                    {money(ref.estimated_total_cost)} · {ref.tenure_months}{" "}
                    months. Separate from the prototype estimate above.
                  </Text>
                ))}
              <Button
                label={`Browse ${route.display_name} offers`}
                onPress={() => onMarketplace(route.id as OfferType)}
                secondary
              />
            </>
          )}

          <Text style={ui.label}>{route.processing_time_label}</Text>
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
      <Text style={ui.h2}>Eligibility</Text>
      <Text style={ui.label}>
        Six simulated Card-to-Card summary checks. Open Route Details for all
        rules.
      </Text>
      {result.checks.map((check) => (
        <View
          key={check.key}
          style={[
            ui.row,
            {
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderColor: color.line,
            },
          ]}
        >
          <Text style={[ui.body, ui.flex]}>{check.label}</Text>
          <Text
            style={{
              color: check.passed ? color.teal : color.danger,
              fontWeight: "800",
              fontSize: 11,
            }}
          >
            {check.passed ? "PASS" : "FAIL"}
          </Text>
        </View>
      ))}
      <Button label="Back to portfolio" onPress={onHome} secondary />
      <Text style={ui.body}>{result.disclaimer}</Text>
    </View>
  );
}

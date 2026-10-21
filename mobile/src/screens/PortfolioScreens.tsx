import React from "react";
import { Text, View } from "react-native";
import { Card, Portfolio } from "../types";
import {
  ActivityRow,
  Badge,
  Button,
  CardTile,
  CardVisual,
  Heading,
  Meter,
  Stat,
  Surface,
} from "../components/UI";
import { color, due, money, ui } from "../theme";

export type ActivityEntry = {
  id: number;
  title: string;
  detail: string;
  time: string;
};
type PortfolioProps = {
  onMarketplace: () => void;
  cards: Card[];
  portfolio: Portfolio;
  onOptimize: () => void;
  onCard: (card: Card) => void;
};
export function HomeScreen({
  cards,
  portfolio,
  onOptimize,
  onCard,
  onMarketplace,
}: PortfolioProps) {
  return (
    <View style={ui.stack}>
      <View style={ui.row}>
        <View>
          <Text style={ui.label}>YOUR MONEY, IN PERSPECTIVE</Text>
          <Heading title="Hello, Alex." />
        </View>
        <View
          style={{
            width: 46,
            height: 46,
            backgroundColor: color.raised,
            borderRadius: 23,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={ui.value}>A</Text>
        </View>
      </View>
      <Surface>
        <View style={ui.row}>
          <Text style={ui.eyebrow}>YOUR CREDIT PORTFOLIO</Text>
          <Badge label="MOCK DATA" />
        </View>
        <Text style={ui.body}>Total outstanding</Text>
        <Text
          style={{
            color: color.ink,
            fontSize: 48,
            fontWeight: "800",
            letterSpacing: -2,
          }}
        >
          {money(portfolio.total_outstanding)}
        </Text>
        <View style={ui.divider} />
        <View style={ui.row}>
          <Stat
            label="Available credit"
            value={money(portfolio.available_credit)}
          />
          <Stat
            label="Portfolio utilization"
            value={`${portfolio.utilization}%`}
          />
        </View>
        <Meter value={portfolio.utilization} />
      </Surface>
      <Button label="Optimize My Credit" onPress={onOptimize} />
      <Button
        label="Explore fictional Marketplace"
        onPress={onMarketplace}
        secondary
      />
      <Text style={ui.label}>
        Explore your options. Every route is a simulation.
      </Text>
      <Surface>
        <Text style={ui.eyebrow}>NEXT DUE · MOCK CARD</Text>
        <Text style={ui.h2}>
          {portfolio.next_due.issuer} {portfolio.next_due.name}
        </Text>
        <View style={ui.row}>
          <Stat
            label="Nearest due date"
            value={due(portfolio.next_due.due_date)}
          />
          <Stat
            label="Minimum due"
            value={money(portfolio.next_due.minimum_due)}
          />
        </View>
      </Surface>
      <Text accessibilityRole="header" style={ui.h2}>
        Your cards{" "}
        <Text style={ui.label}>
          / {cards.length.toString().padStart(2, "0")}
        </Text>
      </Text>
      {cards.map((card) => (
        <CardTile key={card.id} card={card} onPress={() => onCard(card)} />
      ))}
      <Surface>
        <Text style={ui.eyebrow}>UPCOMING BILLS / DEMO SCHEDULE</Text>
        {[...cards]
          .sort((a, b) => a.due_date.localeCompare(b.due_date))
          .map((card) => (
            <View key={card.id} style={ui.row}>
              <View style={ui.flex}>
                <Text style={ui.value}>
                  {card.issuer} {card.name}
                </Text>
                <Text style={ui.label}>
                  {due(card.due_date)} · Minimum {money(card.minimum_due)}
                </Text>
              </View>
              <Text style={ui.value}>{money(card.outstanding)}</Text>
            </View>
          ))}
      </Surface>
      <Surface>
        <Text style={ui.eyebrow}>A LITTLE CLARITY</Text>
        <Text style={ui.h2}>One portfolio. More perspective.</Text>
        <Text style={ui.body}>
          Your {cards.length} mock cards use {portfolio.utilization}% of the
          portfolio limit. Compare simulated routes before choosing how to
          approach a balance.
        </Text>
        <Text style={{ color: color.teal, fontSize: 12 }}>
          Illustrative insight · Not financial advice
        </Text>
      </Surface>
    </View>
  );
}
export function CardsScreen({
  cards,
  onCard,
}: {
  cards: Card[];
  onCard: (card: Card) => void;
}) {
  return (
    <View style={ui.stack}>
      <Heading
        title="Your credit, together."
        subtitle="One clear view of every mock card. Tap a card to take a closer look."
      />
      <Badge label={`${cards.length} SIMULATED CARDS`} />
      {cards.map((card) => (
        <CardTile key={card.id} card={card} onPress={() => onCard(card)} />
      ))}
    </View>
  );
}
export function CardDetailsScreen({
  card,
  onBack,
  onOptimize,
}: {
  card: Card;
  onBack: () => void;
  onOptimize: () => void;
}) {
  return (
    <View style={ui.stack}>
      <Button label="‹ Back to cards" onPress={onBack} secondary />
      <Heading
        title="Card details"
        subtitle="A closer look at your simulated credit."
      />
      <CardVisual card={card} />
      <Surface>
        <View style={ui.row}>
          <Stat label="Outstanding balance" value={money(card.outstanding)} />
          <Stat label="Available credit" value={money(card.available_limit)} />
        </View>
        <View style={ui.divider} />
        <View style={ui.row}>
          <Stat label="Total limit" value={money(card.credit_limit)} />
          <Stat label="Utilization" value={`${card.utilization}%`} />
        </View>
        <Meter value={card.utilization} />
        <View style={ui.row}>
          <Stat label="Due date" value={card.due_date} />
          <Stat label="Minimum due" value={money(card.minimum_due)} />
        </View>
      </Surface>
      <Button label="Optimize My Credit" onPress={onOptimize} />
      <Surface>
        <Text style={ui.h2}>Recent activity</Text>
        <Badge label="ILLUSTRATIVE / SIMULATED" />
        <ActivityRow
          title="Mock statement generated"
          detail={`${card.issuer} ${card.name} · Demo balance snapshot. No real purchase.`}
          time={`Demo date ${due(card.due_date)}`}
        />
        <ActivityRow
          title="Simulated portfolio refresh"
          detail="Card overview reviewed. No bank connection or payment."
          time="Illustrative history"
        />
      </Surface>
    </View>
  );
}
export function ActivityScreen({
  entries,
  children,
}: {
  entries: ActivityEntry[];
  children?: React.ReactNode;
}) {
  return (
    <View style={ui.stack}>
      <Heading
        title="Your credit journey."
        subtitle="A record of exploration, never money movement."
      />
      <Badge label="SIMULATED ACTIVITY ONLY" />
      {children}
      <Surface>
        <Text style={ui.h2}>This session</Text>
        {entries.length ? (
          entries.map((entry) => <ActivityRow key={entry.id} {...entry} />)
        ) : (
          <Text style={ui.body}>
            No checks yet. Visit Optimize to compare your first simulated route.
            Session history resets when you reload.
          </Text>
        )}
      </Surface>
      <Surface>
        <Text style={ui.eyebrow}>ILLUSTRATIVE HISTORY</Text>
        <ActivityRow
          title="Route evaluated"
          detail="Mock alternatives compared. No transaction submitted."
          time="Demo entry"
        />
        <ActivityRow
          title="Simulated route completed"
          detail="A sample result state only. No funds transferred."
          time="Demo entry"
        />
      </Surface>
    </View>
  );
}
export function ProfileScreen() {
  return (
    <View style={ui.stack}>
      <Heading
        title="Made for perspective."
        subtitle="Your Relay prototype profile."
      />
      <Surface>
        <View style={ui.row}>
          <View>
            <Text style={ui.h2}>Alex / Demo user</Text>
            <Text style={ui.body}>Relay prototype identity</Text>
          </View>
          <Badge label="DEMO" />
        </View>
        <View style={ui.divider} />
        <Text style={ui.eyebrow}>Simulation Mode</Text>
        <Text style={ui.body}>
          No live bank, card, or network integrations are connected. All
          balances, routes, activity, and estimates are simulated.
        </Text>
      </Surface>
      <Surface>
        <Text style={ui.h2}>Explore with confidence.</Text>
        <Text style={ui.body}>
          Relay does not collect full card numbers, CVV, PIN, OTP, banking
          passwords, or payment credentials. There is no payment initiation or
          real money movement.
        </Text>
        <Text style={ui.label}>
          Illustrative product research. Not financial advice or an
          issuer-approved offer.
        </Text>
      </Surface>
      <Surface>
        <Stat label="Product" value="Relay · Credit routing prototype" />
        <Stat label="Version" value="0.1.0 · Phase 2 UI" />
        <Text style={ui.body}>
          Built to make credit understandable, with Optimize at the center.
        </Text>
      </Surface>
    </View>
  );
}

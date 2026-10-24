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
  onDemo: () => void;
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
  onDemo,
}: PortfolioProps) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Good morning, Alex"
      : hour < 18
        ? "Good afternoon, Alex"
        : "Good evening, Alex";
  return (
    <View style={ui.stack}>
      <View style={ui.row}>
        <View style={ui.flex}>
          <Text style={ui.label}>YOUR NEXT MOVE, MADE CLEARER</Text>
          <Text
            accessibilityRole="header"
            style={[ui.h2, { fontSize: 26, marginTop: 4 }]}
          >
            {greeting}
          </Text>
        </View>
        <Badge label="DEMO USER" />
      </View>
      <Surface>
        <Text style={ui.eyebrow}>YOUR CREDIT</Text>
        <Text style={ui.body}>Total outstanding</Text>
        <Text
          style={{
            color: color.ink,
            fontSize: 44,
            fontWeight: "800",
            letterSpacing: -1.5,
          }}
        >
          {money(portfolio.total_outstanding)}
        </Text>
        <View style={ui.row}>
          <Stat
            label="Available credit"
            value={money(portfolio.available_credit)}
          />
          <Stat
            label="Overall utilization"
            value={`${portfolio.utilization}%`}
          />
        </View>
        <Meter value={portfolio.utilization} />
        <View style={ui.divider} />
        <Text style={ui.label}>NEXT DUE · MOCK CARD</Text>
        <View style={ui.row}>
          <View style={ui.flex}>
            <Text style={ui.value}>
              {portfolio.next_due.issuer} {portfolio.next_due.name}
            </Text>
            <Text style={ui.label}>
              Next payment due · {due(portfolio.next_due.due_date)}
            </Text>
          </View>
          <Text style={ui.value}>{money(portfolio.next_due.minimum_due)}</Text>
        </View>
      </Surface>
      <Button label="Optimize My Credit" onPress={onOptimize} />
      <View style={[ui.surface, { padding: 16, borderColor: "#36514A" }]}>
        <Text style={ui.eyebrow}>SMART INSIGHT</Text>
        <Text style={ui.body}>
          You may have a lower-cost simulated route available for your next
          obligation.
        </Text>
      </View>
      <View style={ui.row}>
        <Text style={ui.h2}>Your demo cards</Text>
        <Text style={ui.label}>{cards.length} illustrative records</Text>
      </View>
      {cards.map((card) => (
        <CardTile
          key={card.id}
          card={card}
          onPress={() => onCard(card)}
          compact
        />
      ))}
      <Button
        label="Explore fictional Marketplace"
        onPress={onMarketplace}
        secondary
      />
      <Button label="CheQ Demo" onPress={onDemo} secondary />
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
        <Text style={ui.eyebrow}>Example activity</Text>
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
export function ProfileScreen({
  onLogout,
  onDemo,
}: {
  onLogout: () => void;
  onDemo: () => void;
}) {
  return (
    <View style={ui.stack}>
      <Heading title="Alex" subtitle="Demo User · Relay Prototype" />
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
        <Stat label="Version" value="0.6 Demo" />
        <Text style={ui.h2}>About Relay</Text>
        <Text style={ui.body}>
          Relay is an experimental decision and routing layer for comparing
          simulated credit repayment options.
        </Text>
      </Surface>
      <Button label="CheQ Demo" onPress={onDemo} />
      <Button label="Logout" onPress={onLogout} secondary />
    </View>
  );
}

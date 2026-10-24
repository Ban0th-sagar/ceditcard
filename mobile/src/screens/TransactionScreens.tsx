import { ErrorNotice } from "../components/ErrorNotice";
import { AppState } from "react-native";
import { OfferEconomics } from "../components/OfferEconomics";
import type { OfferQuote } from "../offerTypes";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { api } from "../api";
import { RouteOption, RoutingQuoteResult } from "../types";
import {
  DemoOutcome,
  SimulatedTransaction,
  TransactionStatus,
} from "../transactionTypes";
import { Badge, Button, Heading, State, Surface, Stat } from "../components/UI";
import { CostBreakdown } from "../components/RouteCosts";
import { color, money, ui } from "../theme";

const labels: Record<TransactionStatus, string> = {
  CREATED: "Created",
  ELIGIBILITY_CHECK: "Eligibility check",
  ELIGIBLE: "Eligible",
  AUTHORIZED: "Authorized (simulated)",
  PROCESSING: "Processing (simulated)",
  SIMULATED_SETTLED: "Simulated settled",
  INELIGIBLE: "Ineligible",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};
const time = (value: string) => new Date(value).toLocaleString("en-IN");
export function SimulationNotice() {
  return (
    <Surface>
      <View style={ui.row}>
        <Badge label="Simulation Mode" />
        <Text style={ui.value}>No money moved</Text>
      </View>
      <Text style={ui.body}>
        No bank/network/issuer integration. All events are local simulations.
      </Text>
    </Surface>
  );
}
export function ConfirmationScreen({
  result,
  route,
  busy,
  error,
  onBack,
  onConfirm,
  offer,
}: {
  result: RoutingQuoteResult;
  route: RouteOption;
  busy: boolean;
  error: string;
  onBack: () => void;
  onConfirm: (outcome: DemoOutcome) => void;
  offer?: OfferQuote | null;
}) {
  const [outcome, setOutcome] = useState<DemoOutcome>("success");
  return (
    <View style={ui.stack}>
      <Heading
        title="Confirm simulation"
        subtitle="Review the mock route before creating a local simulation."
      />
      <Surface>
        <Text style={ui.label}>FROM</Text>
        <Text style={ui.value}>
          {result.source.issuer} {result.source.name} · ••••{" "}
          {result.source.last_four}
        </Text>
        <Text style={ui.label}>TO</Text>
        <Text style={ui.value}>
          {result.destination.issuer} {result.destination.name} · ••••{" "}
          {result.destination.last_four}
        </Text>
        <Text style={ui.h2}>{route.display_name}</Text>
        <CostBreakdown route={route} />
        <Text style={ui.body}>
          No money will move. The backend will re-check route eligibility, offer
          eligibility, pricing and route selection.
        </Text>
      </Surface>
      {offer && (
        <Surface>
          <Text style={ui.eyebrow}>SELECTED FICTIONAL OFFER</Text>
          <Text style={ui.h2}>
            {offer.offer.provider_name} · {offer.offer.headline}
          </Text>
          <View style={ui.wrap}>
            <Stat label="Tenure" value={`${offer.tenure_months} months`} />
            <Stat
              label="Monthly estimate"
              value={money(offer.monthly_payment_estimate)}
            />
          </View>
          <Text style={ui.body}>{offer.disclaimer}</Text>
        </Surface>
      )}
      <SimulationNotice />
      {error ? <ErrorNotice message={error} /> : null}
      <Button
        label={busy ? "Creating simulation…" : "Simulate Route"}
        onPress={() => onConfirm(outcome)}
        disabled={busy}
      />
      <Button
        label="‹ Back to route results"
        onPress={onBack}
        disabled={busy}
        secondary
      />
      <Surface>
        <Text style={ui.h2}>Controlled demo outcome</Text>
        {(["success", "fail_processing"] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={
              value === "success" ? "Success demo" : "Fail at processing demo"
            }
            accessibilityState={{ checked: outcome === value }}
            aria-checked={outcome === value}
            disabled={busy}
            onPress={() => setOutcome(value)}
            style={{
              minHeight: 48,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: outcome === value ? color.accent : color.line,
            }}
          >
            <Text style={ui.value}>
              {value === "success" ? "Success demo" : "Fail at processing demo"}
            </Text>
          </Pressable>
        ))}
        <Text style={ui.body}>
          Failure is deterministic and local. No bank or network is contacted.
        </Text>
      </Surface>
    </View>
  );
}
export function TransactionTimeline({
  initial,
  onActivity,
}: {
  initial: SimulatedTransaction;
  onActivity: () => void;
}) {
  const [transaction, setTransaction] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const [auto, setAuto] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") setAuto(false);
    });
    const pause = () => {
      if (typeof document !== "undefined" && document.hidden) setAuto(false);
    };
    if (typeof document !== "undefined")
      document.addEventListener("visibilitychange", pause);
    return () => {
      sub.remove();
      if (typeof document !== "undefined")
        document.removeEventListener("visibilitychange", pause);
    };
  }, []);
  useEffect(() => {
    if (!auto || busy) return;
    if (!transaction.allowed_actions.includes("advance")) {
      setAuto(false);
      return;
    }
    const timer = setTimeout(() => {
      void mutate("advance");
    }, 650);
    return () => clearTimeout(timer);
  }, [auto, busy, transaction]);
  async function mutate(action: "advance" | "cancel" | "refresh") {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    if (action !== "advance") setAuto(false);
    try {
      const next = await (action === "refresh"
        ? api.transaction(transaction.id)
        : action === "advance"
          ? api.advanceTransaction(transaction.id, transaction.status)
          : api.cancelTransaction(transaction.id, transaction.status));
      if (mounted.current) setTransaction(next);
    } catch (caught) {
      setAuto(false);
      if (mounted.current)
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not update simulation. Refresh and try again.",
        );
    } finally {
      if (mounted.current) setBusy(false);
      locked.current = false;
    }
  }
  return (
    <View style={ui.stack}>
      <Heading
        title="Transaction timeline"
        subtitle={transaction.quote_snapshot.display_name}
      />
      <SimulationNotice />
      {transaction.status === "SIMULATED_SETTLED" && (
        <View style={[ui.surface, { borderColor: color.accent }]}>
          <Text style={ui.eyebrow}>SIMULATED SETTLED</Text>
          <Text style={ui.h2}>Simulation completed</Text>
          <Text style={ui.body}>No money moved.</Text>
        </View>
      )}
      <Surface>
        <Text style={ui.eyebrow}>CURRENT SIMULATED STATE</Text>
        <Text testID="transaction-status" style={ui.h2}>
          {transaction.status}
        </Text>
        <Text style={ui.body}>{labels[transaction.status]}</Text>
        <Text style={ui.label}>Transaction {transaction.id}</Text>
        <Text style={ui.body}>
          {transaction.source.issuer} → {transaction.destination.issuer} ·{" "}
          {money(transaction.amount)}
        </Text>

        <Text style={ui.label}>Created {time(transaction.created_at)}</Text>
        <Text style={ui.label}>Updated {time(transaction.updated_at)}</Text>
      </Surface>
      <Surface>
        <Text style={ui.eyebrow}>LOCAL SIMULATION CONTROLS</Text>
        <Text style={ui.body}>
          Every step is confirmed by the backend. No payment rail is connected.
        </Text>
        {transaction.allowed_actions.includes("advance") && (
          <>
            <Button
              label={auto ? "Auto Demo running…" : "Auto Demo"}
              onPress={() => setAuto(true)}
              disabled={auto || busy}
            />
            <Button
              label="Manual mode"
              onPress={() => setAuto(false)}
              secondary
            />
          </>
        )}
        {transaction.next_status && (
          <Text style={ui.body}>
            Next local step: {labels[transaction.next_status]}
          </Text>
        )}
        {transaction.allowed_actions.includes("advance") && (
          <Button
            label="Advance simulation"
            onPress={() => void mutate("advance")}
            disabled={busy || auto}
          />
        )}
        {transaction.allowed_actions.includes("cancel") && (
          <Button
            label="Cancel simulation"
            onPress={() => void mutate("cancel")}
            disabled={busy}
            secondary
          />
        )}
      </Surface>
      <Surface>
        <Text style={ui.h2}>Quoted costs</Text>
        <CostBreakdown route={transaction.quote_snapshot} />
      </Surface>
      {transaction.offer_quote_snapshot && (
        <Surface>
          <Text style={ui.eyebrow}>STORED FICTIONAL OFFER</Text>
          <Text style={ui.h2}>
            {transaction.offer_quote_snapshot.offer.headline}
          </Text>
          <OfferEconomics quote={transaction.offer_quote_snapshot} />
          <Text style={ui.body}>
            {transaction.offer_quote_snapshot.disclaimer}
          </Text>
        </Surface>
      )}
      {transaction.failure_code && (
        <Surface>
          <Text style={{ color: color.danger }}>
            {transaction.failure_code}
          </Text>
          <Text style={ui.body}>{transaction.failure_reason}</Text>
          <Text style={ui.body}>
            No money moved. Return to Optimize for a fresh quote and choose
            Success demo to retry.
          </Text>
        </Surface>
      )}
      <Text style={ui.h2}>Local simulation events</Text>
      {transaction.history.map((event) => (
        <Surface key={event.sequence}>
          <Text style={ui.value}>
            {event.sequence}. {labels[event.status]}
          </Text>
          <Text style={ui.label}>{time(event.timestamp)}</Text>
          <Text style={ui.body}>{event.message}</Text>
          {event.code && (
            <Text style={{ color: color.danger }}>{event.code}</Text>
          )}
        </Surface>
      ))}
      {error && <ErrorNotice message={error} />}
      <Button
        label="Refresh timeline"
        onPress={() => void mutate("refresh")}
        disabled={busy}
        secondary
      />
      <Button label="View in Activity" onPress={onActivity} disabled={busy} />
      <Text style={ui.body}>{transaction.disclaimer}</Text>
    </View>
  );
}
export function TransactionActivity({
  onOpen,
}: {
  onOpen: (transaction: SimulatedTransaction) => void;
}) {
  const [transactions, setTransactions] = useState<SimulatedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [opening, setOpening] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api
      .transactions()
      .then((data) => {
        if (active) setTransactions(data);
      })
      .catch(() => {
        if (active)
          setError("Could not load simulated transactions. Try refreshing.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  async function open(id: string) {
    setOpening(true);
    setError("");
    try {
      onOpen(await api.transaction(id));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not open simulation.",
      );
    } finally {
      setOpening(false);
    }
  }
  return (
    <View style={ui.stack}>
      <Text style={ui.h2}>Your demo simulations</Text>
      <Text style={ui.body}>
        Server-memory history. No money moved. No bank/network/issuer
        integration. History resets when the API restarts.
      </Text>
      {loading ? (
        <ActivityIndicator
          accessibilityLabel="Loading simulations"
          color={color.accent}
        />
      ) : error ? (
        <State
          title="History unavailable"
          message={error}
          action="Refresh simulations"
          onAction={() => setRevision((value) => value + 1)}
        />
      ) : transactions.length ? (
        transactions.map((transaction) => (
          <Surface key={transaction.id} testID={`simulation-${transaction.id}`}>
            <Badge label={labels[transaction.status]} />
            <Text style={ui.value}>
              {transaction.source.issuer} → {transaction.destination.issuer}
            </Text>
            <Text style={ui.body}>
              {transaction.quote_snapshot.display_name} ·{" "}
              {money(transaction.amount)}
            </Text>
            <Text style={ui.label}>
              {transaction.history.length} local events ·{" "}
              {time(transaction.updated_at)}
            </Text>
            <Button
              label={`Open simulation ${transaction.id}`}
              onPress={() => void open(transaction.id)}
              disabled={opening}
              secondary
            />
          </Surface>
        ))
      ) : (
        <Surface>
          <Text style={ui.body}>
            No simulations yet. Choose an eligible route in Optimize to start.
          </Text>
        </Surface>
      )}
    </View>
  );
}

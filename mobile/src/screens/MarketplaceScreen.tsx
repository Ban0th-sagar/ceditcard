import { CardSelector } from "../components/CardSelector";
import { ErrorNotice } from "../components/ErrorNotice";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../api";
import { Card } from "../types";
import { OfferQuote, OfferQuoteResponse, OfferType } from "../offerTypes";
import { Badge, Button, Heading, State, Surface } from "../components/UI";
import { OfferEconomics } from "../components/OfferEconomics";
import { color, money, ui } from "../theme";

function OfferCard({
  quote,
  busy,
  onDetails,
  onSelect,
}: {
  quote: OfferQuote;
  busy: boolean;
  onDetails: () => void;
  onSelect: () => void;
}) {
  const [why, setWhy] = useState(false);
  return (
    <View testID={`offer-${quote.offer.id}`} style={ui.surface}>
      <Text style={ui.eyebrow}>{quote.offer.provider_name}</Text>
      <Text style={ui.h2}>{quote.offer.headline}</Text>
      <Badge
        label={
          !quote.offer.active
            ? "Inactive fictional offer"
            : quote.eligible
              ? `Eligible · Rank ${quote.rank}`
              : "Ineligible fictional offer"
        }
      />
      <Badge label="SIMULATED OFFER" />
      <Text style={ui.label}>
        {quote.offer.offer_type === "balance_transfer"
          ? "Balance Transfer"
          : "Refinancing"}
      </Text>
      <OfferEconomics quote={quote} compact />
      {quote.blocking_reasons.map((reason) => (
        <Text key={reason.code} style={{ color: color.danger }}>
          {reason.code}: {reason.message}
        </Text>
      ))}
      <Button
        label={`Why this offer? ${quote.offer.headline}`}
        onPress={() => setWhy(!why)}
        secondary
      />
      {why && (
        <Text testID={`why-${quote.offer.id}`} style={ui.body}>
          {quote.ranking_explanation}
        </Text>
      )}
      <Button
        label={`Details: ${quote.offer.headline}`}
        onPress={onDetails}
        secondary
      />
      {quote.eligible && (
        <Button
          label={`Select offer: ${quote.offer.headline}`}
          onPress={onSelect}
          disabled={busy}
        />
      )}
    </View>
  );
}
export function MarketplaceScreen({
  cards,
  sourceId,
  destinationId,
  amount,
  onSource,
  onDestination,
  onAmount,
  initialType,
  busy,
  selectionError,
  onBack,
  onSelect,
  onTop,
}: {
  cards: Card[];
  sourceId: string;
  destinationId: string;
  amount: string;
  onSource: (id: string) => void;
  onDestination: (id: string) => void;
  onAmount: (amount: string) => void;
  initialType: OfferType;
  busy: boolean;
  selectionError: string;
  onBack: () => void;
  onTop: () => void;
  onSelect: (quote: OfferQuote) => void;
}) {
  const [kind, setKind] = useState(initialType);
  const [tenure, setTenure] = useState<number | null>(null);
  const [response, setResponse] = useState<OfferQuoteResponse | null>(null);
  const [selected, setSelected] = useState<OfferQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [tenureOptions, setTenureOptions] = useState<number[]>([]);
  const [error, setError] = useState("");
  const guard = useRef(false);
  async function compare() {
    if (guard.current) return;
    guard.current = true;
    setLoading(true);
    setError("");
    setResponse(null);
    try {
      const data = await api.offerQuote({
        destination_card_id: destinationId,
        amount: Number(amount),
        tenure_months: tenure,
      });
      setResponse(data);
      setTenureOptions(
        [...new Set(data.quotes.flatMap((q) => q.offer.tenure_options))].sort(
          (a, b) => a - b,
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not compare fictional offers.",
      );
    } finally {
      guard.current = false;
      setLoading(false);
    }
  }
  useEffect(() => {
    void compare();
  }, []);
  if (selected)
    return (
      <View style={ui.stack}>
        <Button
          label="‹ Back to Marketplace"
          onPress={() => {
            setSelected(null);
            onTop();
          }}
          disabled={busy}
          secondary
        />
        <Heading
          title="Offer Details"
          subtitle={`${selected.offer.provider_name} · ${selected.offer.headline}`}
        />
        <Badge label="SIMULATED OFFER" />
        <Text style={ui.body}>
          Illustrative pricing only. Not an actual lending offer.
        </Text>
        <OfferEconomics quote={selected} />
        <Surface>
          <Text style={ui.h2}>Why this offer?</Text>
          <Text style={ui.body}>{selected.ranking_explanation}</Text>
        </Surface>
        <Text style={ui.h2}>Offer eligibility rules</Text>
        {selected.checks.map((check) => (
          <Surface key={check.code}>
            <Text style={ui.value}>{check.label}</Text>
            <Text style={{ color: check.passed ? color.teal : color.danger }}>
              {check.passed ? "Passed" : "Blocked"} · {check.code}
            </Text>
            <Text style={ui.body}>{check.message}</Text>
          </Surface>
        ))}
        <Surface>
          <Text style={ui.h2}>Assumptions & warnings</Text>
          {[...selected.offer.assumptions, ...selected.offer.warnings].map(
            (text) => (
              <Text key={text} style={ui.body}>
                {text}
              </Text>
            ),
          )}
        </Surface>
        <Text style={ui.body}>{selected.disclaimer}</Text>
        {selectionError && <ErrorNotice message={selectionError} />}
        {selected.eligible && (
          <Button
            label={`Select offer: ${selected.offer.headline}`}
            onPress={() => onSelect(selected)}
            disabled={busy}
          />
        )}
      </View>
    );
  const filtered =
    response?.quotes.filter((q) => q.offer.offer_type === kind) ?? [];
  const availableTenures = tenureOptions;
  return (
    <View style={ui.stack}>
      <Button
        label="‹ Back to Optimize"
        onPress={onBack}
        secondary
        disabled={busy}
      />
      <Heading
        title="Fictional Marketplace"
        subtitle="Compare invented offers, ranked for your simulated cost—not partner payout."
      />
      <Badge label="FICTIONAL OFFERS · NO LIVE PRICING" />
      <Surface>
        <Text style={ui.body}>
          Lower monthly payment can mean longer repayment time. Compare total
          repayment, not only EMI/monthly amount. Illustrative simulation only;
          not an approval or financial advice. No money moved.
        </Text>
      </Surface>
      <CardSelector
        cards={cards}
        value={destinationId}
        onChange={(value) => {
          onDestination(value);
          setResponse(null);
        }}
        purpose="destination"
        label="DESTINATION CARD"
        disabled={loading || busy}
      />
      <Text style={ui.h2}>Amount to compare</Text>
      <TextInput
        accessibilityLabel="Marketplace amount"
        value={amount}
        keyboardType="decimal-pad"
        editable={!loading && !busy}
        onChangeText={(value) => {
          onAmount(value);
          setResponse(null);
        }}
        style={[ui.surface, { color: color.ink, fontSize: 26 }]}
      />
      <CardSelector
        cards={cards}
        value={sourceId}
        onChange={onSource}
        purpose="source"
        label="SIMULATION SOURCE"
        disabled={loading || busy}
      />
      <Text style={ui.h2}>Tenure preference</Text>
      <Button
        label="Use each offer's default tenure"
        onPress={() => {
          setTenure(null);
          setResponse(null);
        }}
        secondary
        disabled={loading || busy}
      />
      <View style={ui.wrap}>
        {availableTenures.map((months) => (
          <Button
            key={months}
            label={`${months} months`}
            onPress={() => {
              setTenure(months);
              setResponse(null);
            }}
            disabled={busy || loading}
            secondary
          />
        ))}
      </View>
      <Text style={ui.label}>
        Selected: {tenure === null ? "Offer defaults" : `${tenure} months`}
      </Text>
      <Button
        label="Compare fictional offers"
        onPress={() => void compare()}
        disabled={loading || busy}
      />
      <View accessibilityRole="tablist" style={ui.row}>
        {(["balance_transfer", "refinancing"] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityLabel={
              value === "balance_transfer"
                ? "Balance Transfer offers"
                : "Refinancing offers"
            }
            aria-selected={kind === value}
            onPress={() => setKind(value)}
            style={[
              ui.surface,
              ui.flex,
              kind === value && { borderColor: color.accent },
            ]}
          >
            <Text style={ui.value}>
              {value === "balance_transfer"
                ? "Balance Transfer"
                : "Refinancing"}
            </Text>
          </Pressable>
        ))}
      </View>
      {error && <ErrorNotice message={error} />}
      {selectionError && <ErrorNotice message={selectionError} />}
      {loading && (
        <ActivityIndicator
          color={color.accent}
          accessibilityLabel="Loading fictional offers"
        />
      )}
      {response && (
        <>
          <Text style={ui.body}>
            Evaluated {money(response.amount)} for {response.destination.issuer}{" "}
            {response.destination.name}. {response.responsible_credit}
          </Text>
          <Text style={ui.h2}>Eligible fictional offers</Text>
          {filtered
            .filter((q) => q.eligible)
            .map((quote) => (
              <OfferCard
                key={quote.offer.id}
                quote={quote}
                busy={busy}
                onDetails={() => {
                  setSelected(quote);
                  onTop();
                }}
                onSelect={() => onSelect(quote)}
              />
            ))}
          {!filtered.some((q) => q.eligible) && (
            <State
              title="No eligible fictional offers"
              message="Adjust the destination, amount, or tenure. Blocked options below explain why."
            />
          )}
          <Text style={ui.h2}>Ineligible / inactive offers</Text>
          {filtered
            .filter((q) => !q.eligible)
            .map((quote) => (
              <OfferCard
                key={quote.offer.id}
                quote={quote}
                busy={busy}
                onDetails={() => {
                  setSelected(quote);
                  onTop();
                }}
                onSelect={() => onSelect(quote)}
              />
            ))}
          {!filtered.length && (
            <State
              title="No fictional offers available"
              message="Try another category or compare again."
            />
          )}
          <Text style={ui.body}>{response.disclaimer}</Text>
        </>
      )}
    </View>
  );
}

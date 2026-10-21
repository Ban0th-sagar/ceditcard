import { MarketplaceScreen } from "./src/screens/MarketplaceScreen";
import { OfferQuote, OfferType } from "./src/offerTypes";
import {
  ConfirmationScreen,
  TransactionTimeline,
  TransactionActivity,
} from "./src/screens/TransactionScreens";
import { DemoOutcome, SimulatedTransaction } from "./src/transactionTypes";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { api } from "./src/api";
import { Card, RoutingQuoteResult, Portfolio, RouteOption } from "./src/types";
import { Badge, State } from "./src/components/UI";
import {
  ActivityEntry,
  ActivityScreen,
  CardDetailsScreen,
  CardsScreen,
  HomeScreen,
  ProfileScreen,
} from "./src/screens/PortfolioScreens";
import { OptimizeScreen, ResultScreen } from "./src/screens/OptimizeScreen";
import { color, ui } from "./src/theme";
type Tab = "Home" | "Cards" | "Optimize" | "Activity" | "Profile";
const tabs: { name: Tab; icon: string }[] = [
  { name: "Home", icon: "⌂" },
  { name: "Cards", icon: "▱" },
  { name: "Optimize", icon: "+" },
  { name: "Activity", icon: "≋" },
  { name: "Profile", icon: "○" },
];
export default function App() {
  const [tab, setTab] = useState<Tab>("Home");
  const [cards, setCards] = useState<Card[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [sourceId, setSourceId] = useState("icici_amazon");
  const [destinationId, setDestinationId] = useState("hdfc_regalia");
  const [amount, setAmount] = useState("10000");
  const [result, setResult] = useState<RoutingQuoteResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [pendingRoute, setPendingRoute] = useState<RouteOption | null>(null);
  const [transaction, setTransaction] = useState<SimulatedTransaction | null>(
    null,
  );
  const [marketplace, setMarketplace] = useState(false);
  const [marketplaceType, setMarketplaceType] =
    useState<OfferType>("balance_transfer");
  const [pendingOffer, setPendingOffer] = useState<OfferQuote | null>(null);
  const [selectingOffer, setSelectingOffer] = useState(false);
  const [offerError, setOfferError] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const creationLock = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const eventId = useRef(0);
  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const [data, summary] = await Promise.all([api.cards(), api.portfolio()]);
      setCards(data);
      setPortfolio(summary);
    } catch {
      setLoadError(
        "Could not load your portfolio. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  function navigate(next: Tab) {
    setTab(next);
    setMarketplace(false);
    setPendingOffer(null);
    setOfferError("");
    setPendingRoute(null);
    setTransaction(null);
    setCreateError("");
    setSelectedCard(null);
    setShowResult(false);
    setError("");
    scroll.current?.scrollTo({ y: 0, animated: false });
  }
  function openCard(card: Card) {
    navigate("Cards");
    setSelectedCard(card);
  }
  async function runOptimize() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const data = await api.quote({
        source_card_id: sourceId,
        destination_card_id: destinationId,
        amount: value,
      });
      setResult(data);
      setShowResult(true);
      scroll.current?.scrollTo({ y: 0, animated: false });
      const failed = data.checks.some((check) => !check.passed);
      const time = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const entry = {
        id: ++eventId.current,
        title: failed ? "Route not eligible" : "Optimization checked",
        detail: failed
          ? `${data.source.issuer} → ${data.destination.issuer}: Card-to-Card unavailable; ${data.recommendation?.display_name ?? "No route"} recommended. No payment.`
          : `${data.source.issuer} → ${data.destination.issuer}: ${data.recommendation?.display_name ?? "No route"} recommended. No payment.`,
        time,
      };
      setEntries((previous) => [entry, ...previous]);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not compare routes. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function createSimulation(outcome: DemoOutcome) {
    if (!result || !pendingRoute || creationLock.current) return;
    creationLock.current = true;
    setCreating(true);
    setCreateError("");
    try {
      const created = await api.createTransaction({
        source_card_id: result.source.id,
        destination_card_id: result.destination.id,
        amount: result.amount,
        route_id: pendingRoute.id,
        demo_outcome: outcome,
        ...(pendingOffer
          ? {
              offer_id: pendingOffer.offer.id,
              offer_tenure_months: pendingOffer.tenure_months,
            }
          : {}),
      });
      setTransaction(created);
      setPendingOffer(null);
      setPendingRoute(null);
      scroll.current?.scrollTo({ y: 0, animated: false });
    } catch (caught) {
      setCreateError(
        caught instanceof Error
          ? caught.message
          : "Could not create simulation. Try again.",
      );
    } finally {
      creationLock.current = false;
      setCreating(false);
    }
  }
  function openMarketplace(type: OfferType = "balance_transfer") {
    setTab("Optimize");
    setMarketplaceType(type);
    setMarketplace(true);
    setOfferError("");
    scroll.current?.scrollTo({ y: 0, animated: false });
  }
  async function selectOffer(offer: OfferQuote) {
    if (selectingOffer) return;
    setSelectingOffer(true);
    setOfferError("");
    try {
      const response = await api.quote({
        source_card_id: sourceId,
        destination_card_id: offer.destination_card_id,
        amount: offer.amount,
        offer_id: offer.offer.id,
        offer_tenure_months: offer.tenure_months,
      });
      const route = response.routes.find(
        (route) => route.id === offer.offer.offer_type,
      );
      if (!route?.eligible || !response.selected_offer?.eligible)
        throw new Error(
          "The backend blocked this selection. Refresh offers or choose a different mock source.",
        );
      setResult(response);
      setShowResult(true);
      setPendingRoute(route);
      setPendingOffer(response.selected_offer);
      setCreateError("");
      scroll.current?.scrollTo({ y: 0, animated: false });
    } catch (caught) {
      setOfferError(
        caught instanceof Error
          ? caught.message
          : "Could not select fictional offer.",
      );
    } finally {
      setSelectingOffer(false);
    }
  }
  const content = () => {
    if (transaction)
      return (
        <TransactionTimeline
          key={transaction.id}
          initial={transaction}
          onActivity={() => navigate("Activity")}
        />
      );
    if (pendingRoute && result)
      return (
        <ConfirmationScreen
          result={result}
          route={pendingRoute}
          offer={pendingOffer}
          busy={creating}
          error={createError}
          onBack={() => {
            setPendingRoute(null);
            setPendingOffer(null);
            scroll.current?.scrollTo({ y: 0, animated: false });
          }}
          onConfirm={(outcome) => void createSimulation(outcome)}
        />
      );
    if (marketplace)
      return (
        <MarketplaceScreen
          cards={cards}
          sourceId={sourceId}
          destinationId={destinationId}
          amount={amount}
          onSource={setSourceId}
          onDestination={setDestinationId}
          onAmount={setAmount}
          initialType={marketplaceType}
          busy={selectingOffer}
          selectionError={offerError}
          onTop={() => scroll.current?.scrollTo({ y: 0, animated: false })}
          onBack={() => {
            setMarketplace(false);
            setOfferError("");
            scroll.current?.scrollTo({ y: 0, animated: false });
          }}
          onSelect={(value) => void selectOffer(value)}
        />
      );
    if (tab === "Profile") return <ProfileScreen />;
    if (tab === "Activity")
      return (
        <ActivityScreen entries={entries}>
          <TransactionActivity
            onOpen={(value) => {
              setTransaction(value);
              scroll.current?.scrollTo({ y: 0, animated: false });
            }}
          />
        </ActivityScreen>
      );
    if (loading)
      return (
        <View style={s.loading}>
          <ActivityIndicator color={color.accent} size="large" />
          <Text style={ui.body}>Loading Relay…</Text>
        </View>
      );
    if (loadError)
      return (
        <State
          title="A moment to reconnect."
          message={loadError}
          action="Retry loading portfolio"
          onAction={() => void load()}
        />
      );
    if (!cards.length || !portfolio)
      return (
        <State
          title="A fresh start."
          message="No mock cards are available. Refresh the portfolio to try again."
          action="Refresh portfolio"
          onAction={() => void load()}
        />
      );
    if (tab === "Home")
      return (
        <HomeScreen
          cards={cards}
          portfolio={portfolio}
          onCard={openCard}
          onOptimize={() => navigate("Optimize")}
          onMarketplace={() => openMarketplace()}
        />
      );
    if (tab === "Cards")
      return selectedCard ? (
        <CardDetailsScreen
          card={selectedCard}
          onBack={() => {
            setSelectedCard(null);
            scroll.current?.scrollTo({ y: 0, animated: false });
          }}
          onOptimize={() => navigate("Optimize")}
        />
      ) : (
        <CardsScreen cards={cards} onCard={openCard} />
      );
    if (showResult && result)
      return (
        <ResultScreen
          result={result}
          onMarketplace={openMarketplace}
          onSelect={(route) => {
            setPendingRoute(route);
            setPendingOffer(
              result.selected_offer?.offer.offer_type === route.id
                ? result.selected_offer
                : null,
            );
            setCreateError("");
            scroll.current?.scrollTo({ y: 0, animated: false });
          }}
          onTop={() => scroll.current?.scrollTo({ y: 0, animated: false })}
          onChange={() => {
            setShowResult(false);
            scroll.current?.scrollTo({ y: 0, animated: false });
          }}
          onHome={() => navigate("Home")}
        />
      );
    return (
      <OptimizeScreen
        cards={cards}
        sourceId={sourceId}
        destinationId={destinationId}
        amount={amount}
        setSource={setSourceId}
        setDestination={setDestinationId}
        setAmount={setAmount}
        busy={busy}
        error={error}
        onMarketplace={() => openMarketplace()}
        onRun={() => void runOptimize()}
      />
    );
  };
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={s.shell}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.header}>
          <View style={ui.row}>
            <Text style={s.logo}>r/</Text>
            <Text style={s.brand}>relay</Text>
          </View>
          <Badge label="SIMULATION MODE" />
        </View>
        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          {content()}
          <Text style={s.disclaimer}>
            Mock data only · No real money movement
          </Text>
        </ScrollView>
        <View accessibilityRole="tablist" style={s.nav}>
          {tabs.map((item) => (
            <Pressable
              key={item.name}
              accessibilityRole="tab"
              accessibilityLabel={item.name}
              accessibilityState={{
                selected: tab === item.name,
                disabled: creating || selectingOffer,
              }}
              disabled={creating || selectingOffer}
              aria-disabled={creating || selectingOffer}
              aria-selected={tab === item.name}
              onPress={() => navigate(item.name)}
              style={({ pressed }) => [s.tab, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View
                style={[
                  s.tabIcon,
                  item.name === "Optimize" && s.optimizeIcon,
                  tab === item.name &&
                    item.name !== "Optimize" && {
                      backgroundColor: color.raised,
                    },
                ]}
              >
                <Text
                  style={{
                    fontSize: 25,
                    color:
                      item.name === "Optimize"
                        ? color.bg
                        : tab === item.name
                          ? color.accent
                          : color.muted,
                  }}
                >
                  {item.icon}
                </Text>
              </View>
              <Text
                style={[
                  s.tabText,
                  {
                    color:
                      tab === item.name || item.name === "Optimize"
                        ? color.accent
                        : color.muted,
                  },
                ]}
              >
                {item.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  shell: { flex: 1, width: "100%", maxWidth: 760, alignSelf: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomColor: color.line,
    borderBottomWidth: 1,
  },
  logo: {
    color: color.accent,
    fontSize: 29,
    fontWeight: "900",
    letterSpacing: -4,
    marginRight: 4,
  },
  brand: {
    color: color.ink,
    fontSize: 25,
    fontWeight: "700",
    letterSpacing: -1,
  },
  content: { padding: 20, paddingTop: 28, paddingBottom: 30, gap: 24 },
  loading: { paddingVertical: 70, alignItems: "center", gap: 20 },
  disclaimer: {
    color: color.muted,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 18,
  },
  nav: {
    flexDirection: "row",
    backgroundColor: "#111923",
    borderTopColor: color.line,
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 9,
    paddingBottom: 9,
  },
  tab: { flex: 1, alignItems: "center", minHeight: 58, gap: 4 },
  tabIcon: {
    width: 44,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optimizeIcon: { backgroundColor: color.accent, width: 48, height: 34 },
  tabText: { fontSize: 10, fontWeight: "700" },
});

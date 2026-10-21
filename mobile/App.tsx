import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from './src/api';
import { Card, OptimizeResult, Portfolio } from './src/types';

type Screen = 'home' | 'optimize' | 'result';

const rupee = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [cards, setCards] = useState<Card[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sourceId, setSourceId] = useState('icici_amazon');
  const [destinationId, setDestinationId] = useState('hdfc_regalia');
  const [amount, setAmount] = useState('10000');
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    Promise.all([api.cards(), api.portfolio()])
      .then(([cardsData, portfolioData]) => {
        setCards(cardsData);
        setPortfolio(portfolioData);
      })
      .catch(() => setError('Could not load your portfolio. Check your connection and reload to try again.'))
      .finally(() => setLoading(false));
  }, []);

  const source = useMemo(() => cards.find((c) => c.id === sourceId), [cards, sourceId]);
  const destination = useMemo(() => cards.find((c) => c.id === destinationId), [cards, destinationId]);

  async function runOptimize() {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setError('');
    setOptimizing(true);
    try {
      const data = await api.optimize(sourceId, destinationId, parsedAmount);
      setResult(data);
      setScreen('result');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not compare routes. Please try again.');
    } finally {
      setOptimizing(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator size="large" /><Text style={styles.muted}>Loading Relay…</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>RELAY</Text>
            <Text style={styles.subtitle}>Simulated credit routing · Mock data</Text>
          </View>
          <View style={styles.demoPill}><Text style={styles.demoText}>DEMO</Text></View>
        </View>

        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

        {screen === 'home' && portfolio && (
          <>
            <Text style={styles.eyebrow}>YOUR CREDIT PORTFOLIO</Text>
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>Total outstanding</Text>
              <Text style={styles.heroValue}>{rupee(portfolio.total_outstanding)}</Text>
              <View style={styles.statsRow}>
                <Stat label="Available" value={rupee(portfolio.available_credit)} />
                <Stat label="Utilization" value={`${portfolio.utilization}%`} />
                <Stat label="Cards" value={`${cards.length}`} />
              </View>
            </View>

            <View style={styles.heroCard}>
              <Text style={styles.eyebrow}>NEXT DUE · MOCK CARD</Text>
              <Text style={styles.cardIssuer}>{portfolio.next_due.issuer} {portfolio.next_due.name}</Text>
              <Text style={styles.muted}>Due {portfolio.next_due.due_date} · Minimum {rupee(portfolio.next_due.minimum_due)}</Text>
            </View>
            <Text style={styles.sectionTitle}>Cards</Text>
            {cards.map((card) => <CreditCard key={card.id} card={card} />)}

            <TouchableOpacity style={styles.primaryButton} onPress={() => setScreen('optimize')}>
              <Text style={styles.primaryButtonText}>Optimize my credit</Text>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>Prototype only. No real cards, money movement, or financial advice.</Text>
          </>
        )}

        {screen === 'optimize' && (
          <>
            <TouchableOpacity onPress={() => setScreen('home')}><Text style={styles.back}>‹ Portfolio</Text></TouchableOpacity>
            <Text style={styles.title}>Route an outstanding balance</Text>
            <Text style={styles.eyebrow}>MOCK ELIGIBILITY · SIMULATION ONLY</Text>
            <Text style={styles.muted}>Choose a potential source card, destination card, and amount. Relay will check a mock eligibility policy and compare alternatives.</Text>

            <Text style={styles.inputLabel}>Source card</Text>
            <View style={styles.optionGrid}>
              {cards.map((card) => (
                <ChoiceCard key={card.id} card={card} selected={sourceId === card.id} onPress={() => setSourceId(card.id)} detail={`Available ${rupee(card.available_limit)}`} />
              ))}
            </View>

            <Text style={styles.inputLabel}>Destination card</Text>
            <View style={styles.optionGrid}>
              {cards.map((card) => (
                <ChoiceCard key={card.id} card={card} selected={destinationId === card.id} onPress={() => setDestinationId(card.id)} detail={`Outstanding ${rupee(card.outstanding)}`} />
              ))}
            </View>

            <Text style={styles.inputLabel}>Amount</Text>
            <View style={styles.amountBox}>
              <Text style={styles.currency}>₹</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                placeholder="10000"
                placeholderTextColor="#687385"
              />
            </View>

            {source && destination ? (
              <View style={styles.routePreview}>
                <Text style={styles.routeNode}>{source.issuer} •••• {source.last_four}</Text>
                <Text style={styles.routeArrow}>→</Text>
                <Text style={styles.routeNode}>{destination.issuer} •••• {destination.last_four}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.primaryButton} onPress={runOptimize} disabled={optimizing}>
              <Text style={styles.primaryButtonText}>{optimizing ? 'Checking routes…' : 'Check eligibility & optimize'}</Text>
            </TouchableOpacity>
          </>
        )}

        {screen === 'result' && result && (
          <>
            <TouchableOpacity onPress={() => setScreen('optimize')}><Text style={styles.back}>‹ Change route</Text></TouchableOpacity>
            <Text style={styles.title}>Route analysis</Text>
            <Text style={styles.eyebrow}>SIMULATION COMPLETE · NO MONEY MOVED</Text>
            <Text style={styles.muted}>{result.source.issuer} → {result.destination.issuer} · {rupee(result.amount)}</Text>

            <Text style={styles.sectionTitle}>Eligibility</Text>
            {result.checks.map((check) => (
              <View key={check.key} style={styles.checkRow}>
                <View style={[styles.checkDot, check.passed ? styles.pass : styles.fail]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.checkLabel}>{check.label}</Text>
                  <Text style={styles.checkMessage}>{check.message}</Text>
                </View>
                <Text style={check.passed ? styles.passText : styles.failText}>{check.passed ? 'PASS' : 'FAIL'}</Text>
              </View>
            ))}

            <Text style={styles.sectionTitle}>Compare routes</Text>
            {result.quotes.map((quote) => (
              <View key={quote.route} style={[styles.quoteCard, result.recommendation.route === quote.route && styles.recommendedCard]}>
                <View style={styles.quoteHeader}>
                  <Text style={styles.quoteTitle}>{quote.label}</Text>
                  {result.recommendation.route === quote.route ? <Text style={styles.recommendedTag}>RECOMMENDED</Text> : null}
                </View>
                <Text style={styles.quoteExplanation}>{quote.explanation}</Text>
                <View style={styles.quoteStats}>
                  <Stat label="Fee" value={rupee(quote.processing_fee)} />
                  <Stat label="Est. interest" value={rupee(quote.estimated_interest)} />
                  <Stat label="Total" value={rupee(quote.total_cost)} />
                </View>
                {!quote.eligible ? <Text style={styles.unavailable}>Not eligible in this simulation</Text> : null}
              </View>
            ))}

            <View style={styles.recommendationBox}>
              <Text style={styles.eyebrow}>RELAY RECOMMENDATION</Text>
              <Text style={styles.recommendationTitle}>{result.recommendation.label}</Text>
              <Text style={styles.muted}>Estimated total: {rupee(result.recommendation.total_cost)}</Text>
            </View>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => setScreen('home')}>
              <Text style={styles.secondaryButtonText}>Back to portfolio</Text>
            </TouchableOpacity>
            <Text style={styles.disclaimer}>{result.disclaimer}</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <View><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function CreditCard({ card }: { card: Card }) {
  return (
    <View style={styles.creditCard}>
      <View style={styles.cardTopRow}>
        <View>
          <Text style={styles.cardIssuer}>{card.issuer}</Text>
          <Text style={styles.cardName}>{card.name}</Text>
        </View>
        <Text style={styles.network}>{card.network}</Text>
      </View>
      <Text style={styles.cardDigits}>•••• {card.last_four}</Text>
      <View style={styles.cardBottomRow}>
        <View><Text style={styles.cardSmall}>Outstanding</Text><Text style={styles.cardAmount}>{rupee(card.outstanding)}</Text></View>
        <View><Text style={styles.cardSmall}>Due</Text><Text style={styles.cardAmount}>{card.due_date.slice(5)}</Text></View>
        <View><Text style={styles.cardSmall}>Utilization</Text><Text style={styles.cardAmount}>{card.utilization}%</Text></View>
      </View>
    </View>
  );
}

function ChoiceCard({ card, selected, onPress, detail }: { card: Card; selected: boolean; onPress: () => void; detail: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.choiceCard, selected && styles.choiceSelected]}>
      <Text style={styles.choiceTitle}>{card.issuer} {card.name}</Text>
      <Text style={styles.choiceDigits}>•••• {card.last_four}</Text>
      <Text style={styles.choiceDetail}>{detail}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#071019' },
  container: { padding: 20, paddingBottom: 48, width: '100%', maxWidth: 760, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  brand: { color: '#F7FAFC', fontSize: 28, fontWeight: '900', letterSpacing: 3 },
  subtitle: { color: '#7E8A99', marginTop: 3 },
  demoPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: '#10283A' },
  demoText: { color: '#59C3FF', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  eyebrow: { color: '#62C8FF', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
  heroCard: { backgroundColor: '#0E1C28', padding: 22, borderRadius: 24, borderWidth: 1, borderColor: '#163248', marginBottom: 26 },
  heroLabel: { color: '#92A0AF', fontSize: 14 },
  heroValue: { color: '#FFFFFF', fontSize: 38, fontWeight: '800', marginTop: 7, marginBottom: 22 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statValue: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  statLabel: { color: '#768391', fontSize: 11, marginTop: 4 },
  sectionTitle: { color: '#F4F7FA', fontSize: 20, fontWeight: '800', marginTop: 8, marginBottom: 12 },
  creditCard: { backgroundColor: '#111F2B', borderRadius: 22, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#1D3446' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardIssuer: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  cardName: { color: '#92A0AF', marginTop: 2 },
  network: { color: '#62C8FF', fontWeight: '800' },
  cardDigits: { color: '#B5C1CC', marginVertical: 20, letterSpacing: 3 },
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardSmall: { color: '#6F7C89', fontSize: 10 },
  cardAmount: { color: '#EDF3F8', fontSize: 13, fontWeight: '700', marginTop: 4 },
  primaryButton: { backgroundColor: '#3BAEF4', paddingVertical: 17, borderRadius: 18, alignItems: 'center', marginTop: 18 },
  primaryButtonText: { color: '#05111A', fontWeight: '900', fontSize: 16 },
  secondaryButton: { borderWidth: 1, borderColor: '#2A4559', paddingVertical: 15, borderRadius: 18, alignItems: 'center', marginTop: 14 },
  secondaryButtonText: { color: '#DCE8F1', fontWeight: '800' },
  disclaimer: { color: '#657381', fontSize: 11, lineHeight: 16, marginTop: 16, textAlign: 'center' },
  title: { color: '#FFFFFF', fontSize: 29, fontWeight: '900', marginBottom: 8 },
  muted: { color: '#83909E', lineHeight: 21 },
  back: { color: '#62C8FF', fontWeight: '700', marginBottom: 18 },
  inputLabel: { color: '#E8EEF3', fontWeight: '800', marginTop: 24, marginBottom: 10 },
  optionGrid: { gap: 9 },
  choiceCard: { backgroundColor: '#0D1822', borderWidth: 1, borderColor: '#203442', borderRadius: 16, padding: 14 },
  choiceSelected: { borderColor: '#3BAEF4', backgroundColor: '#10283A' },
  choiceTitle: { color: '#F1F5F8', fontWeight: '800' },
  choiceDigits: { color: '#6F7D8A', marginTop: 4 },
  choiceDetail: { color: '#9BA8B4', marginTop: 8, fontSize: 12 },
  amountBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D1822', borderRadius: 16, borderWidth: 1, borderColor: '#203442', paddingHorizontal: 16 },
  currency: { color: '#62C8FF', fontSize: 24, fontWeight: '900' },
  amountInput: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', paddingVertical: 14, paddingHorizontal: 8, flex: 1 },
  routePreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0B151E', borderRadius: 16, padding: 14, marginTop: 18 },
  routeNode: { color: '#E8EEF3', fontSize: 12, fontWeight: '700', flex: 1, textAlign: 'center' },
  routeArrow: { color: '#3BAEF4', fontSize: 22, paddingHorizontal: 8 },
  errorBox: { backgroundColor: '#2B1619', borderColor: '#61323A', borderWidth: 1, padding: 12, borderRadius: 14, marginBottom: 16 },
  errorText: { color: '#FF909B', fontSize: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#0D1822', padding: 14, borderRadius: 14, marginBottom: 8 },
  checkDot: { width: 9, height: 9, borderRadius: 99, marginTop: 5 },
  pass: { backgroundColor: '#35D197' },
  fail: { backgroundColor: '#FF6678' },
  checkLabel: { color: '#EDF2F6', fontWeight: '800', fontSize: 13 },
  checkMessage: { color: '#71808E', fontSize: 11, marginTop: 4, lineHeight: 16 },
  passText: { color: '#35D197', fontSize: 10, fontWeight: '900' },
  failText: { color: '#FF6678', fontSize: 10, fontWeight: '900' },
  quoteCard: { backgroundColor: '#0D1822', borderWidth: 1, borderColor: '#203442', borderRadius: 18, padding: 16, marginBottom: 10 },
  recommendedCard: { borderColor: '#35D197' },
  quoteHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  quoteTitle: { color: '#FFFFFF', fontWeight: '900', flex: 1 },
  recommendedTag: { color: '#35D197', fontSize: 9, fontWeight: '900' },
  quoteExplanation: { color: '#778592', fontSize: 11, marginTop: 7, lineHeight: 16 },
  quoteStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  unavailable: { color: '#FF7A88', marginTop: 12, fontSize: 11, fontWeight: '700' },
  recommendationBox: { backgroundColor: '#0D2822', borderColor: '#22644F', borderWidth: 1, padding: 18, borderRadius: 20, marginTop: 10 },
  recommendationTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 22, marginBottom: 5 },
});

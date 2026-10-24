import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Badge, Button } from "../components/UI";
import { color, ui } from "../theme";
import { DEMO_EMAIL, DEMO_PASSWORD, rememberDemoAccess } from "../demo/access";
export function BrandIntro() {
  return (
    <View style={s.intro} accessibilityLabel="Relay brand intro">
      <Text style={s.symbol}>r/</Text>
      <Text style={s.brand}>Relay</Text>
      <Text style={ui.h2}>Intelligent credit routing.</Text>
      <Text style={[ui.body, { textAlign: "center", maxWidth: 310 }]}>
        Compare eligible repayment and credit options before you choose how to
        pay.
      </Text>
      <Badge label="DEMO ENVIRONMENT" />
    </View>
  );
}
export function LoginScreen({ onSignIn }: { onSignIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  function signIn() {
    if (
      email.trim().toLowerCase() !== DEMO_EMAIL ||
      password !== DEMO_PASSWORD
    ) {
      setError(
        "Those details do not match this demo. Use the demo credentials below.",
      );
      return;
    }
    rememberDemoAccess(true);
    onSignIn();
  }
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={s.login}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 12 }}>
          <Text style={s.symbol}>r/</Text>
          <Badge label="Demo environment" />
          <Text style={s.brand}>Relay</Text>
          <Text style={ui.h2}>Intelligent credit routing.</Text>
          <Text style={ui.body}>
            One clear view of your credit. Explore eligible options before
            choosing a route.
          </Text>
        </View>
        <View style={[ui.surface, { gap: 14 }]}>
          <Text accessibilityRole="header" style={ui.h2}>
            Sign in to the demo
          </Text>
          <Text style={ui.label}>Email</Text>
          <TextInput
            accessibilityLabel="Email"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setError("");
            }}
            placeholder={DEMO_EMAIL}
            placeholderTextColor={color.muted}
            style={s.input}
          />
          <Text style={ui.label}>Password</Text>
          <TextInput
            accessibilityLabel="Password"
            secureTextEntry
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setError("");
            }}
            onSubmitEditing={signIn}
            style={s.input}
            placeholder="Demo password"
            placeholderTextColor={color.muted}
          />
          {error && (
            <Text
              accessibilityRole="alert"
              style={{ color: color.danger, lineHeight: 21 }}
            >
              {error}
            </Text>
          )}
          <Button label="Sign In" onPress={signIn} />
          <Button
            label="Autofill demo credentials"
            onPress={() => {
              setEmail(DEMO_EMAIL);
              setPassword(DEMO_PASSWORD);
              setError("");
            }}
            secondary
          />
          <Text style={ui.label}>
            Public demo: {DEMO_EMAIL} / {DEMO_PASSWORD}
          </Text>
        </View>
        <Text style={[ui.body, { textAlign: "center" }]}>
          Demo access only — no real financial account is connected.
        </Text>
        <Text style={[ui.label, { textAlign: "center" }]}>
          Local demo access. Do not enter personal or financial credentials.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  intro: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    padding: 28,
  },
  login: {
    padding: 24,
    paddingTop: 34,
    paddingBottom: 32,
    gap: 24,
    flexGrow: 1,
    justifyContent: "center",
  },
  symbol: {
    color: color.accent,
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: -7,
  },
  brand: {
    color: color.ink,
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -2,
  },
  input: {
    minHeight: 48,
    color: color.ink,
    backgroundColor: color.bg,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: 12,
    padding: 13,
    fontSize: 16,
  },
});

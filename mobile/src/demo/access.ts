import { Platform } from "react-native";
// Public demo gate, deliberately not authentication/security for backend data.
export const DEMO_EMAIL = "demo@relay.app";
export const DEMO_PASSWORD = "Relay@123";
const KEY = "relay.demoAccess";
export function hasDemoAccess(): boolean {
  try {
    return (
      Platform.OS === "web" && window.sessionStorage.getItem(KEY) === "true"
    );
  } catch {
    return false;
  }
}
export function rememberDemoAccess(enabled: boolean) {
  try {
    if (Platform.OS === "web")
      enabled
        ? window.sessionStorage.setItem(KEY, "true")
        : window.sessionStorage.removeItem(KEY);
  } catch {
    /* Storage-disabled browsers still work for this mounted session. */
  }
}

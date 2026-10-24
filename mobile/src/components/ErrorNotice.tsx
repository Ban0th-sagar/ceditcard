import React, { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "./UI";
import { color, ui } from "../theme";
const friendly: Record<string, string> = {
  CARD_NOT_FOUND:
    "That demo card is no longer available. Choose another card and try again.",
  OFFER_NOT_FOUND:
    "That fictional offer is no longer available. Refresh the Marketplace.",
  OFFER_INELIGIBLE:
    "This offer no longer meets the demo rules. Refresh offers or choose another option.",
  ROUTE_INELIGIBLE:
    "This route is unavailable after the backend recheck. Compare the alternatives again.",
  STALE_TRANSACTION_STATE:
    "The timeline has changed. Refresh it before continuing.",
  INVALID_TRANSITION:
    "That step is not available in the current simulation state. Refresh the timeline.",
  CANCELLATION_NOT_ALLOWED:
    "This simulation has already reached processing or a final state and cannot be cancelled.",
  TRANSACTION_NOT_FOUND:
    "This simulation is no longer in server memory. Start a fresh demo.",
  INVALID_AMOUNT:
    "Enter a positive amount with no more than two decimal places, within the demo limits.",
};
export function ErrorNotice({ message }: { message: string }) {
  const [details, setDetails] = useState(false);
  const code = message.split(":")[0];
  const friendlyMessage =
    friendly[code] ??
    (/fetch|network|Request failed/i.test(message)
      ? "Relay could not reach the demo service. Check the backend connection and try again."
      : message);
  return (
    <View style={{ gap: 8 }}>
      <Text
        accessibilityRole="alert"
        style={{ color: color.danger, lineHeight: 22 }}
      >
        {friendlyMessage}
      </Text>
      {friendlyMessage !== message && (
        <>
          <Button
            label="Show technical details"
            onPress={() => setDetails(!details)}
            secondary
          />
          {details && (
            <Text testID="error-technical-details" style={ui.label}>
              {message}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

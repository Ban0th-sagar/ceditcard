import React from "react";
import { View } from "react-native";
import { RouteOption } from "../types";
import { Stat } from "./UI";
import { money, ui } from "../theme";
export function CostBreakdown({ route }: { route: RouteOption }) {
  return (
    <View style={ui.wrap}>
      <Stat label="Amount" value={money(route.amount)} />
      <Stat label="Fee" value={money(route.estimated_fee)} />
      <Stat label="Est. interest" value={money(route.estimated_interest)} />
      <Stat label="Total" value={money(route.estimated_total_cost)} />
    </View>
  );
}

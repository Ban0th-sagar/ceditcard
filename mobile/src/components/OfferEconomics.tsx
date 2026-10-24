import React from "react";
import { Text, View } from "react-native";
import { OfferQuote } from "../offerTypes";
import { Stat, Surface } from "./UI";
import { money, ui } from "../theme";
export function OfferEconomics({
  quote,
  compact = false,
}: {
  quote: OfferQuote;
  compact?: boolean;
}) {
  return (
    <View style={ui.stack}>
      <View style={ui.wrap}>
        <Stat label="Principal" value={money(quote.amount)} />
        <Stat label="Processing fee" value={money(quote.estimated_fee)} />
        <Stat
          label="Estimated interest"
          value={money(quote.estimated_interest)}
        />
        <Stat
          label="Total repayment"
          value={money(quote.estimated_total_cost)}
        />
      </View>
      <View style={ui.wrap}>
        <Stat label="Tenure" value={`${quote.tenure_months} months`} />
        <Stat
          label="Monthly estimate"
          value={money(quote.monthly_payment_estimate)}
        />
        {!compact && (
          <Stat
            label="Final installment"
            value={money(quote.final_payment_estimate)}
          />
        )}
      </View>
      <Text style={ui.body}>{quote.offer.processing_time_label}</Text>
      <Text style={ui.label}>
        Fictional annual flat rate:{" "}
        {new Intl.NumberFormat("en-IN", {
          style: "percent",
          maximumFractionDigits: 2,
        }).format(quote.offer.annual_flat_rate)}{" "}
        · not a reducing-balance APR
      </Text>
      {compact ? (
        <Text style={ui.label}>
          Illustrative savings {money(quote.estimated_savings)} vs a
          single-cycle baseline. See details for assumptions.
        </Text>
      ) : (
        <Surface>
          <Stat
            label="Illustrative savings vs baseline"
            value={money(quote.estimated_savings)}
          />
          <Stat
            label="Baseline total"
            value={money(quote.baseline.estimated_total_cost)}
          />
          <Text style={ui.body}>{quote.baseline.label}</Text>
          <Text style={ui.label}>
            {quote.baseline.assumptions} Negative savings means this offer costs
            more than the baseline.
          </Text>
        </Surface>
      )}
    </View>
  );
}

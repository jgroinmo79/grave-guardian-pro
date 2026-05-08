import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleCheckout } from "./pricing.ts";

// In-app review screen logic mirror — kept here so the test asserts
// the SAME calculation the customer sees in CheckoutStep.tsx.
function inAppTotal(opts: {
  basePrice: number;       // monument cleaning price (0 if any annual plan present)
  planPrice: number;       // maintenance + flower-only
  travelFee: number;
  addOnTotal: number;
  isVeteran?: boolean;
}): number {
  const sum = opts.basePrice + opts.planPrice + opts.travelFee + opts.addOnTotal;
  return opts.isVeteran ? Math.round(sum * 0.9) : sum;
}

Deno.test("a) Annual plan only — Sentinel on Single Marker, no travel", () => {
  const r = assembleCheckout({
    monumentType: "single_marker",
    estimatedMiles: 10,
    travelFee: 0,
    selectedMaintenancePlan: "sentinel",
  });

  // No standalone cleaning line item should be sent to Stripe.
  assert(
    !r.lineItems.some((li) => li.name.endsWith("— Cleaning")),
    "Annual plan must not include the standalone cleaning line item",
  );

  const expected = inAppTotal({
    basePrice: 0,
    planPrice: 325,
    travelFee: 0,
    addOnTotal: 0,
  });
  assertEquals(r.subtotal, expected);
  assertEquals(r.lineItemsTotalCents, expected * 100);
  assertEquals(expected, 325);
});

Deno.test("b) One-time cleaning only — Single Marker, no travel", () => {
  const r = assembleCheckout({
    monumentType: "single_marker",
    estimatedMiles: 10,
    travelFee: 0,
  });

  assert(
    r.lineItems.some((li) => li.name === "Single Marker — Cleaning"),
    "One-time cleaning must include the cleaning line item",
  );

  const expected = inAppTotal({
    basePrice: 125,
    planPrice: 0,
    travelFee: 0,
    addOnTotal: 0,
  });
  assertEquals(r.subtotal, expected);
  assertEquals(r.lineItemsTotalCents, expected * 100);
  assertEquals(expected, 125);
});

Deno.test("c) Annual plan with waived travel zone (50 mi)", () => {
  // Caller (edge function) passes travelFee=0 because annual-plan waiver
  // applies in 25 < miles <= 75 range. We simulate that here.
  const r = assembleCheckout({
    monumentType: "single_marker",
    estimatedMiles: 50,
    travelFee: 0,
    selectedMaintenancePlan: "sentinel",
  });

  assert(
    !r.lineItems.some((li) => li.name.endsWith("— Cleaning")),
    "Annual plan must not include cleaning line item",
  );
  assert(
    r.lineItems.some((li) => li.name.startsWith("Travel Fee — Waived with Annual Plan")),
    "Waived-travel callout line item must be present",
  );

  const expected = inAppTotal({
    basePrice: 0,
    planPrice: 325,
    travelFee: 0,
    addOnTotal: 0,
  });
  assertEquals(r.subtotal, expected);
  assertEquals(r.lineItemsTotalCents, expected * 100);
  assertEquals(expected, 325);
});

Deno.test("d) One-time cleaning with non-waived travel fee (50 mi, $65)", () => {
  const r = assembleCheckout({
    monumentType: "single_marker",
    estimatedMiles: 50,
    travelFee: 65,
  });

  assert(
    r.lineItems.some((li) => li.name === "Single Marker — Cleaning"),
    "One-time cleaning must include the cleaning line item",
  );
  assert(
    r.lineItems.some((li) => li.name === "Travel Fee (50 mi round trip)"),
    "Non-waived travel fee line item must be present",
  );

  const expected = inAppTotal({
    basePrice: 125,
    planPrice: 0,
    travelFee: 65,
    addOnTotal: 0,
  });
  assertEquals(r.subtotal, expected);
  assertEquals(r.lineItemsTotalCents, expected * 100);
  assertEquals(expected, 190);
});

// Cross-check every annual maintenance plan × every monument type
// to guard against regressions in the cleaning-line exclusion logic.
Deno.test("e) All annual plans across all monument types exclude cleaning", () => {
  const plans = ["keeper", "sentinel", "legacy"];
  const monuments = [
    "single_marker",
    "double_marker",
    "single_slant",
    "single_upright",
    "double_slant",
    "double_upright",
    "grave_ledger",
  ];
  for (const m of monuments) {
    for (const p of plans) {
      const r = assembleCheckout({
        monumentType: m,
        estimatedMiles: 10,
        travelFee: 0,
        selectedMaintenancePlan: p,
      });
      assert(
        !r.lineItems.some((li) => li.name.endsWith("— Cleaning")),
        `${m} + ${p} must not include cleaning line item`,
      );
      assertEquals(
        r.lineItemsTotalCents,
        r.subtotal * 100,
        `${m} + ${p}: stripe total must equal in-app subtotal`,
      );
    }
  }
});

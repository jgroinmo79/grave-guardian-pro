// Pure pricing/line-item assembly for create-checkout.
// Extracted so tests can verify in-app vs Stripe totals without
// hitting Stripe or the database.

export const MONUMENT_PRICES: Record<string, { price: number; label: string }> = {
  single_marker: { label: "Single Marker", price: 125 },
  double_marker: { label: "Double Marker", price: 150 },
  single_slant: { label: "Single Slant", price: 150 },
  single_upright: { label: "Single Upright", price: 175 },
  double_slant: { label: "Double Slant", price: 200 },
  double_upright: { label: "Double Upright", price: 225 },
  grave_ledger: { label: "Grave Ledger", price: 275 },
};

export const ADD_ONS: Record<string, { label: string; price: number }> = {
  damage_report: { label: "Damage Documentation Report", price: 65 },
  holiday_date_lock: { label: "Holiday Date Lock", price: 35 },
  inscription_repainting: { label: "Inscription Repainting", price: 75 },
  weeding: { label: "Weeding & Plot Edging", price: 75 },
  flag_placement: { label: "Flag Placement", price: 35 },
};

export const MAINTENANCE_PLAN_PRICES: Record<string, Record<string, number>> = {
  single_marker: { keeper: 229, sentinel: 325, legacy: 399 },
  single_slant: { keeper: 315, sentinel: 445, legacy: 555 },
  double_marker: { keeper: 329, sentinel: 469, legacy: 585 },
  single_upright: { keeper: 379, sentinel: 539, legacy: 689 },
  double_slant: { keeper: 469, sentinel: 669, legacy: 849 },
  double_upright: { keeper: 529, sentinel: 759, legacy: 969 },
  grave_ledger: { keeper: 745, sentinel: 1079, legacy: 1389 },
};

export const MAINTENANCE_PLANS: Record<string, string> = {
  keeper: "2 Cleanings / Year",
  sentinel: "3 Cleanings / Year",
  legacy: "4 Cleanings / Year",
};

export const FLOWER_ONLY_PLANS: Record<string, { label: string; price: number }> = {
  flower_1: { label: "1 Flower Placement/yr", price: 125 },
  flower_2: { label: "2 Flower Placements/yr", price: 200 },
  flower_3: { label: "3 Flower Placements/yr", price: 275 },
  flower_4: { label: "4 Flower Placements/yr", price: 350 },
};

export type LineItem = {
  name: string;
  unit_amount: number; // cents
  quantity: number;
};

export type CheckoutInputs = {
  monumentType: string;
  estimatedMiles: number;
  travelFee: number; // resolved by caller (DB or fallback)
  addOns?: string[];
  selectedMaintenancePlan?: string | null;
  selectedFlowerPlan?: string | null;
  selectedFlowerOnly?: string | null;
  isVeteran?: boolean;
};

export type CheckoutAssembly = {
  lineItems: LineItem[];
  subtotal: number; // dollars (in-app review total)
  lineItemsTotalCents: number;
  hasAnnualPlan: boolean;
  showCleaningLine: boolean;
  basePrice: number;
  planPrice: number;
  addOnTotal: number;
};

export function assembleCheckout(inputs: CheckoutInputs): CheckoutAssembly {
  const monument = MONUMENT_PRICES[inputs.monumentType];
  if (!monument) throw new Error(`Invalid monument type: ${inputs.monumentType}`);

  const hasAnnualPlan = !!inputs.selectedMaintenancePlan || !!inputs.selectedFlowerPlan;
  const showCleaningLine = !hasAnnualPlan;
  const basePrice = showCleaningLine ? monument.price : 0;

  let addOnTotal = 0;
  for (const id of inputs.addOns ?? []) {
    const a = ADD_ONS[id];
    if (a) addOnTotal += a.price;
  }

  let planPrice = 0;
  let planLabel = "";
  if (
    inputs.selectedMaintenancePlan &&
    MAINTENANCE_PLAN_PRICES[inputs.monumentType]?.[inputs.selectedMaintenancePlan]
  ) {
    planPrice = MAINTENANCE_PLAN_PRICES[inputs.monumentType][inputs.selectedMaintenancePlan];
    planLabel = MAINTENANCE_PLANS[inputs.selectedMaintenancePlan] || inputs.selectedMaintenancePlan;
  } else if (inputs.selectedFlowerOnly && FLOWER_ONLY_PLANS[inputs.selectedFlowerOnly]) {
    planPrice = FLOWER_ONLY_PLANS[inputs.selectedFlowerOnly].price;
    planLabel = FLOWER_ONLY_PLANS[inputs.selectedFlowerOnly].label;
  }

  const grossSubtotal = basePrice + inputs.travelFee + addOnTotal + planPrice;
  const subtotal = inputs.isVeteran ? Math.round(grossSubtotal * 0.9) : grossSubtotal;

  const lineItems: LineItem[] = [];
  if (showCleaningLine) {
    lineItems.push({
      name: `${monument.label} — Cleaning`,
      unit_amount: basePrice * 100,
      quantity: 1,
    });
  }

  const exactMiles = Number(inputs.estimatedMiles || 0);
  const milesLabel = `${exactMiles} mi round trip`;
  const isAnnualWaiver =
    !!inputs.selectedMaintenancePlan && exactMiles > 25 && exactMiles <= 75;

  if (inputs.travelFee > 0) {
    lineItems.push({
      name: `Travel Fee (${milesLabel})`,
      unit_amount: inputs.travelFee * 100,
      quantity: 1,
    });
  } else {
    const name = isAnnualWaiver
      ? `Travel Fee — Waived with Annual Plan (${milesLabel})`
      : `Travel Fee — Included (${milesLabel})`;
    lineItems.push({ name, unit_amount: 0, quantity: 1 });
  }

  for (const id of inputs.addOns ?? []) {
    const a = ADD_ONS[id];
    if (a && a.price > 0) {
      lineItems.push({ name: a.label, unit_amount: a.price * 100, quantity: 1 });
    }
  }

  if (planPrice > 0) {
    lineItems.push({ name: planLabel, unit_amount: planPrice * 100, quantity: 1 });
  }

  const lineItemsTotalCents = lineItems.reduce(
    (s, li) => s + li.unit_amount * li.quantity,
    0,
  );

  return {
    lineItems,
    subtotal,
    lineItemsTotalCents,
    hasAnnualPlan,
    showCleaningLine,
    basePrice,
    planPrice,
    addOnTotal,
  };
}

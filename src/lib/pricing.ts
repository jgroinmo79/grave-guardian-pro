export type MonumentType = 
  | 'single_marker' | 'double_marker' | 'single_slant' | 'single_upright'
  | 'double_slant' | 'double_upright' | 'grave_ledger';

export type VeteranMonumentType = 'va_upright' | 'va_flat' | 'va_niche';

export type VeteranMaterialType = 'granite' | 'marble' | 'bronze';

export type MaterialType = 'granite' | 'marble' | 'bronze' | 'mixed';

export interface MonumentPricing {
  label: string;
  price: number;
  description: string;
}

export const MONUMENT_PRICES: Record<MonumentType, MonumentPricing> = {
  single_marker: { label: 'Single Marker', price: 135, description: 'Ground-level flat marker' },
  double_marker: { label: 'Double Marker', price: 195, description: 'Wider flat marker for two' },
  single_slant: { label: 'Single Slant', price: 185, description: 'Angled headstone on a base' },
  single_upright: { label: 'Single Upright', price: 215, description: 'Standing headstone on a base' },
  double_slant: { label: 'Double Slant', price: 265, description: 'Wide angled headstone on a base' },
  double_upright: { label: 'Double Upright', price: 295, description: 'Wide standing headstone on a base' },
  grave_ledger: { label: 'Grave Ledger', price: 395, description: 'Full-grave flat slab' },
};

export const TRAVEL_ZONES = [
  { maxMiles: 25, fee: 0, label: 'Zone 1 (0–25 mi)', feeLabel: 'Included' },
  { maxMiles: 75, fee: 65, label: 'Zone 2 (25–75 mi)', feeLabel: '$65' },
  { maxMiles: 150, fee: 150, label: 'Zone 3 (75–150 mi)', feeLabel: '$150' },
];

export function getTravelFee(miles: number) {
  const zone = TRAVEL_ZONES.find(z => miles <= z.maxMiles);
  return zone ?? TRAVEL_ZONES[TRAVEL_ZONES.length - 1];
}

/**
 * Annual maintenance plan customers (keeper / sentinel / legacy) within Zone 2
 * (25–75 mi) get free travel as a plan benefit. Zone 1 is already free; Zone 3
 * (75–150 mi) still charges the standard flat fee.
 */
export function getEffectiveTravelFee(miles: number, hasAnnualPlan: boolean) {
  const zone = getTravelFee(miles);
  if (hasAnnualPlan && miles > 25 && miles <= 75) {
    return { ...zone, fee: 0, feeLabel: 'Included with annual plan' };
  }
  return zone;
}

export const SERVICE_FEATURES = [
  'Full monument cleaning with Endurance Gravestone & Monument Cleaner',
  'Biological growth inhibitor applied',
  '4 GPS-timestamped photos texted/emailed same day',
  'Weeding and edging around monument',
  'Scheduled within 1 week of booking',
];

export const MAINTENANCE_PLANS = {
  keeper: { label: '2 Cleanings / Year', visits: 2, description: '2 cleaning visits per year' },
  sentinel: { label: '3 Cleanings / Year', visits: 3, description: '3 cleaning visits per year' },
  legacy: { label: '4 Cleanings / Year', visits: 4, description: '4 cleaning visits per year' },
};

// Per-monument-type pricing for the 3 annual maintenance plans
export const MAINTENANCE_PLAN_PRICES: Record<MonumentType, Record<string, number>> = {
  single_marker: { keeper: 229, sentinel: 325, legacy: 399 },
  single_slant: { keeper: 315, sentinel: 445, legacy: 555 },
  double_marker: { keeper: 329, sentinel: 469, legacy: 585 },
  single_upright: { keeper: 379, sentinel: 539, legacy: 689 },
  double_slant: { keeper: 469, sentinel: 669, legacy: 849 },
  double_upright: { keeper: 529, sentinel: 759, legacy: 969 },
  grave_ledger: { keeper: 745, sentinel: 1079, legacy: 1389 },
};

// DEPRECATED: Combo cleaning + flower plans (tribute/remembrance/devotion/eternal)
// have been removed. Flower placements will become a per-visit add-on. Empty
// objects are preserved here so existing iterators (Object.entries) just render
// nothing instead of crashing while we migrate callers.
export const FLOWER_PLANS: Record<string, { label: string; cleanings: number; flowers: number; description: string }> = {};
export const FLOWER_PLAN_PRICES: Record<MonumentType, Record<string, number>> = {
  single_marker: {},
  double_marker: {},
  single_slant: {},
  single_upright: {},
  double_slant: {},
  double_upright: {},
  grave_ledger: {},
};

export const FLOWER_ONLY_PLANS = [
  { id: 'flower_1', label: '1 Flower Placement', placements: 1, price: 125 },
  { id: 'flower_2', label: '2 Flower Placements', placements: 2, price: 200 },
  { id: 'flower_3', label: '3 Flower Placements', placements: 3, price: 275 },
  { id: 'flower_4', label: '4 Flower Placements', placements: 4, price: 350 },
];

// ===== New plan-spec pricing helpers (used by the redesigned ServiceStep) =====
// These coexist with the older MAINTENANCE/FLOWER plan tables above so we don't
// disturb existing checkout/subscription code paths that still reference them.

export type IntentChoice = '' | 'monument' | 'flowers' | 'both';

// Multipliers applied to the monument's base cleaning price
export const CLEANING_MULTIPLIERS = [1.0, 1.9, 2.75, 3.5] as const;

// Flat flower placement totals (1, 2, 3, 4 placements)
export const FLOWER_FLAT_TOTALS = [125, 200, 275, 350] as const;

export type ComboPlanId = 'combo_1' | 'combo_2' | 'combo_3' | 'combo_4';
export type CleaningPlanId = 'cleaning_1' | 'cleaning_2' | 'cleaning_3' | 'cleaning_4';

export const cleaningPlanPrice = (basePrice: number, count: 1 | 2 | 3 | 4) =>
  Math.round(basePrice * CLEANING_MULTIPLIERS[count - 1]);

export const flowerFlatPrice = (count: 1 | 2 | 3 | 4) => FLOWER_FLAT_TOTALS[count - 1];

export const comboPlanPrice = (basePrice: number, count: 1 | 2 | 3 | 4) =>
  cleaningPlanPrice(basePrice, count) + flowerFlatPrice(count);

// Standard holidays vs custom-date occasions for the per-slot picker
export const STANDARD_HOLIDAYS = [
  "Mother's Day",
  "Father's Day",
  "Memorial Day",
  "Easter",
  "Christmas",
  "Veterans Day",
  "Halloween",
  "Thanksgiving",
] as const;

export const CUSTOM_DATE_OCCASIONS = [
  "Birthday of deceased",
  "Anniversary",
  "Date of passing",
  "Other",
] as const;

export const ADD_ONS = [
  { id: 'damage_report', label: 'Damage Documentation Report', price: 65, description: 'Formal shareable document with GPS-timestamped damage photos' },
  { id: 'inscription_repainting', label: 'Inscription Repainting', price: 75, priceMax: 150, description: 'Per inscription — $75 to $150' },
  { id: 'weeding', label: 'Weeding & Plot Edging', price: 75, description: 'Standalone weeding and edging — $75+' },
  { id: 'flag_placement', label: 'Flag Placement', price: 35, description: 'American flag installation' },
  { id: 'bronze_cleaning', label: 'Bronze Marker Specialized Cleaning', price: 0, description: 'Quoted on-site' },
  { id: 'crack_repair', label: 'Stone Crack / Chip Repair', price: 0, description: 'Condition-based quote' },
  { id: 'video_documentation', label: 'Video Documentation', price: 0, description: 'Quoted on request' },
];

export interface IntakeFormData {
  // Step 1
  cemeteryName: string;
  section: string;
  lotNumber: string;
  estimatedMiles: number;
  cemeteryLat: number | null;
  cemeteryLng: number | null;
  // Person info
  deceasedName: string;
  shopperName: string;
  shopperRelationship: string;
  shopperPhone: string;
  shopperEmail: string;
  // Step 2
  isVeteran: boolean;
  veteranMonumentType: VeteranMonumentType | '';
  veteranMaterial: VeteranMaterialType | '';
  monumentType: MonumentType | '';
  material: MaterialType | '';
  approximateHeight: string;
  knownDamage: boolean;
  // Step 3
  conditions: {
    mossAlgae: boolean;
    notCleanedRecently: boolean;
    fadedInscription: boolean;
    chipping: boolean;
    leaning: boolean;
  };
  // Photos
  photos: string[];
  // Step 4
  livesLocally: boolean | null;
  importantDates: string;
  wantsMonitoring: boolean | null;
  wantsFlowerPlacement: boolean | null;
  // Step 5
  selectedOffer: string;
  selectedMaintenancePlan: string;
  selectedFlowerPlan: string;
  selectedFlowerOnly: string;
  // Step 6
  addOns: string[];
  // Booking intent (Monument Care / Flower Placement / Both)
  intent: IntentChoice;
  // Per-slot flower picker: ordered list of slot keys, plus date + arrangement maps
  flowerSlotKeys: string[]; // e.g. ["slot_1", "slot_2"]
  // Holiday picker for annual plans
  selectedHolidays: string[];
  holidayCustomDates: Record<string, string>;
  // Flower date picker for standalone flower bookings
  // Flower arrangement selection
  selectedArrangements: Record<string, string>;
  // Preferred date
  preferredDate: Date | null;
  // Step 7
  consentBiological: boolean;
  consentAuthorize: boolean;
  consentPhotos: boolean;
  consentTerms: boolean;
  // Gift order fields
  isGift: boolean;
  giftRecipientName: string;
  giftRecipientEmail: string;
  giftRecipientPhone: string;
  giftMessage: string;
  // Optional flower placements added on top of a one-time cleaning or annual plan.
  // For one-time cleaning: at most one entry, visitNumber === 1.
  // For annual plans: 0..N entries (N = plan visit count), each visitNumber unique.
  cleaningFlowerAddons: { visitNumber: number; arrangementId: string }[];
}

export const initialFormData: IntakeFormData = {
  cemeteryName: '',
  section: '',
  lotNumber: '',
  estimatedMiles: 0,
  cemeteryLat: null,
  cemeteryLng: null,
  deceasedName: '',
  shopperName: '',
  shopperRelationship: '',
  shopperPhone: '',
  shopperEmail: '',
  isVeteran: false,
  veteranMonumentType: '',
  veteranMaterial: '',
  monumentType: '',
  material: '',
  approximateHeight: '',
  knownDamage: false,
  conditions: {
    mossAlgae: false,
    notCleanedRecently: false,
    fadedInscription: false,
    chipping: false,
    leaning: false,
  },
  photos: [],
  livesLocally: null,
  importantDates: '',
  wantsMonitoring: null,
  wantsFlowerPlacement: null,
  selectedOffer: '',
  selectedMaintenancePlan: '',
  selectedFlowerPlan: '',
  selectedFlowerOnly: '',
  addOns: [],
  intent: '',
  flowerSlotKeys: [],
  selectedHolidays: [],
  holidayCustomDates: {},
  selectedArrangements: {},
  preferredDate: null,
  consentBiological: false,
  consentAuthorize: false,
  consentPhotos: false,
  consentTerms: false,
  isGift: false,
  giftRecipientName: '',
  giftRecipientEmail: '',
  giftRecipientPhone: '',
  giftMessage: '',
  cleaningFlowerAddons: [],
};

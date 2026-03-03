export type MonumentType = 
  | 'single_marker' | 'double_marker' | 'single_slant' 
  | 'single_upright' | 'double_slant' | 'double_upright' | 'grave_ledger';

export type MaterialType = 'granite' | 'marble' | 'bronze' | 'mixed';

export type CarePlan = 'keeper' | 'sentinel' | 'legacy';

export interface MonumentPricing {
  label: string;
  offerA: number;
  offerB: number;
  description: string;
}

export const MONUMENT_PRICES: Record<MonumentType, MonumentPricing> = {
  single_marker: { label: 'Single Marker', offerA: 150, offerB: 200, description: 'Flat ground-level marker' },
  double_marker: { label: 'Double Marker', offerA: 200, offerB: 275, description: 'Flat marker for two' },
  single_slant: { label: 'Single Slant', offerA: 175, offerB: 250, description: 'Angled face marker' },
  single_upright: { label: 'Single Upright', offerA: 225, offerB: 300, description: 'Standing headstone' },
  double_slant: { label: 'Double Slant', offerA: 250, offerB: 325, description: 'Angled face for two' },
  double_upright: { label: 'Double Upright', offerA: 300, offerB: 400, description: 'Standing headstone for two' },
  grave_ledger: { label: 'Grave Ledger', offerA: 350, offerB: 450, description: 'Full grave cover slab' },
};

export const TRAVEL_ZONES = [
  { maxMiles: 25, fee: 0, label: 'Local (0–25 mi)' },
  { maxMiles: 50, fee: 25, label: 'Zone 2 (25–50 mi)' },
  { maxMiles: 75, fee: 50, label: 'Zone 3 (50–75 mi)' },
  { maxMiles: 100, fee: 75, label: 'Zone 4 (75–100 mi)' },
  { maxMiles: Infinity, fee: 100, label: 'Zone 5 (100+ mi)' },
];

export function getTravelFee(miles: number) {
  const zone = TRAVEL_ZONES.find(z => miles <= z.maxMiles);
  return zone ?? TRAVEL_ZONES[TRAVEL_ZONES.length - 1];
}

export const CARE_PLANS = {
  keeper: {
    label: 'Keeper',
    price: 29,
    period: 'month',
    features: ['Quarterly cleaning', 'Photo updates', 'Basic monitoring', 'Priority scheduling'],
    recommended: 'out-of-state families',
  },
  sentinel: {
    label: 'Sentinel',
    price: 49,
    period: 'month',
    features: ['Bi-monthly cleaning', 'Photo updates', 'Damage monitoring', 'Priority scheduling', 'Seasonal flower placement', 'Inscription touch-up'],
    recommended: 'families wanting consistent care',
  },
  legacy: {
    label: 'Legacy',
    price: 79,
    period: 'month',
    features: ['Monthly cleaning', 'Photo & video updates', 'Full damage monitoring', 'VIP scheduling', 'Seasonal decorations', 'Inscription maintenance', 'Annual damage report', 'Flag placement'],
    recommended: 'complete peace of mind',
  },
};

export const ADD_ONS = [
  { id: 'damage_report', label: 'Damage Documentation Report', price: 65, description: 'Professional PDF report with photos' },
  { id: 'inscription_basic', label: 'Inscription Repainting (Basic)', price: 150, description: 'Single-color touch-up' },
  { id: 'inscription_detailed', label: 'Inscription Repainting (Detailed)', price: 400, description: 'Multi-color or gold leaf' },
  { id: 'flag_placement', label: 'Flag Placement', price: 25, description: 'American flag installation' },
  { id: 'weeding', label: 'Weeding & Ground Care', price: 40, description: 'Area around monument' },
  { id: 'flowers_basic', label: 'Flower Placement (Basic)', price: 35, description: 'Simple seasonal arrangement' },
  { id: 'flowers_premium', label: 'Flower Placement (Premium)', price: 75, description: 'Premium custom arrangement' },
];

export const SEASONAL_BUNDLES = [
  { id: 'remembrance_trio', label: 'Remembrance Trio', price: 199, description: 'Three seasonal visits with cleaning & flowers', savings: '$56' },
  { id: 'memorial_year', label: 'Memorial Year Bundle', price: 599, description: 'Full year of quarterly cleaning, flowers, and monitoring', savings: '$200+' },
];

export interface IntakeFormData {
  // Step 1
  cemeteryName: string;
  section: string;
  lotNumber: string;
  estimatedMiles: number;
  // Step 2
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
  // Step 4
  livesLocally: boolean | null;
  importantDates: string;
  wantsMonitoring: boolean | null;
  // Step 5
  selectedOffer: 'A' | 'B' | '';
  selectedPlan: CarePlan | '';
  selectedBundle: string;
  // Step 6
  addOns: string[];
  isVeteran: boolean;
  // Step 7
  consentBiological: boolean;
  consentAuthorize: boolean;
  consentPhotos: boolean;
}

export const initialFormData: IntakeFormData = {
  cemeteryName: '',
  section: '',
  lotNumber: '',
  estimatedMiles: 0,
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
  livesLocally: null,
  importantDates: '',
  wantsMonitoring: null,
  selectedOffer: '',
  selectedPlan: '',
  selectedBundle: '',
  addOns: [],
  isVeteran: false,
  consentBiological: false,
  consentAuthorize: false,
  consentPhotos: false,
};

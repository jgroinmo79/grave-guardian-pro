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
  single_marker: { label: 'Single Marker', price: 125, description: 'Ground-level flat marker' },
  double_marker: { label: 'Double Marker', price: 150, description: 'Wider flat marker for two' },
  single_slant: { label: 'Single Slant', price: 150, description: 'Angled headstone on a base' },
  single_upright: { label: 'Single Upright', price: 175, description: 'Standing headstone on a base' },
  double_slant: { label: 'Double Slant', price: 200, description: 'Wide angled headstone on a base' },
  double_upright: { label: 'Double Upright', price: 225, description: 'Wide standing headstone on a base' },
  grave_ledger: { label: 'Grave Ledger', price: 275, description: 'Full-grave flat slab' },
};

export const TRAVEL_ZONES = [
  { maxMiles: 25, fee: 0, label: 'Zone 1 (0–25 mi)', feeLabel: 'Included' },
  { maxMiles: 50, fee: 40, label: 'Zone 2 (26–50 mi)', feeLabel: '$40' },
  { maxMiles: 75, fee: 70, label: 'Zone 3 (51–75 mi)', feeLabel: '$70' },
  { maxMiles: 100, fee: 100, label: 'Zone 4 (76–100 mi)', feeLabel: '$100' },
  { maxMiles: 150, fee: 150, label: 'Zone 5 (101–150 mi)', feeLabel: '$150' },
  { maxMiles: Infinity, fee: 0, label: 'Zone 6 (150+ mi)', feeLabel: 'Custom Quote' },
];

export function getTravelFee(miles: number) {
  const zone = TRAVEL_ZONES.find(z => miles <= z.maxMiles);
  return zone ?? TRAVEL_ZONES[TRAVEL_ZONES.length - 1];
}

export const SERVICE_FEATURES = [
  'Full monument cleaning with Endurance Gravestone & Monument Cleaner',
  'Biological growth inhibitor applied',
  '4 GPS-timestamped photos texted/emailed same day',
  'Weeding and edging around monument',
  'Scheduled within 1 week of booking',
];

export const MAINTENANCE_PLANS = {
  keeper: { label: 'The Keeper', visits: 2, description: '2 cleaning visits per year' },
  sentinel: { label: 'The Sentinel', visits: 3, description: '3 cleaning visits per year' },
  legacy: { label: 'The Legacy', visits: 4, description: '4 cleaning visits per year' },
};

export const MAINTENANCE_PLAN_PRICES: Record<MonumentType, Record<string, number>> = {
  single_marker: { keeper: 180, sentinel: 260, legacy: 340 },
  double_marker: { keeper: 230, sentinel: 330, legacy: 430 },
  single_slant: { keeper: 230, sentinel: 330, legacy: 430 },
  single_upright: { keeper: 270, sentinel: 390, legacy: 510 },
  double_slant: { keeper: 320, sentinel: 460, legacy: 600 },
  double_upright: { keeper: 360, sentinel: 520, legacy: 680 },
  grave_ledger: { keeper: 450, sentinel: 650, legacy: 850 },
};

export const FLOWER_PLANS = {
  tribute: { label: 'The Tribute', cleanings: 1, flowers: 1, description: '1 cleaning + 1 flower placement per year' },
  remembrance: { label: 'The Remembrance', cleanings: 2, flowers: 2, description: '2 cleanings + 2 flower placements per year' },
  devotion: { label: 'The Devotion', cleanings: 3, flowers: 3, description: '3 cleanings + 3 flower placements per year' },
  eternal: { label: 'The Eternal', cleanings: 4, flowers: 4, description: '4 cleanings + 4 flower placements per year' },
};

export const FLOWER_PLAN_PRICES: Record<MonumentType, Record<string, number>> = {
  single_marker: { tribute: 200, remembrance: 355, devotion: 510, eternal: 665 },
  double_marker: { tribute: 225, remembrance: 400, devotion: 575, eternal: 750 },
  single_slant: { tribute: 225, remembrance: 400, devotion: 575, eternal: 750 },
  single_upright: { tribute: 250, remembrance: 445, devotion: 640, eternal: 835 },
  double_slant: { tribute: 275, remembrance: 490, devotion: 705, eternal: 920 },
  double_upright: { tribute: 300, remembrance: 535, devotion: 770, eternal: 1005 },
  grave_ledger: { tribute: 350, remembrance: 625, devotion: 900, eternal: 1175 },
};

export const FLOWER_ONLY_PLANS = [
  { id: 'flower_1', label: '1 Flower Placement', placements: 1, price: 100 },
  { id: 'flower_2', label: '2 Flower Placements', placements: 2, price: 175 },
  { id: 'flower_3', label: '3 Flower Placements', placements: 3, price: 250 },
  { id: 'flower_4', label: '4 Flower Placements', placements: 4, price: 325 },
];

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
  // Gift order fields
  isGift: boolean;
  giftRecipientName: string;
  giftRecipientEmail: string;
  giftRecipientPhone: string;
  giftMessage: string;
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
  selectedHolidays: [],
  holidayCustomDates: {},
  selectedArrangements: {},
  preferredDate: null,
  consentBiological: false,
  consentAuthorize: false,
  consentPhotos: false,
  isGift: false,
  giftRecipientName: '',
  giftRecipientEmail: '',
  giftRecipientPhone: '',
  giftMessage: '',
};

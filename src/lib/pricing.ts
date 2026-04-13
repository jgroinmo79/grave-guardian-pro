export type MonumentType = 
  | 'single_marker' | 'double_marker' | 'single_slant' | 'single_upright'
  | 'double_slant' | 'double_upright' | 'grave_ledger';

export type VeteranMonumentType = 'va_upright' | 'va_flat' | 'va_niche';

export type VeteranMaterialType = 'granite' | 'marble' | 'bronze';

export type MaterialType = 'granite' | 'marble' | 'bronze' | 'mixed';

export type CarePlan = 'keeper' | 'sentinel' | 'legacy';

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

export const CARE_PLANS = {
  keeper: {
    label: 'The Keeper',
    price: 525,
    period: 'year',
    description: '2 visits · 1 flower placement. Choose 1 date: Memorial Day, Easter, Christmas, Mother\'s Day, Father\'s Day, birthday, or anniversary.',
    features: [
      '2 full cleaning visits (spring + fall)',
      '1 included flower placement on your chosen holiday',
      'Photos after each visit',
      'Condition report',
      'Priority scheduling',
      'Automatic damage documentation if deterioration found',
    ],
    recommended: 'out-of-state families',
  },
  sentinel: {
    label: 'The Sentinel',
    price: 675,
    period: 'year',
    description: '3 visits · 2 flower placements. Choose 2 dates: Memorial Day, Easter, Christmas, Mother\'s Day, Father\'s Day, birthday, or anniversary.',
    features: [
      '3 full cleaning visits (spring, summer, fall)',
      '2 included flower placements on your chosen holidays',
      'Photos after each visit',
      'Condition report',
      'Priority scheduling',
      'Automatic damage documentation if deterioration found',
    ],
    recommended: 'families wanting consistent care',
  },
  legacy: {
    label: 'The Legacy',
    price: 1200,
    period: 'year',
    description: '4 visits · 3 flower placements. Choose 3 dates: Memorial Day, Christmas, Mother\'s Day, Father\'s Day, birthday, or anniversary.',
    features: [
      '4 full cleaning visits (quarterly)',
      '3 included flower placements on your chosen dates',
      'Photos after each visit',
      'Condition report',
      'Top-priority scheduling',
      'Automatic damage documentation if deterioration found',
      'Annual preservation assessment',
    ],
    recommended: 'complete peace of mind',
  },
};

export const SEASONAL_BUNDLES = [
  {
    id: 'single_arrangement',
    label: 'Single Arrangement & Placement',
    price: 100,
    description: 'One arrangement delivered and placed on your chosen date. Photo confirmation sent same day. Travel fee applies.',
    savings: null,
  },
  {
    id: 'memorial_day',
    label: 'The Memorial Day Bundle',
    price: 325,
    description: 'Honor their service. Full restoration cleaning, American flag placement, seasonal flower arrangement, condition report. Scheduled the week of Memorial Day.',
    savings: null,
  },
  {
    id: 'remembrance_trio',
    label: 'The Remembrance Trio',
    price: 450,
    description: '3 flower placements on 3 customer-chosen dates — birthdays, holidays, anniversaries. Seasonal arrangement, photos every visit, eyes on the stone every trip.',
    savings: 'Save $75–$150',
  },
  {
    id: 'memorial_year',
    label: 'The Memorial Year Bundle',
    price: 650,
    description: '5 flower placements on 5 customer-chosen dates. Any combination of holidays, birthdays, anniversaries. Priority holiday scheduling.',
    savings: 'Save $225–$350',
  },
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
  selectedPlan: CarePlan | '';
  selectedBundle: string;
  // Step 6
  addOns: string[];
  // Holiday picker for annual plans
  selectedHolidays: string[];
  holidayCustomDates: Record<string, string>; // e.g. { "Deceased's Birthday": "03-15" }
  // Flower date picker for standalone flower bookings
  flowerHolidays: string[];
  flowerCustomDates: Record<string, string>;
  // Flower arrangement selection
  selectedArrangementId: string;
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
  selectedPlan: '',
  selectedBundle: '',
  addOns: [],
  selectedHolidays: [],
  holidayCustomDates: {},
  flowerHolidays: [],
  flowerCustomDates: {},
  selectedArrangementId: '',
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

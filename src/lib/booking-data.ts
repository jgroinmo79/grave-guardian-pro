// Monument types for the booking flow
export type BookingMonumentType =
  | 'single_upright'
  | 'flat_flush'
  | 'double_companion'
  | 'monument_base'
  | 'bronze_plaque'
  | 'obelisk'
  | 'mausoleum_panel';

export const MONUMENT_OPTIONS: { value: BookingMonumentType; label: string }[] = [
  { value: 'single_upright', label: 'Single Upright Headstone' },
  { value: 'flat_flush', label: 'Flat / Flush Grave Marker' },
  { value: 'double_companion', label: 'Double / Companion Stone' },
  { value: 'monument_base', label: 'Monument with Base' },
  { value: 'bronze_plaque', label: 'Bronze Plaque on Granite' },
  { value: 'obelisk', label: 'Obelisk / Unique Shape' },
  { value: 'mausoleum_panel', label: 'Mausoleum Panel' },
];

export const STANDARD_PRICES: Record<BookingMonumentType, number> = {
  single_upright: 175,
  flat_flush: 175,
  double_companion: 225,
  monument_base: 275,
  bronze_plaque: 225,
  obelisk: 275,
  mausoleum_panel: 375,
};

export const PREMIUM_PRICES: Record<BookingMonumentType, number> = {
  single_upright: 225,
  flat_flush: 225,
  double_companion: 275,
  monument_base: 325,
  bronze_plaque: 275,
  obelisk: 325,
  mausoleum_panel: 425,
};

export const STANDARD_INCLUDES = [
  'CCUS-standard clean with Orvus Paste',
  '4 photos delivered same day',
  'Condition assessment',
];

export const PREMIUM_INCLUDES = [
  'Everything in Standard',
  'D/2 Biological Solution treatment',
  'Biological growth inhibitor application',
  'Plot edging',
];

export const CARE_PLANS_BOOKING = [
  {
    id: 'keeper' as const,
    label: 'The Keeper',
    price: 475,
    period: '/yr',
    features: [
      '2 visits per year (spring + fall)',
      '4 photos after each visit',
      'Condition report',
      'Priority scheduling',
      'Automatic Damage Documentation Report triggered if deterioration is found',
    ],
  },
  {
    id: 'sentinel' as const,
    label: 'The Sentinel',
    price: 575,
    period: '/yr',
    features: [
      '3 visits per year (spring, summer, fall)',
      '4 photos after each visit',
      'Condition report',
      'Priority scheduling',
      'Auto damage doc',
      '1 complimentary flower placement included',
    ],
  },
  {
    id: 'legacy' as const,
    label: 'The Legacy',
    price: 1200,
    period: '/yr',
    features: [
      '4 visits per year (quarterly)',
      '4 photos after each visit',
      'Condition report',
      'Top-priority scheduling',
      'Auto damage doc',
      '2 premium flower placements on customer-chosen dates',
      'Annual preservation assessment',
    ],
  },
];

export const FLOWER_OPTIONS = [
  {
    id: 'single_arrangement',
    label: 'Single Arrangement & Placement',
    price: 100,
    priceNote: '+ travel fee',
    description: 'One arrangement delivered and placed on your chosen date. Photo confirmation sent same day.',
  },
  {
    id: 'memorial_day',
    label: 'Memorial Day Bundle',
    price: 325,
    priceNote: '',
    description: 'Full cleaning (Standard tier) + premium arrangement, scheduled around May 26.',
  },
  {
    id: 'remembrance_trio',
    label: 'Remembrance Trio',
    price: 450,
    priceNote: '',
    description: '3 flower placements on 3 customer-chosen dates (e.g. birthday, anniversary, holiday).',
  },
  {
    id: 'memorial_year',
    label: 'Memorial Year Flower Plan',
    price: 650,
    priceNote: '/yr',
    description: '5 placements per year on scheduled dates. No cleaning included — purely remembrance-focused.',
  },
];

export const TRAVEL_ZONES_BOOKING = [
  { label: 'Zone 1', range: '0–25 miles from Benton', fee: 'No charge' },
  { label: 'Zone 2', range: '26–50 miles', fee: '$35' },
  { label: 'Zone 3', range: '51–75 miles', fee: '$70' },
  { label: 'Zone 4', range: '76–100 miles', fee: '$105' },
  { label: 'Zone 5', range: '101–125 miles', fee: '$140' },
  { label: 'Zone 6', range: '126+ miles', fee: 'Quoted at booking ($0.70/mile round-trip)' },
];

export type ServiceType = 'one_time' | 'annual_plan' | 'flower_placement';
export type CleaningTier = 'standard' | 'premium';

export interface BookingFormData {
  // Step 1
  serviceType: ServiceType | '';
  // Step 2 — One-Time
  monumentType: BookingMonumentType | '';
  cleaningTier: CleaningTier | '';
  multiStone: boolean;
  addDamageReport: boolean;
  // Step 2 — Annual
  carePlan: 'keeper' | 'sentinel' | 'legacy' | '';
  // Step 2 — Flowers
  flowerOption: string;
  // Shared
  isVeteran: boolean;
  isMinor: boolean; // 17 or younger
  // Step 3
  preferredDate: Date | null;
  cemeteryAddress: string;
  cemeteryLat: number | null;
  cemeteryLng: number | null;
  notes: string;
}

export const initialBookingData: BookingFormData = {
  serviceType: '',
  monumentType: '',
  cleaningTier: '',
  multiStone: false,
  addDamageReport: false,
  carePlan: '',
  flowerOption: '',
  isVeteran: false,
  isMinor: false,
  preferredDate: null,
  cemeteryAddress: '',
  cemeteryLat: null,
  cemeteryLng: null,
  notes: '',
};

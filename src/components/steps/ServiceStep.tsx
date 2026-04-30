import {
  IntakeFormData,
  MonumentType,
  MONUMENT_PRICES,
  SERVICE_FEATURES,
  cleaningPlanPrice,
  flowerFlatPrice,
  comboPlanPrice,
} from "@/lib/pricing";
import { Check, Sparkles, Flower2, Star } from "lucide-react";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

type PlanCard = {
  key: string;
  title: string;
  description: string;
  price: number;
  bestValue?: boolean;
  // Mutator that sets the right state slots so downstream code (checkout, webhook) stays valid
  apply: () => Partial<IntakeFormData>;
  // Returns true if this card is currently selected
  isSelected: (d: IntakeFormData) => boolean;
};

const baseReset: Partial<IntakeFormData> = {
  selectedOffer: '',
  selectedMaintenancePlan: '',
  selectedFlowerPlan: '',
  selectedFlowerOnly: '',
  selectedHolidays: [],
  holidayCustomDates: {},
  selectedArrangements: {},
};

const buildCleaningOnlyPlans = (B: number): PlanCard[] => [
  {
    key: 'cleaning_1',
    title: '1 Cleaning',
    description: 'A single, thorough monument cleaning visit.',
    price: cleaningPlanPrice(B, 1),
    apply: () => ({ ...baseReset, selectedOffer: 'cleaning' }),
    isSelected: (d) => d.selectedOffer === 'cleaning' && !d.selectedMaintenancePlan && !d.selectedFlowerPlan && !d.selectedFlowerOnly,
  },
  {
    key: 'keeper',
    title: '2 Cleanings',
    description: 'Two cleaning visits across the year — spring and fall.',
    price: cleaningPlanPrice(B, 2),
    apply: () => ({ ...baseReset, selectedOffer: 'cleaning', selectedMaintenancePlan: 'keeper' }),
    isSelected: (d) => d.selectedMaintenancePlan === 'keeper',
  },
  {
    key: 'sentinel',
    title: '3 Cleanings',
    description: 'Three cleaning visits — spaced through the year.',
    price: cleaningPlanPrice(B, 3),
    bestValue: true,
    apply: () => ({ ...baseReset, selectedOffer: 'cleaning', selectedMaintenancePlan: 'sentinel' }),
    isSelected: (d) => d.selectedMaintenancePlan === 'sentinel',
  },
  {
    key: 'legacy',
    title: '4 Cleanings',
    description: 'Four cleaning visits — full year of premium care.',
    price: cleaningPlanPrice(B, 4),
    apply: () => ({ ...baseReset, selectedOffer: 'cleaning', selectedMaintenancePlan: 'legacy' }),
    isSelected: (d) => d.selectedMaintenancePlan === 'legacy',
  },
];

const buildComboPlans = (B: number): PlanCard[] => [
  {
    key: 'tribute',
    title: '1 Cleaning + 1 Placement',
    description: 'A single cleaning paired with one flower placement.',
    price: comboPlanPrice(B, 1),
    apply: () => ({ ...baseReset, selectedOffer: 'cleaning', selectedFlowerPlan: 'tribute' }),
    isSelected: (d) => d.selectedFlowerPlan === 'tribute',
  },
  {
    key: 'remembrance',
    title: '2 Cleanings + 2 Placements',
    description: 'Two cleanings and two flower placements through the year.',
    price: comboPlanPrice(B, 2),
    bestValue: true,
    apply: () => ({ ...baseReset, selectedOffer: 'cleaning', selectedFlowerPlan: 'remembrance' }),
    isSelected: (d) => d.selectedFlowerPlan === 'remembrance',
  },
  {
    key: 'devotion',
    title: '3 Cleanings + 3 Placements',
    description: 'Three cleanings and three flower placements — premium care.',
    price: comboPlanPrice(B, 3),
    bestValue: true,
    apply: () => ({ ...baseReset, selectedOffer: 'cleaning', selectedFlowerPlan: 'devotion' }),
    isSelected: (d) => d.selectedFlowerPlan === 'devotion',
  },
  {
    key: 'eternal',
    title: '4 Cleanings + 4 Placements',
    description: 'Full annual coverage — four of each, the highest tier.',
    price: comboPlanPrice(B, 4),
    apply: () => ({ ...baseReset, selectedOffer: 'cleaning', selectedFlowerPlan: 'eternal' }),
    isSelected: (d) => d.selectedFlowerPlan === 'eternal',
  },
];

const buildFlowerOnlyPlans = (): PlanCard[] => [
  {
    key: 'flower_1',
    title: '1 Flower Placement',
    description: 'A single seasonal flower placement at the monument.',
    price: flowerFlatPrice(1),
    apply: () => ({ ...baseReset, selectedFlowerOnly: 'flower_1' }),
    isSelected: (d) => d.selectedFlowerOnly === 'flower_1',
  },
  {
    key: 'flower_2',
    title: '2 Flower Placements',
    description: 'Two flower placements scheduled across the year.',
    price: flowerFlatPrice(2),
    apply: () => ({ ...baseReset, selectedFlowerOnly: 'flower_2' }),
    isSelected: (d) => d.selectedFlowerOnly === 'flower_2',
  },
  {
    key: 'flower_3',
    title: '3 Flower Placements',
    description: 'Three flower placements — covers most major occasions.',
    price: flowerFlatPrice(3),
    apply: () => ({ ...baseReset, selectedFlowerOnly: 'flower_3' }),
    isSelected: (d) => d.selectedFlowerOnly === 'flower_3',
  },
  {
    key: 'flower_4',
    title: '4 Flower Placements',
    description: 'Four flower placements — full year of remembrance.',
    price: flowerFlatPrice(4),
    apply: () => ({ ...baseReset, selectedFlowerOnly: 'flower_4' }),
    isSelected: (d) => d.selectedFlowerOnly === 'flower_4',
  },
];

const ServiceStep = ({ data, update }: Props) => {
  const monument = data.monumentType ? MONUMENT_PRICES[data.monumentType as MonumentType] : null;
  const intent = data.intent || 'monument'; // safe default

  let plans: PlanCard[] = [];
  let heading = '';
  let subheading = '';
  let Icon = Sparkles;

  if (intent === 'flowers') {
    plans = buildFlowerOnlyPlans();
    heading = 'Choose Your Flower Plan';
    subheading = 'Flat pricing — no monument cleaning included.';
    Icon = Flower2;
  } else if (!monument) {
    return (
      <div className="text-center text-muted-foreground py-12">
        Please go back and select a monument type first.
      </div>
    );
  } else if (intent === 'both') {
    plans = buildComboPlans(monument.price);
    heading = 'Choose Your Care + Flower Plan';
    subheading = `Pricing based on your ${monument.label} ($${monument.price} base).`;
    Icon = Flower2;
  } else {
    plans = buildCleaningOnlyPlans(monument.price);
    heading = 'Choose Your Monument Care Plan';
    subheading = `Pricing based on your ${monument.label} ($${monument.price} base).`;
    Icon = Sparkles;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-2">
        <Icon className="w-8 h-8 text-primary mx-auto mb-3" />
        <h2 className="text-3xl font-display font-bold mb-2">{heading}</h2>
        <p className="text-muted-foreground font-serif">{subheading}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {plans.map((plan) => {
          const selected = plan.isSelected(data);
          return (
            <button
              key={plan.key}
              type="button"
              onClick={() => update(plan.apply())}
              className={`relative p-5 rounded-xl border text-left transition-all flex flex-col min-h-[180px] ${
                selected
                  ? 'border-primary bg-primary/10 shadow-patina ring-2 ring-primary/30'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              {plan.bestValue && (
                <span className="absolute -top-2.5 right-4 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" /> Best Value
                </span>
              )}
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-display font-bold text-lg leading-tight">{plan.title}</h3>
                <p className="font-display font-bold text-2xl text-primary whitespace-nowrap">
                  ${plan.price}
                </p>
              </div>
              <p className="text-sm text-muted-foreground font-serif flex-1">{plan.description}</p>
              {selected && (
                <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary uppercase tracking-widest">
                  <Check className="w-3.5 h-3.5" /> Selected
                </div>
              )}
            </button>
          );
        })}
      </div>

      {intent !== 'flowers' && (
        <div className="max-w-2xl mx-auto rounded-lg border border-border bg-secondary/30 p-4 mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
            Every cleaning includes
          </p>
          <ul className="space-y-1.5 text-sm text-muted-foreground font-serif">
            {SERVICE_FEATURES.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-primary mt-1 shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ServiceStep;

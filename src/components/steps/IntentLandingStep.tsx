import { IntakeFormData, IntentChoice } from "@/lib/pricing";
import { Sparkles, Flower2, Heart } from "lucide-react";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

const OPTIONS: { id: IntentChoice; title: string; subtitle: string; icon: typeof Sparkles }[] = [
  {
    id: 'monument',
    title: 'Monument Care',
    subtitle: 'Cleaning and preservation only',
    icon: Sparkles,
  },
  {
    id: 'flowers',
    title: 'Flower Placement',
    subtitle: 'The Finer Detail placement only',
    icon: Flower2,
  },
  {
    id: 'both',
    title: 'Both',
    subtitle: 'Monument care and flower placement together',
    icon: Heart,
  },
];

const IntentLandingStep = ({ data, update }: Props) => {
  const handleSelect = (choice: IntentChoice) => {
    // Reset downstream selections so a switch in intent doesn't leave stale state
    update({
      intent: choice,
      selectedOffer: '',
      selectedMaintenancePlan: '',
      selectedFlowerPlan: '',
      selectedFlowerOnly: '',
      selectedHolidays: [],
      holidayCustomDates: {},
      selectedArrangements: {},
      flowerSlotKeys: [],
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center max-w-xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-display font-bold mb-3 text-foreground">
          What brings you here today?
        </h1>
        <p className="text-muted-foreground font-serif text-lg">
          Choose the path that fits — we'll tailor the rest of your booking.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const selected = data.intent === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt.id)}
              className={`group relative p-6 rounded-2xl border text-left transition-all min-h-[200px] flex flex-col ${
                selected
                  ? "border-primary bg-primary/10 shadow-patina ring-2 ring-primary/30"
                  : "border-border bg-card hover:border-primary/60 hover:bg-card/80"
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${
                selected ? "bg-primary/20" : "bg-secondary/60 group-hover:bg-primary/15"
              }`}>
                <Icon className={`w-6 h-6 ${selected ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
              </div>
              <h3 className="font-display font-bold text-xl mb-2">{opt.title}</h3>
              <p className="text-sm text-muted-foreground font-serif leading-relaxed">
                {opt.subtitle}
              </p>
              {selected && (
                <span className="absolute top-3 right-3 text-[10px] uppercase tracking-widest text-primary font-semibold">
                  Selected
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default IntentLandingStep;

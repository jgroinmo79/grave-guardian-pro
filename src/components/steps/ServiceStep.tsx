import { IntakeFormData, MonumentType, MONUMENT_PRICES, MAINTENANCE_PLANS, MAINTENANCE_PLAN_PRICES, FLOWER_PLANS, FLOWER_PLAN_PRICES, FLOWER_ONLY_PLANS, SERVICE_FEATURES } from "@/lib/pricing";
import { Check, Leaf, Flower2 } from "lucide-react";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

const ServiceStep = ({ data, update }: Props) => {
  const resolvedMonumentType: MonumentType | null = data.monumentType
    ? data.monumentType as MonumentType
    : null;
  const monument = resolvedMonumentType ? MONUMENT_PRICES[resolvedMonumentType] : null;

  const hasSelectedCleaning = data.selectedOffer !== '';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-display font-bold mb-2">Select Your Service</h2>
        <p className="text-muted-foreground">Choose the right cleaning package</p>
      </div>

      {monument && resolvedMonumentType ? (
        <div className="max-w-lg mx-auto space-y-8">
          {/* Section A: One-Time Cleaning */}
          <button
            onClick={() => update({ selectedOffer: 'cleaning' })}
            className={`relative w-full p-5 rounded-lg border text-left transition-all ${
              hasSelectedCleaning
                ? "border-primary bg-primary/10"
                : "border-border bg-secondary/30 hover:border-muted-foreground/40"
            }`}
          >
            <p className="font-display font-bold text-xl">{monument.label} — Cleaning</p>
            <p className="text-xs text-muted-foreground mt-1">A thorough, professional clean using industry-approved methods</p>
            <p className="text-3xl font-bold text-foreground mt-2">${monument.price}</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {SERVICE_FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>
          </button>

          {/* Section B: Annual Maintenance Plans */}
          {hasSelectedCleaning && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Leaf className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-display font-bold text-lg">Annual Maintenance Plans</p>
                  <p className="text-xs text-muted-foreground">Recurring cleaning visits — no flowers.</p>
                </div>
              </div>
              {(Object.keys(MAINTENANCE_PLANS) as Array<keyof typeof MAINTENANCE_PLANS>).map((key) => {
                const plan = MAINTENANCE_PLANS[key];
                const price = MAINTENANCE_PLAN_PRICES[resolvedMonumentType]?.[key];
                const selected = data.selectedMaintenancePlan === key;
                return (
                  <button
                    key={key}
                    onClick={() => update({
                      selectedMaintenancePlan: selected ? '' : key,
                      ...(selected ? {} : { selectedFlowerPlan: '', selectedFlowerOnly: '' }),
                    })}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/30 hover:border-muted-foreground/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold">{plan.label}</p>
                        <p className="text-xs text-muted-foreground">{plan.description}</p>
                      </div>
                      {price && <p className="text-sm font-bold ml-3 whitespace-nowrap">${price}/yr</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Section C: Cleaning + Flower Plans */}
          {hasSelectedCleaning && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Flower2 className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-display font-bold text-lg">Cleaning & Flower Plans</p>
                  <p className="text-xs text-muted-foreground">Combined cleaning visits and flower placements.</p>
                </div>
              </div>
              {(Object.keys(FLOWER_PLANS) as Array<keyof typeof FLOWER_PLANS>).map((key) => {
                const plan = FLOWER_PLANS[key];
                const price = FLOWER_PLAN_PRICES[resolvedMonumentType]?.[key];
                const selected = data.selectedFlowerPlan === key;
                return (
                  <button
                    key={key}
                    onClick={() => update({
                      selectedFlowerPlan: selected ? '' : key,
                      ...(selected ? {} : { selectedMaintenancePlan: '', selectedFlowerOnly: '' }),
                    })}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/30 hover:border-muted-foreground/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold">{plan.label}</p>
                        <p className="text-xs text-muted-foreground">{plan.description}</p>
                      </div>
                      {price && <p className="text-sm font-bold ml-3 whitespace-nowrap">${price}/yr</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Section D: Flower Placement Only */}
          {hasSelectedCleaning && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Flower2 className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-display font-bold text-lg">Flower Placements Only</p>
                  <p className="text-xs text-muted-foreground">Standalone flower placements without cleaning. Travel fee applies.</p>
                </div>
              </div>
              {FLOWER_ONLY_PLANS.map((plan) => {
                const selected = data.selectedFlowerOnly === plan.id;
                return (
                  <button
                    key={plan.id}
                    onClick={() => update({
                      selectedFlowerOnly: selected ? '' : plan.id,
                      ...(selected ? {} : { selectedMaintenancePlan: '', selectedFlowerPlan: '' }),
                    })}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/30 hover:border-muted-foreground/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold">{plan.label}</p>
                      </div>
                      <p className="text-sm font-bold ml-3 whitespace-nowrap">${plan.price}/yr</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">Please go back and select a monument type first.</p>
      )}
    </div>
  );
};

export default ServiceStep;

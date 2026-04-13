import { useState } from "react";
import { IntakeFormData, MonumentType, MONUMENT_PRICES, MAINTENANCE_PLANS, MAINTENANCE_PLAN_PRICES, SERVICE_FEATURES } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Check, Shield, Sparkles, X, Leaf, Flower2, Star } from "lucide-react";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

// Map veteran monument types to their pricing equivalent
const VETERAN_PRICE_MAP: Record<string, MonumentType> = {
  va_upright: 'single_upright',
  va_flat: 'single_marker',
  va_niche: 'single_marker',
};

const ServiceStep = ({ data, update }: Props) => {
  // Resolve monument pricing — works for both veteran and non-veteran flows
  const resolvedMonumentType: MonumentType | null = data.monumentType
    ? data.monumentType as MonumentType
    : data.isVeteran && data.veteranMonumentType
    ? VETERAN_PRICE_MAP[data.veteranMonumentType] || 'single_upright'
    : null;
  const monument = resolvedMonumentType ? MONUMENT_PRICES[resolvedMonumentType] : null;

  const isOutOfState = data.livesLocally === false;
  const wantsFlowers = data.wantsFlowerPlacement === true;
  const wantsMonitoring = data.wantsMonitoring === true;
  const hasSelectedOffer = data.selectedOffer !== '';

  // Determine which maintenance plans to recommend based on intent
  const getRecommendedPlan = (): string | null => {
    if (wantsFlowers && (isOutOfState || wantsMonitoring)) return 'legacy';
    if (wantsMonitoring && isOutOfState) return 'sentinel';
    if (wantsMonitoring) return 'keeper';
    if (isOutOfState) return 'keeper';
    return null;
  };

  const recommendedPlan = getRecommendedPlan();
  const showCarePlans = hasSelectedOffer;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">Step 5</span>
        <h2 className="text-3xl font-display font-bold mb-2 mt-2">Select Your Service</h2>
        <p className="text-muted-foreground">Choose the right cleaning package</p>
      </div>

      {monument && (
        <div className="max-w-lg mx-auto space-y-6">
          {/* Single service option */}
          <button
            onClick={() => update({ selectedOffer: 'A' })}
            className={`relative w-full p-5 rounded-lg border text-left transition-all ${
              data.selectedOffer !== ''
                ? "border-primary bg-primary/10"
                : "border-border bg-secondary/30 hover:border-muted-foreground/40"
            }`}
          >
            <p className="font-display font-bold text-xl mt-1">Monument Cleaning</p>
            <p className="text-xs text-muted-foreground mt-1">A thorough, professional clean using industry-approved methods</p>
            <p className="text-3xl font-bold text-foreground mt-2">
              ${monument.price}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {SERVICE_FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>
          </button>

          {/* Contextual Maintenance Plans */}
          {showCarePlans && (
            <div className="space-y-3">
              <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                <p className="text-sm font-semibold text-primary mb-1 flex items-center gap-2">
                  <Leaf className="w-4 h-4" />
                  {isOutOfState && wantsMonitoring
                    ? "You're out of state and want monitoring — a Care Plan is perfect for you"
                    : isOutOfState
                    ? "Since you're out of state, a Care Plan keeps your loved one's memorial maintained"
                    : "Ongoing monitoring with a Care Plan gives you year-round peace of mind"}
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Set-it-and-forget-it memorial care — you always know who's at your loved one's grave.
                </p>
                <div className="space-y-2">
                  {(Object.keys(MAINTENANCE_PLANS) as Array<keyof typeof MAINTENANCE_PLANS>).map((key) => {
                    const plan = MAINTENANCE_PLANS[key];
                    const planPrice = resolvedMonumentType ? MAINTENANCE_PLAN_PRICES[resolvedMonumentType]?.[key] : null;
                    const isRecommended = key === recommendedPlan;
                    return (
                      <button
                        key={key}
                        onClick={() => update({ selectedMaintenancePlan: data.selectedMaintenancePlan === key ? '' : key })}
                        className={`w-full p-3 rounded-lg border text-left transition-all relative ${
                          data.selectedMaintenancePlan === key
                            ? "border-primary bg-primary/10"
                            : isRecommended
                            ? "border-primary/50 bg-primary/5"
                            : "border-border bg-secondary/20 hover:border-muted-foreground/40"
                        }`}
                      >
                        {isRecommended && (
                          <span className="absolute -top-2 right-3 text-[10px] font-bold uppercase tracking-wider gradient-patina text-primary-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Star className="w-2.5 h-2.5" /> Recommended
                          </span>
                        )}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold">{plan.label}</p>
                            <p className="text-xs text-muted-foreground">{plan.description}</p>
                          </div>
                          {planPrice && <p className="text-sm font-bold ml-3 whitespace-nowrap">${planPrice}/yr</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!monument && (
        <p className="text-center text-muted-foreground">Please go back and select a monument type first.</p>
      )}
    </div>
  );
};

export default ServiceStep;

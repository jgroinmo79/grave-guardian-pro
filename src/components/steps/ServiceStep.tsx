import { useState } from "react";
import { IntakeFormData, MONUMENT_PRICES, CARE_PLANS, SEASONAL_BUNDLES, CarePlan, OFFER_A_FEATURES, OFFER_B_EXTRAS } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Check, Shield, Sparkles, X, Leaf, Flower2, Star } from "lucide-react";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

const ServiceStep = ({ data, update }: Props) => {
  const [showUpsell, setShowUpsell] = useState(false);
  const monument = data.monumentType ? MONUMENT_PRICES[data.monumentType] : null;
  

  const handleSelectA = () => {
    update({ selectedOffer: 'A' });
    setShowUpsell(true);
  };

  const handleUpgradeToB = () => {
    update({ selectedOffer: 'B' });
    setShowUpsell(false);
  };

  const isOutOfState = data.livesLocally === false;
  const wantsFlowers = data.wantsFlowerPlacement === true;
  const wantsMonitoring = data.wantsMonitoring === true;
  const hasImportantDates = data.importantDates.trim().length > 0;
  const hasSelectedOffer = data.selectedOffer !== '';

  // Determine which care plans to recommend based on intent
  const getRecommendedPlan = (): CarePlan | null => {
    if (wantsFlowers && (isOutOfState || wantsMonitoring)) return 'legacy';
    if (wantsMonitoring && isOutOfState) return 'sentinel';
    if (wantsMonitoring) return 'keeper';
    if (isOutOfState) return 'keeper';
    return null;
  };

  const recommendedPlan = getRecommendedPlan();
  const showCarePlans = hasSelectedOffer;
  const showBundles = hasSelectedOffer;

  const formatPlanPrice = (plan: typeof CARE_PLANS[CarePlan]) => {
    if (plan.period === 'one-time') return `$${plan.price}`;
    return `$${plan.price}/yr`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">Step 5</span>
        <h2 className="text-3xl font-display font-bold mb-2 mt-2">Select Your Service</h2>
        <p className="text-muted-foreground">Choose the right cleaning package</p>
      </div>

      {monument && (
        <div className="max-w-lg mx-auto space-y-6">
          {/* Essential vs Full Service */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Essential Clean */}
            <button
              onClick={handleSelectA}
              className={`relative p-5 rounded-lg border text-left transition-all ${
                data.selectedOffer === 'A'
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary/30 hover:border-muted-foreground/40"
              }`}
            >
              <p className="font-display font-bold text-xl mt-1">Standard Clean</p>
              <p className="text-xs text-muted-foreground mt-1">A thorough, gentle clean using CCUS-approved methods</p>
              <p className="text-3xl font-bold text-foreground mt-2">
                ${monument.offerA}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {OFFER_A_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </button>

            {/* Full Service Clean */}
            <button
              onClick={() => { update({ selectedOffer: 'B' }); setShowUpsell(false); }}
              className={`relative p-5 rounded-lg border text-left transition-all ${
                data.selectedOffer === 'B'
                  ? "border-primary bg-primary/10 shadow-patina"
                  : "border-border bg-secondary/30 hover:border-muted-foreground/40"
              }`}
            >
              <span className="absolute -top-2.5 right-3 text-[10px] font-bold uppercase tracking-wider gradient-patina text-primary-foreground px-2 py-0.5 rounded-full">
                Best Value
              </span>
              <p className="font-display font-bold text-xl mt-1">Restoration Clean</p>
              <p className="text-3xl font-bold text-foreground mt-2">
                ${monument.offerB}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> Everything in Standard Clean
                </li>
                {OFFER_B_EXTRAS.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Shield className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </button>
          </div>

          {/* Upsell Modal */}
          {showUpsell && data.selectedOffer === 'A' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
              <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl">
                <div className="flex justify-between items-start mb-4">
                  <Shield className="w-8 h-8 text-accent" />
                  <button onClick={() => setShowUpsell(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="font-display font-bold text-xl mb-2">Protect Your Investment</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add D/2 Biological Solution growth inhibitor, detailed condition report, weeding & edging, 
                  and groundskeeping damage documentation for just <span className="text-accent font-bold">${monument.offerB - monument.offerA} more</span>. 
                  Keeps the monument cleaner 3–5× longer.
                </p>
                <div className="flex gap-3">
                  <Button variant="hero" className="flex-1" onClick={handleUpgradeToB}>
                     Upgrade to Full Service
                   </Button>
                  <Button variant="outline" onClick={() => setShowUpsell(false)}>
                    No thanks
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Contextual Seasonal Bundles — shown when user wants flowers or has important dates */}
          {showBundles && (
            <div className="space-y-3">
              <h3 className="text-lg font-display font-semibold flex items-center gap-2">
                <Flower2 className="w-5 h-5 text-accent" /> Flower & Holiday Bundles
              </h3>
              <p className="text-xs text-muted-foreground">
                {wantsFlowers
                  ? "Since you're interested in flower placements, these bundles are a great fit."
                  : "Add seasonal flower placements for your important dates."}
              </p>
              <div className="space-y-3">
                {SEASONAL_BUNDLES.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => update({ selectedBundle: data.selectedBundle === b.id ? '' : b.id })}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${
                      data.selectedBundle === b.id
                        ? "border-accent bg-accent/10"
                        : "border-border bg-secondary/30 hover:border-muted-foreground/40"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{b.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{b.description}</p>
                        {b.savings && <span className="text-xs text-primary font-semibold">{b.savings}</span>}
                      </div>
                      <p className="text-xl font-bold ml-4">${b.price}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contextual Care Plans — shown when user is out of state or wants monitoring */}
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
                  {(Object.keys(CARE_PLANS) as CarePlan[]).map((key) => {
                    const plan = CARE_PLANS[key];
                    const isRecommended = key === recommendedPlan;
                    return (
                      <button
                        key={key}
                        onClick={() => update({ selectedPlan: data.selectedPlan === key ? '' : key })}
                        className={`w-full p-3 rounded-lg border text-left transition-all relative ${
                          data.selectedPlan === key
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
                          <p className="text-sm font-bold ml-3 whitespace-nowrap">{formatPlanPrice(plan)}</p>
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

import { useState } from "react";
import { IntakeFormData, MONUMENT_PRICES, getTravelFee, CARE_PLANS, SEASONAL_BUNDLES, CarePlan } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Check, Shield, Sparkles, X } from "lucide-react";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

const ServiceStep = ({ data, update }: Props) => {
  const [showUpsell, setShowUpsell] = useState(false);
  const monument = data.monumentType ? MONUMENT_PRICES[data.monumentType] : null;
  const travelFee = getTravelFee(data.estimatedMiles).fee;

  const handleSelectA = () => {
    update({ selectedOffer: 'A' });
    setShowUpsell(true);
  };

  const handleUpgradeToB = () => {
    update({ selectedOffer: 'B' });
    setShowUpsell(false);
  };

  const hasImportantDates = data.importantDates.trim().length > 0;
  const isOutOfState = data.livesLocally === false;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">Step 5</span>
        <h2 className="text-3xl font-display font-bold mb-2 mt-2">Select Your Service</h2>
        <p className="text-muted-foreground">Choose the right cleaning package</p>
      </div>

      {monument && (
        <div className="max-w-lg mx-auto space-y-6">
          {/* Offer A vs B */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Offer A */}
            <button
              onClick={handleSelectA}
              className={`relative p-5 rounded-lg border text-left transition-all ${
                data.selectedOffer === 'A'
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary/30 hover:border-muted-foreground/40"
              }`}
            >
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Offer A</p>
              <p className="font-display font-bold text-xl mt-1">Standard Clean</p>
              <p className="text-3xl font-bold text-foreground mt-2">
                ${monument.offerA + travelFee}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {travelFee > 0 && `Includes $${travelFee} travel fee`}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary" /> Professional cleaning</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary" /> Before & after photos</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary" /> Surface debris removal</li>
              </ul>
            </button>

            {/* Offer B */}
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
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Offer B</p>
              <p className="font-display font-bold text-xl mt-1">Deep Clean + Protect</p>
              <p className="text-3xl font-bold text-foreground mt-2">
                ${monument.offerB + travelFee}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {travelFee > 0 && `Includes $${travelFee} travel fee`}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-primary" /> Everything in Offer A</li>
                <li className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-accent" /> Biological growth inhibitor</li>
                <li className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-accent" /> Extended protection</li>
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
                  Add biological growth inhibitor for just <span className="text-accent font-bold">$50 more</span> to 
                  prevent rapid moss and algae regrowth. Keeps the monument cleaner 3–5× longer.
                </p>
                <div className="flex gap-3">
                  <Button variant="hero" className="flex-1" onClick={handleUpgradeToB}>
                    Upgrade to Offer B
                  </Button>
                  <Button variant="outline" onClick={() => setShowUpsell(false)}>
                    No thanks
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Seasonal Bundles */}
          {(hasImportantDates || isOutOfState) && (
            <div className="space-y-3">
              <h3 className="text-lg font-display font-semibold">Seasonal Bundles</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SEASONAL_BUNDLES.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => update({ selectedBundle: data.selectedBundle === b.id ? '' : b.id })}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      data.selectedBundle === b.id
                        ? "border-accent bg-accent/10"
                        : "border-border bg-secondary/30 hover:border-muted-foreground/40"
                    }`}
                  >
                    <p className="font-semibold text-sm">{b.label}</p>
                    <p className="text-xl font-bold mt-1">${b.price}</p>
                    <p className="text-xs text-muted-foreground mt-1">{b.description}</p>
                    <span className="text-xs text-primary font-semibold">Save {b.savings}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Care Plan Selection */}
          {isOutOfState && (
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-sm font-semibold text-primary mb-1">
                Since you're out of state, we recommend the Keeper plan
              </p>
              <p className="text-xs text-muted-foreground">
                Get quarterly cleaning, photo updates, and monitoring starting at $29/mo
              </p>
              <div className="flex gap-2 mt-3">
                {(Object.keys(CARE_PLANS) as CarePlan[]).map((key) => (
                  <Button
                    key={key}
                    variant={data.selectedPlan === key ? "hero" : "outline"}
                    size="sm"
                    onClick={() => update({ selectedPlan: data.selectedPlan === key ? '' : key })}
                  >
                    {CARE_PLANS[key].label} · ${CARE_PLANS[key].price}/mo
                  </Button>
                ))}
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

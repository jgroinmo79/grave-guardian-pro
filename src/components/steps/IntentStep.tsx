import { IntakeFormData, CARE_PLANS, CarePlan } from "@/lib/pricing";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, MapPinOff, Eye, Check } from "lucide-react";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

const IntentStep = ({ data, update }: Props) => {
  const showPlanRecommendation = data.livesLocally !== null || data.wantsMonitoring !== null;
  
  let recommendedPlan: CarePlan = 'keeper';
  if (data.wantsMonitoring === true && data.livesLocally === false) {
    recommendedPlan = 'legacy';
  } else if (data.wantsMonitoring === true) {
    recommendedPlan = 'sentinel';
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">Step 4</span>
        <h2 className="text-3xl font-display font-bold mb-2 mt-2">Tell Us More</h2>
        <p className="text-muted-foreground">Help us personalize your service</p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Local or out of state */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <MapPinOff className="w-4 h-4 text-primary" />
            Do you live locally or out of state?
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: true, label: 'Local' },
              { value: false, label: 'Out of State' },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => update({ livesLocally: opt.value })}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  data.livesLocally === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/50 hover:border-muted-foreground/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Important dates */}
        <div className="space-y-2">
          <Label htmlFor="dates" className="text-sm font-medium flex items-center gap-2">
            <Heart className="w-4 h-4 text-accent" />
            Important dates (birthdays, anniversaries, holidays)
          </Label>
          <Input
            id="dates"
            placeholder="e.g. March 15 (birthday), Memorial Day"
            value={data.importantDates}
            onChange={(e) => update({ importantDates: e.target.value })}
            className="bg-secondary border-border"
          />
        </div>

        {/* Monitoring */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            Would you like ongoing monitoring to prevent unnoticed damage?
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: true, label: 'Yes, I want peace of mind' },
              { value: false, label: 'No, one-time is fine' },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => update({ wantsMonitoring: opt.value })}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  data.wantsMonitoring === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/50 hover:border-muted-foreground/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Plan Recommendation */}
        {showPlanRecommendation && (
          <div className="mt-8">
            <h3 className="text-lg font-display font-semibold mb-4 text-center">
              Recommended Care Plans
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(Object.entries(CARE_PLANS) as [CarePlan, typeof CARE_PLANS[CarePlan]][]).map(
                ([key, plan]) => {
                  const isRecommended = key === recommendedPlan;
                  return (
                    <div
                      key={key}
                      className={`relative p-4 rounded-lg border transition-all ${
                        isRecommended
                          ? "border-primary bg-primary/5 shadow-patina"
                          : "border-border bg-secondary/30"
                      }`}
                    >
                      {isRecommended && (
                        <span className="absolute -top-2.5 left-3 text-[10px] font-bold uppercase tracking-wider gradient-patina text-primary-foreground px-2 py-0.5 rounded-full">
                          Recommended
                        </span>
                      )}
                      <p className="font-display font-bold text-lg">{plan.label}</p>
                      <p className="text-2xl font-bold text-primary mt-1">
                        ${plan.price}<span className="text-xs text-muted-foreground font-normal">/mo</span>
                      </p>
                      <ul className="mt-3 space-y-1.5">
                        {plan.features.slice(0, 4).map((f) => (
                          <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Check className="w-3 h-3 text-primary shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntentStep;

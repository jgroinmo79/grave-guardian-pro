import { IntakeFormData } from "@/lib/pricing";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, MapPinOff, Eye, Flower2 } from "lucide-react";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

const IntentStep = ({ data, update }: Props) => {
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

        {/* Flower placement interest */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Flower2 className="w-4 h-4 text-accent" />
            Would you like seasonal flower placements on important dates?
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: true, label: 'Yes, that would mean a lot' },
              { value: false, label: 'No, not right now' },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => update({ wantsFlowerPlacement: opt.value })}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  data.wantsFlowerPlacement === opt.value
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-secondary/50 hover:border-muted-foreground/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
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
      </div>
    </div>
  );
};

export default IntentStep;

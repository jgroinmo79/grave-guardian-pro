import { IntakeFormData } from "@/lib/pricing";
import { Label } from "@/components/ui/label";
import { MapPinOff } from "lucide-react";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

const IntentStep = ({ data, update }: Props) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
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
      </div>
    </div>
  );
};

export default IntentStep;

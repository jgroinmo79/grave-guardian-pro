import { IntakeFormData } from "@/lib/pricing";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

const CONDITIONS = [
  { key: 'mossAlgae' as const, label: 'Visible moss, algae, or black staining' },
  { key: 'notCleanedRecently' as const, label: 'Not cleaned in the last 5 years' },
  { key: 'fadedInscription' as const, label: 'Faded or hard-to-read inscription' },
  { key: 'chipping' as const, label: 'Chipping or cracking present' },
  { key: 'leaning' as const, label: 'Monument is leaning' },
];

const ConditionStep = ({ data, update }: Props) => {
  const heavyNeglect = Object.values(data.conditions).filter(Boolean).length >= 3;

  const toggleCondition = (key: keyof typeof data.conditions) => {
    update({
      conditions: { ...data.conditions, [key]: !data.conditions[key] },
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">Step 3</span>
        <h2 className="text-3xl font-display font-bold mb-2 mt-2">Condition Assessment</h2>
        <p className="text-muted-foreground">Check all that apply to the monument</p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {CONDITIONS.map((c) => (
          <div
            key={c.key}
            className={`flex items-center gap-3 p-4 rounded-lg border transition-all cursor-pointer ${
              data.conditions[c.key]
                ? "border-primary/50 bg-primary/5"
                : "border-border bg-secondary/30 hover:border-muted-foreground/40"
            }`}
            onClick={() => toggleCondition(c.key)}
          >
            <Checkbox
              checked={data.conditions[c.key]}
              onCheckedChange={() => toggleCondition(c.key)}
            />
            <Label className="text-sm cursor-pointer flex-1">{c.label}</Label>
          </div>
        ))}

        {heavyNeglect && (
          <div className="mt-6 p-4 rounded-lg border border-accent/50 bg-accent/10 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-accent mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-accent">Heavy Neglect Detected</p>
              <p className="text-xs text-muted-foreground mt-1">
                Based on the conditions selected, this monument may require a custom quote. 
                We'll review your submission and provide a detailed estimate.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConditionStep;

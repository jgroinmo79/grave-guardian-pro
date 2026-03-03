import { IntakeFormData, ADD_ONS } from "@/lib/pricing";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Medal } from "lucide-react";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

const AddOnsStep = ({ data, update }: Props) => {
  const toggleAddOn = (id: string) => {
    const current = data.addOns;
    update({
      addOns: current.includes(id) ? current.filter((a) => a !== id) : [...current, id],
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">Step 6</span>
        <h2 className="text-3xl font-display font-bold mb-2 mt-2">Enhance Your Service</h2>
        <p className="text-muted-foreground">Optional add-ons to complete the care</p>
      </div>

      <div className="max-w-md mx-auto space-y-3">
        {ADD_ONS.map((addon) => {
          const selected = data.addOns.includes(addon.id);
          return (
            <div
              key={addon.id}
              onClick={() => toggleAddOn(addon.id)}
              className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                selected
                  ? "border-primary/50 bg-primary/5"
                  : "border-border bg-secondary/30 hover:border-muted-foreground/40"
              }`}
            >
              <Checkbox checked={selected} onCheckedChange={() => toggleAddOn(addon.id)} />
              <div className="flex-1">
                <p className="text-sm font-medium">{addon.label}</p>
                <p className="text-xs text-muted-foreground">{addon.description}</p>
              </div>
              <span className="text-sm font-bold text-accent">${addon.price}</span>
            </div>
          );
        })}

        {/* Veteran Discount */}
        <div className="mt-6 p-4 rounded-lg border border-accent/30 bg-accent/5">
          <div className="flex items-center gap-3">
            <Medal className="w-5 h-5 text-accent" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-semibold cursor-pointer">Veteran Discount (10% off)</Label>
                <Badge variant="outline" className="text-[10px] border-accent text-accent">
                  Verification Required
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Upload DD214 or equivalent during checkout</p>
            </div>
            <Checkbox
              checked={data.isVeteran}
              onCheckedChange={(c) => update({ isVeteran: c === true })}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddOnsStep;

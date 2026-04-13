import { IntakeFormData, ADD_ONS } from "@/lib/pricing";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

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

  const formatPrice = (addon: typeof ADD_ONS[number]) => {
    if (addon.price === 0) return 'Quote';
    if ('priceMax' in addon && addon.priceMax) return `$${addon.price}–$${addon.priceMax}`;
    return `$${addon.price}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        
        <h2 className="text-3xl font-display font-bold mb-2 mt-2">Available Add-Ons</h2>
        <p className="text-muted-foreground">Enhance any service with these options</p>
      </div>

      <div className="max-w-md mx-auto space-y-3">
        {ADD_ONS.map((addon) => {
          const selected = data.addOns.includes(addon.id);
          const isQuoteOnly = addon.price === 0;
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
              <span className={`text-sm font-bold ${isQuoteOnly ? 'text-muted-foreground' : 'text-accent'}`}>
                {formatPrice(addon)}
              </span>
            </div>
          );
        })}



        {/* Note about care plan inclusion */}
        <p className="text-xs text-muted-foreground text-center mt-4 italic">
          On all recurring Care Packages, the Damage Documentation Report is auto-generated at no extra charge if damage is found.
        </p>
      </div>
    </div>
  );
};

export default AddOnsStep;

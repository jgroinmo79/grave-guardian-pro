import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IntakeFormData, getTravelFee } from "@/lib/pricing";
import { MapPin, Navigation } from "lucide-react";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

const CemeteryStep = ({ data, update }: Props) => {
  const zone = getTravelFee(data.estimatedMiles);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-primary mb-3">
          <MapPin className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase tracking-widest">Step 1</span>
        </div>
        <h2 className="text-3xl font-display font-bold mb-2">Cemetery Location</h2>
        <p className="text-muted-foreground">Help us locate the monument</p>
      </div>

      <div className="max-w-md mx-auto space-y-5">
        <div className="space-y-2">
          <Label htmlFor="cemetery" className="text-sm font-medium">Cemetery Name</Label>
          <Input
            id="cemetery"
            placeholder="e.g. Cape County Memorial Park"
            value={data.cemeteryName}
            onChange={(e) => update({ cemeteryName: e.target.value })}
            className="bg-secondary border-border"
          />
          <p className="text-xs text-muted-foreground">Google Maps autocomplete coming soon</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="section">Section</Label>
            <Input
              id="section"
              placeholder="e.g. A"
              value={data.section}
              onChange={(e) => update({ section: e.target.value })}
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lot">Lot Number</Label>
            <Input
              id="lot"
              placeholder="e.g. 142"
              value={data.lotNumber}
              onChange={(e) => update({ lotNumber: e.target.value })}
              className="bg-secondary border-border"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="miles">Estimated Distance from Cape Girardeau (miles)</Label>
          <Input
            id="miles"
            type="number"
            min={0}
            placeholder="e.g. 30"
            value={data.estimatedMiles || ''}
            onChange={(e) => update({ estimatedMiles: Number(e.target.value) })}
            className="bg-secondary border-border"
          />
        </div>

        {data.estimatedMiles > 0 && (
          <div className="rounded-lg bg-secondary/50 border border-border p-4 flex items-center gap-3">
            <Navigation className="w-5 h-5 text-accent" />
            <div>
              <p className="text-sm font-medium">{zone.label}</p>
              <p className="text-sm text-muted-foreground">
                Travel fee: {zone.fee === 0 ? (
                  <span className="text-primary font-semibold">Free!</span>
                ) : (
                  <span className="text-accent font-semibold">${zone.fee}</span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CemeteryStep;

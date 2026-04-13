import { useState } from "react";
import { IntakeFormData, MonumentType, MaterialType, VeteranMonumentType, VeteranMaterialType } from "@/lib/pricing";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Square, RectangleHorizontal, Landmark, Shapes, Medal } from "lucide-react";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

type ConsolidatedType = 'upright' | 'flat' | 'large' | 'other';

const CONSOLIDATED_MONUMENTS: { id: ConsolidatedType; label: string; subtitle: string; icon: typeof Square; dbValue: MonumentType }[] = [
  { id: 'upright', label: 'Upright Headstone', subtitle: 'Standard standing headstone', icon: Square, dbValue: 'single_upright' },
  { id: 'flat', label: 'Flat / Flush Marker', subtitle: 'Ground-level marker', icon: RectangleHorizontal, dbValue: 'single_marker' },
  { id: 'large', label: 'Large Monument', subtitle: 'Double stone, monument with base, or obelisk', icon: Landmark, dbValue: 'double_upright' },
  { id: 'other', label: 'Other / Unique', subtitle: 'Grave ledger, slant marker, or custom shape', icon: Shapes, dbValue: 'grave_ledger' },
];

const MATERIALS: { value: MaterialType; label: string }[] = [
  { value: 'granite', label: 'Granite' },
  { value: 'marble', label: 'Marble' },
  { value: 'bronze', label: 'Bronze' },
  { value: 'mixed', label: 'Mixed' },
];

const VA_MONUMENT_TYPES: { value: VeteranMonumentType; label: string; description: string }[] = [
  { value: 'va_upright', label: 'Upright', description: 'Standard VA upright headstone' },
  { value: 'va_flat', label: 'Flat', description: 'Ground-level flat marker' },
  { value: 'va_niche', label: 'Niche', description: 'Columbarium niche cover' },
];

const VA_MATERIALS: { value: VeteranMaterialType; label: string }[] = [
  { value: 'marble', label: 'Marble' },
  { value: 'granite', label: 'Granite' },
  { value: 'bronze', label: 'Bronze' },
];

const MonumentStep = ({ data, update }: Props) => {
  // Determine which consolidated type is currently selected based on DB value
  const getConsolidatedFromDb = (dbVal: MonumentType | ''): ConsolidatedType | '' => {
    if (!dbVal) return '';
    const match = CONSOLIDATED_MONUMENTS.find(c => c.dbValue === dbVal);
    if (match) return match.id;
    if (['double_slant', 'double_upright', 'double_marker'].includes(dbVal)) return 'large';
    if (['grave_ledger', 'single_slant'].includes(dbVal)) return 'other';
    return '';
  };

  const [selectedGroup, setSelectedGroup] = useState<ConsolidatedType | ''>(getConsolidatedFromDb(data.monumentType));
  const [otherDescription, setOtherDescription] = useState('');

  const handleGroupSelect = (group: ConsolidatedType) => {
    setSelectedGroup(group);
    const consolidated = CONSOLIDATED_MONUMENTS.find(c => c.id === group)!;
    update({ monumentType: consolidated.dbValue });
    if (group !== 'other') setOtherDescription('');
  };

  const handleVeteranToggle = (isVet: boolean) => {
    setSelectedGroup('');
    setOtherDescription('');
    update({
      isVeteran: isVet,
      veteranMonumentType: '',
      veteranMaterial: '',
      monumentType: '',
      material: '',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        
        <h2 className="text-3xl font-display font-bold mb-2 mt-2">Monument Details</h2>
        <p className="text-muted-foreground">Tell us about the monument</p>
      </div>

      <div className="max-w-xl mx-auto space-y-6">
        {/* Veteran Question */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Medal className="w-4 h-4 text-accent" />
            Does this monument belong to a veteran?
          </Label>
          <div className="grid grid-cols-2 gap-3 max-w-xs">
            {[true, false].map((val) => (
              <button
                key={String(val)}
                onClick={() => handleVeteranToggle(val)}
                className={`p-3 rounded-lg border text-center text-sm font-medium transition-all ${
                  data.isVeteran === val
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/50 text-foreground hover:border-muted-foreground/40"
                }`}
              >
                {val ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>

        {/* Veteran flow */}
        {data.isVeteran && (
          <>
            {/* VA Monument Type */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Monument Type</Label>
              <div className="grid grid-cols-3 gap-3">
                {VA_MONUMENT_TYPES.map((t) => {
                  const selected = data.veteranMonumentType === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => update({ veteranMonumentType: t.value })}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        selected
                          ? "border-primary bg-primary/10 shadow-patina"
                          : "border-border bg-secondary/50 hover:border-muted-foreground/40"
                      }`}
                    >
                      <p className={`text-sm font-medium ${selected ? "text-primary" : "text-foreground"}`}>{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* VA Material */}
            {data.veteranMonumentType && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Material</Label>
                <div className="grid grid-cols-3 gap-3">
                  {VA_MATERIALS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => update({ veteranMaterial: m.value })}
                      className={`p-3 rounded-lg border text-center text-sm font-medium transition-all ${
                        data.veteranMaterial === m.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary/50 text-foreground hover:border-muted-foreground/40"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Non-veteran flow */}
        {!data.isVeteran && (
          <>
            {/* Consolidated Monument Type Grid */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Monument Type</Label>
              <div className="grid grid-cols-2 gap-3">
                {CONSOLIDATED_MONUMENTS.map((m) => {
                  const selected = selectedGroup === m.id;
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleGroupSelect(m.id)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        selected
                          ? "border-primary bg-primary/10 shadow-patina"
                          : "border-border bg-secondary/50 hover:border-muted-foreground/40"
                      }`}
                    >
                      <Icon className={`w-6 h-6 mb-2 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                      <p className={`text-sm font-medium ${selected ? "text-primary" : "text-foreground"}`}>{m.label}</p>
                      <p className="text-xs text-muted-foreground">{m.subtitle}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Other / Unique description */}
            {selectedGroup === 'other' && (
              <div className="space-y-2">
                <Label htmlFor="other-desc" className="text-sm font-medium">Briefly describe your monument</Label>
                <Input
                  id="other-desc"
                  placeholder="e.g. Bronze plaque on granite base"
                  value={otherDescription}
                  onChange={(e) => setOtherDescription(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
            )}

            {/* Material */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Material</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {MATERIALS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => update({ material: m.value })}
                    className={`p-3 rounded-lg border text-center text-sm font-medium transition-all ${
                      data.material === m.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/50 text-foreground hover:border-muted-foreground/40"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Height */}
        <div className="space-y-2">
          <Label htmlFor="height">Approximate Height</Label>
          <Input
            id="height"
            placeholder="e.g. 3 feet"
            value={data.approximateHeight}
            onChange={(e) => update({ approximateHeight: e.target.value })}
            className="bg-secondary border-border max-w-xs"
          />
        </div>

        {/* Known damage */}
        <div className="flex items-center gap-3">
          <Checkbox
            id="damage"
            checked={data.knownDamage}
            onCheckedChange={(c) => update({ knownDamage: c === true })}
          />
          <Label htmlFor="damage" className="text-sm cursor-pointer">
            Known cracks, leaning, or previous repairs
          </Label>
        </div>
      </div>
    </div>
  );
};

export default MonumentStep;

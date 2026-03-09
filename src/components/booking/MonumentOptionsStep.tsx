import { BookingFormData, MONUMENT_OPTIONS, STANDARD_PRICES, PREMIUM_PRICES, STANDARD_INCLUDES, PREMIUM_INCLUDES, CARE_PLANS_BOOKING, FLOWER_OPTIONS, BookingMonumentType } from "@/lib/booking-data";
import { Check, Shield } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  data: BookingFormData;
  update: (d: Partial<BookingFormData>) => void;
}

const MonumentOptionsStep = ({ data, update }: Props) => {
  const renderOneTimeCleaning = () => {
    const mt = data.monumentType as BookingMonumentType;
    const standardPrice = mt ? STANDARD_PRICES[mt] : null;
    const premiumPrice = mt ? PREMIUM_PRICES[mt] : null;

    return (
      <div className="space-y-5">
        {/* Monument type dropdown */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-foreground">Monument Type</label>
          <select
            value={data.monumentType}
            onChange={(e) => update({ monumentType: e.target.value as BookingMonumentType })}
            className="w-full rounded-lg border border-border bg-secondary/50 text-foreground px-4 py-3 text-sm focus:outline-none focus:border-[#C9A84C]"
          >
            <option value="">Select monument type…</option>
            {MONUMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Tier cards */}
        {mt && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Standard */}
            <button
              onClick={() => update({ cleaningTier: 'standard' })}
              className={`relative p-5 rounded-lg border text-left transition-all ${
                data.cleaningTier === 'standard'
                  ? "border-[#C9A84C] bg-[#C9A84C]/10"
                  : "border-border bg-secondary/30 hover:border-muted-foreground/40"
              }`}
            >
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Standard</p>
              <p className="font-display font-bold text-base mt-1">Orvus Paste Clean</p>
              <p className="text-3xl font-bold text-foreground mt-2">${standardPrice}</p>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {STANDARD_INCLUDES.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#C9A84C] mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </button>

            {/* Premium */}
            <button
              onClick={() => update({ cleaningTier: 'premium' })}
              className={`relative p-5 rounded-lg border text-left transition-all ${
                data.cleaningTier === 'premium'
                  ? "border-[#C9A84C] bg-[#C9A84C]/10 shadow-bronze"
                  : "border-border bg-secondary/30 hover:border-muted-foreground/40"
              }`}
            >
              <span className="absolute -top-2.5 right-3 text-[10px] font-bold uppercase tracking-wider bg-[#8B6914] text-white px-2 py-0.5 rounded-full">
                Recommended
              </span>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Premium</p>
              <p className="font-display font-bold text-base mt-1">D/2 Biological Treatment</p>
              <p className="text-3xl font-bold text-foreground mt-2">${premiumPrice}</p>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {PREMIUM_INCLUDES.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Shield className="w-3.5 h-3.5 text-[#C9A84C] mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </button>
          </div>
        )}

        {/* Multi-stone toggle */}
        {mt && (
          <div className="p-4 rounded-lg border border-border bg-secondary/20">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={data.multiStone}
                onCheckedChange={(c) => update({ multiStone: !!c })}
              />
              <span className="text-sm font-medium">Adding more stones on the same visit?</span>
            </label>
            {data.multiStone && (
              <p className="text-xs text-muted-foreground mt-2 ml-7">
                2nd stone: 20% off · 3rd+ stone: 30% off. Final multi-stone pricing confirmed at booking.
              </p>
            )}
          </div>
        )}

        {/* Damage report add-on */}
        {mt && (
          <label className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border border-border bg-secondary/20">
            <Checkbox
              checked={data.addDamageReport}
              onCheckedChange={(c) => update({ addDamageReport: !!c })}
            />
            <div>
              <span className="text-sm font-medium">Add Damage Documentation Report (+$65)</span>
              <p className="text-xs text-muted-foreground mt-0.5">Detailed written report with photos and preservation recommendations.</p>
            </div>
          </label>
        )}
      </div>
    );
  };

  const renderAnnualPlan = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {CARE_PLANS_BOOKING.map((plan) => {
          const selected = data.carePlan === plan.id;
          const isBestValue = plan.id === 'sentinel';
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-xl border bg-card text-card-foreground transition-all ${
                selected
                  ? "border-[#C9A84C] shadow-lg ring-1 ring-[#C9A84C]/30"
                  : "border-border hover:border-muted-foreground/40"
              }`}
            >
              {isBestValue && (
                <span className="absolute -top-3 right-4 text-xs font-bold tracking-wide bg-[#8B6914] text-white px-3 py-1 rounded-md">
                  Best Value
                </span>
              )}

              <div className="p-6 flex-1 flex flex-col">
                <h3 className="font-display text-xl font-bold">{plan.label}</h3>
                <p className="mt-2">
                  <span className="text-3xl font-bold">${plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </p>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                  {plan.features[0]}. Includes cleaning and seasonal photos.
                </p>

                <ul className="mt-5 space-y-2.5 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => update({ carePlan: selected ? '' : plan.id })}
                  className={`w-full mt-6 py-3 rounded-lg text-sm font-semibold transition-all ${
                    selected
                      ? "bg-[#8B6914] text-white hover:bg-[#C9A84C]"
                      : isBestValue
                        ? "bg-foreground text-background hover:bg-foreground/90"
                        : "border border-border text-foreground hover:bg-secondary/50"
                  }`}
                >
                  {selected ? "✓ Selected" : "Choose Plan"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground p-3 rounded-lg bg-secondary/30 border border-border">
        All plan prices are based on a single upright headstone. Multi-stone or monument-with-base plans are quoted individually — pricing typically 20–30% above single-stone rate.
      </p>
    </div>
  );

  const renderFlowerPlacement = () => (
    <div className="space-y-4">
      {FLOWER_OPTIONS.map((opt) => {
        const selected = data.flowerOption === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => update({ flowerOption: selected ? '' : opt.id })}
            className={`w-full p-5 rounded-lg border text-left transition-all ${
              selected
                ? "border-[#C9A84C] bg-[#C9A84C]/10"
                : "border-border bg-secondary/30 hover:border-muted-foreground/40"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-display font-bold text-base">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
              </div>
              <p className="text-xl font-bold ml-4 whitespace-nowrap">
                ${opt.price}{opt.priceNote && <span className="text-xs font-normal text-muted-foreground">{opt.priceNote}</span>}
              </p>
            </div>
          </button>
        );
      })}
      <p className="text-xs text-muted-foreground p-3 rounded-lg bg-secondary/30 border border-border">
        Flower packages can be combined with any annual care plan.
      </p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <span className="text-sm font-semibold uppercase tracking-widest text-[#C9A84C]">Step 2</span>
        <h2 className="text-3xl font-display font-bold mb-2 mt-2">
          {data.serviceType === 'one_time' ? 'Cleaning Options' : data.serviceType === 'annual_plan' ? 'Choose Your Plan' : 'Flower Options'}
        </h2>
        <p className="text-muted-foreground">Select the option that fits your needs</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {data.serviceType === 'one_time' && renderOneTimeCleaning()}
        {data.serviceType === 'annual_plan' && renderAnnualPlan()}
        {data.serviceType === 'flower_placement' && renderFlowerPlacement()}

        {/* Veteran checkbox */}
        <label className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border border-border bg-secondary/20">
          <Checkbox
            checked={data.isVeteran}
            onCheckedChange={(c) => update({ isVeteran: !!c })}
          />
          <span className="text-sm font-medium">I am booking for a veteran's grave.</span>
        </label>
        {data.isVeteran && (
          <p className="text-xs text-[#C9A84C] font-semibold -mt-4 ml-11">
            10% veteran discount will be applied at checkout.
          </p>
        )}

        {/* Minor (17 or younger) checkbox */}
        <label className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border border-border bg-secondary/20 -mt-2">
          <Checkbox
            checked={data.isMinor}
            onCheckedChange={(c) => update({ isMinor: !!c })}
          />
          <span className="text-sm font-medium">This stone belongs to someone 17 or younger.</span>
        </label>
        {data.isMinor && (
          <p className="text-xs text-[#C9A84C] font-semibold -mt-4 ml-11">
            17% discount will be applied at checkout.
          </p>
        )}
      </div>
    </div>
  );
};

export default MonumentOptionsStep;

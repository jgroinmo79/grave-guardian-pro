import { BookingFormData, MONUMENT_OPTIONS, STANDARD_PRICES, PREMIUM_PRICES, CARE_PLANS_BOOKING, FLOWER_OPTIONS } from "@/lib/booking-data";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  data: BookingFormData;
}

const ReviewStep = ({ data }: Props) => {
  const lines: { label: string; value: string }[] = [];

  // Service type
  const serviceLabel = data.serviceType === 'one_time' ? 'One-Time Cleaning' : data.serviceType === 'annual_plan' ? 'Annual Care Plan' : 'Flower Placement';
  lines.push({ label: 'Service', value: serviceLabel });

  let subtotal = 0;

  if (data.serviceType === 'one_time') {
    const mt = MONUMENT_OPTIONS.find((o) => o.value === data.monumentType);
    if (mt) lines.push({ label: 'Monument', value: mt.label });
    const tier = data.cleaningTier === 'premium' ? 'Premium' : 'Standard';
    lines.push({ label: 'Tier', value: tier });
    if (data.monumentType) {
      const price = data.cleaningTier === 'premium'
        ? PREMIUM_PRICES[data.monumentType]
        : STANDARD_PRICES[data.monumentType];
      subtotal += price;
      lines.push({ label: `${tier} Clean`, value: `$${price}` });
    }
    if (data.addDamageReport) {
      subtotal += 65;
      lines.push({ label: 'Damage Documentation Report', value: '$65' });
    }
    if (data.multiStone) {
      lines.push({ label: 'Multi-stone', value: 'Discount applied at booking' });
    }
  }

  if (data.serviceType === 'annual_plan') {
    const plan = CARE_PLANS_BOOKING.find((p) => p.id === data.carePlan);
    if (plan) {
      subtotal += plan.price;
      lines.push({ label: plan.label, value: `$${plan.price}${plan.period}` });
    }
  }

  if (data.serviceType === 'flower_placement') {
    const opt = FLOWER_OPTIONS.find((o) => o.id === data.flowerOption);
    if (opt) {
      subtotal += opt.price;
      lines.push({ label: opt.label, value: `$${opt.price}${opt.priceNote ? ' ' + opt.priceNote : ''}` });
    }
  }

  // Discounts
  let discount = 0;
  const discountLines: { label: string; pct: number }[] = [];

  if (data.isVeteran) discountLines.push({ label: 'Veteran Discount (10%)', pct: 0.10 });
  if (data.isMinor) discountLines.push({ label: 'Youth Memorial Discount (17%)', pct: 0.17 });

  // Apply largest discount (not stacked)
  if (discountLines.length > 0) {
    const best = discountLines.reduce((a, b) => a.pct > b.pct ? a : b);
    discount = Math.round(subtotal * best.pct);
    lines.push({ label: best.label, value: `-$${discount}` });
    // If both apply, show the other as noted
    if (discountLines.length > 1) {
      const other = discountLines.find((d) => d !== best)!;
      lines.push({ label: `${other.label} (included in above)`, value: '—' });
    }
  }

  lines.push({ label: 'Travel fee', value: 'calculated at confirmation' });

  if (data.preferredDate) {
    lines.push({ label: 'Preferred Date', value: format(data.preferredDate, 'PPP') });
  }
  if (data.cemeteryAddress) {
    lines.push({ label: 'Cemetery', value: data.cemeteryAddress });
  }
  if (data.notes) {
    lines.push({ label: 'Notes', value: data.notes });
  }

  const estimatedTotal = subtotal - discount;

  const handleSubmit = () => {
    toast.success("Booking request submitted! Josh will reach out shortly.");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <span className="text-sm font-semibold uppercase tracking-widest text-[#C9A84C]">Step 4</span>
        <h2 className="text-3xl font-display font-bold mb-2 mt-2">Review Your Booking</h2>
        <p className="text-muted-foreground">Confirm everything looks right</p>
      </div>

      <div className="max-w-lg mx-auto">
        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          {lines.map((l, i) => (
            <div key={i} className="flex items-start justify-between text-sm gap-4">
              <span className="text-muted-foreground">{l.label}</span>
              <span className="font-semibold text-right">{l.value}</span>
            </div>
          ))}

          <div className="border-t border-border pt-3 mt-3 flex items-center justify-between">
            <span className="font-display font-bold text-lg">Estimated Total</span>
            <span className="font-display font-bold text-2xl text-[#C9A84C]">
              ${estimatedTotal > 0 ? estimatedTotal : '—'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Final total confirmed after travel fee calculation.</p>
        </div>

        <Button
          variant="hero"
          className="w-full mt-6 py-6 text-lg bg-[#8B6914] hover:bg-[#C9A84C] text-white"
          onClick={handleSubmit}
        >
          Submit Booking Request
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-3">
          No payment required now — this is a booking request only.
        </p>
      </div>
    </div>
  );
};

export default ReviewStep;

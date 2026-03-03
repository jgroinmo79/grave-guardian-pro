import { IntakeFormData, MONUMENT_PRICES, getTravelFee, ADD_ONS, CARE_PLANS, SEASONAL_BUNDLES } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { CreditCard, Lock } from "lucide-react";

interface Props {
  data: IntakeFormData;
}

const CheckoutStep = ({ data }: Props) => {
  const monument = data.monumentType ? MONUMENT_PRICES[data.monumentType] : null;
  const travelFee = getTravelFee(data.estimatedMiles).fee;
  const basePrice = monument
    ? (data.selectedOffer === 'B' ? monument.offerB : monument.offerA)
    : 0;
  
  const selectedAddOns = ADD_ONS.filter((a) => data.addOns.includes(a.id));
  const addOnTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);
  
  const bundle = SEASONAL_BUNDLES.find((b) => b.id === data.selectedBundle);
  const plan = data.selectedPlan ? CARE_PLANS[data.selectedPlan] : null;

  let subtotal = basePrice + travelFee + addOnTotal + (bundle?.price ?? 0);
  if (data.isVeteran) subtotal = Math.round(subtotal * 0.9);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <CreditCard className="w-8 h-8 text-primary mx-auto mb-3" />
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">Step 8</span>
        <h2 className="text-3xl font-display font-bold mb-2 mt-2">Review & Checkout</h2>
        <p className="text-muted-foreground">Review your order before payment</p>
      </div>

      <div className="max-w-md mx-auto">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          {/* Line items */}
          {monument && (
            <div className="flex justify-between text-sm">
              <span>{monument.label} — Offer {data.selectedOffer || 'A'}</span>
              <span className="font-semibold">${basePrice}</span>
            </div>
          )}

          {travelFee > 0 && (
            <div className="flex justify-between text-sm">
              <span>Travel Fee</span>
              <span className="font-semibold">${travelFee}</span>
            </div>
          )}

          {selectedAddOns.map((a) => (
            <div key={a.id} className="flex justify-between text-sm">
              <span>{a.label}</span>
              <span className="font-semibold">${a.price}</span>
            </div>
          ))}

          {bundle && (
            <div className="flex justify-between text-sm">
              <span>{bundle.label}</span>
              <span className="font-semibold">${bundle.price}</span>
            </div>
          )}

          {data.isVeteran && (
            <div className="flex justify-between text-sm text-primary">
              <span>Veteran Discount (10%)</span>
              <span className="font-semibold">
                -${Math.round((basePrice + travelFee + addOnTotal + (bundle?.price ?? 0)) * 0.1)}
              </span>
            </div>
          )}

          <div className="border-t border-border pt-3 flex justify-between">
            <span className="font-display font-bold text-lg">Total Due Today</span>
            <span className="font-display font-bold text-2xl text-primary">${subtotal}</span>
          </div>

          {plan && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
              <span className="font-semibold">{plan.label}:</span>{' '}
              <span className="text-muted-foreground">
                ${plan.price}{plan.period === 'year' ? '/yr' : ''} {plan.period === 'one-time' ? '(one-time)' : '(annual, starts after first service)'}
              </span>
            </div>
          )}
        </div>

        <Button variant="hero" size="lg" className="w-full mt-6 h-12 text-base" disabled>
          <Lock className="w-4 h-4 mr-2" />
          Proceed to Payment
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-3">
          Stripe checkout will be enabled after backend setup. Your data is secure.
        </p>
      </div>
    </div>
  );
};

export default CheckoutStep;

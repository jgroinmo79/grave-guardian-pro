import { useState } from "react";
import { IntakeFormData, MONUMENT_PRICES, getTravelFee, ADD_ONS, CARE_PLANS, SEASONAL_BUNDLES } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  data: IntakeFormData;
}

const CheckoutStep = ({ data }: Props) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleCheckout = async () => {
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          monumentType: data.monumentType,
          selectedOffer: data.selectedOffer,
          estimatedMiles: data.estimatedMiles,
          addOns: data.addOns,
          selectedBundle: data.selectedBundle,
          isVeteran: data.isVeteran,
          customerEmail: email,
          // Monument & form data for DB persistence
          cemeteryName: data.cemeteryName,
          section: data.section,
          lotNumber: data.lotNumber,
          material: data.material,
          approximateHeight: data.approximateHeight,
          knownDamage: data.knownDamage,
          conditions: data.conditions,
          // Consent
          consentBiological: data.consentBiological,
          consentAuthorize: data.consentAuthorize,
          consentPhotos: data.consentPhotos,
        },
      });

      if (error) throw error;
      if (result?.url) {
        window.open(result.url, "_blank");
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast.error(err.message || "Failed to start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

        <div className="mt-6 space-y-3">
          <div>
            <Label htmlFor="checkout-email" className="text-sm">Email for receipt & communication</Label>
            <Input
              id="checkout-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>

          <Button
            variant="hero"
            size="lg"
            className="w-full h-12 text-base"
            onClick={handleCheckout}
            disabled={loading || !email.trim()}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Lock className="w-4 h-4 mr-2" />
            )}
            {loading ? "Redirecting to Stripe…" : "Proceed to Payment"}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Secure payment powered by Stripe. You'll be redirected to complete checkout.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutStep;

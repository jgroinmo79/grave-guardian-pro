import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, MapPin, Ruler, Package, Calendar, Loader2, Gift, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface OrderDetails {
  id: string;
  offer: string;
  status: string;
  total_price: number;
  base_price: number;
  travel_fee: number;
  add_ons_total: number | null;
  bundle_price: number | null;
  is_veteran: boolean | null;
  is_gift: boolean | null;
  gift_recipient_name: string | null;
  gift_message: string | null;
  shopper_name: string | null;
  deceased_name: string | null;
  stripe_payment_status: string | null;
  created_at: string;
  monuments: {
    cemetery_name: string;
    monument_type: string;
    material: string;
    estimated_miles: number | null;
    section: string | null;
    lot_number: string | null;
  } | null;
}

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      // The stripe_payment_intent_id is updated to the real pi_ by the webhook,
      // but initially it stores the session id. Try both approaches.
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, offer, status, total_price, base_price, travel_fee,
          add_ons_total, bundle_price, is_veteran, is_gift,
          gift_recipient_name, gift_message, shopper_name, deceased_name,
          stripe_payment_status, created_at,
          monuments (
            cemetery_name, monument_type, material, estimated_miles, section, lot_number
          )
        `)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setOrder(data as unknown as OrderDetails);
      }
      setLoading(false);
    };

    // Small delay to allow webhook to process
    const timer = setTimeout(fetchOrder, 1500);
    return () => clearTimeout(timer);
  }, [sessionId]);

  const formatType = (t: string) => t?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="min-h-screen gradient-dark flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6 animate-fade-in">
        <div className="text-center space-y-3">
          {order?.is_gift ? (
            <>
              <Gift className="w-16 h-16 text-accent mx-auto" />
              <h1 className="text-3xl font-display font-bold">Gift Purchase Complete!</h1>
              <p className="text-muted-foreground">
                Your gift of memorial care has been placed. {order.gift_recipient_name ? `${order.gift_recipient_name} will be so grateful.` : 'What a thoughtful gesture.'}
              </p>
            </>
          ) : (
            <>
              <CheckCircle className="w-16 h-16 text-primary mx-auto" />
              <h1 className="text-3xl font-display font-bold">Payment Successful!</h1>
              <p className="text-muted-foreground">
                Thank you for your order. Josh will be in touch within 24 hours to confirm your service date.
              </p>
            </>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : order ? (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-mono">Order #{order.id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString("en-US", {
                    month: "long", day: "numeric", year: "numeric",
                  })}
                </p>
              </div>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                order.status === "confirmed"
                  ? "bg-primary/15 text-primary"
                  : "bg-accent/15 text-accent"
              }`}>
                {formatType(order.status)}
              </span>
            </div>

            {order.monuments && (
              <div className="space-y-2 border-t border-border pt-4">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{order.monuments.cemetery_name}</span>
                  {order.monuments.section && (
                    <span className="text-muted-foreground">
                      — Section {order.monuments.section}
                      {order.monuments.lot_number ? `, Lot ${order.monuments.lot_number}` : ""}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Ruler className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>{formatType(order.monuments.monument_type)} · {formatType(order.monuments.material)}</span>
                </div>
              </div>
            )}

            <div className="border-t border-border pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Price (Offer {order.offer})</span>
                <span>${Number(order.base_price).toFixed(2)}</span>
              </div>
              {Number(order.travel_fee) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Travel Fee</span>
                  <span>${Number(order.travel_fee).toFixed(2)}</span>
                </div>
              )}
              {Number(order.add_ons_total) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Add-Ons</span>
                  <span>${Number(order.add_ons_total).toFixed(2)}</span>
                </div>
              )}
              {Number(order.bundle_price) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bundle</span>
                  <span>${Number(order.bundle_price).toFixed(2)}</span>
                </div>
              )}
              {order.is_veteran && (
                <div className="flex justify-between text-primary">
                  <span>Veteran Discount (10%)</span>
                  <span>Applied</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-3 font-display font-bold text-lg">
                <span>Total Paid</span>
                <span className="text-primary">${Number(order.total_price).toFixed(2)}</span>
              </div>
            </div>

            {order.stripe_payment_status && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Package className="w-3.5 h-3.5" />
                <span>Payment: {order.stripe_payment_status}</span>
              </div>
            )}
          </div>

          {/* Gift share section */}
          {order.is_gift && (
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-5 space-y-4">
              {order.gift_message && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Gift Message</p>
                  <p className="text-sm italic">&ldquo;{order.gift_message}&rdquo;</p>
                </div>
              )}
              <Button
                variant="outline"
                className="w-full border-accent text-accent hover:bg-accent/10"
                onClick={() => {
                  const text = `🎁 A gift of memorial care has been placed for ${order.deceased_name || 'a loved one'} at ${order.monuments?.cemetery_name || 'the cemetery'}${order.gift_message ? `\n\n"${order.gift_message}"` : ''}\n\n— From ${order.shopper_name || 'someone who cares'}\n\nPowered by Grave Detail Cleaning & Preservation`;
                  navigator.clipboard.writeText(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied!' : 'Share This Gift'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">Copy a message to text or email to the recipient</p>
            </div>
          )}
        </div>
        ) : null}

        <div className="text-center">
          <Button variant="hero" onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;

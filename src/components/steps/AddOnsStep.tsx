import { useState } from "react";
import { IntakeFormData, ADD_ONS } from "@/lib/pricing";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

type Addon = (typeof ADD_ONS)[number];

const AddOnsStep = ({ data, update }: Props) => {
  const [quoteAddon, setQuoteAddon] = useState<Addon | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [requested, setRequested] = useState<string[]>([]);
  const [form, setForm] = useState({ message: "" });

  const toggleAddOn = (id: string) => {
    const current = data.addOns;
    update({
      addOns: current.includes(id) ? current.filter((a) => a !== id) : [...current, id],
    });
  };

  const formatPrice = (addon: Addon) => {
    if (addon.price === 0) return "Quote";
    if ("priceMax" in addon && addon.priceMax) return `$${addon.price}–$${addon.priceMax}`;
    return `$${addon.price}`;
  };

  const openQuote = (addon: Addon) => {
    setForm({ message: "" });
    setQuoteAddon(addon);
  };

  const submitQuote = async () => {
    if (!quoteAddon) return;
    if (!data.shopperName.trim() || !data.shopperEmail.trim()) {
      toast({
        title: "Add your contact info first",
        description:
          "Go back to the Contact step and enter your name and email — we use that to send the quote.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("request-quote", {
        body: {
          service: quoteAddon.label,
          serviceCode: quoteAddon.id,
          name: data.shopperName,
          email: data.shopperEmail,
          phone: data.shopperPhone,
          cemetery: data.cemeteryName,
          message: form.message,
        },
      });
      if (error) throw error;
      setRequested((prev) => [...prev, quoteAddon.id]);
      setQuoteAddon(null);
      toast({
        title: "Quote request sent",
        description: "Josh will reach out within 1 business day with pricing.",
      });
    } catch (e: any) {
      toast({
        title: "Couldn't send request",
        description: e?.message || "Please try again or call (573) 545-5759.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
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
          const wasRequested = requested.includes(addon.id);

          if (isQuoteOnly) {
            return (
              <div
                key={addon.id}
                className="flex items-center gap-4 p-4 rounded-lg border border-border bg-secondary/30"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{addon.label}</p>
                  <p className="text-xs text-muted-foreground">{addon.description}</p>
                  {wasRequested && (
                    <Badge variant="secondary" className="mt-2 text-[10px]">
                      Quote requested
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openQuote(addon)}
                  className="border-accent/40 text-accent hover:bg-accent/10 hover:text-accent"
                >
                  {wasRequested ? "Request again" : "Request Quote"}
                </Button>
              </div>
            );
          }

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
              <span className="text-sm font-bold text-accent">{formatPrice(addon)}</span>
            </div>
          );
        })}

        <p className="text-xs text-muted-foreground text-center mt-4 italic">
          On all recurring Care Packages, the Damage Documentation Report is auto-generated at no extra
          charge if damage is found.
        </p>
      </div>

      <Dialog open={!!quoteAddon} onOpenChange={(o) => !o && setQuoteAddon(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request a quote</DialogTitle>
            <DialogDescription>
              {quoteAddon?.label} is priced on-site after Josh assesses the monument. Send the request
              and we'll follow up within 1 business day.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border border-border bg-secondary/40 p-3 text-sm">
              <div className="text-muted-foreground text-xs mb-1">We'll reach out to</div>
              <div className="font-medium">{data.shopperName || "—"}</div>
              <div className="text-xs text-muted-foreground">
                {data.shopperEmail || "no email on file"}
                {data.shopperPhone ? ` · ${data.shopperPhone}` : ""}
              </div>
              {data.cemeteryName && (
                <div className="text-xs text-muted-foreground mt-1">
                  Cemetery: {data.cemeteryName}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="quote-message" className="text-xs">
                Anything we should know? (optional)
              </Label>
              <Textarea
                id="quote-message"
                value={form.message}
                onChange={(e) => setForm({ message: e.target.value.slice(0, 1000) })}
                placeholder="Photos, condition details, timing, etc."
                className="mt-1"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteAddon(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={submitQuote}
              disabled={submitting}
              className="bg-patina hover:bg-bronze text-white"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddOnsStep;

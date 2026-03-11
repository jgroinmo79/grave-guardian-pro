import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IntakeFormData } from "@/lib/pricing";
import { User, Phone, Mail } from "lucide-react";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

const ContactStep = ({ data, update }: Props) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-primary mb-3">
          <User className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase tracking-widest">Step 2</span>
        </div>
        <h2 className="text-3xl font-display font-bold mb-2">Contact Information</h2>
        <p className="text-muted-foreground">Who is this service for, and who should we contact?</p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Deceased Info */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Person Memorialized</h3>
          <div className="space-y-2">
            <Label htmlFor="deceased-name">Name on Monument</Label>
            <Input
              id="deceased-name"
              placeholder="e.g. John A. Smith"
              value={data.deceasedName}
              onChange={(e) => update({ deceasedName: e.target.value })}
              className="bg-secondary border-border"
            />
            <p className="text-xs text-muted-foreground">The name of the person whose grave this is</p>
          </div>
        </div>

        {/* Shopper Info */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your Information</h3>
          <div className="space-y-2">
            <Label htmlFor="shopper-name">Your Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="shopper-name"
                placeholder="Your full name"
                value={data.shopperName}
                onChange={(e) => update({ shopperName: e.target.value })}
                className="bg-secondary border-border pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="shopper-phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="shopper-phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={data.shopperPhone}
                onChange={(e) => update({ shopperPhone: e.target.value })}
                className="bg-secondary border-border pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">So Josh can reach you about your order</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="shopper-email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="shopper-email"
                type="email"
                placeholder="you@email.com"
                value={data.shopperEmail}
                onChange={(e) => update({ shopperEmail: e.target.value })}
                className="bg-secondary border-border pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">For order confirmation and receipt</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactStep;

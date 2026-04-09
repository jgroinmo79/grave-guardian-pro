import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IntakeFormData } from "@/lib/pricing";
import { Gift, User, Phone, Mail } from "lucide-react";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

const GiftBuyerStep = ({ data, update }: Props) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-primary mb-3">
          <Gift className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase tracking-widest">Step 1</span>
        </div>
        <h2 className="text-3xl font-display font-bold mb-2">Gift Buyer Info</h2>
        <p className="text-muted-foreground">Tell us about yourself — you're the one paying for this gift.</p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your Information</h3>
          <div className="space-y-2">
            <Label htmlFor="buyer-name">Your Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="buyer-name"
                placeholder="Your full name"
                value={data.shopperName}
                onChange={(e) => update({ shopperName: e.target.value })}
                className="bg-secondary border-border pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="buyer-email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="buyer-email"
                type="email"
                placeholder="you@email.com"
                value={data.shopperEmail}
                onChange={(e) => update({ shopperEmail: e.target.value })}
                className="bg-secondary border-border pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">For order confirmation and receipt</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="buyer-phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="buyer-phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={data.shopperPhone}
                onChange={(e) => update({ shopperPhone: e.target.value })}
                className="bg-secondary border-border pl-10"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiftBuyerStep;

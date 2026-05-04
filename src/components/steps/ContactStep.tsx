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
          
        </div>
        <h2 className="text-3xl font-display font-bold mb-2">Contact Information</h2>
        <p className="text-muted-foreground">Who is this service for, and who should we contact?</p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Deceased Info */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Person Memorialized</h3>
          {(() => {
            const parts = data.deceasedName.trim().split(/\s+/);
            const firstName = parts.length > 1 ? parts.slice(0, -1).join(" ") : (parts[0] || "");
            const lastName = parts.length > 1 ? parts[parts.length - 1] : "";
            const setName = (first: string, last: string) =>
              update({ deceasedName: `${first} ${last}`.trim().replace(/\s+/g, " ") });
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="deceased-first-name">First Name</Label>
                  <Input
                    id="deceased-first-name"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setName(e.target.value, lastName)}
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deceased-last-name">Last Name</Label>
                  <Input
                    id="deceased-last-name"
                    placeholder="Smith"
                    value={lastName}
                    onChange={(e) => setName(firstName, e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>
              </div>
            );
          })()}
          <p className="text-xs text-muted-foreground">The name of the person whose grave this is</p>
        </div>

        {/* Shopper Info */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your Information</h3>
          {(() => {
            const parts = data.shopperName.trim().split(/\s+/);
            const firstName = parts.length > 1 ? parts.slice(0, -1).join(" ") : (parts[0] || "");
            const lastName = parts.length > 1 ? parts[parts.length - 1] : "";
            const setName = (first: string, last: string) =>
              update({ shopperName: `${first} ${last}`.trim().replace(/\s+/g, " ") });
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="shopper-first-name">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="shopper-first-name"
                      placeholder="First"
                      value={firstName}
                      onChange={(e) => setName(e.target.value, lastName)}
                      className="bg-secondary border-border pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shopper-last-name">Last Name</Label>
                  <Input
                    id="shopper-last-name"
                    placeholder="Last"
                    value={lastName}
                    onChange={(e) => setName(firstName, e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>
              </div>
            );
          })()}
          <div className="space-y-2">
            <Label htmlFor="shopper-relationship">Relationship to Deceased <span className="text-destructive">*</span></Label>
            <Input
              id="shopper-relationship"
              placeholder="e.g. Son, Daughter, Spouse, Friend"
              value={data.shopperRelationship}
              onChange={(e) => update({ shopperRelationship: e.target.value })}
              className="bg-secondary border-border"
              required
            />
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

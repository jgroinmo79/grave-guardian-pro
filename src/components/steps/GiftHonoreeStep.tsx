import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IntakeFormData } from "@/lib/pricing";
import { Heart, User, Phone, Mail, MessageSquare } from "lucide-react";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

const GiftHonoreeStep = ({ data, update }: Props) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-primary mb-3">
          <Heart className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase tracking-widest">Step 2</span>
        </div>
        <h2 className="text-3xl font-display font-bold mb-2">Honoree Details</h2>
        <p className="text-muted-foreground">Who is this gift for?</p>
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

        {/* Recipient Info */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Gift Recipient <span className="text-xs font-normal text-muted-foreground">(optional)</span></h3>
          <p className="text-xs text-muted-foreground">The family member or loved one you're gifting this service to.</p>
          <div className="space-y-2">
            <Label htmlFor="recipient-name">Recipient Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="recipient-name"
                placeholder="e.g. Jane Smith"
                value={data.giftRecipientName}
                onChange={(e) => update({ giftRecipientName: e.target.value })}
                className="bg-secondary border-border pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipient-email">Recipient Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="recipient-email"
                type="email"
                placeholder="recipient@email.com"
                value={data.giftRecipientEmail}
                onChange={(e) => update({ giftRecipientEmail: e.target.value })}
                className="bg-secondary border-border pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipient-phone">Recipient Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="recipient-phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={data.giftRecipientPhone}
                onChange={(e) => update({ giftRecipientPhone: e.target.value })}
                className="bg-secondary border-border pl-10"
              />
            </div>
          </div>
        </div>

        {/* Gift Message */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Gift Message <span className="text-xs font-normal text-muted-foreground">(optional)</span>
          </h3>
          <div className="space-y-2">
            <Textarea
              placeholder="Write a personal message to include with this gift..."
              value={data.giftMessage}
              onChange={(e) => {
                if (e.target.value.length <= 300) {
                  update({ giftMessage: e.target.value });
                }
              }}
              className="bg-secondary border-border min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground text-right">{data.giftMessage.length}/300</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiftHonoreeStep;

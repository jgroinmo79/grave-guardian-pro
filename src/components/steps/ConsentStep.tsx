import { IntakeFormData } from "@/lib/pricing";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

const ConsentStep = ({ data, update }: Props) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <ShieldCheck className="w-8 h-8 text-primary mx-auto mb-3" />
        
        <h2 className="text-3xl font-display font-bold mb-2 mt-2">Legal & Consent</h2>
        <p className="text-muted-foreground">Please review and agree to proceed</p>
      </div>

      <div className="max-w-md mx-auto space-y-5">
        {/* Required */}
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Required</p>
          
          <div
            className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${
              data.consentBiological ? "border-primary/50 bg-primary/5" : "border-border bg-secondary/30"
            }`}
          >
            <Checkbox
              id="bio"
              checked={data.consentBiological}
              onCheckedChange={(c) => update({ consentBiological: c === true })}
              className="mt-0.5"
            />
            <Label htmlFor="bio" className="text-sm cursor-pointer leading-relaxed">
              I understand that biological cleaning may reveal pre-existing weaknesses, cracks, or damage 
              previously hidden by growth. Grave Detail is not responsible for pre-existing conditions.
            </Label>
          </div>

          <div
            className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${
              data.consentAuthorize ? "border-primary/50 bg-primary/5" : "border-border bg-secondary/30"
            }`}
          >
            <Checkbox
              id="auth"
              checked={data.consentAuthorize}
              onCheckedChange={(c) => update({ consentAuthorize: c === true })}
              className="mt-0.5"
            />
            <Label htmlFor="auth" className="text-sm cursor-pointer leading-relaxed">
              I authorize Grave Detail Cleaning & Preservation LLC to perform the selected services 
              on the identified monument.
            </Label>
          </div>
        </div>

        {/* Optional */}
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Optional</p>
          
          <div
            className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${
              data.consentPhotos ? "border-accent/50 bg-accent/5" : "border-border bg-secondary/30"
            }`}
          >
            <Checkbox
              id="photos"
              checked={data.consentPhotos}
              onCheckedChange={(c) => update({ consentPhotos: c === true })}
              className="mt-0.5"
            />
            <Label htmlFor="photos" className="text-sm cursor-pointer leading-relaxed">
              I consent to Grave Detail using before/after photos of my monument for marketing 
              purposes (website, social media). No personal identifying information will be shared.
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentStep;

import { useState, useRef } from "react";
import { IntakeFormData } from "@/lib/pricing";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Camera, X, Loader2, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

const CONDITIONS = [
  { key: 'mossAlgae' as const, label: 'Visible moss, algae, or black staining' },
  { key: 'notCleanedRecently' as const, label: 'Not cleaned in the last 5 years' },
  { key: 'fadedInscription' as const, label: 'Faded or hard-to-read inscription' },
  { key: 'chipping' as const, label: 'Chipping or cracking present' },
  { key: 'leaning' as const, label: 'Monument is leaning' },
];

const ConditionStep = ({ data, update }: Props) => {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const heavyNeglect = Object.values(data.conditions).filter(Boolean).length >= 3;

  const toggleCondition = (key: keyof typeof data.conditions) => {
    update({
      conditions: { ...data.conditions, [key]: !data.conditions[key] },
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxFiles = 6;
    if (data.photos.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} photos allowed`);
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB limit`);
        continue;
      }

      const ext = file.name.split(".").pop();
      const path = `intake/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from("monument-photos")
        .upload(path, file, { contentType: file.type });

      if (error) {
        console.error("Upload error:", error);
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("monument-photos")
        .getPublicUrl(path);

      newUrls.push(urlData.publicUrl);
    }

    if (newUrls.length > 0) {
      update({ photos: [...data.photos, ...newUrls] });
      toast.success(`${newUrls.length} photo${newUrls.length > 1 ? "s" : ""} uploaded`);
    }

    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    update({ photos: data.photos.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">Step 3</span>
        <h2 className="text-3xl font-display font-bold mb-2 mt-2">Condition Assessment</h2>
        <p className="text-muted-foreground">Check all that apply and upload photos if available</p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Condition checkboxes */}
        <div className="space-y-4">
          {CONDITIONS.map((c) => (
            <div
              key={c.key}
              className={`flex items-center gap-3 p-4 rounded-lg border transition-all cursor-pointer ${
                data.conditions[c.key]
                  ? "border-primary/50 bg-primary/5"
                  : "border-border bg-secondary/30 hover:border-muted-foreground/40"
              }`}
              onClick={() => toggleCondition(c.key)}
            >
              <Checkbox
                checked={data.conditions[c.key]}
                onCheckedChange={() => toggleCondition(c.key)}
              />
              <Label className="text-sm cursor-pointer flex-1">{c.label}</Label>
            </div>
          ))}
        </div>

        {heavyNeglect && (
          <div className="p-4 rounded-lg border border-accent/50 bg-accent/10 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-accent mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-accent">Heavy Neglect Detected</p>
              <p className="text-xs text-muted-foreground mt-1">
                Based on the conditions selected, this monument may require a custom quote.
                We'll review your submission and provide a detailed estimate.
              </p>
            </div>
          </div>
        )}

        {/* Photo Upload */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Monument Photos</Label>
            <span className="text-xs text-muted-foreground">(optional, up to 6)</span>
          </div>

          {/* Photo grid */}
          {data.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {data.photos.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                  <img src={url} alt={`Monument photo ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {data.photos.length < 6 && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full p-6 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center gap-2 text-muted-foreground hover:text-primary"
            >
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <ImagePlus className="w-6 h-6" />
              )}
              <span className="text-sm">
                {uploading ? "Uploading…" : "Tap to add photos"}
              </span>
            </button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />

          <p className="text-xs text-muted-foreground">
            Photos help Josh assess the monument before arrival. Front, back, and close-up of any damage recommended.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConditionStep;

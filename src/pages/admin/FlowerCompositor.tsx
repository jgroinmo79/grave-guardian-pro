import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Wand2, Check, Loader2 } from "lucide-react";

type Arrangement = {
  id: string;
  name: string;
  arrangement_type: string | null;
  ffc_code: string | null;
  gd_code: string | null;
  image_url: string | null;
  image_url_2: string | null;
};

const CINZEL_URL = "https://fonts.gstatic.com/s/cinzel/v23/8vIU7ww63mVu7gtR-kwKxNvkNOjw-tbnTYrvDE5ZdqU.woff2";
const CORMORANT_URL = "https://fonts.gstatic.com/s/cormorantgaramond/v16/I_uuMpWeuBzZNBtQbbRQkiCvs5Y5LtgtqbKHl4kS3qE.woff2";
const CORMORANT_ITALIC_URL = "https://fonts.gstatic.com/s/cormorantgaramond/v16/I_uyMpWeuBzZNBtQbbRQkiCqYevQyOFLk5UVvLad7Q.woff2";

let fontsLoaded = false;
async function ensureFonts() {
  if (fontsLoaded) return;
  try {
    const cinzel = new FontFace("Cinzel", `url(${CINZEL_URL})`, { weight: "400" });
    const cinzelBold = new FontFace("Cinzel", `url(${CINZEL_URL})`, { weight: "700" });
    const cormorant = new FontFace("Cormorant Garamond", `url(${CORMORANT_URL})`, { style: "normal" });
    const cormorantItalic = new FontFace("Cormorant Garamond", `url(${CORMORANT_ITALIC_URL})`, { style: "italic" });
    const loaded = await Promise.all([cinzel.load(), cinzelBold.load(), cormorant.load(), cormorantItalic.load()]);
    loaded.forEach((f) => (document as any).fonts.add(f));
    await (document as any).fonts.ready;
    fontsLoaded = true;
  } catch (e) {
    console.warn("Font loading failed, using fallback", e);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function categoryLabel(a: Arrangement): string {
  const c = (a.ffc_code || "").toUpperCase();
  if (c.startsWith("SD") && c.includes("LG")) return "Saddle & Bouquet";
  if (c.startsWith("SD") && c.includes("MD")) return "Saddle & Bouquet";
  if (c.startsWith("MD")) return "Medium Bouquet";
  if (c.startsWith("LG")) return "Large Bouquet";
  if (c.startsWith("SD")) return "Monument Saddle";
  return (a.arrangement_type || "Arrangement").replace(/\b\w/g, (m) => m.toUpperCase());
}

type BracketSpec = {
  height?: { in: number; cm: number };
  width?: { in: number; cm: number };
  length?: { in: number; cm: number };
  rightWidth?: { in: number; cm: number };
  bottomLength?: { in: number; cm: number };
  heightLabelOnly?: string;
  note?: string;
  combo?: boolean;
};

function bracketSpec(a: Arrangement): BracketSpec | null {
  const c = (a.ffc_code || "").toUpperCase();
  const isSD = c.startsWith("SD");
  const hasLG = c.includes("LG");
  const hasMD = c.includes("MD");
  if (isSD && (hasLG || hasMD)) {
    return {
      combo: true,
      bottomLength: { in: 30, cm: 76.20 },
      rightWidth: { in: 19, cm: 48.26 },
      height: hasLG ? { in: 28, cm: 71.12 } : { in: 24, cm: 60.96 },
      width: hasLG ? { in: 18, cm: 45.72 } : { in: 15, cm: 38.10 },
    };
  }
  if (isSD) {
    return {
      bottomLength: { in: 30, cm: 76.20 },
      rightWidth: { in: 19, cm: 48.26 },
      heightLabelOnly: "13in tall",
      note: 'Fits headstones 4"–8.5" thick',
    };
  }
  if (c.startsWith("MD")) return { height: { in: 24, cm: 60.96 }, width: { in: 15, cm: 38.10 } };
  if (c.startsWith("LG")) return { height: { in: 28, cm: 71.12 }, width: { in: 18, cm: 45.72 } };
  return null;
}

function drawBracketLabel(ctx: CanvasRenderingContext2D, x: number, y: number, big: string, small: string, align: CanvasTextAlign = "center") {
  ctx.fillStyle = "#C9976B";
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.font = 'bold 28px Cinzel, Georgia, serif';
  ctx.fillText(big, x, y - 8);
  ctx.font = '14px Cinzel, Georgia, serif';
  ctx.fillText(small, x, y + 14);
}

function drawVBracket(ctx: CanvasRenderingContext2D, x: number, top: number, bottom: number) {
  const cb = 14;
  ctx.beginPath();
  ctx.moveTo(x - cb, top); ctx.lineTo(x + cb, top);
  ctx.moveTo(x, top); ctx.lineTo(x, bottom);
  ctx.moveTo(x - cb, bottom); ctx.lineTo(x + cb, bottom);
  ctx.stroke();
}

function drawHBracket(ctx: CanvasRenderingContext2D, y: number, left: number, right: number) {
  const cb = 14;
  ctx.beginPath();
  ctx.moveTo(left, y - cb); ctx.lineTo(left, y + cb);
  ctx.moveTo(left, y); ctx.lineTo(right, y);
  ctx.moveTo(right, y - cb); ctx.lineTo(right, y + cb);
  ctx.stroke();
}

async function composite(canvas: HTMLCanvasElement, a: Arrangement) {
  const W = 1200, H = 1200;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // 1. base
  ctx.fillStyle = "#141414";
  ctx.fillRect(0, 0, W, H);

  // 2. stone texture grid
  ctx.strokeStyle = "#1A1A1A";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = 0; y <= H; y += 24) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
  for (let x = 0; x <= W; x += 24) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
  ctx.stroke();

  // 3. radial glow
  const glow = ctx.createRadialGradient(0, H, 0, 0, H, 700);
  glow.addColorStop(0, "rgba(201,151,107,0.07)");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // 4. header bar
  ctx.fillStyle = "#2C2C2C";
  ctx.fillRect(0, 0, W, 110);
  ctx.fillStyle = "#C9976B";
  ctx.fillRect(0, 107, W, 3);
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#C9976B";
  ctx.font = '30px Cinzel, Georgia, serif';
  ctx.textAlign = "left";
  ctx.fillText("The Finer Detail", 32, 55);
  ctx.fillStyle = "#E8E4DF";
  ctx.font = '22px Cinzel, Georgia, serif';
  ctx.textAlign = "right";
  ctx.fillText(categoryLabel(a), 1168, 55);

  // 7. flower image (drawn before brackets so brackets overlay)
  if (a.image_url) {
    try {
      const img = await loadImage(a.image_url);
      const zoneTop = 110, zoneBottom = 1100;
      const pad = 40;
      const availW = W - pad * 2;
      const availH = (zoneBottom - zoneTop) - pad * 2;
      const scale = Math.min(availW / img.width, availH / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = (W - dw) / 2;
      const dy = zoneTop + pad + (availH - dh) / 2;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 10;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    } catch (e) {
      console.warn("flower image failed", e);
    }
  }

  // 8. brackets
  const spec = bracketSpec(a);
  if (spec) {
    ctx.strokeStyle = "#C9976B";
    ctx.lineWidth = 2;
    const zoneTop = 110, zoneBottom = 1100;
    const flowerLeft = 80, flowerRight = W - 80;
    const flowerTop = zoneTop + 60, flowerBottom = zoneBottom - 60;

    if (spec.combo) {
      const mid = (zoneTop + zoneBottom) / 2;
      // dividing line
      ctx.save();
      ctx.strokeStyle = "#C9976B";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(200, mid); ctx.lineTo(W - 200, mid);
      ctx.stroke();
      ctx.restore();

      // upper: bouquet (height left, width top)
      if (spec.height) {
        drawVBracket(ctx, 60, flowerTop, mid - 20);
        ctx.save(); ctx.translate(30, (flowerTop + mid - 20) / 2); ctx.rotate(-Math.PI / 2);
        drawBracketLabel(ctx, 0, 0, `${spec.height.in}in`, `${spec.height.cm.toFixed(2)}cm`);
        ctx.restore();
      }
      if (spec.width) {
        drawHBracket(ctx, zoneTop + 30, flowerLeft + 100, flowerRight - 100);
        drawBracketLabel(ctx, W / 2, zoneTop + 30 - 30, `${spec.width.in}in`, `${spec.width.cm.toFixed(2)}cm`);
      }
      // lower: saddle (bottom length, right width)
      if (spec.bottomLength) {
        drawHBracket(ctx, zoneBottom - 30, flowerLeft + 100, flowerRight - 100);
        drawBracketLabel(ctx, W / 2, zoneBottom - 30 + 30, `${spec.bottomLength.in}in`, `${spec.bottomLength.cm.toFixed(2)}cm`);
      }
      if (spec.rightWidth) {
        drawVBracket(ctx, W - 60, mid + 20, flowerBottom);
        ctx.save(); ctx.translate(W - 30, (mid + 20 + flowerBottom) / 2); ctx.rotate(Math.PI / 2);
        drawBracketLabel(ctx, 0, 0, `${spec.rightWidth.in}in`, `${spec.rightWidth.cm.toFixed(2)}cm`);
        ctx.restore();
      }
    } else {
      if (spec.height) {
        drawVBracket(ctx, 60, flowerTop, flowerBottom);
        ctx.save(); ctx.translate(30, (flowerTop + flowerBottom) / 2); ctx.rotate(-Math.PI / 2);
        drawBracketLabel(ctx, 0, 0, `${spec.height.in}in`, `${spec.height.cm.toFixed(2)}cm`);
        ctx.restore();
      }
      if (spec.width) {
        drawHBracket(ctx, zoneTop + 30, flowerLeft + 100, flowerRight - 100);
        drawBracketLabel(ctx, W / 2, zoneTop + 30 - 30, `${spec.width.in}in`, `${spec.width.cm.toFixed(2)}cm`);
      }
      if (spec.bottomLength) {
        drawHBracket(ctx, zoneBottom - 30, flowerLeft + 100, flowerRight - 100);
        drawBracketLabel(ctx, W / 2, zoneBottom - 30 + 30, `${spec.bottomLength.in}in`, `${spec.bottomLength.cm.toFixed(2)}cm`);
      }
      if (spec.rightWidth) {
        drawVBracket(ctx, W - 60, flowerTop, flowerBottom);
        ctx.save(); ctx.translate(W - 30, (flowerTop + flowerBottom) / 2); ctx.rotate(Math.PI / 2);
        drawBracketLabel(ctx, 0, 0, `${spec.rightWidth.in}in`, `${spec.rightWidth.cm.toFixed(2)}cm`);
        ctx.restore();
      }
      if (spec.heightLabelOnly) {
        ctx.fillStyle = "#C9976B";
        ctx.font = 'bold 24px Cinzel, Georgia, serif';
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(spec.heightLabelOnly, 90, flowerTop + 40);
      }
      if (spec.note) {
        ctx.fillStyle = "#6B6B6B";
        ctx.font = 'italic 16px "Cormorant Garamond", Georgia, serif';
        ctx.textAlign = "center";
        ctx.fillText(spec.note, W / 2, zoneBottom - 70);
      }
    }
  }

  // 9. disclaimer
  ctx.fillStyle = "#6B6B6B";
  ctx.font = 'italic 13px "Cormorant Garamond", Georgia, serif';
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("Measurements approximate", 1168, 1090);

  // 5. footer bar
  ctx.fillStyle = "#2C2C2C";
  ctx.fillRect(0, 1100, W, 100);
  ctx.fillStyle = "#C9976B";
  ctx.fillRect(0, 1100, W, 3);
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#C9976B";
  ctx.font = '18px Cinzel, Georgia, serif';
  ctx.textAlign = "left";
  ctx.fillText("gravedetail.net", 32, 1150);
  ctx.fillStyle = "#6B6B6B";
  ctx.font = 'italic 16px "Cormorant Garamond", Georgia, serif';
  ctx.textAlign = "center";
  ctx.fillText("CCUS Certified · Fully Insured", W / 2, 1150);
  ctx.fillStyle = "#6B6B6B";
  ctx.font = '16px Cinzel, Georgia, serif';
  ctx.textAlign = "right";
  ctx.fillText("@Grave_Detail", 1168, 1150);

  // 6. bronze line
  ctx.fillStyle = "#C9976B";
  ctx.fillRect(0, 1197, W, 3);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob failed"))), "image/jpeg", 0.88)
  );
}

export default function FlowerCompositor() {
  const qc = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [previewArr, setPreviewArr] = useState<Arrangement | null>(null);

  useEffect(() => { ensureFonts(); }, []);

  const { data: arrangements = [], isLoading } = useQuery({
    queryKey: ["compositor-arrangements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flower_arrangements")
        .select("id,name,arrangement_type,ffc_code,gd_code,image_url,image_url_2")
        .not("image_url", "is", null)
        .order("name");
      if (error) throw error;
      return (data || []) as Arrangement[];
    },
  });

  const grouped = useMemo(() => {
    const g: Record<string, Arrangement[]> = {};
    for (const a of arrangements) {
      const k = a.arrangement_type || "other";
      (g[k] ||= []).push(a);
    }
    Object.values(g).forEach((arr) => arr.sort((a, b) => a.name.localeCompare(b.name)));
    return g;
  }, [arrangements]);

  async function generate(a: Arrangement) {
    if (!canvasRef.current) return;
    setGenerating(a.id);
    setActiveId(a.id);
    try {
      await ensureFonts();
      await composite(canvasRef.current, a);
      setPreviewArr(a);
      toast.success("Preview generated. Review and Save.");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Generation failed");
    } finally {
      setGenerating(null);
    }
  }

  async function savePreview() {
    if (!canvasRef.current || !previewArr) return;
    const a = previewArr;
    setGenerating(a.id);
    try {
      const blob = await canvasToBlob(canvasRef.current);
      const filename = `${a.gd_code || a.id}_branded.jpg`;
      const { error: upErr } = await supabase.storage
        .from("flower-images")
        .upload(filename, blob, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("flower-images").getPublicUrl(filename);
      const url = `${pub.publicUrl}?t=${Date.now()}`;
      const { error: dbErr } = await supabase
        .from("flower_arrangements")
        .update({ image_url_2: url })
        .eq("id", a.id);
      if (dbErr) throw dbErr;
      toast.success(`Saved ${a.name}`);
      setPreviewArr(null);
      setActiveId(null);
      qc.invalidateQueries({ queryKey: ["compositor-arrangements"] });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Save failed");
    } finally {
      setGenerating(null);
    }
  }

  function discardPreview() {
    setPreviewArr(null);
    setActiveId(null);
  }

  async function generateAll() {
    const pending = arrangements.filter((a) => !a.image_url_2);
    if (!pending.length) { toast.info("Nothing to generate."); return; }
    if (!canvasRef.current) return;
    await ensureFonts();
    setBulkProgress({ done: 0, total: pending.length });
    for (let i = 0; i < pending.length; i++) {
      const a = pending[i];
      try {
        await composite(canvasRef.current, a);
        const blob = await canvasToBlob(canvasRef.current);
        const filename = `${a.gd_code || a.id}_branded.jpg`;
        const { error: upErr } = await supabase.storage
          .from("flower-images")
          .upload(filename, blob, { contentType: "image/jpeg", upsert: true });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("flower-images").getPublicUrl(filename);
        const url = `${pub.publicUrl}?t=${Date.now()}`;
        const { error: dbErr } = await supabase
          .from("flower_arrangements")
          .update({ image_url_2: url })
          .eq("id", a.id);
        if (dbErr) throw dbErr;
      } catch (e: any) {
        console.error("bulk failed for", a.name, e);
        toast.error(`Failed: ${a.name}`);
      }
      setBulkProgress({ done: i + 1, total: pending.length });
    }
    setBulkProgress(null);
    toast.success("Bulk generation complete");
    qc.invalidateQueries({ queryKey: ["compositor-arrangements"] });
  }

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-primary" /> Image Compositor
          </h1>
          <p className="text-sm text-muted-foreground">
            Composite arrangements onto branded backgrounds.
          </p>
        </div>
        <Button onClick={generateAll} disabled={!!bulkProgress || !!generating}>
          {bulkProgress ? `Generating ${bulkProgress.done}/${bulkProgress.total}` : "Generate All"}
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}

      {Object.keys(grouped).sort().map((type) => (
        <Card key={type}>
          <CardContent className="p-4">
            <h2 className="text-lg font-display font-semibold mb-3 capitalize">{type}</h2>
            <div className="space-y-2">
              {grouped[type].map((a) => (
                <div key={a.id}>
                  <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/40">
                    <img
                      src={a.image_url || ""}
                      alt={a.name}
                      className="w-14 h-14 object-cover rounded border border-border flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{a.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.ffc_code || a.gd_code || a.arrangement_type}
                      </p>
                    </div>
                    {a.image_url_2 && (
                      <Badge variant="secondary" className="gap-1">
                        <Check className="w-3 h-3" /> Generated
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generate(a)}
                      disabled={!!generating || !!bulkProgress}
                    >
                      {generating === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Generate"}
                    </Button>
                  </div>
                  {previewArr?.id === a.id && (
                    <div className="mt-2 p-3 bg-muted/30 rounded-md space-y-2">
                      <canvas
                        ref={canvasRef}
                        className="w-full h-auto border border-border rounded"
                        style={{ maxWidth: "100%" }}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={savePreview} disabled={!!generating}>
                          {generating === a.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={discardPreview} disabled={!!generating}>
                          Discard
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Hidden canvas for bulk + non-active generation */}
      {!previewArr && <canvas ref={canvasRef} className="hidden" />}
    </div>
  );
}

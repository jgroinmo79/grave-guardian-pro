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
  const type = (a.arrangement_type || "").toLowerCase();

  // Priority 1: arrangement_type === "saddle"
  if (type === "saddle") {
    return {
      bottomLength: { in: 30, cm: 76.20 },
      rightWidth: { in: 19, cm: 48.26 },
      heightLabelOnly: "13in tall",
      note: 'Fits headstones 4"–8.5" thick',
    };
  }

  // Priority 1: arrangement_type === "bouquet" — use ffc_code MD/LG
  if (type === "bouquet") {
    if (c.startsWith("LG")) return { height: { in: 28, cm: 71.12 }, width: { in: 18, cm: 45.72 } };
    if (c.startsWith("MD")) return { height: { in: 24, cm: 60.96 }, width: { in: 15, cm: 38.10 } };
    return null;
  }

  // Priority 2: fallback to ffc_code prefix detection
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
  ctx.textBaseline = "top";
  // Left brand text
  ctx.fillStyle = "#C9976B";
  ctx.font = '24px Cinzel, Georgia, serif';
  ctx.textAlign = "left";
  let leftText = "The Finer Detail";
  if (ctx.measureText(leftText).width > 360) {
    ctx.font = '20px Cinzel, Georgia, serif';
  }
  ctx.fillText(leftText, 28, 38);
  // Right side: name + gd_code, right-aligned
  ctx.textAlign = "right";
  ctx.fillStyle = "#E8E4DF";
  ctx.font = '18px Cinzel, Georgia, serif';
  const nameText = a.name || categoryLabel(a);
  if (ctx.measureText(nameText).width > 580) {
    ctx.font = '15px Cinzel, Georgia, serif';
  }
  ctx.fillText(nameText, 1172, 30);
  ctx.fillStyle = "#6B6B6B";
  ctx.font = '14px Cinzel, Georgia, serif';
  ctx.fillText(a.gd_code || "", 1172, 64);
  ctx.textBaseline = "middle";

  // 7. Flower image (white background keyed out, drawn directly on granite)
  const cardX = 80, cardY = 150, cardW = 1040, cardH = 910;
  if (a.image_url) {
    try {
      const img = await loadImage(a.image_url);
      // Offscreen canvas for chroma keying
      const offscreen = document.createElement("canvas");
      offscreen.width = img.naturalWidth || img.width;
      offscreen.height = img.naturalHeight || img.height;
      const off = offscreen.getContext("2d")!;
      off.drawImage(img, 0, 0);
      try {
        const imageData = off.getImageData(0, 0, offscreen.width, offscreen.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          if (r > 230 && g > 230 && b > 230) {
            data[i + 3] = 0;
          } else if (r > 200 && g > 200 && b > 200) {
            const whiteness = (r + g + b - 600) / 105;
            data[i + 3] = Math.round(255 * (1 - whiteness));
          }
        }
        off.putImageData(imageData, 0, 0);
      } catch (keyErr) {
        console.warn("chroma key failed (likely CORS); drawing as-is", keyErr);
      }

      // Fit within 1080 x 965, centered between header (y=130) and footer (y=1095)
      const availW = 1080;
      const availH = 965;
      const centerX = 1200 / 2;
      const centerY = (130 + 1095) / 2;
      const scale = Math.min(availW / offscreen.width, availH / offscreen.height);
      const dw = offscreen.width * scale;
      const dh = offscreen.height * scale;
      const dx = centerX - dw / 2;
      const dy = centerY - dh / 2;

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.7)";
      ctx.shadowBlur = 25;
      ctx.shadowOffsetY = 8;
      ctx.drawImage(offscreen, dx, dy, dw, dh);
      ctx.restore();
    } catch (e) {
      console.warn("flower image failed", e);
    }
  }
  // Keep card coords available for bracket geometry (no rect drawn)
  void cardX; void cardY; void cardW; void cardH;

  // 8. brackets — drawn relative to the white card
  const spec = bracketSpec(a);
  if (spec) {
    ctx.strokeStyle = "#C9976B";
    ctx.lineWidth = 2;
    const zoneTop = 110, zoneBottom = 1100;
    const flowerLeft = cardX, flowerRight = cardX + cardW;
    const flowerTop = cardY + 10, flowerBottom = cardY + cardH - 10;

    // Bracket geometry references the white card (cardX=80, cardY=150, cardW=1040, cardH=820)
    const bracketTop = cardY + 10;        // 160
    const bracketBottom = cardY + cardH - 10; // 960
    const bracketLeftX = 95;
    const bracketRightX = cardX + cardW + 15; // 1135
    const bracketTopY = cardY - 10;       // 140
    const bracketBottomY = cardY + cardH + 10; // 980
    const cardLeftX = cardX + 20;
    const cardRightX = cardX + cardW - 20;

    if (spec.combo) {
      const mid = (bracketTop + bracketBottom) / 2;
      ctx.save();
      ctx.strokeStyle = "#C9976B";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cardLeftX + 80, mid); ctx.lineTo(cardRightX - 80, mid);
      ctx.stroke();
      ctx.restore();

      if (spec.height) {
        drawVBracket(ctx, bracketLeftX, bracketTop, mid - 20);
        ctx.save(); ctx.translate(bracketLeftX - 30, (bracketTop + mid - 20) / 2); ctx.rotate(-Math.PI / 2);
        drawBracketLabel(ctx, 0, 0, `${spec.height.in}in`, `${spec.height.cm.toFixed(2)}cm`);
        ctx.restore();
      }
      if (spec.width) {
        drawHBracket(ctx, bracketTopY, cardLeftX + 80, cardRightX - 80);
        drawBracketLabel(ctx, W / 2, bracketTopY - 30, `${spec.width.in}in`, `${spec.width.cm.toFixed(2)}cm`);
      }
      if (spec.bottomLength) {
        drawHBracket(ctx, bracketBottomY, cardLeftX + 80, cardRightX - 80);
        drawBracketLabel(ctx, W / 2, bracketBottomY + 30, `${spec.bottomLength.in}in`, `${spec.bottomLength.cm.toFixed(2)}cm`);
      }
      if (spec.rightWidth) {
        drawVBracket(ctx, bracketRightX, mid + 20, bracketBottom);
        ctx.save(); ctx.translate(bracketRightX + 30, (mid + 20 + bracketBottom) / 2); ctx.rotate(Math.PI / 2);
        drawBracketLabel(ctx, 0, 0, `${spec.rightWidth.in}in`, `${spec.rightWidth.cm.toFixed(2)}cm`);
        ctx.restore();
      }
    } else {
      if (spec.height) {
        // Vertical bracket on the left side of the white card
        ctx.beginPath();
        ctx.moveTo(bracketLeftX, bracketTop);
        ctx.lineTo(bracketLeftX, bracketBottom);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bracketLeftX - 7, bracketTop);
        ctx.lineTo(bracketLeftX + 7, bracketTop);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bracketLeftX - 7, bracketBottom);
        ctx.lineTo(bracketLeftX + 7, bracketBottom);
        ctx.stroke();
        // Label rotated alongside the bracket
        const midY = (bracketTop + bracketBottom) / 2;
        ctx.save();
        ctx.translate(bracketLeftX - 25, midY);
        ctx.rotate(-Math.PI / 2);
        drawBracketLabel(ctx, 0, 0, `${spec.height.in}in`, `${spec.height.cm.toFixed(2)}cm`);
        ctx.restore();
      }
      if (spec.width) {
        drawHBracket(ctx, bracketTopY, cardLeftX + 80, cardRightX - 80);
        drawBracketLabel(ctx, W / 2, bracketTopY - 30, `${spec.width.in}in`, `${spec.width.cm.toFixed(2)}cm`);
      }
      if (spec.bottomLength) {
        drawHBracket(ctx, bracketBottomY, cardLeftX + 80, cardRightX - 80);
        drawBracketLabel(ctx, W / 2, bracketBottomY + 30, `${spec.bottomLength.in}in`, `${spec.bottomLength.cm.toFixed(2)}cm`);
      }
      if (spec.rightWidth) {
        drawVBracket(ctx, bracketRightX, bracketTop, bracketBottom);
        ctx.save(); ctx.translate(bracketRightX + 30, (bracketTop + bracketBottom) / 2); ctx.rotate(Math.PI / 2);
        drawBracketLabel(ctx, 0, 0, `${spec.rightWidth.in}in`, `${spec.rightWidth.cm.toFixed(2)}cm`);
        ctx.restore();
      }
      if (spec.heightLabelOnly) {
        ctx.fillStyle = "#C9976B";
        ctx.font = 'bold 24px Cinzel, Georgia, serif';
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(spec.heightLabelOnly, 90, bracketTop + 40);
      }
      if (spec.note) {
        ctx.fillStyle = "#6B6B6B";
        ctx.font = 'italic 16px "Cormorant Garamond", Georgia, serif';
        ctx.textAlign = "center";
        ctx.fillText(spec.note, W / 2, bracketBottom + 60);
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
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#2C2C2C";
  ctx.fillRect(0, 1100, W, 100);
  // Footer top border line
  ctx.strokeStyle = "#C9976B";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 1100);
  ctx.lineTo(W, 1100);
  ctx.stroke();
  // Footer bottom line
  ctx.fillStyle = "#C9976B";
  ctx.fillRect(0, 1197, W, 3);
  ctx.textBaseline = "middle";
  // Footer left
  ctx.fillStyle = "#C9976B";
  ctx.font = '18px Cinzel, Georgia, serif';
  ctx.textAlign = "left";
  ctx.fillText("gravedetail.net", 32, 1150);
  // Footer center
  ctx.fillStyle = "#6B6B6B";
  ctx.font = 'italic 15px "Cormorant Garamond", Georgia, serif';
  ctx.textAlign = "center";
  ctx.fillText("CCUS Certified · Fully Insured", W / 2, 1150);
  // Footer right
  ctx.fillStyle = "#6B6B6B";
  ctx.font = '15px Cinzel, Georgia, serif';
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
  const [serverBatch, setServerBatch] = useState<{
    running: boolean;
    processed: number;
    total: number;
    updated: number;
    skipped: number;
    failed: number;
    lastMessage: string;
    finalReport: null | {
      total: number;
      processed: number;
      updated: number;
      skipped: number;
      failed: { id: string; gd_code: string | null; reason: string }[];
    };
  }>({
    running: false,
    processed: 0,
    total: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    lastMessage: "",
    finalReport: null,
  });

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
    setGenerating(a.id);
    setActiveId(a.id);
    setPreviewArr(a);
    try {
      await ensureFonts();
      // Wait for the preview canvas to mount in the DOM before drawing
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      if (!canvasRef.current) throw new Error("Canvas not ready");
      await composite(canvasRef.current, a);
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
                        className="w-full h-auto border border-border rounded block"
                        style={{ maxWidth: "100%", backgroundColor: "#141414" }}
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

      {/* Persistent off-screen canvas — always mounted so ref is stable across re-renders */}
      {!previewArr && (
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", left: -99999, top: -99999, width: 1, height: 1 }}
        />
      )}
    </div>
  );
}

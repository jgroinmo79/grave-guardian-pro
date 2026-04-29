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

async function loadImage(url: string): Promise<HTMLImageElement> {
  // Fetch as blob → object URL so the canvas is never CORS-tainted,
  // regardless of whether the source is Supabase Storage, FFC, or a proxy.
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image fetch HTTP ${res.status}`);
  const blob = await res.blob();
  if (!blob.type.startsWith("image/")) {
    throw new Error(`expected image, got ${blob.type || "unknown"}`);
  }
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image decode failed"));
      img.src = objectUrl;
    });
  } finally {
    // Defer revoke a tick so the image is fully decoded before release.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
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

// Detect a previously branded GD image by sampling its top-left pixel.
// Branded images are drawn on a #141414 granite background → near-black corner.
// Raw FFC images sit on white → bright corner.
async function isAlreadyBrandedImage(imageUrl: string): Promise<boolean> {
  try {
    const res = await fetch(imageUrl, { cache: "no-store" });
    if (!res.ok) return false;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = objectUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("image decode failed"));
      });
      const sample = document.createElement("canvas");
      sample.width = 10;
      sample.height = 10;
      const sCtx = sample.getContext("2d")!;
      sCtx.drawImage(img, 0, 0, 10, 10);
      const pixel = sCtx.getImageData(0, 0, 1, 1).data;
      return pixel[0] < 30 && pixel[1] < 30 && pixel[2] < 30;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch (e) {
    console.warn("[isAlreadyBrandedImage] check failed; assuming not branded", e);
    return false;
  }
}

async function composite(canvas: HTMLCanvasElement, a: Arrangement, opts?: { imageUrlOverride?: string; skipBrackets?: boolean }) {
  const W = 1200, H = 1200;
  // HARD canvas reset: reassigning width wipes all pixels and resets ctx state.
  canvas.width = W;
  canvas.width = canvas.width;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Belt-and-suspenders state reset
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowColor = "rgba(0,0,0,0)";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, W, H);


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
  const flowerSrc = opts?.imageUrlOverride || a.image_url;
  if (flowerSrc) {
    try {
      const img = await loadImage(flowerSrc);
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
  const spec = opts?.skipBrackets ? null : bracketSpec(a);
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
  const [processBatch, setProcessBatch] = useState<{
    running: boolean;
    paused: boolean;
    processed: number;
    total: number;
    saved: number;
    skipped: number;
    failed: number;
    lastMessage: string;
    currentName: string;
    failures: { gd_code: string | null; step: string; reason: string }[];
    finalReport: null | {
      total: number;
      processed: number;
      saved: number;
      skipped: number;
      failed: { gd_code: string | null; step: string; reason: string }[];
    };
  }>({
    running: false,
    paused: false,
    processed: 0,
    total: 0,
    saved: 0,
    skipped: 0,
    failed: 0,
    lastMessage: "",
    currentName: "",
    failures: [],
    finalReport: null,
  });
  const processPauseRef = useRef(false);
  const processResumeIndexRef = useRef(0);
  const [brandBatch, setBrandBatch] = useState<{
    running: boolean;
    paused: boolean;
    processed: number;
    total: number;
    branded: number;
    skipped: number;
    failed: number;
    lastMessage: string;
    failures: { gd_code: string | null; step: string; reason: string }[];
    finalReport: null | {
      total: number;
      processed: number;
      branded: number;
      skipped: number;
      failed: { gd_code: string | null; step: string; reason: string }[];
    };
  }>({
    running: false,
    paused: false,
    processed: 0,
    total: 0,
    branded: 0,
    skipped: 0,
    failed: 0,
    lastMessage: "",
    failures: [],
    finalReport: null,
  });
  const [reprocess, setReprocess] = useState(false);
  const pauseRequestedRef = useRef(false);

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

  function pauseProcessBatch() {
    processPauseRef.current = true;
    setProcessBatch((s) => ({
      ...s,
      paused: true,
      lastMessage: "Pause requested — stopping after current arrangement…",
    }));
  }

  async function runProcessBatch(opts?: { startIndex?: number }) {
    if (!canvasRef.current) {
      toast.error("Canvas not ready");
      return;
    }
    processPauseRef.current = false;
    const startIndex = opts?.startIndex ?? 0;

    setProcessBatch((s) => ({
      ...s,
      running: true,
      paused: false,
      lastMessage: startIndex > 0 ? `Resuming at ${startIndex + 1}…` : "Starting…",
      finalReport: null,
      ...(startIndex === 0
        ? { processed: 0, saved: 0, skipped: 0, failed: 0, currentName: "", failures: [] }
        : {}),
    }));

    let saved = 0;
    let skipped = 0;
    let failed = 0;
    const failedList: { gd_code: string | null; step: string; reason: string }[] = [];
    const recordFailure = (gd_code: string | null, step: string, err: any) => {
      const reason =
        err?.name === "AbortError"
          ? "fetch timeout (10s)"
          : err?.message || String(err);
      console.error(`[process-batch] ${gd_code || "?"} step="${step}" error:`, err);
      failed++;
      failedList.push({ gd_code, step, reason });
      setProcessBatch((s) => ({
        ...s,
        failed,
        failures: [...s.failures, { gd_code, step, reason }].slice(0, 50),
        lastMessage: `Failed ${gd_code || "?"} @ ${step}: ${reason}`,
      }));
    };

    try {
      try {
        await ensureFonts();
      } catch (fontErr) {
        console.error("[process-batch] font load failed (continuing):", fontErr);
      }

      // Load all arrangements with FFC code (and all 5 image slots so we can
      // brand whatever already exists without scraping FFC).
      let list: Arrangement[] = [];
      try {
        const { data: rows, error } = await supabase
          .from("flower_arrangements")
          .select(
            "id,name,arrangement_type,ffc_code,gd_code,image_url,image_url_2,image_url_3,image_url_4,image_url_5",
          )
          .not("ffc_code", "is", null)
          .order("name");
        if (error) throw error;
        list = (rows || []) as Arrangement[];
      } catch (loadErr: any) {
        console.error("[process-batch] failed to load arrangements:", loadErr);
        toast.error(loadErr?.message || "Failed to load arrangements");
        setProcessBatch((s) => ({
          ...s,
          running: false,
          paused: false,
          lastMessage: `Load failed: ${loadErr?.message || loadErr}`,
        }));
        return;
      }

      setProcessBatch((s) => ({
        ...s,
        total: list.length,
        lastMessage: `Found ${list.length} arrangements`,
      }));

      for (let i = startIndex; i < list.length; i++) {
        if (processPauseRef.current) {
          processResumeIndexRef.current = i;
          setProcessBatch((s) => ({
            ...s,
            running: false,
            paused: true,
            lastMessage: `Paused at ${i} of ${list.length}. Resume to continue.`,
          }));
          toast.info(`Paused at ${i} of ${list.length}`);
          try {
            qc.invalidateQueries({ queryKey: ["compositor-arrangements"] });
          } catch {}
          return;
        }

        const a = list[i];
        const label = a.name || a.gd_code || a.id;
        const gd = a.gd_code || a.id;

        setProcessBatch((s) => ({
          ...s,
          processed: i + 1,
          currentName: label,
          lastMessage: `Processing ${i + 1} of ${list.length} — ${label}`,
        }));

        try {
          // Skip rule: image_url already points at our branded storage and
          // reprocess off => nothing to do. Otherwise we (re)brand.
          const alreadyBranded =
            (a.image_url || "").includes("gravedetail") &&
            (a.image_url || "").includes("flower-images");
          if (!reprocess && alreadyBranded) {
            skipped++;
            setProcessBatch((s) => ({
              ...s,
              skipped,
              lastMessage: `Skipped ${label} (already branded)`,
            }));
            await new Promise((r) => setTimeout(r, 30));
            continue;
          }

          // Use whatever image URLs are already on the row. No FFC scraping.
          const sourceUrls = [
            a.image_url,
            (a as any).image_url_2,
            (a as any).image_url_3,
            (a as any).image_url_4,
            (a as any).image_url_5,
          ]
            .filter((u): u is string => !!u)
            .slice(0, 5);

          if (sourceUrls.length === 0) {
            skipped++;
            setProcessBatch((s) => ({
              ...s,
              skipped,
              lastMessage: `Skipped ${label} (no image URLs on row)`,
            }));
            await new Promise((r) => setTimeout(r, 30));
            continue;
          }

          const slotUrls: (string | null)[] = [null, null, null, null, null];
          const slotErrors: string[] = [];

          for (let slot = 0; slot < sourceUrls.length; slot++) {
            const rawUrl = sourceUrls[slot];

            // Skip slot if URL already points to our branded storage for this gd_code
            if (!reprocess && rawUrl.includes("flower-images") && a.gd_code && rawUrl.includes(`${a.gd_code}_`)) {
              slotUrls[slot] = rawUrl;
              continue;
            }

            // Pixel-level branded check: dark top-left corner = already branded
            if (!reprocess) {
              const branded = await isAlreadyBrandedImage(rawUrl);
              if (branded) {
                slotUrls[slot] = rawUrl;
                console.log(`[process-batch] ${a.gd_code || "?"} slot ${slot + 1} already branded (pixel check), skipping`);
                continue;
              }
            }

            // canvas draw
            let drawn = false;
            try {
              await composite(canvasRef.current!, a, {
                imageUrlOverride: rawUrl,
                skipBrackets: slot !== 0,
              });
              drawn = true;
            } catch (drawErr: any) {
              const reason = drawErr?.message || String(drawErr);
              slotErrors.push(`slot ${slot + 1} canvas draw: ${reason}`);
              console.error(
                `[process-batch] ${a.gd_code || "?"} slot ${slot + 1} canvas draw error:`,
                drawErr,
              );
            }
            if (!drawn) {
              await new Promise((r) => setTimeout(r, 100));
              continue;
            }

            // canvas -> blob
            let blob: Blob | null = null;
            try {
              blob = await canvasToBlob(canvasRef.current!);
            } catch (blobErr: any) {
              const reason = blobErr?.message || String(blobErr);
              slotErrors.push(`slot ${slot + 1} canvas encode: ${reason}`);
              console.error(
                `[process-batch] ${a.gd_code || "?"} slot ${slot + 1} canvas encode error:`,
                blobErr,
              );
            }
            if (!blob) {
              await new Promise((r) => setTimeout(r, 100));
              continue;
            }

            // upload to storage
            const filename = `${gd}_${slot + 1}.jpg`;
            try {
              const { error: upErr } = await supabase.storage
                .from("flower-images")
                .upload(filename, blob, {
                  contentType: "image/jpeg",
                  upsert: true,
                });
              if (upErr) throw upErr;
              const { data: pub } = supabase.storage
                .from("flower-images")
                .getPublicUrl(filename);
              slotUrls[slot] = `${pub.publicUrl}?t=${Date.now()}`;
            } catch (upErr: any) {
              const reason = upErr?.message || String(upErr);
              slotErrors.push(`slot ${slot + 1} upload to storage: ${reason}`);
              console.error(
                `[process-batch] ${a.gd_code || "?"} slot ${slot + 1} upload error:`,
                upErr,
              );
            }

            await new Promise((r) => setTimeout(r, 200));
          }

          if (!slotUrls.some(Boolean)) {
            const reason = slotErrors[0] || "all slots failed (unknown reason)";
            recordFailure(a.gd_code, "all slots failed", new Error(reason));
          } else {
            try {
              const { error: updErr } = await supabase
                .from("flower_arrangements")
                .update({
                  image_url: slotUrls[0] ?? a.image_url ?? undefined,
                  image_url_2: slotUrls[1],
                  image_url_3: slotUrls[2],
                  image_url_4: slotUrls[3],
                  image_url_5: slotUrls[4],
                })
                .eq("id", a.id);
              if (updErr) throw updErr;
              saved++;
              setProcessBatch((s) => ({
                ...s,
                saved,
                lastMessage: `Saved ${label} (${slotUrls.filter(Boolean).length} images)`,
              }));
            } catch (dbErr: any) {
              recordFailure(a.gd_code, "database update", dbErr);
            }
          }
        } catch (e: any) {
          // Defensive catch-all so the loop NEVER stops on a single arrangement
          recordFailure(a.gd_code, "unexpected", e);
        }

        // small delay between arrangements
        await new Promise((r) => setTimeout(r, 200));
      }

      processResumeIndexRef.current = 0;
      setProcessBatch((s) => ({
        ...s,
        running: false,
        paused: false,
        lastMessage: "Complete",
        finalReport: {
          total: list.length,
          processed: list.length,
          saved,
          skipped,
          failed: failedList,
        },
      }));
      toast.success(
        `Processing complete: ${saved} saved, ${skipped} skipped, ${failed} failed`,
      );
      qc.invalidateQueries({ queryKey: ["compositor-arrangements"] });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Process batch failed");
      setProcessBatch((s) => ({
        ...s,
        running: false,
        paused: false,
        lastMessage: e.message || "Failed",
      }));
    }
  }

  function resumeProcessBatch() {
    runProcessBatch({ startIndex: processResumeIndexRef.current });
  }

  function pauseBrandBatch() {
    pauseRequestedRef.current = true;
    setBrandBatch((s) => ({ ...s, paused: true, lastMessage: "Pause requested — will stop after current arrangement…" }));
  }

  async function runBrandBatch() {
    if (!canvasRef.current) {
      toast.error("Canvas not ready");
      return;
    }
    pauseRequestedRef.current = false;
    setBrandBatch({
      running: true,
      paused: false,
      processed: 0,
      total: 0,
      branded: 0,
      skipped: 0,
      failed: 0,
      lastMessage: "Starting…",
      failures: [],
      finalReport: null,
    });

    let branded = 0;
    let skipped = 0;
    let failed = 0;
    const failedList: { gd_code: string | null; step: string; reason: string }[] = [];
    const recordBrandFailure = (gd_code: string | null, step: string, err: any) => {
      const reason = err?.message || String(err);
      console.error(`[brand-batch] ${gd_code || "?"} step="${step}" error:`, err);
      failed++;
      failedList.push({ gd_code, step, reason });
      setBrandBatch((s) => ({
        ...s,
        failed,
        failures: [...s.failures, { gd_code, step, reason }].slice(0, 50),
        lastMessage: `Failed ${gd_code || "?"} @ ${step}: ${reason}`,
      }));
    };

    try {
      await ensureFonts();

      const { data: rows, error } = await supabase
        .from("flower_arrangements")
        .select("id,name,arrangement_type,ffc_code,gd_code,image_url,image_url_2,image_url_3,image_url_4,image_url_5")
        .not("ffc_code", "is", null)
        .order("name");
      if (error) throw error;
      const list = (rows || []) as Arrangement[];

      setBrandBatch((s) => ({ ...s, total: list.length, lastMessage: `Found ${list.length} arrangements` }));

      for (let i = 0; i < list.length; i++) {
        if (pauseRequestedRef.current) {
          setBrandBatch((s) => ({ ...s, running: false, lastMessage: `Paused after ${i} arrangements` }));
          toast.info(`Paused after ${i} arrangements`);
          qc.invalidateQueries({ queryKey: ["compositor-arrangements"] });
          return;
        }

        const a = list[i];
        const label = a.name || a.gd_code || a.id;
        setBrandBatch((s) => ({
          ...s,
          processed: i + 1,
          lastMessage: `Branding ${i + 1} of ${list.length} — ${label}`,
        }));

        // Skip if already branded with our storage URL and reprocess off
        const alreadyBranded = (a.image_url || "").includes("gravedetail") &&
          (a.image_url || "").includes("flower-images");
        if (alreadyBranded && !reprocess) {
          skipped++;
          setBrandBatch((s) => ({
            ...s,
            skipped,
            lastMessage: `Skipped ${label} (already branded)`,
          }));
          await new Promise((r) => setTimeout(r, 50));
          continue;
        }

        let currentStep: string = "load arrangement";
        try {
          const gd = a.gd_code || a.id;
          const sourceUrls = [
            a.image_url,
            (a as any).image_url_2,
            (a as any).image_url_3,
            (a as any).image_url_4,
            (a as any).image_url_5,
          ].filter((u): u is string => !!u).slice(0, 5);

          if (sourceUrls.length === 0) {
            skipped++;
            setBrandBatch((s) => ({ ...s, skipped, lastMessage: `Skipped ${label} (no image URLs)` }));
            continue;
          }

          const slotUrls: (string | null)[] = [null, null, null, null, null];
          const slotErrors: string[] = [];

          for (let slot = 0; slot < sourceUrls.length; slot++) {
            const rawUrl = sourceUrls[slot];
            // Skip slot if URL already points to our branded storage for this gd_code
            if (!reprocess && rawUrl.includes("flower-images") && a.gd_code && rawUrl.includes(`${a.gd_code}_`)) {
              slotUrls[slot] = rawUrl;
              continue;
            // Pixel-level branded check: dark top-left corner = already branded
            if (!reprocess) {
              const branded = await isAlreadyBrandedImage(rawUrl);
              if (branded) {
                slotUrls[slot] = rawUrl;
                console.log(`[brand-batch] ${a.gd_code || "?"} slot ${slot + 1} already branded (pixel check), skipping`);
                continue;
              }
            }
            let slotStep = "fetch image";
            try {
              slotStep = "canvas draw";
              await composite(canvasRef.current!, a, {
                imageUrlOverride: rawUrl,
                skipBrackets: slot !== 0,
              });
              const blob = await canvasToBlob(canvasRef.current!);
              slotStep = "upload to storage";
              const filename = `${gd}_${slot + 1}.jpg`;
              const { error: upErr } = await supabase.storage
                .from("flower-images")
                .upload(filename, blob, { contentType: "image/jpeg", upsert: true });
              if (upErr) throw upErr;
              const { data: pub } = supabase.storage.from("flower-images").getPublicUrl(filename);
              slotUrls[slot] = `${pub.publicUrl}?t=${Date.now()}`;
            } catch (slotErr: any) {
              const reason = slotErr?.message || String(slotErr);
              const stepLabel = `slot ${slot + 1} ${slotStep}`;
              slotErrors.push(`${stepLabel}: ${reason}`);
              console.error(
                `[brand-batch] ${a.gd_code || "?"} ${stepLabel} error:`,
                slotErr,
              );
            }
            // 300ms between images to keep browser responsive
            await new Promise((r) => setTimeout(r, 300));
          }

          if (!slotUrls.some(Boolean)) {
            const reason = slotErrors[0] || "all slots failed (unknown reason)";
            recordBrandFailure(a.gd_code, "all slots failed", new Error(reason));
            continue;
          }

          currentStep = "database update";
          const { error: updErr } = await supabase
            .from("flower_arrangements")
            .update({
              image_url: slotUrls[0] ?? a.image_url ?? undefined,
              image_url_2: slotUrls[1],
              image_url_3: slotUrls[2],
              image_url_4: slotUrls[3],
              image_url_5: slotUrls[4],
            })
            .eq("id", a.id);
          if (updErr) throw updErr;

          branded++;
          setBrandBatch((s) => ({
            ...s,
            branded,
            lastMessage: `Branded ${label} (${slotUrls.filter(Boolean).length} slots)`,
          }));
        } catch (e: any) {
          recordBrandFailure(a.gd_code, currentStep, e);
        }
      }

      setBrandBatch((s) => ({
        ...s,
        running: false,
        branded,
        skipped,
        failed,
        lastMessage: "Complete",
        finalReport: {
          total: list.length,
          processed: list.length,
          branded,
          skipped,
          failed: failedList,
        },
      }));
      toast.success(`Branding complete: ${branded} branded, ${skipped} skipped, ${failed} failed`);
      qc.invalidateQueries({ queryKey: ["compositor-arrangements"] });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Brand batch failed");
      setBrandBatch((s) => ({ ...s, running: false, lastMessage: e.message || "Failed" }));
    }
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
        <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {processBatch.running ? (
              <Button
                onClick={pauseProcessBatch}
                disabled={processBatch.paused}
                variant="outline"
              >
                {processBatch.paused ? "Pausing…" : "Pause"}
              </Button>
            ) : processBatch.paused ? (
              <Button
                onClick={resumeProcessBatch}
                style={{ backgroundColor: "#C9976B", color: "#141414" }}
                className="hover:opacity-90"
              >
                Resume
              </Button>
            ) : (
              <Button
                onClick={() => runProcessBatch()}
                disabled={!!bulkProgress || !!generating || brandBatch.running}
                style={{ backgroundColor: "#C9976B", color: "#141414" }}
                className="hover:opacity-90"
              >
                Process All Images
              </Button>
            )}
            <label className="flex items-center gap-1 text-xs text-muted-foreground select-none">
              <input
                type="checkbox"
                checked={reprocess}
                onChange={(e) => setReprocess(e.target.checked)}
                disabled={processBatch.running || brandBatch.running}
              />
              Reprocess
            </label>
          </div>
          <div className="flex items-center gap-2">
            {brandBatch.running ? (
              <Button
                onClick={pauseBrandBatch}
                disabled={brandBatch.paused}
                variant="outline"
              >
                {brandBatch.paused ? "Pausing…" : "Pause"}
              </Button>
            ) : (
              <Button
                onClick={runBrandBatch}
                disabled={!!bulkProgress || !!generating || processBatch.running}
                style={{ backgroundColor: "#C9976B", color: "#141414" }}
                className="hover:opacity-90"
              >
                Brand All Images
              </Button>
            )}
          </div>
          <Button
            onClick={generateAll}
            disabled={!!bulkProgress || !!generating || processBatch.running || brandBatch.running}
          >
            {bulkProgress ? `Generating ${bulkProgress.done}/${bulkProgress.total}` : "Generate All"}
          </Button>
        </div>
      </div>

      {(processBatch.running || processBatch.paused || processBatch.finalReport) && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              {processBatch.running && <Loader2 className="w-4 h-4 animate-spin" />}
              Process All Images (client-side)
            </div>
            {processBatch.total > 0 && (
              <div className="w-full h-2 rounded bg-muted overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.round((processBatch.processed / Math.max(1, processBatch.total)) * 100))}%`,
                    backgroundColor: "#C9976B",
                  }}
                />
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {processBatch.processed} of {processBatch.total} ·
              {" "}{processBatch.saved} images saved, {processBatch.skipped} skipped (outdoor / existing), {processBatch.failed} failed
            </div>
            {processBatch.currentName && processBatch.running && (
              <div className="text-xs font-medium truncate">
                Current: {processBatch.currentName}
              </div>
            )}
            {processBatch.lastMessage && (
              <div className="text-xs font-mono truncate text-muted-foreground">
                {processBatch.lastMessage}
              </div>
            )}
            {(() => {
              const list = processBatch.finalReport?.failed ?? processBatch.failures;
              if (!list || list.length === 0) return null;
              const shown = list.slice(0, 50);
              return (
                <details className="text-xs" open={processBatch.running}>
                  <summary className="cursor-pointer">
                    Failed ({list.length}){list.length > 50 ? " — showing first 50" : ""}
                  </summary>
                  <ul className="mt-1 space-y-0.5 max-h-60 overflow-auto">
                    {shown.map((f, i) => (
                      <li key={i} className="font-mono break-all">
                        <span className="text-foreground">{f.gd_code || "?"}</span>{" "}
                        <span className="text-muted-foreground">[{f.step}]</span>{" "}
                        <span className="text-destructive">{f.reason}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {(brandBatch.running || brandBatch.finalReport) && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              {brandBatch.running && <Loader2 className="w-4 h-4 animate-spin" />}
              Client-side branding
            </div>
            <div className="text-xs text-muted-foreground">
              Processed {brandBatch.processed}/{brandBatch.total} ·
              Branded {brandBatch.branded} · Skipped {brandBatch.skipped} · Failed {brandBatch.failed}
            </div>
            {brandBatch.lastMessage && (
              <div className="text-xs font-mono truncate">{brandBatch.lastMessage}</div>
            )}
            {(() => {
              const list = brandBatch.finalReport?.failed ?? brandBatch.failures;
              if (!list || list.length === 0) return null;
              const shown = list.slice(0, 50);
              return (
                <details className="text-xs" open={brandBatch.running}>
                  <summary className="cursor-pointer">
                    Failed ({list.length}){list.length > 50 ? " — showing first 50" : ""}
                  </summary>
                  <ul className="mt-1 space-y-0.5 max-h-60 overflow-auto">
                    {shown.map((f, i) => (
                      <li key={i} className="font-mono break-all">
                        <span className="text-foreground">{f.gd_code || "?"}</span>{" "}
                        <span className="text-muted-foreground">[{f.step}]</span>{" "}
                        <span className="text-destructive">{f.reason}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })()}
          </CardContent>
        </Card>
      )}

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

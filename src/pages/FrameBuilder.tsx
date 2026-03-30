import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const COLORS = {
  polishedBlack: "#141414",
  rawGranite: "#2C2C2C",
  greyGranite: "#6B6B6B",
  whiteMarble: "#E8E4DF",
  brightBronze: "#C9976B",
  agedBronze: "#7A5C3E",
};

type Layout = "sideBySide" | "topBottom" | "singleBefore" | "singleAfter";
type FrameStyle = "classic" | "minimal" | "bold";

interface ManualAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
}

const DEFAULT_ADJUSTMENTS: ManualAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 0,
};

function applyEnhancements(
  srcImg: HTMLImageElement,
  auto: boolean,
  manual: ManualAdjustments
): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const c = document.createElement("canvas");
    const w = srcImg.width, h = srcImg.height;
    c.width = w; c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(srcImg, 0, 0);

    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;

    let totalB = 0, totalS = 0;
    const count = w * h;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      totalB += (r + g + b) / 3;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      totalS += mx === 0 ? 0 : (mx - mn) / mx;
    }
    const avgB = totalB / count, avgS = totalS / count;

    let brightBoost = manual.brightness;
    let contFactor = 1 + manual.contrast / 100;
    let satBoost = 1 + manual.saturation / 100;
    let sharpAmt = manual.sharpness / 100;

    if (auto) {
      brightBoost += avgB < 100 ? 18 : avgB < 140 ? 10 : 4;
      contFactor *= avgB < 120 ? 1.15 : 1.08;
      satBoost *= avgS < 0.3 ? 1.25 : avgS < 0.5 ? 1.12 : 1.05;
      sharpAmt += 0.45;
    }

    for (let i = 0; i < d.length; i += 4) {
      let r = d[i] + brightBoost, g = d[i + 1] + brightBoost, b = d[i + 2] + brightBoost;
      r = (r - 128) * contFactor + 128;
      g = (g - 128) * contFactor + 128;
      b = (b - 128) * contFactor + 128;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
      if (mx !== mn) {
        r = l + (r - l) * satBoost;
        g = l + (g - l) * satBoost;
        b = l + (b - l) * satBoost;
      }
      d[i] = Math.max(0, Math.min(255, r));
      d[i + 1] = Math.max(0, Math.min(255, g));
      d[i + 2] = Math.max(0, Math.min(255, b));
    }
    ctx.putImageData(imageData, 0, 0);

    if (sharpAmt > 0) {
      const bc = document.createElement("canvas");
      bc.width = w; bc.height = h;
      const bx = bc.getContext("2d")!;
      bx.filter = "blur(1.2px)";
      bx.drawImage(c, 0, 0);
      const blurD = bx.getImageData(0, 0, w, h).data;
      const sharp = ctx.getImageData(0, 0, w, h);
      const sd = sharp.data;
      for (let i = 0; i < sd.length; i += 4) {
        sd[i] = Math.max(0, Math.min(255, sd[i] + (sd[i] - blurD[i]) * sharpAmt));
        sd[i + 1] = Math.max(0, Math.min(255, sd[i + 1] + (sd[i + 1] - blurD[i + 1]) * sharpAmt));
        sd[i + 2] = Math.max(0, Math.min(255, sd[i + 2] + (sd[i + 2] - blurD[i + 2]) * sharpAmt));
      }
      ctx.putImageData(sharp, 0, 0);
    }

    const out = new Image();
    out.onload = () => resolve(out);
    out.src = c.toDataURL();
  });
}

function applyBeforeEnhancements(
  srcImg: HTMLImageElement
): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const c = document.createElement("canvas");
    const w = srcImg.width, h = srcImg.height;
    c.width = w; c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(srcImg, 0, 0);

    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;

    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], g = d[i + 1], b = d[i + 2];
      const gray = r * 0.3 + g * 0.59 + b * 0.11;
      r = r * 0.85 + gray * 0.15 + 3;
      g = g * 0.85 + gray * 0.15;
      b = b * 0.85 + gray * 0.15 - 3;
      r = (r - 128) * 0.95 + 128;
      g = (g - 128) * 0.95 + 128;
      b = (b - 128) * 0.95 + 128;
      d[i] = Math.max(0, Math.min(255, r));
      d[i + 1] = Math.max(0, Math.min(255, g));
      d[i + 2] = Math.max(0, Math.min(255, b));
    }
    ctx.putImageData(imageData, 0, 0);

    const out = new Image();
    out.onload = () => resolve(out);
    out.src = c.toDataURL();
  });
}

export default function FrameBuilder() {
  const [beforeImgRaw, setBeforeImgRaw] = useState<HTMLImageElement | null>(null);
  const [beforeImgProcessed, setBeforeImgProcessed] = useState<HTMLImageElement | null>(null);
  const [afterImgRaw, setAfterImgRaw] = useState<HTMLImageElement | null>(null);
  const [afterImgProcessed, setAfterImgProcessed] = useState<HTMLImageElement | null>(null);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const [layout, setLayout] = useState<Layout>("sideBySide");
  const [frameStyle] = useState<FrameStyle>("classic");
  const [showBranding, setShowBranding] = useState(true);
  const [showTagline, setShowTagline] = useState(true);
  const [autoEnhance, setAutoEnhance] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState<ManualAdjustments>(DEFAULT_ADJUSTMENTS);
  const [caption, setCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (afterImgRaw) {
      applyEnhancements(afterImgRaw, autoEnhance, manual).then(setAfterImgProcessed);
    }
  }, [afterImgRaw, autoEnhance, manual]);

  useEffect(() => {
    if (beforeImgRaw) {
      if (autoEnhance) {
        applyBeforeEnhancements(beforeImgRaw).then(setBeforeImgProcessed);
      } else {
        setBeforeImgProcessed(beforeImgRaw);
      }
    }
  }, [beforeImgRaw, autoEnhance]);

  const handleFile = useCallback(async (file: File, which: "before" | "after") => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        if (which === "before") {
          setBeforeImgRaw(img);
          setBeforePreview(dataUrl);
        } else {
          setAfterImgRaw(img);
          setAfterPreview(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  const drawFrame = useCallback(() => {
    const beforeImg = beforeImgProcessed;
    const afterImg = afterImgProcessed;
    const isSingle = layout === "singleBefore" || layout === "singleAfter";

    if (isSingle) {
      const needed = layout === "singleBefore" ? beforeImg : afterImg;
      if (!needed || !canvasRef.current) return;
    } else {
      if (!beforeImg || !afterImg || !canvasRef.current) return;
    }

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const fs = frameStyle;
    const pad = 24, gap = 12, labelH = 48, topBar = 6;
    const brandH = showBranding ? 64 : 0;
    const tagH = showTagline && showBranding ? 28 : 0;
    const captionH = caption.trim() ? 44 : 0;
    const imgW = 540, imgH = 540;

    let W: number, H: number;
    if (layout === "sideBySide") {
      W = pad + imgW + gap + imgW + pad;
      H = topBar + pad + labelH + imgH + pad + captionH + brandH + tagH + (brandH ? 8 : 0);
    } else if (layout === "topBottom") {
      W = pad + imgW + pad;
      H = topBar + pad + labelH + imgH + gap + labelH + imgH + pad + captionH + brandH + tagH + (brandH ? 8 : 0);
    } else {
      W = pad + imgW + pad;
      H = topBar + pad + labelH + imgH + pad + captionH + brandH + tagH + (brandH ? 8 : 0);
    }
    canvas.width = W; canvas.height = H;

    ctx.fillStyle = COLORS.polishedBlack;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = COLORS.brightBronze;
    ctx.fillRect(0, 0, W, topBar);

    function cropDraw(img: HTMLImageElement, x: number, y: number, w: number, h: number) {
      const sr = img.width / img.height, dr = w / h;
      let sx: number, sy: number, sw: number, sh: number;
      if (sr > dr) { sh = img.height; sw = sh * dr; sx = (img.width - sw) / 2; sy = 0; }
      else { sw = img.width; sh = sw / dr; sx = 0; sy = (img.height - sh) / 2; }
      if (fs === "classic") {
        const r = 6;
        ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip();
        ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
        ctx.restore();
        ctx.strokeStyle = COLORS.rawGranite; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.stroke();
      } else {
        ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
      }
    }

    function drawLabel(text: string, x: number, y: number, w: number) {
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      if (fs === "bold") {
        ctx.fillStyle = text === "BEFORE" ? COLORS.greyGranite : COLORS.brightBronze;
        ctx.font = "bold 22px 'Cinzel', serif";
      } else if (fs === "minimal") {
        ctx.fillStyle = COLORS.greyGranite;
        ctx.font = "600 14px 'Cinzel', serif";
      } else {
        ctx.fillStyle = COLORS.whiteMarble;
        ctx.font = "600 16px 'Cinzel', serif";
      }
      const sp = text.split("").join("\u200A");
      ctx.fillText(sp, x + w / 2, y + labelH / 2);
      if (fs === "classic") {
        const tw = ctx.measureText(sp).width;
        const half = tw / 2 + 16;
        ctx.strokeStyle = COLORS.greyGranite; ctx.lineWidth = 1; ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.moveTo(x + w / 2 - half - 40, y + labelH / 2); ctx.lineTo(x + w / 2 - half, y + labelH / 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + w / 2 + half, y + labelH / 2); ctx.lineTo(x + w / 2 + half + 40, y + labelH / 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    const y0 = topBar + pad;

    if (layout === "sideBySide") {
      drawLabel("BEFORE", pad, y0, imgW);
      drawLabel("AFTER", pad + imgW + gap, y0, imgW);
      cropDraw(beforeImg!, pad, y0 + labelH, imgW, imgH);
      cropDraw(afterImg!, pad + imgW + gap, y0 + labelH, imgW, imgH);
    } else if (layout === "topBottom") {
      drawLabel("BEFORE", pad, y0, imgW);
      cropDraw(beforeImg!, pad, y0 + labelH, imgW, imgH);
      const y1 = y0 + labelH + imgH + gap;
      drawLabel("AFTER", pad, y1, imgW);
      cropDraw(afterImg!, pad, y1 + labelH, imgW, imgH);
    } else if (layout === "singleBefore") {
      drawLabel("BEFORE", pad, y0, imgW);
      cropDraw(beforeImg!, pad, y0 + labelH, imgW, imgH);
    } else {
      drawLabel("AFTER", pad, y0, imgW);
      cropDraw(afterImg!, pad, y0 + labelH, imgW, imgH);
    }

    if (caption.trim()) {
      const capY = H - captionH - brandH - tagH - (brandH ? 8 : 0);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = COLORS.whiteMarble;
      ctx.font = "italic 15px 'Cormorant Garamond', serif";
      ctx.fillText(caption.trim(), W / 2, capY + captionH / 2);
    }

    if (showBranding) {
      const by = H - brandH - tagH;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = fs === "bold" ? COLORS.brightBronze : COLORS.whiteMarble;
      ctx.font = fs === "bold" ? "700 26px 'Cinzel', serif" : "600 22px 'Cinzel', serif";
      ctx.fillText("G\u200A\u200AR\u200A\u200AA\u200A\u200AV\u200A\u200AE\u200A\u200A \u200A\u200AD\u200A\u200AE\u200A\u200AT\u200A\u200AA\u200A\u200AI\u200A\u200AL", W / 2, by + brandH / 2);
      if (fs !== "minimal") {
        ctx.strokeStyle = COLORS.brightBronze; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
        ctx.beginPath(); ctx.moveTo(W / 2 - 60, by + brandH / 2 + 18); ctx.lineTo(W / 2 + 60, by + brandH / 2 + 18); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    if (showBranding && showTagline) {
      const ty = H - tagH - 4;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = COLORS.greyGranite;
      ctx.font = "italic 13px 'Cormorant Garamond', serif";
      ctx.fillText("Time Takes a Toll. We Take It Back.", W / 2, ty + tagH / 2);
    }

    setPreviewUrl(canvas.toDataURL("image/png"));
  }, [beforeImgProcessed, afterImgProcessed, layout, frameStyle, showBranding, showTagline, caption]);

  useEffect(() => {
    const isSingle = layout === "singleBefore" || layout === "singleAfter";
    if (isSingle) {
      const needed = layout === "singleBefore" ? beforeImgProcessed : afterImgProcessed;
      if (needed) drawFrame();
    } else {
      if (beforeImgProcessed && afterImgProcessed) drawFrame();
    }
  }, [beforeImgProcessed, afterImgProcessed, layout, frameStyle, showBranding, showTagline, caption, drawFrame]);

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = `grave-detail-${layout}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const layoutOptions: { key: Layout; label: string }[] = [
    { key: "sideBySide", label: "Side by Side" },
    { key: "topBottom", label: "Top / Bottom" },
    { key: "singleBefore", label: "Single \u2014 Before" },
    { key: "singleAfter", label: "Single \u2014 After" },
  ];

  const pillClass = (active: boolean) =>
    `px-4 py-1.5 rounded-full text-xs tracking-wider cursor-pointer transition-all border ` +
    (active
      ? "border-[#C9976B] bg-[#C9976B] text-[#141414] font-bold"
      : "border-[#6B6B6B] bg-transparent text-[#E8E4DF]");

  const sliderRow = (label: string, key: keyof ManualAdjustments, min: number, max: number) => (
    <div className="flex items-center gap-3 mb-3" key={key}>
      <span className="text-xs w-20 shrink-0" style={{ color: COLORS.greyGranite, fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={manual[key]}
        onChange={(e) => setManual({ ...manual, [key]: Number(e.target.value) })}
        className="flex-1 h-1 appearance-none rounded-full outline-none"
        style={{ accentColor: COLORS.brightBronze, background: COLORS.rawGranite }}
      />
      <span className="text-xs w-8 text-right" style={{ color: COLORS.greyGranite }}>{manual[key]}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#141414] text-[#E8E4DF] p-4 pb-24" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet" />

      <div className="text-center mb-6">
        <h1 className="text-lg font-semibold tracking-[4px] text-[#E8E4DF]" style={{ fontFamily: "'Cinzel', serif" }}>FRAME BUILDER</h1>
        <div className="w-10 h-0.5 bg-[#C9976B] mx-auto mt-2" />
      </div>

      <div className="mb-5">
        <div className="text-[11px] tracking-[2px] mb-2" style={{ fontFamily: "'Cinzel', serif", color: COLORS.greyGranite }}>LAYOUT</div>
        <div className="flex gap-2 flex-wrap">
          {layoutOptions.map(({ key, label }) => (
            <button key={key} className={pillClass(layout === key)} onClick={() => setLayout(key)} style={{ fontFamily: "'Cinzel', serif" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <div className="text-[11px] tracking-[2px] mb-2" style={{ fontFamily: "'Cinzel', serif", color: COLORS.greyGranite }}>PHOTOS</div>
        <div className="flex gap-3">
          {(layout !== "singleAfter") && (
            <div
              onClick={() => beforeInputRef.current?.click()}
              className="flex-1 min-h-[160px] rounded-lg flex flex-col items-center justify-center relative overflow-hidden cursor-pointer"
              style={{
                border: `2px dashed ${beforePreview ? COLORS.brightBronze : COLORS.greyGranite}`,
                background: beforePreview ? "none" : COLORS.rawGranite,
              }}
            >
              {beforePreview && <img src={beforePreview} alt="Before" className="absolute inset-0 w-full h-full object-cover" />}
              <div className={`relative z-10 flex flex-col items-center gap-1 p-3 rounded-md ${beforePreview ? "bg-black/70" : ""}`}>
                {!beforePreview && <span className="text-3xl" style={{ color: COLORS.greyGranite }}>+</span>}
                <span className="text-base tracking-wide" style={{ fontFamily: "'Cormorant Garamond', serif", color: beforePreview ? COLORS.brightBronze : COLORS.whiteMarble }}>
                  {beforePreview ? "Change" : "Before"}
                </span>
                {!beforePreview && <span className="text-xs" style={{ color: COLORS.greyGranite }}>Tap to upload</span>}
              </div>
              <input ref={beforeInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], "before")} />
            </div>
          )}
          {(layout !== "singleBefore") && (
            <div
              onClick={() => afterInputRef.current?.click()}
              className="flex-1 min-h-[160px] rounded-lg flex flex-col items-center justify-center relative overflow-hidden cursor-pointer"
              style={{
                border: `2px dashed ${afterPreview ? COLORS.brightBronze : COLORS.greyGranite}`,
                background: afterPreview ? "none" : COLORS.rawGranite,
              }}
            >
              {afterPreview && <img src={afterPreview} alt="After" className="absolute inset-0 w-full h-full object-cover" />}
              <div className={`relative z-10 flex flex-col items-center gap-1 p-3 rounded-md ${afterPreview ? "bg-black/70" : ""}`}>
                {!afterPreview && <span className="text-3xl" style={{ color: COLORS.greyGranite }}>+</span>}
                <span className="text-base tracking-wide" style={{ fontFamily: "'Cormorant Garamond', serif", color: afterPreview ? COLORS.brightBronze : COLORS.whiteMarble }}>
                  {afterPreview ? "Change" : "After"}
                </span>
                {!afterPreview && <span className="text-xs" style={{ color: COLORS.greyGranite }}>Tap to upload</span>}
              </div>
              <input ref={afterInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], "after")} />
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg p-4 mb-5" style={{ background: COLORS.rawGranite }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] tracking-[2px]" style={{ fontFamily: "'Cinzel', serif", color: COLORS.greyGranite }}>AUTO ENHANCE</span>
          <div className="flex items-center cursor-pointer select-none" onClick={() => setAutoEnhance(!autoEnhance)}>
            <div className={`w-10 h-[22px] rounded-full relative transition-colors ${autoEnhance ? "bg-[#C9976B]" : "bg-[#6B6B6B]"}`}>
              <div className={`w-[18px] h-[18px] rounded-full bg-[#E8E4DF] absolute top-[2px] transition-all shadow ${autoEnhance ? "left-5" : "left-[2px]"}`} />
            </div>
          </div>
        </div>
        <p className="text-xs mb-3" style={{ color: COLORS.greyGranite }}>
          Before: grime emphasis &middot; After: clean &amp; bright
        </p>
        <button
          onClick={() => setShowManual(!showManual)}
          className="text-[11px] tracking-[2px] cursor-pointer"
          style={{ fontFamily: "'Cinzel', serif", color: COLORS.greyGranite, background: "none", border: "none", borderBottom: `1px solid ${COLORS.greyGranite}` }}
        >
          MANUAL ADJUSTMENTS {showManual ? "\u25B2" : "\u25BC"}
        </button>
        {showManual && (
          <div className="mt-4">
            {sliderRow("Bright", "brightness", -30, 30)}
            {sliderRow("Contrast", "contrast", -30, 30)}
            {sliderRow("Saturate", "saturation", -30, 30)}
            {sliderRow("Sharp", "sharpness", 0, 100)}
            <button
              onClick={() => setManual(DEFAULT_ADJUSTMENTS)}
              className="text-xs mt-1 px-3 py-1 rounded border cursor-pointer"
              style={{ borderColor: COLORS.greyGranite, color: COLORS.greyGranite, background: "none" }}
            >
              Reset
            </button>
          </div>
        )}
      </div>

      <div className="mb-5">
        <div className="text-[11px] tracking-[2px] mb-2" style={{ fontFamily: "'Cinzel', serif", color: COLORS.greyGranite }}>CAPTION (OPTIONAL)</div>
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="e.g. Schwitz Monument — Cape Girardeau, MO"
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
          style={{
            background: COLORS.rawGranite,
            color: COLORS.whiteMarble,
            border: `1px solid ${COLORS.greyGranite}`,
            fontFamily: "'Cormorant Garamond', serif",
          }}
        />
      </div>

      <div className="flex gap-5 mb-6 flex-wrap">
        {([
          [showBranding, setShowBranding, "Branding"],
          [showTagline, setShowTagline, "Tagline"],
        ] as [boolean, React.Dispatch<React.SetStateAction<boolean>>, string][]).map(([val, setter, label]) => (
          <div key={label} className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => setter(!val)}>
            <div className={`w-10 h-[22px] rounded-full relative transition-colors ${val ? "bg-[#C9976B]" : "bg-[#6B6B6B]"}`}>
              <div className={`w-[18px] h-[18px] rounded-full bg-[#E8E4DF] absolute top-[2px] transition-all shadow ${val ? "left-5" : "left-[2px]"}`} />
            </div>
            <span className="text-sm">{label}</span>
          </div>
        ))}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {previewUrl && (
        <div className="mb-5">
          <div className="text-[11px] tracking-[2px] mb-2" style={{ fontFamily: "'Cinzel', serif", color: COLORS.greyGranite }}>PREVIEW</div>
          <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.rawGranite}` }}>
            <img src={previewUrl} alt="Preview" className="w-full block" />
          </div>
        </div>
      )}

      {previewUrl && (
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 py-3.5 rounded-lg text-sm font-bold tracking-[3px] transition-colors bg-[#C9976B] text-[#141414] active:bg-[#7A5C3E]"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            DOWNLOAD
          </button>
          <button
            disabled={uploading}
            onClick={async () => {
              if (!canvasRef.current) return;
              setUploading(true);
              try {
                const blob = await new Promise<Blob>((res) => canvasRef.current!.toBlob((b) => res(b!), "image/png"));
                const path = `gallery/${Date.now()}.png`;
                const { error: upErr } = await supabase.storage.from("monument-photos").upload(path, blob, { contentType: "image/png" });
                if (upErr) throw upErr;
                const { data: { publicUrl } } = supabase.storage.from("monument-photos").getPublicUrl(path);
                const { error: dbErr } = await supabase.from("gallery_photos").insert({ photo_url: publicUrl, alt_text: caption || "Before & After" });
                if (dbErr) throw dbErr;
                queryClient.invalidateQueries({ queryKey: ["gallery-photos"] });
                toast.success("Added to gallery!");
              } catch (err: any) {
                toast.error(err.message || "Upload failed");
              } finally {
                setUploading(false);
              }
            }}
            className="flex-1 py-3.5 rounded-lg text-sm font-bold tracking-[3px] transition-colors border border-[#C9976B] text-[#C9976B] active:bg-[#7A5C3E] active:text-[#141414] disabled:opacity-50"
            style={{ fontFamily: "'Cinzel', serif", background: "transparent" }}
          >
            {uploading ? "UPLOADING…" : "ADD TO GALLERY"}
          </button>
        </div>
      )}

      {!beforeImgRaw && !afterImgRaw && (
        <div className="text-center py-5 italic text-sm" style={{ color: COLORS.greyGranite }}>
          Upload your before &amp; after photos to get started
        </div>
      )}
    </div>
  );
}

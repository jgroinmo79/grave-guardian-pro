import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const COLORS = {
  polishedBlack: "#141414",
  rawGranite: "#2C2C2C",
  greyGranite: "#6B6B6B",
  whiteMarble: "#E8E4DF",
  brightBronze: "#C9976B",
  agedBronze: "#7A5C3E",
};

function enhanceImage(srcImg: HTMLImageElement): Promise<HTMLImageElement> {
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
    const brightBoost = avgB < 100 ? 18 : avgB < 140 ? 10 : 4;
    const contFactor = avgB < 120 ? 1.15 : 1.08;
    const satBoost = avgS < 0.3 ? 1.25 : avgS < 0.5 ? 1.12 : 1.05;

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

    const bc = document.createElement("canvas");
    bc.width = w; bc.height = h;
    const bx = bc.getContext("2d")!;
    bx.filter = "blur(1.2px)";
    bx.drawImage(c, 0, 0);
    const blurD = bx.getImageData(0, 0, w, h).data;
    const sharp = ctx.getImageData(0, 0, w, h);
    const sd = sharp.data;
    for (let i = 0; i < sd.length; i += 4) {
      sd[i] = Math.max(0, Math.min(255, sd[i] + (sd[i] - blurD[i]) * 0.45));
      sd[i + 1] = Math.max(0, Math.min(255, sd[i + 1] + (sd[i + 1] - blurD[i + 1]) * 0.45));
      sd[i + 2] = Math.max(0, Math.min(255, sd[i + 2] + (sd[i + 2] - blurD[i + 2]) * 0.45));
    }
    ctx.putImageData(sharp, 0, 0);

    const out = new Image();
    out.onload = () => resolve(out);
    out.src = c.toDataURL();
  });
}

export default function FrameBuilder() {
  const [beforeImg, setBeforeImg] = useState<HTMLImageElement | null>(null);
  const [afterImgRaw, setAfterImgRaw] = useState<HTMLImageElement | null>(null);
  const [afterImgEnhanced, setAfterImgEnhanced] = useState<HTMLImageElement | null>(null);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const [layout, setLayout] = useState<"sideBySide" | "stacked">("sideBySide");
  const [frameStyle, setFrameStyle] = useState<"classic" | "minimal" | "bold">("classic");
  const [showBranding, setShowBranding] = useState(true);
  const [showTagline, setShowTagline] = useState(true);
  const [autoEnhance, setAutoEnhance] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFile = useCallback(async (file: File, which: "before" | "after") => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = async () => {
        if (which === "before") {
          setBeforeImg(img);
          setBeforePreview(dataUrl);
        } else {
          setAfterImgRaw(img);
          setAfterPreview(dataUrl);
          const enhanced = await enhanceImage(img);
          setAfterImgEnhanced(enhanced);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  const drawFrame = useCallback(() => {
    const activeAfter = autoEnhance ? afterImgEnhanced : afterImgRaw;
    if (!beforeImg || !activeAfter || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const isSide = layout === "sideBySide";
    const fs = frameStyle;
    const pad = 24, gap = 12, labelH = 48, topBar = 6;
    const brandH = showBranding ? 64 : 0;
    const tagH = showTagline && showBranding ? 28 : 0;
    const imgW = 540, imgH = 540;

    let W: number, H: number;
    if (isSide) {
      W = pad + imgW + gap + imgW + pad;
      H = topBar + pad + labelH + imgH + pad + brandH + tagH + (brandH ? 8 : 0);
    } else {
      W = pad + imgW + pad;
      H = topBar + pad + labelH + imgH + gap + labelH + imgH + pad + brandH + tagH + (brandH ? 8 : 0);
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
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.clip();
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

    if (isSide) {
      const y0 = topBar + pad;
      drawLabel("BEFORE", pad, y0, imgW);
      drawLabel("AFTER", pad + imgW + gap, y0, imgW);
      cropDraw(beforeImg, pad, y0 + labelH, imgW, imgH);
      cropDraw(activeAfter, pad + imgW + gap, y0 + labelH, imgW, imgH);
    } else {
      const y0 = topBar + pad;
      drawLabel("BEFORE", pad, y0, imgW);
      cropDraw(beforeImg, pad, y0 + labelH, imgW, imgH);
      const y1 = y0 + labelH + imgH + gap;
      drawLabel("AFTER", pad, y1, imgW);
      cropDraw(activeAfter, pad, y1 + labelH, imgW, imgH);
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
  }, [beforeImg, afterImgRaw, afterImgEnhanced, autoEnhance, layout, frameStyle, showBranding, showTagline]);

  useEffect(() => {
    const activeAfter = autoEnhance ? afterImgEnhanced : afterImgRaw;
    if (beforeImg && activeAfter) drawFrame();
  }, [beforeImg, afterImgRaw, afterImgEnhanced, autoEnhance, layout, frameStyle, showBranding, showTagline, drawFrame]);

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = `grave-detail-${layout}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const pillClass = (active: boolean) =>
    `px-4 py-1.5 rounded-full text-xs tracking-wider cursor-pointer transition-all border ` +
    (active
      ? "border-[#C9976B] bg-[#C9976B] text-[#141414] font-bold"
      : "border-[#6B6B6B] bg-transparent text-[#E8E4DF]");

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-6" style={{ background: COLORS.polishedBlack, fontFamily: "'Cinzel', serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet" />

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div className="text-center space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-widest" style={{ color: COLORS.whiteMarble }}>
          FRAME BUILDER
        </h1>
        <div className="w-16 h-0.5 mx-auto" style={{ background: COLORS.brightBronze }} />
      </div>

      <div className="flex gap-3">
        {(["before", "after"] as const).map((which) => {
          const preview = which === "before" ? beforePreview : afterPreview;
          const inputRef = which === "before" ? beforeInputRef : afterInputRef;
          return (
            <div
              key={which}
              onClick={() => inputRef.current?.click()}
              className="flex-1 min-h-[150px] rounded-lg flex flex-col items-center justify-center relative overflow-hidden cursor-pointer"
              style={{
                border: `2px dashed ${preview ? COLORS.brightBronze : COLORS.greyGranite}`,
                background: preview ? "none" : COLORS.rawGranite,
              }}
            >
              {preview && <img src={preview} alt={which} className="absolute inset-0 w-full h-full object-cover" />}
              <div className="relative z-10 text-center" style={{ textShadow: preview ? "0 1px 4px #000" : "none" }}>
                {!preview && <span className="text-3xl block mb-1" style={{ color: COLORS.brightBronze }}>+</span>}
                <span
                  className="text-xs uppercase tracking-widest block"
                  style={{ color: preview ? COLORS.whiteMarble : COLORS.greyGranite }}
                >
                  {preview ? `Change ${which}` : which}
                </span>
                {!preview && <span className="text-[10px] block mt-1" style={{ color: COLORS.greyGranite }}>Tap to upload</span>}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], which)}
              />
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest" style={{ color: COLORS.greyGranite }}>LAYOUT</p>
        <div className="flex gap-2">
          <span className={pillClass(layout === "sideBySide")} onClick={() => setLayout("sideBySide")} style={{ fontFamily: "'Cinzel', serif" }}>Side by Side</span>
          <span className={pillClass(layout === "stacked")} onClick={() => setLayout("stacked")} style={{ fontFamily: "'Cinzel', serif" }}>Stacked</span>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest" style={{ color: COLORS.greyGranite }}>STYLE</p>
        <div className="flex gap-2">
          {(["classic", "minimal", "bold"] as const).map((s) => (
            <span key={s} className={pillClass(frameStyle === s)} onClick={() => setFrameStyle(s)} style={{ fontFamily: "'Cinzel', serif" }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        {([
          ["autoEnhance", autoEnhance, setAutoEnhance, "Auto Enhance"],
          ["branding", showBranding, setShowBranding, "Branding"],
          ["tagline", showTagline, setShowTagline, "Tagline"],
        ] as const).map(([key, val, setter, label]) => (
          <div key={key as string} className="flex items-center gap-2 cursor-pointer" onClick={() => (setter as any)(!val)}>
            <div
              className="w-9 h-5 rounded-full relative transition-colors"
              style={{ background: val ? COLORS.brightBronze : COLORS.greyGranite }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ left: val ? "18px" : "2px" }}
              />
            </div>
            <span className="text-xs tracking-wider" style={{ color: COLORS.whiteMarble }}>{label}</span>
          </div>
        ))}
      </div>

      {previewUrl && (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-center" style={{ color: COLORS.greyGranite }}>PREVIEW</p>
          <div className="rounded-lg overflow-hidden border" style={{ borderColor: COLORS.rawGranite }}>
            <img src={previewUrl} alt="preview" className="w-full" />
          </div>
        </div>
      )}

      {previewUrl && (
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 py-3 rounded-lg text-sm font-bold tracking-widest transition-colors"
            style={{ background: COLORS.brightBronze, color: COLORS.polishedBlack }}
          >
            DOWNLOAD
          </button>
          <button
            disabled={uploading}
            onClick={async () => {
              if (!canvasRef.current) return;
              setUploading(true);
              try {
                const blob = await new Promise<Blob>((res) =>
                  canvasRef.current!.toBlob((b) => res(b!), "image/png")
                );
                const path = `gallery/${Date.now()}.png`;
                const { error: uploadError } = await supabase.storage
                  .from("monument-photos")
                  .upload(path, blob, { contentType: "image/png" });
                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage
                  .from("monument-photos")
                  .getPublicUrl(path);

                const { data: existing } = await supabase
                  .from("gallery_photos")
                  .select("display_order")
                  .order("display_order", { ascending: false })
                  .limit(1);
                const maxOrder = existing?.length ? existing[0].display_order : -1;

                const { error: insertError } = await supabase.from("gallery_photos").insert({
                  photo_url: urlData.publicUrl,
                  alt_text: "Before and after monument cleaning",
                  display_order: maxOrder + 1,
                });
                if (insertError) throw insertError;

                queryClient.invalidateQueries({ queryKey: ["gallery-photos"] });
                alert("Added to gallery!");
              } catch (err: any) {
                alert("Upload failed: " + err.message);
              } finally {
                setUploading(false);
              }
            }}
            className="flex-1 py-3 rounded-lg text-sm font-bold tracking-widest transition-colors border"
            style={{
              background: "transparent",
              color: COLORS.brightBronze,
              borderColor: COLORS.brightBronze,
              opacity: uploading ? 0.5 : 1,
            }}
          >
            {uploading ? "UPLOADING…" : "ADD TO GALLERY"}
          </button>
        </div>
      )}

      {!beforeImg && !afterImgRaw && (
        <p className="text-center text-sm italic" style={{ color: COLORS.greyGranite, fontFamily: "'Cormorant Garamond', serif" }}>
          Upload your before & after photos to get started
        </p>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import cemeteryBg from "@/assets/cemetery-bg.jpg";

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ComingSoon = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hidden access: type "austin" anywhere on the page to enter the site.
  useEffect(() => {
    const SECRET = "austin";
    let buffer = "";
    const handler = (e: KeyboardEvent) => {
      // Ignore typing inside form fields so visitors can't trigger it accidentally.
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key.length !== 1) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-SECRET.length);
      if (buffer === SECRET) navigate("/home");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const { error: insertError } = await supabase
      .from("launch_signups" as any)
      .insert({ email: normalized } as any);
    setSubmitting(false);
    if (insertError && insertError.code !== "23505") {
      setError("Something went wrong. Please try again.");
      return;
    }
    setSuccess(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden bg-background">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${cemeteryBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 z-0 bg-black/75" />

      <div className="relative z-10 w-full max-w-2xl text-center space-y-8">
        <motion.h1
          {...fade(0)}
          className="uppercase font-bold text-[32px] sm:text-[48px] leading-tight font-cinzel text-foreground tracking-[0.15em]"
        >
          Launching Summer 2026
        </motion.h1>

        <motion.p
          {...fade(0.15)}
          className="italic text-[22px] font-garamond text-bronze mt-4"
        >
          Be the first to know when we open the gates.
        </motion.p>

        <motion.div {...fade(0.3)} className="mt-8 min-h-[64px] flex items-center justify-center">
          {success ? (
            <p className="italic text-lg font-garamond text-bronze">
              You're on the list. We'll be in touch.
            </p>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="w-full flex flex-col sm:flex-row gap-3 items-center justify-center"
            >
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full sm:w-[320px] outline-none bg-card border border-granite text-foreground font-garamond rounded-sm px-[18px] py-[14px]"
              />
              <button
                type="submit"
                disabled={submitting}
                className="uppercase font-semibold transition-colors disabled:opacity-60 w-full sm:w-auto bg-bronze text-background hover:bg-patina hover:text-foreground font-cinzel tracking-[0.1em] rounded-sm px-7 py-[14px]"
              >
                {submitting ? "..." : "Notify Me"}
              </button>
            </form>
          )}
        </motion.div>

        {error && !success && (
          <p className="text-sm font-garamond text-bronze">
            {error}
          </p>
        )}

        <motion.p
          {...fade(0.45)}
          className="text-[14px] font-garamond text-granite mt-6"
        >
          Founder-operated · CCUS-certified · Fully insured
        </motion.p>

      </div>
    </div>
  );
};

export default ComingSoon;

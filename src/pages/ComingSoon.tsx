import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ backgroundColor: "#141414" }}
    >
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
          className="uppercase font-bold text-[32px] sm:text-[48px] leading-tight"
          style={{
            fontFamily: "Cinzel, serif",
            color: "#E8E4DF",
            letterSpacing: "0.15em",
          }}
        >
          Launching Summer 2026
        </motion.h1>

        <motion.p
          {...fade(0.15)}
          className="italic text-[22px]"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            color: "#C9976B",
            marginTop: "16px",
          }}
        >
          Be the first to know when we open the gates.
        </motion.p>

        <motion.div {...fade(0.3)} style={{ marginTop: "32px" }} className="min-h-[64px] flex items-center justify-center">
          {success ? (
            <p
              className="italic text-lg"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: "#C9976B" }}
            >
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
                className="w-full sm:w-[320px] outline-none"
                style={{
                  backgroundColor: "#2C2C2C",
                  border: "1px solid #6B6B6B",
                  color: "#E8E4DF",
                  padding: "14px 18px",
                  borderRadius: "2px",
                  fontFamily: "'Cormorant Garamond', serif",
                }}
              />
              <button
                type="submit"
                disabled={submitting}
                className="uppercase font-semibold transition-colors disabled:opacity-60 w-full sm:w-auto"
                style={{
                  backgroundColor: "#C9976B",
                  color: "#141414",
                  fontFamily: "Cinzel, serif",
                  letterSpacing: "0.1em",
                  padding: "14px 28px",
                  borderRadius: "2px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#7A5C3E";
                  e.currentTarget.style.color = "#E8E4DF";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#C9976B";
                  e.currentTarget.style.color = "#141414";
                }}
              >
                {submitting ? "..." : "Notify Me"}
              </button>
            </form>
          )}
        </motion.div>

        {error && !success && (
          <p
            className="text-sm"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "#C9976B" }}
          >
            {error}
          </p>
        )}

        <motion.p
          {...fade(0.45)}
          className="text-[14px]"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            color: "#6B6B6B",
            marginTop: "24px",
          }}
        >
          Founder-operated · CCUS-certified · Fully insured
        </motion.p>

        <motion.div {...fade(0.6)} className="pt-4">
          <Link
            to="/home"
            className="text-xs uppercase tracking-[0.15em] transition-colors hover:underline"
            style={{ fontFamily: "Cinzel, serif", color: "#6B6B6B" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#C9976B")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6B6B")}
          >
            Enter Site →
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default ComingSoon;

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Instagram, Facebook, Phone, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import cemeteryBg from "@/assets/cemetery-bg.jpg";
import { toast } from "sonner";

// Local-time target: May 15, 2026 at midnight in the visitor's own timezone.
// Using explicit Y/M/D constructor avoids string-parsing ambiguity across browsers.
const TARGET_DATE = new Date(2026, 4, 15, 0, 0, 0, 0);

function useCountdown(target: Date) {
  const calc = () => {
    const diff = Math.max(0, target.getTime() - Date.now());
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay },
});

const ComingSoon = () => {
  const countdown = useCountdown(TARGET_DATE);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    const trimmedEmail = email.trim();
    const signupId = crypto.randomUUID();
    const { error } = await supabase.from("email_signups" as any).insert({ id: signupId, email: trimmedEmail } as any);
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        toast.success("You're already on the list!");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } else {
      toast.success("You're on the list! We'll notify you at launch.");
      setEmail("");
      // Send confirmation email (fire-and-forget)
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "signup-confirmation",
          recipientEmail: trimmedEmail,
          idempotencyKey: `signup-confirm-${signupId}`,
        },
      });
    }
  };

  const timerBoxes = [
    { value: countdown.days, label: "Days" },
    { value: countdown.hours, label: "Hours" },
    { value: countdown.minutes, label: "Minutes" },
    { value: countdown.seconds, label: "Seconds" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden" style={{ backgroundColor: "#141414" }}>
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${cemeteryBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 z-0 bg-black/75" />
      <div className="relative z-10 w-full max-w-lg text-center space-y-10">
        {/* Business Name */}
        <motion.h1
          {...fade(0)}
          className="text-4xl sm:text-5xl font-bold tracking-wider"
          style={{ fontFamily: "Cinzel, serif", color: "#E8E4DF" }}
        >
          Grave Detail
          <span className="block text-lg sm:text-xl tracking-[0.2em] mt-1" style={{ color: "#C9976B" }}>
            Cleaning &amp; Preservation
          </span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          {...fade(0.15)}
          className="text-xl sm:text-2xl italic"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: "#C9976B" }}
        >
          Time Takes a Toll. We Take It Back.
        </motion.p>

        {/* Coming Soon Badge */}
        <motion.div {...fade(0.3)} className="flex justify-center">
          <span
            className="px-6 py-2 rounded-full text-sm font-semibold tracking-widest uppercase"
            style={{
              fontFamily: "Cinzel, serif",
              color: "#C9976B",
              border: "1px solid #C9976B",
              backgroundColor: "rgba(201,151,107,0.08)",
            }}
          >
            Coming Soon
          </span>
        </motion.div>

        {/* Countdown */}
        <motion.div {...fade(0.45)} className="flex justify-center gap-3 sm:gap-4">
          {timerBoxes.map((box) => (
            <div
              key={box.label}
              className="flex flex-col items-center rounded-lg px-4 py-3 min-w-[70px]"
              style={{ backgroundColor: "#2C2C2C", border: "1px solid #6B6B6B" }}
            >
              <span
                className="text-2xl sm:text-3xl font-bold tabular-nums"
                style={{ fontFamily: "Cinzel, serif", color: "#E8E4DF" }}
              >
                {String(box.value).padStart(2, "0")}
              </span>
              <span
                className="text-[10px] uppercase tracking-widest mt-1"
                style={{ fontFamily: "Cinzel, serif", color: "#6B6B6B" }}
              >
                {box.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Email Signup */}
        <motion.form {...fade(0.6)} onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            required
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 h-12 rounded-md px-4 text-sm outline-none"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              backgroundColor: "#2C2C2C",
              border: "1px solid #6B6B6B",
              color: "#E8E4DF",
            }}
          />
          <button
            type="submit"
            disabled={submitting}
            className="h-12 px-6 rounded-md text-sm font-semibold tracking-wider uppercase transition-colors disabled:opacity-60"
            style={{
              fontFamily: "Cinzel, serif",
              backgroundColor: "#C9976B",
              color: "#141414",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#7A5C3E")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#C9976B")}
          >
            {submitting ? "..." : "Notify Me"}
          </button>
        </motion.form>

        {/* Contact Info */}
        <motion.div
          {...fade(0.75)}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: "#6B6B6B" }}
        >
          <a href="tel:5735455759" className="flex items-center gap-1.5 hover:text-[#C9976B] transition-colors">
            <Phone className="w-4 h-4" /> (573) 545-5759
          </a>
          <span className="hidden sm:inline">|</span>
          <a href="mailto:info@gravedetail.net" className="flex items-center gap-1.5 hover:text-[#C9976B] transition-colors">
            <Mail className="w-4 h-4" /> info@gravedetail.net
          </a>
        </motion.div>

        {/* Social Icons */}
        <motion.div {...fade(0.9)} className="flex justify-center gap-6">
          <a
            href="https://www.instagram.com/grave_detail/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors"
            style={{ color: "#6B6B6B" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#C9976B")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6B6B")}
            aria-label="Instagram"
          >
            <Instagram className="w-5 h-5" />
          </a>
          <a
            href="https://www.facebook.com/GraveDetail"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors"
            style={{ color: "#6B6B6B" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#C9976B")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6B6B")}
            aria-label="Facebook"
          >
            <Facebook className="w-5 h-5" />
          </a>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          {...fade(1.05)}
          className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs uppercase tracking-[0.15em]"
          style={{ fontFamily: "Cinzel, serif", color: "#6B6B6B" }}
        >
          <span>CCUS Certified</span>
          <span>•</span>
          <span>Fully Insured</span>
          <span>•</span>
          <span>Owner-Operated</span>
        </motion.div>

        {/* Enter Site Link */}
        <motion.div {...fade(1.15)} className="pt-2">
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

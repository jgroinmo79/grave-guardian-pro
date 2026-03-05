import { useState } from "react";
import { Button } from "@/components/ui/button";
import IntakeFlow from "@/components/IntakeFlow";
import { Shield, Star, Clock, ChevronRight, LogOut, User, Settings } from "lucide-react";
import heroImage from "@/assets/hero-monument.png";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const Index = () => {
  const [showIntake, setShowIntake] = useState(false);
  const { user, signOut } = useAuth();

  const { data: isAdmin } = useQuery({
    queryKey: ["admin-role", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  if (showIntake) return <IntakeFlow />;

  return (
    <div className="min-h-screen gradient-dark overflow-hidden">
      {/* User bar */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <User className="w-3 h-3" />
          {user?.email}
        </span>
        {isAdmin && (
          <Link to="/admin" className="text-xs text-primary hover:underline flex items-center gap-1">
            <Settings className="w-3 h-3" /> Admin
          </Link>
        )}
        <Button variant="outline" size="sm" onClick={signOut} className="h-8 text-xs">
          <LogOut className="w-3 h-3 mr-1" /> Sign Out
        </Button>
      </div>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center px-4">
        {/* Hero background image */}
        <div className="absolute inset-0">
          <img src={heroImage} alt="Grave Detail Cleaning and Preservation monument" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-background/70" />
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-6 font-semibold">
              Cape Girardeau, Missouri
            </p>
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.1] mb-6">
              Honor Their Memory.{" "}
              <span className="text-gradient-patina">Preserve Their Stone.</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed">
              Professional monument cleaning and long-term preservation 
              so your loved one's resting place reflects the respect they deserve.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="hero"
                size="lg"
                className="h-14 px-10 text-base"
                onClick={() => setShowIntake(true)}
              >
                Get Your Free Quote <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
              <Button variant="outline" size="lg" className="h-14 px-8 text-base">
                View Our Work
              </Button>
            </div>
          </motion.div>

          {/* Trust signals */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-xl mx-auto"
          >
            {[
              { icon: Shield, label: "Insured & Bonded", sub: "Full liability coverage" },
              { icon: Star, label: "5-Star Rated", sub: "Trusted by families" },
              { icon: Clock, label: "Same-Week Service", sub: "Priority scheduling" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2">
                <item.icon className="w-5 h-5 text-primary" />
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* About Us */}
      <section className="relative px-4 py-24 sm:py-32">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-10 text-center">
              About <span className="text-gradient-patina">Us</span>
            </h2>

            <div className="space-y-6 text-muted-foreground leading-relaxed text-base sm:text-lg">
              <p>
                Grave Detail Cleaning &amp; Preservation was founded by Josh Grogan after the loss of a close family member. Like many families, he began visiting the gravesite regularly and quickly noticed something that most people overlook until they see it firsthand — how quickly monuments become covered in biological growth, staining, and weathering, and how many of them remain that way for years or even decades.
              </p>
              <p>
                What began as a personal effort to care for one memorial turned into a deeper realization: countless graves are neglected not because families do not care, but because they live far away, lack the proper knowledge, or simply do not know how to safely care for stone monuments. Headstones are not just pieces of stone; they are historical records, family markers, and lasting tributes to lives that mattered.
              </p>
              <p>
                In 2024, Josh began studying cemetery conservation and preservation methods, attending training and researching best practices used by professional gravestone conservators. One principle guided everything from the start — "Do No Harm." Preservation work must always protect the original stone, use the gentlest methods possible, and avoid shortcuts that cause long-term damage. Modern conservation standards emphasize minimal intervention and careful documentation of treatments so the integrity of the monument is preserved for future generations.
              </p>
              <p>
                Grave Detail Cleaning &amp; Preservation was built around those standards. Every service is performed using preservation-based methods designed to remove biological growth, improve readability, and extend the life of the monument without harming the stone. Soft-wash techniques, non-ionic cleaners, and professional conservation products are used instead of pressure washing, harsh chemicals, or abrasive cleaning methods that can permanently damage historic markers.
              </p>

              <p className="text-foreground font-semibold text-lg sm:text-xl mt-10">
                But this work is about more than stone.
              </p>
              <p className="text-foreground font-semibold text-lg sm:text-xl">
                It is about respect.
              </p>
              <p className="text-foreground font-semibold text-lg sm:text-xl">
                It is about family history.
              </p>
              <p className="text-foreground font-semibold text-lg sm:text-xl">
                It is about making sure someone's name and memory are not slowly erased by time.
              </p>

              <p>
                Many families cannot regularly visit the resting places of their loved ones. Some live across the country. Others simply need help maintaining the site properly. Our role is to step in with care, professionalism, and the understanding that every grave we work on belongs to someone's story.
              </p>
              <p>
                Grave Detail Cleaning &amp; Preservation exists to ensure those stories remain visible, dignified, and preserved for generations to come.
              </p>

              <p className="text-gradient-patina font-display text-2xl sm:text-3xl font-bold text-center mt-12">
                Time Takes a Toll. We Take It Back.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;

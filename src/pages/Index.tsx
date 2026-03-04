import { useState } from "react";
import { Button } from "@/components/ui/button";
import IntakeFlow from "@/components/IntakeFlow";
import { Shield, Star, Clock, ChevronRight, LogOut, User, Settings } from "lucide-react";
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
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />

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
    </div>
  );
};

export default Index;

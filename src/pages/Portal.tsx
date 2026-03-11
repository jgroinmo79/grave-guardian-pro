import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User, MapPin, Camera, Clock, ChevronRight, Shield, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import GraveDetail from "@/components/portal/GraveDetail";

const Portal = () => {
  const { user, signOut } = useAuth();
  const [selectedMonumentId, setSelectedMonumentId] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: monuments, isLoading } = useQuery({
    queryKey: ["my-monuments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monuments")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: orders } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

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

  if (selectedMonumentId) {
    return (
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Button variant="ghost" size="sm" className="mb-4 gap-1.5" onClick={() => setSelectedMonumentId(null)}>
            <ArrowLeft className="w-4 h-4" /> Back to Portal
          </Button>
          <GraveDetail monumentId={selectedMonumentId} />
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: "bg-accent/20 text-accent",
    confirmed: "bg-primary/20 text-primary",
    scheduled: "bg-primary/20 text-primary",
    in_progress: "bg-accent/20 text-accent",
    completed: "bg-primary/20 text-primary",
    cancelled: "bg-destructive/20 text-destructive",
  };

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-display font-bold text-lg text-gradient-patina">My Portal</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
              <User className="w-3 h-3" />
              {profile?.full_name || user?.email}
            </span>
            {isAdmin && (
              <Link to="/admin" className="text-xs text-primary hover:underline">Admin</Link>
            )}
            <Button variant="outline" size="sm" onClick={signOut} className="h-8 text-xs gap-1">
              <LogOut className="w-3 h-3" /> Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="font-display text-2xl font-bold">
            Welcome{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            View your monuments, service history, and photos below.
          </p>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: MapPin, label: "Monuments", value: monuments?.length ?? 0 },
            { icon: Clock, label: "Orders", value: orders?.length ?? 0 },
            { icon: Shield, label: "Active", value: orders?.filter(o => !["completed", "cancelled"].includes(o.status)).length ?? 0 },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4 text-center space-y-1">
              <stat.icon className="w-4 h-4 text-primary mx-auto" />
              <p className="text-xl font-display font-bold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* My Monuments */}
        <section className="space-y-4">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> My Monuments
          </h3>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !monuments?.length ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground text-sm">No monuments yet.</p>
              <Link to="/">
                <Button variant="hero" size="sm" className="mt-4">Book Your First Service</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {monuments.map((m) => (
                <motion.button
                  key={m.id}
                  className="rounded-xl border border-border bg-card p-4 flex items-center justify-between text-left hover:border-primary/30 transition-colors w-full"
                  onClick={() => setSelectedMonumentId(m.id)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">{m.cemetery_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.monument_type.replace(/_/g, " ")} · {m.material}
                      {m.section ? ` · Sec ${m.section}` : ""}
                      {m.lot_number ? `, Lot ${m.lot_number}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </motion.button>
              ))}
            </div>
          )}
        </section>

        {/* Recent Orders */}
        <section className="space-y-4">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Order History
          </h3>
          {!orders?.length ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground text-sm">No orders yet.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {orders.map((o) => (
                <div key={o.id} className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-mono text-muted-foreground">#{o.id.slice(0, 8)}</p>
                    <p className="text-sm font-semibold">Offer {o.offer}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[o.status] ?? ""}`}>
                      {o.status.replace(/_/g, " ")}
                    </span>
                    <p className="font-display font-bold">${Number(o.total_price).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Book Another */}
        <div className="text-center pt-4">
          <Link to="/">
            <Button variant="hero" size="lg" className="gap-2">
              Book Another Service <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Portal;

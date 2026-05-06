import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User, MapPin, Clock, ChevronRight, Shield, ArrowLeft, FileText, MessageSquare, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import GraveDetail from "@/components/portal/GraveDetail";
import PlanDetail from "@/components/portal/PlanDetail";
import SupportForm from "@/components/portal/SupportForm";
import HistoryTab from "@/components/portal/HistoryTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const { data: subscriptions } = useQuery({
    queryKey: ["my-subscriptions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, monuments (cemetery_name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: invoices } = useQuery({
    queryKey: ["my-invoices", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
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
            <ArrowLeft className="w-4 h-4" /> Back to Detail Hub
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

  const statusLabels: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    scheduled: "Scheduled",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  const planStatusColors: Record<string, string> = {
    active: "bg-primary/20 text-primary",
    paused: "bg-accent/20 text-accent",
    cancelled: "bg-destructive/20 text-destructive",
    expired: "bg-muted text-muted-foreground",
  };

  const invoiceStatusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    sent: "bg-accent/20 text-accent",
    paid: "bg-primary/20 text-primary",
    overdue: "bg-destructive/20 text-destructive",
  };

  const activePlans = subscriptions?.filter((s) => s.status === "active").length ?? 0;

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-display font-bold text-lg text-gradient-patina">Detail Hub</h1>
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
            View your monuments, service history, photos, and invoices below.
          </p>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-5 gap-2">
          {[
            { icon: MapPin, label: "Monuments", value: monuments?.length ?? 0 },
            { icon: Clock, label: "Orders", value: orders?.length ?? 0 },
            { icon: Shield, label: "Plans", value: activePlans },
            { icon: FileText, label: "Receipts", value: orders?.filter((o: any) => o.stripe_payment_status === "paid").length ?? 0 },
            { icon: MessageSquare, label: "Requests", value: "—" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-3 text-center space-y-1">
              <stat.icon className="w-4 h-4 text-primary mx-auto" />
              <p className="text-lg font-display font-bold">{stat.value}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabbed content */}
        <Tabs defaultValue="graves" className="space-y-4">
          <TabsList className="bg-secondary w-full grid grid-cols-5">
            <TabsTrigger value="graves" className="text-xs">Graves</TabsTrigger>
            <TabsTrigger value="plans" className="text-xs">Plans</TabsTrigger>
            <TabsTrigger value="invoices" className="text-xs">Receipts</TabsTrigger>
            <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
            <TabsTrigger value="support" className="text-xs">Support</TabsTrigger>
          </TabsList>

          {/* My Graves */}
          <TabsContent value="graves" className="space-y-4">
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
                {monuments.map((m) => {
                  // Find plan for this monument
                  const plan = subscriptions?.find((s) => s.monument_id === m.id && s.status === "active");
                  return (
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
                      <div className="flex items-center gap-2">
                        {plan && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium capitalize">
                            {plan.plan}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Plans */}
          <TabsContent value="plans" className="space-y-4">
            {!subscriptions?.length ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No care plans yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Care plans are set up after your first service.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {subscriptions.map((s: any) => (
                  <PlanDetail key={s.id} subscription={s} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Receipts */}
          <TabsContent value="invoices" className="space-y-4">
            {(() => {
              const paidOrders = (orders ?? []).filter(
                (o: any) => o.stripe_payment_status === "paid" || o.status === "completed" || o.status === "confirmed" || o.status === "scheduled" || o.status === "in_progress"
              );
              if (!paidOrders.length) {
                return (
                  <div className="rounded-xl border border-border bg-card p-8 text-center">
                    <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No receipts yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">Receipts appear here after a successful payment.</p>
                  </div>
                );
              }
              return (
                <div className="grid gap-3">
                  {paidOrders.map((o: any) => {
                    const monument = monuments?.find((m) => m.id === o.monument_id);
                    const subtotal = Number(o.base_price ?? 0) + Number(o.bundle_price ?? 0) + Number(o.add_ons_total ?? 0);
                    return (
                      <div key={o.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border">
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Receipt</p>
                            <p className="font-semibold text-sm font-mono">#{o.id.slice(0, 8).toUpperCase()}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">PAID</span>
                            <p className="font-display font-bold text-lg mt-1">${Number(o.total_price).toFixed(2)}</p>
                          </div>
                        </div>

                        {monument && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{monument.cemetery_name}</span>
                            {monument.section ? ` · Sec ${monument.section}` : ""}
                            {monument.lot_number ? `, Lot ${monument.lot_number}` : ""}
                          </div>
                        )}

                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Service</span>
                            <span>${Number(o.base_price ?? 0).toFixed(2)}</span>
                          </div>
                          {Number(o.bundle_price ?? 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Care Plan</span>
                              <span>${Number(o.bundle_price).toFixed(2)}</span>
                            </div>
                          )}
                          {Number(o.add_ons_total ?? 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Add-ons</span>
                              <span>${Number(o.add_ons_total).toFixed(2)}</span>
                            </div>
                          )}
                          {Number(o.travel_fee ?? 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Travel Fee</span>
                              <span>${Number(o.travel_fee).toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-1.5 border-t border-border font-semibold text-foreground">
                            <span>Total Paid</span>
                            <span>${Number(o.total_price).toFixed(2)}</span>
                          </div>
                        </div>

                        {o.stripe_payment_intent_id && (
                          <p className="text-[10px] text-muted-foreground font-mono pt-1">
                            Payment ID: {o.stripe_payment_intent_id.slice(0, 20)}…
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </TabsContent>

          {/* Order History */}
          <TabsContent value="history" className="space-y-4">
            <HistoryTab orders={orders ?? []} />
          </TabsContent>

          {/* Support */}
          <TabsContent value="support">
            <SupportForm />
          </TabsContent>
        </Tabs>

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

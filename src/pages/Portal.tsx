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
            View your monuments, service history, photos, and invoices below.
          </p>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-5 gap-2">
          {[
            { icon: MapPin, label: "Monuments", value: monuments?.length ?? 0 },
            { icon: Clock, label: "Orders", value: orders?.length ?? 0 },
            { icon: Shield, label: "Plans", value: activePlans },
            { icon: FileText, label: "Invoices", value: invoices?.length ?? 0 },
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
            <TabsTrigger value="invoices" className="text-xs">Invoices</TabsTrigger>
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

          {/* Invoices */}
          <TabsContent value="invoices" className="space-y-4">
            {!invoices?.length ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No invoices yet.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {invoices.map((inv: any) => (
                  <div key={inv.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">#{inv.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(inv.created_at).toLocaleDateString()}
                          {inv.due_date && ` · Due ${new Date(inv.due_date).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${invoiceStatusColors[inv.status] ?? ""}`}>
                          {inv.status}
                        </span>
                        <p className="font-display font-bold">${Number(inv.total).toFixed(2)}</p>
                      </div>
                    </div>
                    {/* Payment action */}
                    {inv.status !== "paid" && inv.status !== "draft" && (
                      <div className="pt-1">
                        {inv.stripe_payment_link ? (
                          <a href={inv.stripe_payment_link} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="hero" className="text-xs h-7 gap-1">
                              <CreditCard className="w-3 h-3" /> Pay Now
                            </Button>
                          </a>
                        ) : (
                          <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
                            💳 To pay, please contact us or mail a check to the address on your invoice.
                          </p>
                        )}
                      </div>
                    )}
                    {inv.paid_at && (
                      <p className="text-[10px] text-primary">Paid {new Date(inv.paid_at).toLocaleDateString()}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
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

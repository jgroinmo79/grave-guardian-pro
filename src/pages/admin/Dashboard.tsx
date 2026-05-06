import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, Users, DollarSign, CalendarDays, TrendingUp, Shield, FileText, AlertTriangle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const now = new Date();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

  const { data: orders } = useQuery({
    queryKey: ["admin-orders-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id, status, total_price, created_at, scheduled_date").limit(500);
      if (error) throw error;
      return data;
    },
  });

  const { data: monuments } = useQuery({
    queryKey: ["admin-monuments-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("monuments").select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: activeClients } = useQuery({
    queryKey: ["admin-active-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id");
      if (error) throw error;
      return data?.length ?? 0;
    },
  });

  const { data: activePlans } = useQuery({
    queryKey: ["admin-active-plans"],
    queryFn: async () => {
      const { count, error } = await supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: invoiceStats } = useQuery({
    queryKey: ["admin-invoice-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("id, status, total");
      if (error) throw error;
      const outstanding = data?.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + Number(i.total), 0) ?? 0;
      const paid = data?.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total), 0) ?? 0;
      return { outstanding, paid, total: data?.length ?? 0 };
    },
  });

  const totalOrders = orders?.length ?? 0;
  const pendingOrders = orders?.filter((o) => o.status === "pending").length ?? 0;
  const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total_price), 0) ?? 0;
  const upcomingJobs = orders?.filter((o) => o.scheduled_date && o.scheduled_date >= format(now, "yyyy-MM-dd") && o.status !== "completed" && o.status !== "cancelled").length ?? 0;
  const servicedThisMonth = orders?.filter((o) => o.status === "completed" && o.scheduled_date && o.scheduled_date >= monthStart && o.scheduled_date <= monthEnd).length ?? 0;

  const stats = [
    { label: "Total Orders", value: totalOrders, icon: ClipboardList, color: "text-primary" },
    { label: "Pending", value: pendingOrders, icon: CalendarDays, color: "text-accent" },
    { label: "Active Clients", value: activeClients ?? 0, icon: Users, color: "text-primary" },
    { label: "Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-accent" },
  ];

  const stats2 = [
    { label: "Active Plans", value: activePlans ?? 0, icon: Shield, color: "text-primary" },
    { label: "Upcoming Jobs", value: upcomingJobs, icon: CalendarDays, color: "text-accent" },
    { label: "Serviced This Month", value: servicedThisMonth, icon: TrendingUp, color: "text-primary" },
    { label: "Outstanding Invoices", value: `$${(invoiceStats?.outstanding ?? 0).toLocaleString()}`, icon: FileText, color: "text-accent" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back, Josh</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-display font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats2.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-display font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-display font-semibold mb-4">Recent Orders</h2>
        <RecentOrdersTable />
      </div>

      <DangerZone />
    </div>
  );
};

function DangerZone() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (confirm !== "DELETE ALL") return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-all-orders", {
        body: { confirmation: "DELETE ALL" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("All orders and related data deleted");
      setOpen(false);
      setConfirm("");
      await queryClient.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
        <div>
          <h2 className="text-lg font-display font-semibold text-destructive">Danger Zone</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Permanently delete all orders, monuments, invoices, subscriptions, photos, service logs, support tickets, consent logs, abandoned leads, and uploaded files. This cannot be undone.
          </p>
        </div>
      </div>
      <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirm(""); }}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">Delete All Orders</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all orders & related data?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes every order, monument, invoice, subscription, service log, photo record, support ticket, consent log, abandoned lead, and all files in monument-photos storage. Customer accounts remain intact. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-delete">Type <span className="font-mono font-bold">DELETE ALL</span> to confirm</Label>
            <Input
              id="confirm-delete"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="DELETE ALL"
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={confirm !== "DELETE ALL" || loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting…</> : "Delete Everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RecentOrdersTable() {
  const navigate = useNavigate();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-recent-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, offer, status, total_price, created_at, monument_id")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!orders?.length) return <p className="text-sm text-muted-foreground">No orders yet.</p>;

  const statusColors: Record<string, string> = {
    pending: "bg-accent/20 text-accent",
    confirmed: "bg-primary/20 text-primary",
    scheduled: "bg-primary/20 text-primary",
    in_progress: "bg-accent/20 text-accent",
    completed: "bg-primary/20 text-primary",
    cancelled: "bg-destructive/20 text-destructive",
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="pb-2 font-medium">Order</th>
            <th className="pb-2 font-medium">Offer</th>
            <th className="pb-2 font-medium">Status</th>
            <th className="pb-2 font-medium text-right">Total</th>
            <th className="pb-2 font-medium text-right">Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr
              key={o.id}
              className="border-b border-border/50 last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => navigate(`/admin/orders/${o.id}`)}
            >
              <td className="py-3 font-mono text-xs">{o.id.slice(0, 8)}…</td>
              <td className="py-3">Offer {o.offer}</td>
              <td className="py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[o.status] ?? ""}`}>
                  {o.status}
                </span>
              </td>
              <td className="py-3 text-right font-semibold">${Number(o.total_price).toFixed(2)}</td>
              <td className="py-3 text-right text-muted-foreground">
                {new Date(o.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminDashboard;

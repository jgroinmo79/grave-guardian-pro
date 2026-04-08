import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Send, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const statusStyles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-accent/20 text-accent",
  paid: "bg-primary/20 text-primary",
  overdue: "bg-destructive/20 text-destructive",
  cancelled: "bg-muted text-muted-foreground line-through",
};

const AdminInvoices = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState("all");

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["admin-invoices", filter],
    queryFn: async () => {
      let q = supabase
        .from("invoices")
        .select(`*, monuments (cemetery_name, monument_type), profiles:user_id (full_name, email)`)
        .order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates = status === "paid"
        ? { status, paid_at: new Date().toISOString() }
        : { status };
      const { error } = await supabase.from("invoices").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      toast({ title: "Invoice updated" });
    },
  });

  // Stats
  const stats = {
    total: invoices?.length ?? 0,
    outstanding: invoices?.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + Number(i.total), 0) ?? 0,
    paid: invoices?.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total), 0) ?? 0,
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Invoices</h1>
          <p className="text-sm text-muted-foreground">Manage billing and payments</p>
        </div>
        <CreateInvoiceDialog open={showCreate} onOpenChange={setShowCreate} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
          <p className="text-xl font-display font-bold">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Outstanding</p>
          <p className="text-xl font-display font-bold text-accent">${stats.outstanding.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Collected</p>
          <p className="text-xl font-display font-bold text-primary">${stats.paid.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["all", "draft", "sent", "paid", "overdue"].map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            className="text-xs capitalize"
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>

      {/* Invoice list */}
      {!invoices?.length ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No invoices found.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {invoices.map((inv: any) => (
            <div key={inv.id} className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">#{inv.invoice_number}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusStyles[inv.status] ?? ""}`}>
                    {inv.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {inv.profiles?.full_name ?? inv.profiles?.email ?? "—"} · {inv.monuments?.cemetery_name ?? "—"}
                </p>
                {inv.due_date && (
                  <p className="text-xs text-muted-foreground">Due {new Date(inv.due_date).toLocaleDateString()}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-display font-bold">${Number(inv.total).toFixed(2)}</p>
                {inv.status === "draft" && (
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => updateStatus.mutate({ id: inv.id, status: "sent" })}>
                    <Send className="w-3 h-3" /> Send
                  </Button>
                )}
                {(inv.status === "sent" || inv.status === "overdue") && (
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => updateStatus.mutate({ id: inv.id, status: "paid" })}>
                    <CheckCircle className="w-3 h-3" /> Mark Paid
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function CreateInvoiceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    description: "",
    amount: "",
    userId: "",
    monumentId: "",
  });

  const { data: orders } = useQuery({
    queryKey: ["admin-orders-for-invoice"],
    queryFn: async () => {
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("id, user_id, monument_id, total_price, offer, monuments (cemetery_name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (ordersError) throw ordersError;

      // Fetch profiles separately since there's no FK between orders and profiles
      const userIds = [...new Set(ordersData?.map((o) => o.user_id) ?? [])];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds)
        : { data: [] };

      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
      return (ordersData ?? []).map((o) => ({ ...o, profile: profileMap.get(o.user_id) ?? null }));
    },
  });

  const [selectedOrder, setSelectedOrder] = useState("");

  const createInvoice = useMutation({
    mutationFn: async () => {
      const order = orders?.find((o: any) => o.id === selectedOrder);
      if (!order) throw new Error("Select an order");

      // Get next invoice number
      const { data: seqData, error: seqErr } = await supabase.rpc("has_role", { _user_id: "00000000-0000-0000-0000-000000000000", _role: "admin" as const });
      // Use timestamp-based invoice number instead
      const invoiceNumber = `GD-${Date.now().toString(36).toUpperCase()}`;

      const { error } = await supabase.from("invoices").insert({
        user_id: order.user_id,
        order_id: order.id,
        monument_id: order.monument_id,
        invoice_number: invoiceNumber,
        subtotal: Number(order.total_price),
        total: Number(form.amount || order.total_price),
        line_items: [{ description: form.description || `Offer ${order.offer} Service`, amount: Number(form.amount || order.total_price) }],
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        notes: form.description,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      toast({ title: "Invoice created" });
      onOpenChange(false);
      setSelectedOrder("");
      setForm({ description: "", amount: "", userId: "", monumentId: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> New Invoice
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Order</Label>
            <Select value={selectedOrder} onValueChange={(v) => {
              setSelectedOrder(v);
              const o = orders?.find((o: any) => o.id === v);
              if (o) setForm((f) => ({ ...f, amount: String(o.total_price) }));
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select an order..." />
              </SelectTrigger>
              <SelectContent>
                {orders?.map((o: any) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.profile?.full_name ?? o.profile?.email ?? o.id.slice(0, 8)} — ${Number(o.total_price).toFixed(0)} — {(o.monuments as any)?.cemetery_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Service description..." />
          </div>
          <div>
            <Label>Total Amount ($)</Label>
            <Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          </div>
          <Button className="w-full" onClick={() => createInvoice.mutate()} disabled={!selectedOrder || createInvoice.isPending}>
            {createInvoice.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create Invoice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AdminInvoices;

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "scheduled", "in_progress", "completed", "cancelled"];

const AdminOrders = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-all-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, offer, status, total_price, travel_fee, base_price,
          add_ons_total, bundle_price, is_veteran,
          consent_biological, consent_authorize, consent_photos,
          notes, scheduled_date, created_at, updated_at,
          stripe_payment_status,
          monuments (
            id, cemetery_name, monument_type, material, estimated_miles,
            section, lot_number, approximate_height,
            condition_moss_algae, condition_chipping, condition_leaning,
            condition_faded_inscription, condition_not_cleaned, known_damage
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
      toast({ title: "Status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const statusColors: Record<string, string> = {
    pending: "bg-accent/20 text-accent",
    confirmed: "bg-primary/20 text-primary",
    scheduled: "bg-primary/20 text-primary",
    in_progress: "bg-accent/20 text-accent",
    completed: "bg-primary/20 text-primary",
    cancelled: "bg-destructive/20 text-destructive",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">{orders?.length ?? 0} total orders</p>
      </div>

      {!orders?.length ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No orders yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const m = order.monuments as any;
            return (
              <div key={order.id} className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</p>
                    <p className="font-semibold">{m?.cemetery_name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">
                      {m?.monument_type?.replace(/_/g, " ")} · {m?.material} · {m?.estimated_miles ?? 0} mi
                    </p>
                    {m?.section && (
                      <p className="text-xs text-muted-foreground">
                        Section {m.section}{m?.lot_number ? `, Lot ${m.lot_number}` : ""}
                      </p>
                    )}
                  </div>

                  <div className="text-right space-y-1">
                    <p className="text-xl font-display font-bold">${Number(order.total_price).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Offer {order.offer}</p>
                    {order.stripe_payment_status && (
                      <p className="text-xs text-muted-foreground">
                        Payment: {order.stripe_payment_status}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Status:</span>
                    <Select
                      value={order.status}
                      onValueChange={(val) =>
                        updateStatus.mutate({ id: order.id, status: val as OrderStatus })
                      }
                    >
                      <SelectTrigger className="h-7 w-36 text-xs bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">
                            {s.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                   {order.scheduled_date && (
                     <p className="text-xs text-muted-foreground">
                       📅 {(() => { const [y, m, d] = order.scheduled_date!.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(); })()}
                     </p>
                   )}

                   <Button variant="outline" size="sm" className="text-xs gap-1.5 ml-auto" asChild>
                     <Link to={`/admin/orders/${order.id}`}>
                       <ExternalLink className="w-3 h-3" /> View / Change Order
                     </Link>
                   </Button>

                   <p className="text-xs text-muted-foreground">
                     Ordered: {new Date(order.created_at).toLocaleDateString()}
                   </p>
                </div>

                {/* Conditions */}
                {m && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.condition_moss_algae && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">Moss/Algae</span>}
                    {m.condition_chipping && <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent">Chipping</span>}
                    {m.condition_leaning && <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Leaning</span>}
                    {m.condition_faded_inscription && <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent">Faded</span>}
                    {m.condition_not_cleaned && <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent">Not Cleaned</span>}
                    {m.known_damage && <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Known Damage</span>}
                  </div>
                )}

                {order.notes && (
                  <p className="text-xs text-muted-foreground italic border-t border-border/50 pt-3">
                    {order.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminOrders;

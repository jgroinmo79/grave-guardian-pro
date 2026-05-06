import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CalendarDays, List, Map as MapIcon, LayoutGrid, XCircle, RotateCcw, Flower2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { CalendarView } from "@/components/admin/CalendarView";
import { CemeteryRouteView } from "@/components/admin/CemeteryRouteView";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { computeSubscriptionVisits } from "@/lib/subscription-schedule";

const AdminSchedule = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-scheduled-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, status, scheduled_date, total_price, offer, travel_fee,
          monuments (cemetery_name, monument_type, material, estimated_miles, section, lot_number)
        `)
        .in("status", ["pending", "confirmed", "scheduled", "in_progress", "completed"])
        .not("scheduled_date", "is", null)
        .order("scheduled_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: cancelledOrders } = useQuery({
    queryKey: ["admin-cancelled-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, status, scheduled_date, total_price, offer, travel_fee, created_at,
          shopper_name, shopper_email, shopper_phone,
          monuments (cemetery_name, monument_type, material, estimated_miles, section, lot_number)
        `)
        .eq("status", "cancelled")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: unscheduled } = useQuery({
    queryKey: ["admin-unscheduled-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, status, total_price, offer, travel_fee, created_at,
          monuments (cemetery_name, monument_type, estimated_miles)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Active annual plan subscriptions — used to surface flower placement visits
  const { data: subscriptions } = useQuery({
    queryKey: ["admin-schedule-subscriptions"],
    queryFn: async () => {
      const { data: subs, error } = await supabase
        .from("subscriptions")
        .select(`
          id, plan, status, important_dates, start_date, user_id, monument_id,
          monuments (cemetery_name, monument_type, material, section, lot_number)
        `)
        .eq("status", "active");
      if (error) throw error;
      if (!subs?.length) return [];
      const userIds = [...new Set(subs.map((s) => s.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return subs.map((s: any) => ({
        ...s,
        customerName:
          profileMap.get(s.user_id)?.full_name ||
          profileMap.get(s.user_id)?.email ||
          "Customer",
      }));
    },
  });

  // Derive flower placement visits (cleaning_flowers type) from active subscriptions
  const flowerVisits = useMemo(() => {
    if (!subscriptions?.length) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const years = [today.getFullYear(), today.getFullYear() + 1];
    const visits: Array<{
      id: string;
      subscriptionId: string;
      date: string;
      customerName: string;
      cemeteryName: string;
      monumentType: string | null;
      monumentMaterial: string | null;
      section: string | null;
      lotNumber: string | null;
      plan: string;
      holidayNotes: string | null;
    }> = [];
    for (const sub of subscriptions) {
      const m = sub.monuments as any;
      const importantDates = sub.important_dates as string | null;
      for (const year of years) {
        const computed = computeSubscriptionVisits(
          {
            id: sub.id,
            plan: sub.plan,
            status: sub.status,
            important_dates: importantDates,
            start_date: sub.start_date,
            customerName: sub.customerName,
            cemeteryName: m?.cemetery_name ?? "Unknown",
          },
          year
        );
        for (const v of computed) {
          if (v.type !== "cleaning_flowers") continue;
          const [y, mo, d] = v.date.split("-").map(Number);
          if (new Date(y, mo - 1, d) < today) continue;
          if (visits.find((x) => x.id === v.id)) continue;
          visits.push({
            id: v.id,
            subscriptionId: sub.id,
            date: v.date,
            customerName: sub.customerName,
            cemeteryName: m?.cemetery_name ?? "Unknown",
            monumentType: m?.monument_type ?? null,
            monumentMaterial: m?.material ?? null,
            section: m?.section ?? null,
            lotNumber: m?.lot_number ?? null,
            plan: sub.plan,
            holidayNotes: importantDates,
          });
        }
      }
    }
    visits.sort((a, b) => a.date.localeCompare(b.date));
    return visits;
  }, [subscriptions]);

  const scheduleOrder = useMutation({
    mutationFn: async ({ id, date }: { id: string; date: Date }) => {
      const newDate = format(date, "yyyy-MM-dd");
      const { error } = await supabase
        .from("orders")
        .update({
          scheduled_date: newDate,
          status: "scheduled" as const,
        })
        .eq("id", id);
      if (error) throw error;
      return { id, newDate };
    },
    onMutate: async ({ id, date }) => {
      const newDate = format(date, "yyyy-MM-dd");
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["admin-scheduled-orders"] });
      await queryClient.cancelQueries({ queryKey: ["admin-unscheduled-orders"] });

      const prevScheduled = queryClient.getQueryData<any[]>(["admin-scheduled-orders"]);
      const prevUnscheduled = queryClient.getQueryData<any[]>(["admin-unscheduled-orders"]);

      // Update date in-place in the scheduled list
      if (prevScheduled) {
        queryClient.setQueryData(["admin-scheduled-orders"],
          prevScheduled.map((o) =>
            o.id === id ? { ...o, scheduled_date: newDate, status: "scheduled" } : o
          )
        );
      }
      // Remove from unscheduled if present
      if (prevUnscheduled) {
        const moved = prevUnscheduled.find((o) => o.id === id);
        if (moved) {
          queryClient.setQueryData(["admin-unscheduled-orders"],
            prevUnscheduled.filter((o) => o.id !== id)
          );
          // Add to scheduled list if it wasn't there
          if (prevScheduled && !prevScheduled.find((o) => o.id === id)) {
            queryClient.setQueryData(["admin-scheduled-orders"], [
              ...prevScheduled,
              { ...moved, scheduled_date: newDate, status: "scheduled" },
            ]);
          }
        }
      }

      setOpenPopover(null);
      return { prevScheduled, prevUnscheduled };
    },
    onError: (err: Error, _vars, context) => {
      // Roll back on error
      if (context?.prevScheduled) queryClient.setQueryData(["admin-scheduled-orders"], context.prevScheduled);
      if (context?.prevUnscheduled) queryClient.setQueryData(["admin-unscheduled-orders"], context.prevUnscheduled);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Order scheduled" });
      // Background-refresh calendar view
      queryClient.invalidateQueries({ queryKey: ["admin-calendar-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
    },
  });

  const reactivateOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: "pending" as const, scheduled_date: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cancelled-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-unscheduled-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
      toast({ title: "Order reactivated", description: "Moved back to pending." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const DatePickerButton = ({ orderId, currentDate }: { orderId: string; currentDate?: string | null }) => (
    <Popover open={openPopover === orderId} onOpenChange={(open) => setOpenPopover(open ? orderId : null)}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs gap-1.5">
          <CalendarDays className="w-3 h-3" />
          {currentDate
            ? (() => { const [y,m,d] = currentDate.split("-").map(Number); return format(new Date(y, m-1, d), "MMM d"); })()
            : "Schedule"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          required
          selected={currentDate ? new Date(currentDate) : undefined}
          onSelect={(date) => {
            if (date) scheduleOrder.mutate({ id: orderId, date });
          }}
          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );

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
        <h1 className="text-2xl font-display font-bold">Schedule</h1>
        <p className="text-sm text-muted-foreground">Calendar, list, and route views</p>
      </div>

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList className="bg-secondary">
          <TabsTrigger value="calendar" className="gap-1.5 text-xs">
            <LayoutGrid className="w-3.5 h-3.5" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-1.5 text-xs">
            <List className="w-3.5 h-3.5" /> List
          </TabsTrigger>
          <TabsTrigger value="route" className="gap-1.5 text-xs">
            <MapIcon className="w-3.5 h-3.5" /> Route
          </TabsTrigger>
        </TabsList>

        {/* Calendar View */}
        <TabsContent value="calendar">
          <div className="rounded-xl border border-border bg-card p-4">
            <CalendarView onSelectOrder={(id) => navigate(`/admin/orders/${id}`)} />
          </div>
        </TabsContent>

        {/* List View */}
        <TabsContent value="list" className="space-y-6">
          {/* Scheduled jobs */}
          <div className="space-y-4">
            <h2 className="text-lg font-display font-semibold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Upcoming Jobs
            </h2>

            {!orders?.length ? (
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">No scheduled jobs.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {orders.map((o) => {
                  const m = o.monuments as any;
                  return (
                    <div key={o.id} className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">{m?.cemetery_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {m?.monument_type?.replace(/_/g, " ")} · {m?.estimated_miles ?? 0} mi
                          {m?.section ? ` · Sec ${m.section}` : ""}
                          {m?.lot_number ? `, Lot ${m.lot_number}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          o.status === "pending" && "bg-orange-500/20 text-orange-500",
                          (o.status === "scheduled" || o.status === "confirmed") && "bg-emerald-500/20 text-emerald-600",
                          o.status === "in_progress" && "bg-emerald-600/20 text-emerald-700",
                          o.status === "completed" && "bg-red-500/20 text-red-500"
                        )}>
                          {o.status === "pending" ? "unconfirmed" : o.status.replace(/_/g, " ")}
                        </span>
                        <DatePickerButton orderId={o.id} currentDate={o.scheduled_date} />
                        <span className="text-sm font-semibold">${Number(o.total_price).toFixed(0)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Flower Placements (from active annual plan subscriptions) */}
          <div className="space-y-4">
            <h2 className="text-lg font-display font-semibold flex items-center gap-2">
              <Flower2 className="w-5 h-5 text-primary" />
              Upcoming Flower Placements
            </h2>
            {!flowerVisits.length ? (
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">No upcoming flower placements.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {flowerVisits.map((v) => {
                  const [y, mo, d] = v.date.split("-").map(Number);
                  const placedDate = new Date(y, mo - 1, d);
                  return (
                    <div
                      key={v.id}
                      className="rounded-xl border border-primary/30 bg-card p-4 flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <p className="font-semibold text-sm flex items-center gap-2">
                          <Flower2 className="w-4 h-4 text-primary" />
                          {v.customerName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {v.cemeteryName}
                          {v.section ? ` · Sec ${v.section}` : ""}
                          {v.lotNumber ? `, Lot ${v.lotNumber}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {v.monumentType?.replace(/_/g, " ") ?? "monument"}
                          {v.monumentMaterial ? ` · ${v.monumentMaterial}` : ""}
                          {" · "}plan: {v.plan}
                        </p>
                        {v.holidayNotes && (
                          <p className="text-xs text-muted-foreground italic">
                            Holidays: {v.holidayNotes.split(",").map((s) => s.split("|")[0].trim()).join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                          flower placement
                        </span>
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {format(placedDate, "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending / Unscheduled */}
          <div className="space-y-4">
            <h2 className="text-lg font-display font-semibold">Pending (Unscheduled)</h2>
            {!unscheduled?.length ? (
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">No pending orders.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {unscheduled.map((o) => {
                  const m = o.monuments as any;
                  return (
                    <div key={o.id} className="rounded-xl border border-border/50 bg-card/50 p-4 flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">{m?.cemetery_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {m?.monument_type?.replace(/_/g, " ")} · {m?.estimated_miles ?? 0} mi
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-medium">pending</span>
                        <DatePickerButton orderId={o.id} currentDate={null} />
                        <span className="text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-sm font-semibold">${Number(o.total_price).toFixed(0)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cancelled Orders */}
          <div className="space-y-4">
            <h2 className="text-lg font-display font-semibold flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              Cancelled Orders
            </h2>
            {!cancelledOrders?.length ? (
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">No cancelled orders.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {cancelledOrders.map((o) => {
                  const m = o.monuments as any;
                  return (
                    <div
                      key={o.id}
                      onClick={() => navigate(`/admin/orders/${o.id}`)}
                      className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-destructive/10 transition-colors"
                    >
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">{m?.cemetery_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {m?.monument_type?.replace(/_/g, " ")} · {m?.material}
                          {m?.section ? ` · Sec ${m.section}` : ""}
                          {m?.lot_number ? `, Lot ${m.lot_number}` : ""}
                        </p>
                        {o.shopper_name && (
                          <p className="text-xs text-muted-foreground">
                            {o.shopper_name}{o.shopper_phone ? ` · ${o.shopper_phone}` : ""}{o.shopper_email ? ` · ${o.shopper_email}` : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium">
                          cancelled
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            reactivateOrder.mutate(o.id);
                          }}
                          disabled={reactivateOrder.isPending}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reactivate
                        </Button>
                        <span className="text-sm font-semibold">${Number(o.total_price).toFixed(0)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Route View */}
        <TabsContent value="route">
          <CemeteryRouteView />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSchedule;

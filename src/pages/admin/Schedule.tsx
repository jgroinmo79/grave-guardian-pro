import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CalendarDays, List, Map, LayoutGrid, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useState } from "react";
import { CalendarView } from "@/components/admin/CalendarView";
import { CemeteryRouteView } from "@/components/admin/CemeteryRouteView";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

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

  const scheduleOrder = useMutation({
    mutationFn: async ({ id, date }: { id: string; date: Date }) => {
      const { error } = await supabase
        .from("orders")
        .update({
          scheduled_date: format(date, "yyyy-MM-dd"),
          status: "scheduled" as const,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-scheduled-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-unscheduled-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-calendar-orders"] });
      toast({ title: "Order scheduled" });
      setOpenPopover(null);
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
            ? format(new Date(currentDate), "MMM d")
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
            <Map className="w-3.5 h-3.5" /> Route
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

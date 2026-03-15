import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScheduleOrder {
  id: string;
  status: string;
  scheduled_date: string | null;
  total_price: number;
  offer: string;
  monuments: {
    cemetery_name: string;
    monument_type: string;
    material: string;
    estimated_miles: number | null;
    section: string | null;
    lot_number: string | null;
  } | null;
}

export function CalendarView({ onSelectOrder }: { onSelectOrder?: (id: string) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: orders } = useQuery({
    queryKey: ["admin-calendar-orders", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      const { data, error } = await supabase
        .from("orders")
        .select(`id, status, scheduled_date, total_price, offer, monuments (cemetery_name, monument_type, material, estimated_miles, section, lot_number)`)
        .not("scheduled_date", "is", null)
        .gte("scheduled_date", format(start, "yyyy-MM-dd"))
        .lte("scheduled_date", format(end, "yyyy-MM-dd"))
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data as ScheduleOrder[];
    },
  });

  const ordersByDate = useMemo(() => {
    const map = new Map<string, ScheduleOrder[]>();
    orders?.forEach((o) => {
      if (o.scheduled_date) {
        const key = o.scheduled_date;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(o);
      }
    });
    return map;
  }, [orders]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const selectedDayOrders = selectedDate
    ? ordersByDate.get(format(selectedDate, "yyyy-MM-dd")) ?? []
    : [];

  const statusColor: Record<string, string> = {
    scheduled: "bg-primary",
    confirmed: "bg-primary",
    in_progress: "bg-accent",
    completed: "bg-primary/50",
  };

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="font-display font-semibold text-lg">{format(currentMonth, "MMMM yyyy")}</h3>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="bg-secondary p-2 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayOrders = ordersByDate.get(dateKey) ?? [];
          const inMonth = isSameMonth(day, currentMonth);
          const selected = selectedDate && isSameDay(day, selectedDate);

          return (
            <button
              key={dateKey}
              onClick={() => setSelectedDate(day)}
              className={cn(
                "bg-card min-h-[70px] p-1.5 text-left transition-colors hover:bg-muted/50 relative",
                !inMonth && "opacity-30",
                selected && "ring-2 ring-primary ring-inset",
                isToday(day) && "bg-muted/30"
              )}
            >
              <span className={cn(
                "text-xs font-medium",
                isToday(day) && "text-primary font-bold"
              )}>
                {format(day, "d")}
              </span>
              {dayOrders.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {dayOrders.slice(0, 3).map((o) => (
                    <div
                      key={o.id}
                      className={cn("h-1.5 rounded-full", statusColor[o.status] ?? "bg-muted-foreground")}
                    />
                  ))}
                  {dayOrders.length > 3 && (
                    <span className="text-[9px] text-muted-foreground">+{dayOrders.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">
            {format(selectedDate, "EEEE, MMMM d")} · {selectedDayOrders.length} job{selectedDayOrders.length !== 1 ? "s" : ""}
          </h4>
          {selectedDayOrders.length === 0 ? (
            <p className="text-xs text-muted-foreground">No jobs scheduled for this day.</p>
          ) : (
            <div className="grid gap-2">
              {selectedDayOrders.map((o) => {
                const m = o.monuments;
                return (
                  <button
                    key={o.id}
                    onClick={() => onSelectOrder?.(o.id)}
                    className="rounded-lg border border-border bg-card/80 p-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-primary" />
                        {m?.cemetery_name}
                      </p>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-medium",
                        statusColor[o.status] ? `${statusColor[o.status]}/20 text-primary` : "bg-muted text-muted-foreground"
                      )}>
                        {o.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {m?.monument_type?.replace(/_/g, " ")} · {m?.material}
                      {m?.section ? ` · Sec ${m.section}` : ""}
                      {m?.lot_number ? `, Lot ${m.lot_number}` : ""}
                    </p>
                    <p className="text-xs font-semibold text-accent mt-1">${Number(o.total_price).toFixed(0)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

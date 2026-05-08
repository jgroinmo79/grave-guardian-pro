import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, MapPin, Flower2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { holidayToDate } from "@/lib/subscription-schedule";

function computeEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function getHolidaysForYear(year: number): Record<string, string> {
  const holidays: Record<string, string> = {};
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");
  holidays[fmt(computeEaster(year))] = "Easter";
  for (const name of ["Memorial Day", "Mother's Day", "Father's Day", "Christmas"] as const) {
    const d = holidayToDate(name, year);
    if (d) holidays[fmt(d)] = name;
  }
  return holidays;
}

interface CalendarEntry {
  id: string;
  date: string;
  type: "order" | "subscription_visit" | "flower_booking";
  label: string;
  customerName: string;
  cemeteryName: string;
  isFlower: boolean;
  status?: string;
  price?: number;
  plan?: string;
  orderId?: string;
  monumentType?: string | null;
}

const FLOWER_BUNDLE_IDS = ["flower_1", "flower_2", "flower_3", "flower_4"];

export function CalendarView({ onSelectOrder }: { onSelectOrder?: (id: string) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const year = currentMonth.getFullYear();
  const HOLIDAYS = useMemo(() => getHolidaysForYear(year), [year]);

  const { data: entries } = useQuery({
    queryKey: ["admin-calendar-visits", format(currentMonth, "yyyy-MM")],
    queryFn: async (): Promise<CalendarEntry[]> => {
      const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      const { data: visits, error } = await supabase
        .from("scheduled_visits")
        .select("id, source, order_id, subscription_id, visit_date, status, user_id")
        .neq("status", "canceled")
        .gte("visit_date", start)
        .lte("visit_date", end)
        .order("visit_date", { ascending: true });
      if (error) throw error;
      if (!visits?.length) return [];

      const orderIds = [...new Set(visits.filter(v => v.source === "order").map(v => v.order_id!))];
      const subIds = [...new Set(visits.filter(v => v.source === "subscription").map(v => v.subscription_id!))];
      const userIds = [...new Set(visits.map(v => v.user_id))];

      const [ordersRes, subsRes, profilesRes] = await Promise.all([
        orderIds.length
          ? supabase.from("orders").select("id, status, total_price, offer, bundle_id, shopper_name, monuments (cemetery_name, monument_type)").in("id", orderIds)
          : Promise.resolve({ data: [], error: null }),
        subIds.length
          ? supabase.from("subscriptions").select("id, plan, monuments (cemetery_name, monument_type)").in("id", subIds)
          : Promise.resolve({ data: [], error: null }),
        userIds.length
          ? supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const orderMap = new Map((ordersRes.data || []).map((o: any) => [o.id, o]));
      const subMap = new Map((subsRes.data || []).map((s: any) => [s.id, s]));
      const nameMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p.full_name || "Unknown"]));

      return visits.map((v): CalendarEntry => {
        if (v.source === "order") {
          const o: any = orderMap.get(v.order_id!);
          const isFlowerBundle = o?.bundle_id ? FLOWER_BUNDLE_IDS.includes(o.bundle_id) : false;
          return {
            id: v.id,
            date: v.visit_date,
            type: isFlowerBundle ? "flower_booking" : "order",
            label: isFlowerBundle ? "Flower Placement" : "Cleaning",
            customerName: o?.shopper_name || nameMap.get(v.user_id) || "Unknown",
            cemeteryName: o?.monuments?.cemetery_name || "Unknown",
            isFlower: !!isFlowerBundle,
            status: o?.status,
            price: o?.total_price,
            orderId: v.order_id!,
            monumentType: o?.monuments?.monument_type ?? null,
          };
        }
        const s: any = subMap.get(v.subscription_id!);
        return {
          id: v.id,
          date: v.visit_date,
          type: "subscription_visit",
          label: "Cleaning Only",
          customerName: nameMap.get(v.user_id) || "Unknown",
          cemeteryName: s?.monuments?.cemetery_name || "Unknown",
          isFlower: false,
          plan: s?.plan,
          monumentType: s?.monuments?.monument_type ?? null,
        };
      });
    },
  });

  const entriesByDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    entries?.forEach(e => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    });
    return map;
  }, [entries]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 0 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
  });

  const selectedDayEntries = selectedDate
    ? entriesByDate.get(format(selectedDate, "yyyy-MM-dd")) ?? []
    : [];

  const dotColor = (entry: CalendarEntry) => {
    if (entry.isFlower) return "bg-yellow-500";
    if (entry.type === "subscription_visit") return "bg-sky-500";
    const sc: Record<string, string> = {
      pending: "bg-orange-500",
      scheduled: "bg-emerald-500",
      confirmed: "bg-emerald-500",
      in_progress: "bg-emerald-600",
      completed: "bg-red-500",
    };
    return sc[entry.status ?? ""] ?? "bg-muted-foreground";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-[10px] font-medium text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Order</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500 inline-block" /> Plan Visit</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Flowers</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> Unconfirmed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> Holiday</span>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="font-display font-semibold text-lg">{format(currentMonth, "MMMM yyyy")}</h3>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="bg-secondary p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
        ))}
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayEntries = entriesByDate.get(dateKey) ?? [];
          const inMonth = isSameMonth(day, currentMonth);
          const selected = selectedDate && isSameDay(day, selectedDate);
          const hasFlower = dayEntries.some(e => e.isFlower);
          const holiday = HOLIDAYS[dateKey];

          return (
            <button
              key={dateKey}
              onClick={() => setSelectedDate(day)}
              className={cn(
                "bg-card min-h-[70px] p-1.5 text-left transition-colors hover:bg-muted/50 relative",
                !inMonth && "opacity-30",
                selected && "ring-2 ring-primary ring-inset",
                isToday(day) && "bg-muted/30",
                hasFlower && "bg-yellow-500/5",
                holiday && "bg-primary/5"
              )}
            >
              <span className={cn("text-xs font-medium", isToday(day) && "text-primary font-bold")}>
                {format(day, "d")}
              </span>
              {holiday && (
                <div className="text-[7px] leading-tight font-semibold text-primary truncate mt-0.5">{holiday}</div>
              )}
              {dayEntries.length > 0 && (
                <div className="mt-0.5 space-y-0.5">
                  {dayEntries.slice(0, 3).map((e) => (
                    <div key={e.id} className={cn("h-1.5 rounded-full", dotColor(e))} />
                  ))}
                  {dayEntries.length > 3 && (
                    <span className="text-[8px] text-muted-foreground">+{dayEntries.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">
            {format(selectedDate, "EEEE, MMMM d")} · {selectedDayEntries.length} visit{selectedDayEntries.length !== 1 ? "s" : ""}
            {HOLIDAYS[format(selectedDate, "yyyy-MM-dd")] && (
              <span className="ml-2 text-primary font-bold">🎗️ {HOLIDAYS[format(selectedDate, "yyyy-MM-dd")]}</span>
            )}
          </h4>
          {selectedDayEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground">No visits scheduled for this day.</p>
          ) : (
            <div className="grid gap-2">
              {selectedDayEntries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => entry.orderId && onSelectOrder?.(entry.orderId)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    entry.isFlower
                      ? "border-yellow-500/40 bg-yellow-500/10 hover:bg-yellow-500/15"
                      : "border-border bg-card/80 hover:bg-muted/50",
                    !entry.orderId && "cursor-default"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      {entry.isFlower ? <Flower2 className="w-3 h-3 text-yellow-600" /> : <MapPin className="w-3 h-3 text-primary" />}
                      {entry.cemeteryName}
                    </p>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap",
                      entry.isFlower && "bg-yellow-500/20 text-yellow-700",
                      entry.type === "subscription_visit" && !entry.isFlower && "bg-sky-500/20 text-sky-600",
                      entry.type === "order" && entry.status === "pending" && "bg-orange-500/20 text-orange-500",
                      entry.type === "order" && ["scheduled","confirmed","in_progress"].includes(entry.status ?? "") && "bg-emerald-500/20 text-emerald-600",
                      entry.type === "order" && entry.status === "completed" && "bg-red-500/20 text-red-500",
                      entry.type === "flower_booking" && "bg-yellow-500/20 text-yellow-700"
                    )}>
                      {entry.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {entry.customerName}
                    {entry.plan && ` · ${entry.plan.charAt(0).toUpperCase() + entry.plan.slice(1)} Plan`}
                    {entry.monumentType && ` · ${entry.monumentType.replace(/_/g, " ")}`}
                  </p>
                  {entry.price != null && (
                    <p className="text-xs font-semibold text-accent mt-1">${Number(entry.price).toFixed(0)}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

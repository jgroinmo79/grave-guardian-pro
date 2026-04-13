import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, MapPin, Flower2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { computeSubscriptionVisits, holidayToDate, type SubscriptionVisit } from "@/lib/subscription-schedule";

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

  const easter = computeEaster(year);
  holidays[fmt(easter)] = "Easter";

  for (const name of ["Memorial Day", "Mother's Day", "Father's Day", "Christmas"] as const) {
    const d = holidayToDate(name, year);
    if (d) holidays[fmt(d)] = name;
  }

  return holidays;
}

interface ScheduleOrder {
  id: string;
  status: string;
  scheduled_date: string | null;
  total_price: number;
  offer: string;
  bundle_id: string | null;
  shopper_name: string | null;
  monuments: {
    cemetery_name: string;
    monument_type: string;
    material: string;
    estimated_miles: number | null;
    section: string | null;
    lot_number: string | null;
  } | null;
}

/** Unified calendar entry */
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
  monument?: ScheduleOrder["monuments"];
  arrangementId?: string | null;
}

export function CalendarView({ onSelectOrder }: { onSelectOrder?: (id: string) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const year = currentMonth.getFullYear();
  const HOLIDAYS = useMemo(() => getHolidaysForYear(year), [year]);

  // Fetch orders (including bundle_id and shopper_name)
  const { data: orders } = useQuery({
    queryKey: ["admin-calendar-orders", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      const { data, error } = await supabase
        .from("orders")
        .select(`id, status, scheduled_date, total_price, offer, bundle_id, shopper_name, monuments (cemetery_name, monument_type, material, estimated_miles, section, lot_number)`)
        .not("scheduled_date", "is", null)
        .neq("status", "cancelled")
        .gte("scheduled_date", format(start, "yyyy-MM-dd"))
        .lte("scheduled_date", format(end, "yyyy-MM-dd"))
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data as ScheduleOrder[];
    },
  });

  // Fetch active subscriptions for the year
  const { data: subscriptions } = useQuery({
    queryKey: ["admin-calendar-subscriptions", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`id, plan, status, important_dates, start_date, user_id, monuments (cemetery_name)`)
        .eq("status", "active");
      if (error) throw error;

      // Fetch profile names for those user_ids
      const userIds = [...new Set((data ?? []).map((s: any) => s.user_id))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        profiles?.forEach((p: any) => {
          profileMap[p.user_id] = p.full_name || "Unknown";
        });
      }

      return (data ?? []).map((s: any) => ({
        ...s,
        customerName: profileMap[s.user_id] || "Unknown",
        cemeteryName: (s.monuments as any)?.cemetery_name || "Unknown",
      }));
    },
  });

  // Compute all calendar entries
  const entriesByDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    const addEntry = (entry: CalendarEntry) => {
      if (!map.has(entry.date)) map.set(entry.date, []);
      map.get(entry.date)!.push(entry);
    };

    // Regular orders
    const FLOWER_BUNDLE_IDS = ["tribute", "remembrance", "devotion", "eternal", "flower_1", "flower_2", "flower_3", "flower_4"];
    orders?.forEach((o) => {
      if (!o.scheduled_date) return;
      const isFlowerBundle = o.bundle_id ? FLOWER_BUNDLE_IDS.includes(o.bundle_id) : false;
      addEntry({
        id: `order-${o.id}`,
        date: o.scheduled_date,
        type: isFlowerBundle ? "flower_booking" : "order",
        label: isFlowerBundle ? "Flower Placement" : "Cleaning",
        customerName: o.shopper_name || "Unknown",
        cemeteryName: o.monuments?.cemetery_name || "Unknown",
        isFlower: !!isFlowerBundle,
        status: o.status,
        price: o.total_price,
        orderId: o.id,
        monument: o.monuments,
      });
    });

    // Subscription visits
    subscriptions?.forEach((sub: any) => {
      const visits = computeSubscriptionVisits({
        id: sub.id,
        plan: sub.plan,
        status: sub.status,
        important_dates: sub.important_dates,
        start_date: sub.start_date,
        customerName: sub.customerName,
        cemeteryName: sub.cemeteryName,
      }, year);

      visits.forEach((v) => {
        addEntry({
          id: v.id,
          date: v.date,
          type: "subscription_visit",
          label: v.isFlower ? "Cleaning + Flowers" : "Cleaning Only",
          customerName: v.customerName,
          cemeteryName: v.cemeteryName,
          isFlower: v.isFlower,
          plan: v.plan,
          arrangementId: v.arrangementId,
        });
      });
    });

    return map;
  }, [orders, subscriptions, year]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const selectedDayEntries = selectedDate
    ? entriesByDate.get(format(selectedDate, "yyyy-MM-dd")) ?? []
    : [];

  const dotColor = (entry: CalendarEntry) => {
    if (entry.isFlower) return "bg-yellow-500";
    if (entry.type === "subscription_visit") return "bg-sky-500";
    // Order status colors
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
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] font-medium text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Order</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500 inline-block" /> Plan Visit</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Flowers</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> Unconfirmed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> Holiday</span>
      </div>

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
              <span className={cn(
                "text-xs font-medium",
                isToday(day) && "text-primary font-bold"
              )}>
                {format(day, "d")}
              </span>
              {holiday && (
                <div className="text-[7px] leading-tight font-semibold text-primary truncate mt-0.5">
                  {holiday}
                </div>
              )}
              {dayEntries.length > 0 && (
                <div className="mt-0.5 space-y-0.5">
                  {dayEntries.slice(0, 3).map((e) => (
                    <div
                      key={e.id}
                      className={cn("h-1.5 rounded-full", dotColor(e))}
                    />
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

      {/* Selected day detail */}
      {selectedDate && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">
            {format(selectedDate, "EEEE, MMMM d")} · {selectedDayEntries.length} visit{selectedDayEntries.length !== 1 ? "s" : ""}
            {HOLIDAYS[format(selectedDate, "yyyy-MM-dd")] && (
              <span className="ml-2 text-primary font-bold">
                🎗️ {HOLIDAYS[format(selectedDate, "yyyy-MM-dd")]}
              </span>
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
                      {entry.isFlower ? (
                        <Flower2 className="w-3 h-3 text-yellow-600" />
                      ) : (
                        <MapPin className="w-3 h-3 text-primary" />
                      )}
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
                    {entry.monument?.monument_type && ` · ${entry.monument.monument_type.replace(/_/g, " ")}`}
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

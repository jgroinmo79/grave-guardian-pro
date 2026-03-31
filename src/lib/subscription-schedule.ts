/**
 * Compute scheduled visit dates for annual care plan subscriptions.
 * Pure frontend logic — no DB schema changes.
 */
import { addDays, eachMonthOfInterval, startOfYear, endOfYear, getDay, setMonth, setDate, differenceInDays } from "date-fns";

/** Map holiday names → approximate date in a given year */
export function holidayToDate(holiday: string, year: number, customDateStr?: string): Date | null {
  switch (holiday) {
    case "Memorial Day": {
      // Last Monday of May
      const may31 = new Date(year, 4, 31);
      const dayOfWeek = may31.getDay();
      const offset = dayOfWeek === 1 ? 0 : (dayOfWeek === 0 ? 1 : dayOfWeek - 1);
      return new Date(year, 4, 31 - offset);
    }
    case "Mother's Day": {
      // 2nd Sunday of May
      const may1 = new Date(year, 4, 1);
      const firstSunday = may1.getDay() === 0 ? 1 : 8 - may1.getDay();
      return new Date(year, 4, firstSunday + 7);
    }
    case "Father's Day": {
      // 3rd Sunday of June
      const jun1 = new Date(year, 5, 1);
      const firstSunday = jun1.getDay() === 0 ? 1 : 8 - jun1.getDay();
      return new Date(year, 5, firstSunday + 14);
    }
    case "Christmas":
      return new Date(year, 11, 25);
    case "Deceased's Birthday":
    case "Deceased's Anniversary": {
      if (!customDateStr) return null;
      // Parse "March 15" or "03-15" style
      const monthDayMatch = customDateStr.match(/^(\d{1,2})-(\d{1,2})$/);
      if (monthDayMatch) {
        return new Date(year, parseInt(monthDayMatch[1]) - 1, parseInt(monthDayMatch[2]));
      }
      // Try "Month Day" format
      const parsed = new Date(`${customDateStr}, ${year}`);
      if (!isNaN(parsed.getTime())) return parsed;
      return null;
    }
    default:
      return null;
  }
}

export interface SubscriptionVisit {
  id: string; // subscription id + visit index
  subscriptionId: string;
  date: string; // yyyy-MM-dd
  type: "cleaning_flowers" | "cleaning_only" | "flower_placement";
  customerName: string;
  cemeteryName: string;
  plan: string;
  isFlower: boolean;
}

interface SubscriptionInput {
  id: string;
  plan: string;
  status: string;
  important_dates: string | null;
  start_date: string;
  customerName: string;
  cemeteryName: string;
}

/**
 * Compute all visits for a subscription in a given year.
 */
export function computeSubscriptionVisits(sub: SubscriptionInput, year: number): SubscriptionVisit[] {
  if (sub.status !== "active") return [];

  const planConfig: Record<string, { totalVisits: number; flowerVisits: number }> = {
    keeper: { totalVisits: 2, flowerVisits: 1 },
    sentinel: { totalVisits: 3, flowerVisits: 2 },
    legacy: { totalVisits: 4, flowerVisits: 3 },
    guardian: { totalVisits: 1, flowerVisits: 0 },
  };

  const config = planConfig[sub.plan];
  if (!config) return [];

  // Parse important_dates — stored as comma-separated holiday names,
  // possibly with custom dates in format "Holiday|MM-DD"
  const holidayEntries: { name: string; customDate?: string }[] = [];
  if (sub.important_dates) {
    sub.important_dates.split(",").map(s => s.trim()).filter(Boolean).forEach(entry => {
      const [name, customDate] = entry.split("|").map(s => s.trim());
      holidayEntries.push({ name, customDate });
    });
  }

  // Resolve flower visit dates
  const flowerDates: Date[] = [];
  for (const entry of holidayEntries.slice(0, config.flowerVisits)) {
    const d = holidayToDate(entry.name, year, entry.customDate);
    if (d) flowerDates.push(d);
  }

  // Sort flower dates chronologically
  flowerDates.sort((a, b) => a.getTime() - b.getTime());

  const visits: SubscriptionVisit[] = [];
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Add flower visits
  flowerDates.forEach((d, i) => {
    visits.push({
      id: `${sub.id}-flower-${i}`,
      subscriptionId: sub.id,
      date: fmt(d),
      type: "cleaning_flowers",
      customerName: sub.customerName,
      cemeteryName: sub.cemeteryName,
      plan: sub.plan,
      isFlower: true,
    });
  });

  // Compute cleaning-only visits in the largest gaps
  const cleaningCount = config.totalVisits - flowerDates.length;
  if (cleaningCount > 0) {
    // Build date anchors: start of year, flower dates, end of year
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    const anchors = [yearStart, ...flowerDates, yearEnd];

    // Find gaps and place cleaning visits in the middle of the largest gaps
    const gaps: { start: Date; end: Date; size: number }[] = [];
    for (let i = 0; i < anchors.length - 1; i++) {
      gaps.push({
        start: anchors[i],
        end: anchors[i + 1],
        size: differenceInDays(anchors[i + 1], anchors[i]),
      });
    }

    // Sort gaps by size descending, pick the largest ones
    const sortedGaps = [...gaps].sort((a, b) => b.size - a.size);
    for (let i = 0; i < cleaningCount && i < sortedGaps.length; i++) {
      const gap = sortedGaps[i];
      const midpoint = addDays(gap.start, Math.floor(gap.size / 2));
      visits.push({
        id: `${sub.id}-clean-${i}`,
        subscriptionId: sub.id,
        date: fmt(midpoint),
        type: "cleaning_only",
        customerName: sub.customerName,
        cemeteryName: sub.cemeteryName,
        plan: sub.plan,
        isFlower: false,
      });
    }
  }

  return visits;
}

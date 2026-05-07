/**
 * Compute scheduled visit dates for annual care plan subscriptions.
 * Pure frontend logic — no DB schema changes.
 */

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
    case "Easter":
      return computeEaster(year);
    case "Christmas":
      return new Date(year, 11, 25);
    case "Veterans Day":
      return new Date(year, 10, 11);
    case "Halloween":
      return new Date(year, 9, 31);
    case "Independence Day":
    case "Fourth of July":
      return new Date(year, 6, 4);
    case "Valentine's Day":
      return new Date(year, 1, 14);
    case "New Year's Day":
      return new Date(year, 0, 1);
    case "Thanksgiving": {
      // 4th Thursday of November
      const nov1 = new Date(year, 10, 1);
      const firstThu = nov1.getDay() <= 4 ? 5 - nov1.getDay() : 12 - nov1.getDay();
      return new Date(year, 10, firstThu + 21);
    }
    case "Date of passing":
    case "Birthday of deceased":
    case "Anniversary":
    case "Other":
    case "Deceased's Birthday":
    case "Deceased's Anniversary": {
      if (!customDateStr) return null;
      const monthDayMatch = customDateStr.match(/^(\d{1,2})-(\d{1,2})$/);
      if (monthDayMatch) {
        return new Date(year, parseInt(monthDayMatch[1]) - 1, parseInt(monthDayMatch[2]));
      }
      const parsed = new Date(`${customDateStr}, ${year}`);
      if (!isNaN(parsed.getTime())) return parsed;
      return null;
    }
    default:
      return null;
  }
}

/** Compute Easter Sunday using the Anonymous Gregorian algorithm */
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
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export interface SubscriptionVisit {
  id: string;
  subscriptionId: string;
  date: string; // yyyy-MM-dd
  type: "cleaning_flowers" | "cleaning_only";
  customerName: string;
  cemeteryName: string;
  plan: string;
  isFlower: boolean;
  arrangementId: string | null;
}

interface SubscriptionInput {
  id: string;
  plan: string; // keeper, sentinel, legacy, tribute, remembrance, devotion, eternal
  status: string;
  important_dates: string | null;
  start_date: string;
  customerName: string;
  cemeteryName: string;
  arrangements?: Record<string, string>; // holiday name → arrangement ID
}

const PLAN_CONFIGS: Record<string, { cleanings: number; flowers: number }> = {
  // Maintenance plans — cleaning only
  keeper: { cleanings: 2, flowers: 0 },
  sentinel: { cleanings: 3, flowers: 0 },
  legacy: { cleanings: 4, flowers: 0 },
  // Cleaning + Flower plans — combined trips
  tribute: { cleanings: 1, flowers: 1 },
  remembrance: { cleanings: 2, flowers: 2 },
  devotion: { cleanings: 3, flowers: 3 },
  eternal: { cleanings: 4, flowers: 4 },
};

const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Compute all visits for a subscription anchored to its start date.
 */
export function computeSubscriptionVisits(sub: SubscriptionInput, year: number): SubscriptionVisit[] {
  if (sub.status !== "active") return [];

  const config = PLAN_CONFIGS[sub.plan];
  if (!config) return [];

  // Step A — Parse start date
  const [sy, sm, sd] = sub.start_date.split("-").map(Number);
  const startDate = new Date(sy, sm - 1, sd);
  const subscriptionYear = startDate.getFullYear();

  // If the requested year doesn't overlap with this subscription's year, skip
  const subEndDate = new Date(startDate);
  subEndDate.setFullYear(subEndDate.getFullYear() + 1);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  if (startDate > yearEnd || subEndDate < yearStart) return [];

  const visits: SubscriptionVisit[] = [];

  if (config.flowers > 0) {
    // Step B — Resolve flower placement dates
    const holidayEntries: { name: string; customDate?: string }[] = [];
    if (sub.important_dates) {
      sub.important_dates.split(",").map(s => s.trim()).filter(Boolean).forEach(entry => {
        const [name, customDate] = entry.split("|").map(s => s.trim());
        holidayEntries.push({ name, customDate });
      });
    }

    const flowerDates: { date: Date; holidayName: string }[] = [];
    for (const entry of holidayEntries.slice(0, config.flowers)) {
      // Try the subscription start year first, then next year if the date has passed
      let d = holidayToDate(entry.name, subscriptionYear, entry.customDate);
      if (d && d < startDate) {
        d = holidayToDate(entry.name, subscriptionYear + 1, entry.customDate);
      }
      if (d) flowerDates.push({ date: d, holidayName: entry.name });
    }

    flowerDates.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Step C — Each flower date is a combined cleaning + flowers visit
    flowerDates.forEach((fd, i) => {
      if (fd.date.getFullYear() === year || (fd.date >= yearStart && fd.date <= yearEnd)) {
        visits.push({
          id: `${sub.id}-cf-${i}`,
          subscriptionId: sub.id,
          date: fmt(fd.date),
          type: "cleaning_flowers",
          customerName: sub.customerName,
          cemeteryName: sub.cemeteryName,
          plan: sub.plan,
          isFlower: true,
          arrangementId: sub.arrangements?.[fd.holidayName] || null,
        });
      }
    });
  } else {
    // Step D — Maintenance plans: spread cleanings evenly from start_date
    const interval = Math.round(365 / config.cleanings);
    for (let i = 0; i < config.cleanings; i++) {
      const visitDate = new Date(startDate);
      visitDate.setDate(visitDate.getDate() + interval * i);

      if (visitDate.getFullYear() === year || (visitDate >= yearStart && visitDate <= yearEnd)) {
        visits.push({
          id: `${sub.id}-clean-${i}`,
          subscriptionId: sub.id,
          date: fmt(visitDate),
          type: "cleaning_only",
          customerName: sub.customerName,
          cemeteryName: sub.cemeteryName,
          plan: sub.plan,
          isFlower: false,
          arrangementId: null,
        });
      }
    }
  }

  // Step F — Sort by date
  visits.sort((a, b) => a.date.localeCompare(b.date));
  return visits;
}

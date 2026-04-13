import { IntakeFormData, FLOWER_PLANS, FLOWER_ONLY_PLANS } from "@/lib/pricing";
import { Flower2, CalendarHeart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

const ALL_HOLIDAYS = [
  "Memorial Day",
  "Mother's Day",
  "Father's Day",
  "Easter",
  "Christmas",
  "Deceased's Birthday",
  "Deceased's Anniversary",
];

const HolidayPickerStep = ({ data, update }: Props) => {
  const flowerPlan = data.selectedFlowerPlan
    ? FLOWER_PLANS[data.selectedFlowerPlan as keyof typeof FLOWER_PLANS]
    : null;
  const flowerOnly = data.selectedFlowerOnly
    ? FLOWER_ONLY_PLANS.find((f) => f.id === data.selectedFlowerOnly)
    : null;

  const maxPicks = flowerPlan ? flowerPlan.flowers : flowerOnly ? flowerOnly.placements : 0;
  const planLabel = flowerPlan ? flowerPlan.label : flowerOnly ? flowerOnly.label : '';

  const needsCustomDate = (holiday: string) =>
    holiday === "Deceased's Birthday" || holiday === "Deceased's Anniversary";

  const toggleHoliday = (holiday: string) => {
    const current = data.selectedHolidays;
    if (current.includes(holiday)) {
      const updated = current.filter((h) => h !== holiday);
      const updatedDates = { ...data.holidayCustomDates };
      delete updatedDates[holiday];
      update({ selectedHolidays: updated, holidayCustomDates: updatedDates });
    } else if (current.length < maxPicks) {
      update({ selectedHolidays: [...current, holiday] });
    }
  };

  const updateCustomDate = (holiday: string, value: string) => {
    update({
      holidayCustomDates: { ...data.holidayCustomDates, [holiday]: value },
    });
  };

  if (!planLabel || maxPicks === 0) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <CalendarHeart className="w-8 h-8 text-primary mx-auto mb-3" />
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">
          Flower Placement Dates
        </span>
        <h2 className="text-3xl font-display font-bold mb-2 mt-2">
          Choose Your Holidays
        </h2>
        <p className="text-muted-foreground">
          {planLabel} includes {maxPicks} flower placement{maxPicks > 1 ? "s" : ""}.
          Select {maxPicks} date{maxPicks > 1 ? "s" : ""} below.
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-3">
        {ALL_HOLIDAYS.map((holiday) => {
          const selected = data.selectedHolidays.includes(holiday);
          const atLimit = data.selectedHolidays.length >= maxPicks && !selected;

          return (
            <div key={holiday}>
              <button
                onClick={() => !atLimit && toggleHoliday(holiday)}
                disabled={atLimit}
                className={`w-full p-4 rounded-lg border text-left transition-all flex items-center gap-3 ${
                  selected
                    ? "border-primary bg-primary/10"
                    : atLimit
                    ? "border-border bg-secondary/10 opacity-50 cursor-not-allowed"
                    : "border-border bg-secondary/30 hover:border-muted-foreground/40"
                }`}
              >
                <Flower2
                  className={`w-5 h-5 shrink-0 ${
                    selected ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span className="font-medium text-sm">{holiday}</span>
                {selected && (
                  <span className="ml-auto text-xs font-semibold text-primary">
                    Selected
                  </span>
                )}
              </button>

              {selected && needsCustomDate(holiday) && (
                <div className="mt-2 ml-8 mr-2">
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Enter the month and day (e.g. March 15)
                  </Label>
                  <Input
                    placeholder="e.g. March 15"
                    value={data.holidayCustomDates[holiday] || ""}
                    onChange={(e) => updateCustomDate(holiday, e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              )}
            </div>
          );
        })}

        <p className="text-xs text-muted-foreground text-center pt-2">
          {data.selectedHolidays.length} of {maxPicks} selected.
          Flower placements are paired with a cleaning visit on or near each date.
        </p>
      </div>
    </div>
  );
};

export default HolidayPickerStep;

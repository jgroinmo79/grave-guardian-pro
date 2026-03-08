import { BookingFormData } from "@/lib/booking-data";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  data: BookingFormData;
  update: (d: Partial<BookingFormData>) => void;
}

const ScheduleStep = ({ data, update }: Props) => (
  <div className="space-y-6 animate-fade-in">
    <div className="text-center mb-8">
      <span className="text-sm font-semibold uppercase tracking-widest text-[#C9A84C]">Step 3</span>
      <h2 className="text-3xl font-display font-bold mb-2 mt-2">Schedule</h2>
      <p className="text-muted-foreground">Pick your preferred date and location</p>
    </div>

    <div className="max-w-lg mx-auto space-y-5">
      {/* Date Picker */}
      <div>
        <label className="block text-sm font-semibold mb-2">Preferred Service Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !data.preferredDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {data.preferredDate ? format(data.preferredDate, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={data.preferredDate ?? undefined}
              onSelect={(d) => update({ preferredDate: d ?? null })}
              disabled={(d) => d < new Date()}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Cemetery Address */}
      <div>
        <label className="block text-sm font-semibold mb-2">Cemetery Name & Address</label>
        <input
          type="text"
          value={data.cemeteryAddress}
          onChange={(e) => update({ cemeteryAddress: e.target.value })}
          placeholder="e.g. Cape County Memorial Park, Jackson MO"
          className="w-full rounded-lg border border-border bg-secondary/50 text-foreground px-4 py-3 text-sm focus:outline-none focus:border-[#C9A84C] placeholder:text-muted-foreground"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-semibold mb-2">Any notes for Joshua? <span className="font-normal text-muted-foreground">(optional)</span></label>
        <textarea
          value={data.notes}
          onChange={(e) => update({ notes: e.target.value })}
          rows={4}
          placeholder="Special requests, access instructions, etc."
          className="w-full rounded-lg border border-border bg-secondary/50 text-foreground px-4 py-3 text-sm focus:outline-none focus:border-[#C9A84C] placeholder:text-muted-foreground resize-none"
        />
      </div>
    </div>
  </div>
);

export default ScheduleStep;

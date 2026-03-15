import { IntakeFormData } from "@/lib/pricing";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  data: IntakeFormData;
  update: (d: Partial<IntakeFormData>) => void;
}

const ScheduleDateStep = ({ data, update }: Props) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <CalendarIcon className="w-8 h-8 text-primary mx-auto mb-3" />
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">Step 7</span>
        <h2 className="text-3xl font-display font-bold mb-2 mt-2">Preferred Service Date</h2>
        <p className="text-muted-foreground">When would you like us to come out?</p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-12",
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

        <p className="text-xs text-muted-foreground text-center">
          Services are typically scheduled within 1 week of booking. We'll confirm your date via email.
        </p>
      </div>
    </div>
  );
};

export default ScheduleDateStep;

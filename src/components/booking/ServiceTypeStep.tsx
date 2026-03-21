import { BookingFormData, ServiceType } from "@/lib/booking-data";
import { Sparkles, CalendarDays, Flower2 } from "lucide-react";

interface Props {
  data: BookingFormData;
  update: (d: Partial<BookingFormData>) => void;
}

const SERVICES: { id: ServiceType; label: string; desc: string; icon: typeof Sparkles }[] = [
  {
    id: 'one_time',
    label: 'One-Time Cleaning',
    desc: 'A single visit. Cleaned, photographed, and documented.',
    icon: Sparkles,
  },
  {
    id: 'annual_plan',
    label: 'Annual Care Plan',
    desc: 'Recurring care on a yearly schedule. Set it and we handle the rest.',
    icon: CalendarDays,
  },
  {
    id: 'flower_placement',
    label: 'Flower Placement',
    desc: 'Artificial arrangement delivered and placed on your chosen date.',
    icon: Flower2,
  },
];

const ServiceTypeStep = ({ data, update }: Props) => (
  <div className="space-y-6 animate-fade-in">
    <div className="text-center mb-8">
      <span className="text-sm font-semibold uppercase tracking-widest text-[#C9976B]">Step 1</span>
      <h2 className="text-3xl font-display font-bold mb-2 mt-2">Choose Your Service</h2>
      <p className="text-muted-foreground">What can we do for you?</p>
    </div>

    <div className="max-w-lg mx-auto space-y-4">
      {SERVICES.map((s) => {
        const selected = data.serviceType === s.id;
        const Icon = s.icon;
        return (
          <button
            key={s.id}
            onClick={() => update({
              serviceType: s.id,
              // Reset step 2 selections when changing service type
              monumentType: '',
              cleaningTier: '',
              multiStone: false,
              addDamageReport: false,
              carePlan: '',
              flowerOption: '',
            })}
            className={`w-full p-5 rounded-lg border text-left transition-all flex items-start gap-4 ${
              selected
                ? "border-[#C9976B] bg-[#C9976B]/10"
                : "border-border bg-secondary/30 hover:border-muted-foreground/40"
            }`}
          >
            <Icon className={`w-6 h-6 mt-0.5 shrink-0 ${selected ? "text-[#C9976B]" : "text-muted-foreground"}`} />
            <div>
              <p className="font-display font-bold text-lg">{s.label}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

export default ServiceTypeStep;

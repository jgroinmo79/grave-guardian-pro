import { Check } from "lucide-react";

const STEPS = ["Service Type", "Monument & Options", "Schedule", "Review"];

interface Props {
  currentStep: number;
}

const BookingProgress = ({ currentStep }: Props) => (
  <div className="w-full py-6 px-4">
    <div className="flex items-center justify-between max-w-xl mx-auto">
      {STEPS.map((label, i) => {
        const isCompleted = i < currentStep;
        const isCurrent = i === currentStep;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                  isCompleted
                    ? "bg-[#8B6914] text-white"
                    : isCurrent
                    ? "border-2 border-[#C9A84C] text-[#C9A84C]"
                    : "border border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-medium hidden sm:block ${
                  isCurrent ? "text-[#C9A84C]" : isCompleted ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 mx-2">
                <div
                  className={`h-px transition-all duration-300 ${
                    isCompleted ? "bg-[#8B6914]" : "bg-border"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

export default BookingProgress;

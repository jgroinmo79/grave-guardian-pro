import { motion } from "framer-motion";
import { Check } from "lucide-react";

const STEPS = [
  "Cemetery",
  "Monument",
  "Condition",
  "Intent",
  "Service",
  "Add-Ons",
  "Consent",
  "Checkout",
];

interface StepProgressProps {
  currentStep: number;
}

const StepProgress = ({ currentStep }: StepProgressProps) => {
  return (
    <div className="w-full py-6 px-4">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {STEPS.map((label, i) => {
          const isCompleted = i < currentStep;
          const isCurrent = i === currentStep;
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                    isCompleted
                      ? "gradient-patina text-primary-foreground"
                      : isCurrent
                      ? "border-2 border-primary text-primary"
                      : "border border-muted-foreground/30 text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className={`text-[10px] font-medium hidden sm:block ${
                    isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 mx-2">
                  <div
                    className={`h-px transition-all duration-300 ${
                      isCompleted ? "bg-primary" : "bg-border"
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
};

export default StepProgress;

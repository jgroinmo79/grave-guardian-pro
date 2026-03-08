import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import BookingProgress from "./BookingProgress";
import ServiceTypeStep from "./ServiceTypeStep";
import MonumentOptionsStep from "./MonumentOptionsStep";
import ScheduleStep from "./ScheduleStep";
import ReviewStep from "./ReviewStep";
import { BookingFormData, initialBookingData } from "@/lib/booking-data";

const TOTAL_STEPS = 4;

const BookingFlow = () => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<BookingFormData>(initialBookingData);

  const update = (partial: Partial<BookingFormData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const goToStep = (s: number) => {
    setStep(s);
    window.scrollTo({ top: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return data.serviceType !== '';
      case 1: {
        if (data.serviceType === 'one_time') return data.monumentType !== '' && data.cleaningTier !== '';
        if (data.serviceType === 'annual_plan') return data.carePlan !== '';
        if (data.serviceType === 'flower_placement') return data.flowerOption !== '';
        return false;
      }
      case 2:
        return data.cemeteryAddress.trim().length > 0;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0: return <ServiceTypeStep data={data} update={update} />;
      case 1: return <MonumentOptionsStep data={data} update={update} />;
      case 2: return <ScheduleStep data={data} update={update} />;
      case 3: return <ReviewStep data={data} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen gradient-dark">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="text-center mb-2">
          <h1 className="font-display text-xl font-bold">
            <span className="text-gradient-patina">Grave Detail</span>
          </h1>
          <p className="text-xs text-muted-foreground">Cleaning & Preservation</p>
        </div>

        <BookingProgress currentStep={step} />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="mt-6"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-10 max-w-md mx-auto">
          <Button
            variant="outline"
            onClick={() => goToStep(Math.max(0, step - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          {step < TOTAL_STEPS - 1 && (
            <Button
              className="bg-[#8B6914] hover:bg-[#C9A84C] text-white"
              onClick={() => goToStep(Math.min(TOTAL_STEPS - 1, step + 1))}
              disabled={!canProceed()}
            >
              Continue <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingFlow;

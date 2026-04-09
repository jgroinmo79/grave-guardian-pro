import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";
import BookingProgress from "./BookingProgress";
import GiftBuyerStep from "@/components/steps/GiftBuyerStep";
import GiftHonoreeStep from "@/components/steps/GiftHonoreeStep";
import CemeteryStep from "@/components/steps/CemeteryStep";
import MonumentStep from "@/components/steps/MonumentStep";
import ConditionStep from "@/components/steps/ConditionStep";
import ServiceStep from "@/components/steps/ServiceStep";
import AddOnsStep from "@/components/steps/AddOnsStep";
import ConsentStep from "@/components/steps/ConsentStep";
import CheckoutStep from "@/components/steps/CheckoutStep";
import { IntakeFormData, initialFormData } from "@/lib/pricing";

type StepDef = {
  id: string;
  render: (data: IntakeFormData, update: (d: Partial<IntakeFormData>) => void) => React.ReactNode;
  canProceed: (data: IntakeFormData) => boolean;
};

const GiftBookingFlow = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<IntakeFormData>({
    ...initialFormData,
    isGift: true,
  });

  const update = (partial: Partial<IntakeFormData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const steps: StepDef[] = useMemo(() => {
    return [
      {
        id: 'gift-buyer',
        render: (d, u) => <GiftBuyerStep data={d} update={u} />,
        canProceed: (d) => d.shopperName.trim().length > 0 && d.shopperEmail.trim().length > 0,
      },
      {
        id: 'gift-honoree',
        render: (d, u) => <GiftHonoreeStep data={d} update={u} />,
        canProceed: (d) => d.deceasedName.trim().length > 0,
      },
      {
        id: 'cemetery',
        render: (d, u) => <CemeteryStep data={d} update={u} />,
        canProceed: (d) => d.cemeteryName.trim().length > 0,
      },
      {
        id: 'monument',
        render: (d, u) => <MonumentStep data={d} update={u} />,
        canProceed: (d) => {
          if (d.isVeteran) return d.veteranMonumentType !== '' && d.veteranMaterial !== '';
          return d.monumentType !== '' && d.material !== '';
        },
      },
      {
        id: 'condition',
        render: (d, u) => <ConditionStep data={d} update={u} />,
        canProceed: () => true,
      },
      {
        id: 'service',
        render: (d, u) => <ServiceStep data={d} update={u} />,
        canProceed: (d) => d.selectedOffer !== '',
      },
      {
        id: 'addons',
        render: (d, u) => <AddOnsStep data={d} update={u} />,
        canProceed: () => true,
      },
      {
        id: 'consent',
        render: (d, u) => <ConsentStep data={d} update={u} />,
        canProceed: (d) => d.consentBiological && d.consentAuthorize,
      },
      {
        id: 'checkout',
        render: (d) => <CheckoutStep data={d} />,
        canProceed: () => true,
      },
    ];
  }, []);

  const totalSteps = steps.length;
  const currentStep = steps[Math.min(stepIndex, totalSteps - 1)];
  const safeIndex = Math.min(stepIndex, totalSteps - 1);

  if (stepIndex !== safeIndex) {
    setStepIndex(safeIndex);
  }

  const goToStep = (s: number) => {
    setStepIndex(s);
    window.scrollTo({ top: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  return (
    <div className="min-h-screen gradient-dark">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center mb-2">
          <img src={logo} alt="Grave Detail Cleaning & Preservation" className="h-12 mx-auto mb-1" />
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-accent mt-1">
            🎁 Gift Order
          </span>
        </div>

        <BookingProgress currentStep={safeIndex} totalSteps={totalSteps} />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="mt-6"
          >
            {currentStep.render(data, update)}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-10 max-w-md mx-auto">
          <Button
            variant="outline"
            onClick={() => goToStep(Math.max(0, safeIndex - 1))}
            disabled={safeIndex === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          {safeIndex < totalSteps - 1 && (
            <Button
              className="bg-[#7A5C3E] hover:bg-[#C9976B] text-white"
              onClick={() => goToStep(Math.min(totalSteps - 1, safeIndex + 1))}
              disabled={!currentStep.canProceed(data)}
            >
              Continue <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GiftBookingFlow;

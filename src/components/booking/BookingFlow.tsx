import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";
import BookingProgress from "./BookingProgress";
import CemeteryStep from "@/components/steps/CemeteryStep";
import ContactStep from "@/components/steps/ContactStep";
import MonumentStep from "@/components/steps/MonumentStep";
import ConditionStep from "@/components/steps/ConditionStep";
import IntentStep from "@/components/steps/IntentStep";
import ServiceStep from "@/components/steps/ServiceStep";
import AddOnsStep from "@/components/steps/AddOnsStep";
import HolidayPickerStep from "@/components/steps/HolidayPickerStep";
import FlowerDatePickerStep from "@/components/steps/FlowerDatePickerStep";
import FlowerArrangementStep from "@/components/steps/FlowerArrangementStep";
import ScheduleDateStep from "@/components/steps/ScheduleDateStep";
import ConsentStep from "@/components/steps/ConsentStep";
import CheckoutStep from "@/components/steps/CheckoutStep";
import { IntakeFormData, initialFormData } from "@/lib/pricing";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/components/PageViewTracker";

type StepDef = {
  id: string;
  render: (data: IntakeFormData, update: (d: Partial<IntakeFormData>) => void) => React.ReactNode;
  canProceed: (data: IntakeFormData) => boolean;
};

const BookingFlow = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<IntakeFormData>(initialFormData);
  const leadIdRef = useRef<string | null>(null);

  const update = (partial: Partial<IntakeFormData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const hasAnnualPlan = data.selectedPlan !== '';
  const needsFlowerDates = ['single_arrangement', 'remembrance_trio', 'memorial_year'].includes(data.selectedBundle);
  const flowerPickLimit = data.selectedBundle === 'single_arrangement' ? 1 : data.selectedBundle === 'remembrance_trio' ? 3 : data.selectedBundle === 'memorial_year' ? 5 : 0;

  const steps: StepDef[] = useMemo(() => {
    const base: StepDef[] = [
      {
        id: 'cemetery',
        render: (d, u) => <CemeteryStep data={d} update={u} />,
        canProceed: (d) => d.cemeteryName.trim().length > 0,
      },
      {
        id: 'contact',
        render: (d, u) => <ContactStep data={d} update={u} />,
        canProceed: (d) => d.shopperName.trim().length > 0 && d.shopperEmail.trim().length > 0,
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
        id: 'intent',
        render: (d, u) => <IntentStep data={d} update={u} />,
        canProceed: () => true,
      },
      {
        id: 'addons',
        render: (d, u) => <AddOnsStep data={d} update={u} />,
        canProceed: () => true,
      },
    ];

    // Insert holiday picker step after add-ons if annual plan selected
    if (hasAnnualPlan) {
      const maxPicks = data.selectedPlan === 'keeper' ? 1 : data.selectedPlan === 'sentinel' ? 2 : 3;
      base.push({
        id: 'holidays',
        render: (d, u) => <HolidayPickerStep data={d} update={u} />,
        canProceed: (d) => {
          if (d.selectedHolidays.length !== maxPicks) return false;
          for (const h of d.selectedHolidays) {
            if ((h === "Deceased's Birthday" || h === "Deceased's Anniversary") && !d.holidayCustomDates[h]?.trim()) {
              return false;
            }
          }
          return true;
        },
      });
      // Flower arrangement selection for annual plan flower placements
      base.push({
        id: 'flower-arrangement',
        render: (d, u) => <FlowerArrangementStep data={d} update={u} />,
        canProceed: (d) => d.selectedArrangementId !== '',
      });
    }

    // Insert flower date picker step if a standalone flower bundle needing dates is selected
    if (needsFlowerDates) {
      base.push({
        id: 'flower-dates',
        render: (d, u) => <FlowerDatePickerStep data={d} update={u} />,
        canProceed: (d) => {
          if (d.flowerHolidays.length !== flowerPickLimit) return false;
          for (const h of d.flowerHolidays) {
            if ((h === "Deceased's Birthday" || h === "Deceased's Anniversary") && !d.flowerCustomDates[h]?.trim()) {
              return false;
            }
          }
          return true;
        },
      });
      // Flower arrangement selection for standalone flower bundles
      base.push({
        id: 'flower-arrangement',
        render: (d, u) => <FlowerArrangementStep data={d} update={u} />,
        canProceed: (d) => d.selectedArrangementId !== '',
      });
    }

    base.push(
      {
        id: 'schedule',
        render: (d, u) => <ScheduleDateStep data={d} update={u} />,
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
    );

    return base;
  }, [hasAnnualPlan, data.selectedPlan, needsFlowerDates, flowerPickLimit]);

  // Track abandoned lead on step changes
  useEffect(() => {
    const sessionId = getSessionId();
    const saveProgress = async () => {
      const stepId = steps[Math.min(stepIndex, steps.length - 1)]?.id || "cemetery";
      const leadData: any = {
        session_id: sessionId,
        step_reached: stepId,
        step_index: stepIndex,
        email: data.shopperEmail || null,
        name: data.shopperName || null,
        phone: data.shopperPhone || null,
        form_data: {
          cemeteryName: data.cemeteryName,
          monumentType: data.monumentType,
          selectedOffer: data.selectedOffer,
        },
      };

      if (!leadIdRef.current) {
        const { data: inserted } = await supabase
          .from("abandoned_leads" as any)
          .insert(leadData as any)
          .select("id")
          .single();
        if (inserted) leadIdRef.current = (inserted as any).id;
      } else {
        await supabase
          .from("abandoned_leads" as any)
          .update(leadData as any)
          .eq("id", leadIdRef.current);
      }
    };

    const timer = setTimeout(saveProgress, 1500);
    return () => clearTimeout(timer);
  }, [stepIndex, data.shopperEmail, data.shopperName, data.shopperPhone, data.cemeteryName, steps]);

  const totalSteps = steps.length;
  const currentStep = steps[Math.min(stepIndex, totalSteps - 1)];
  const safeIndex = Math.min(stepIndex, totalSteps - 1);

  // If step index exceeds steps (plan deselected), clamp
  if (stepIndex !== safeIndex) {
    setStepIndex(safeIndex);
  }

  const goToStep = (s: number, pushHistory = true) => {
    setStepIndex(s);
    if (pushHistory) {
      window.history.pushState({ step: s }, "");
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  // Push initial state and handle browser back/forward
  useEffect(() => {
    window.history.replaceState({ step: 0 }, "");
  }, []);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && typeof e.state.step === "number") {
        setStepIndex(e.state.step);
        window.scrollTo({ top: 0, behavior: "instant" });
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <div className="min-h-screen gradient-dark">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center mb-2">
          <img src={logo} alt="Grave Detail Cleaning & Preservation" className="h-12 mx-auto mb-1" />
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

export default BookingFlow;

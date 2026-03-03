import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import StepProgress from "@/components/StepProgress";
import CemeteryStep from "@/components/steps/CemeteryStep";
import MonumentStep from "@/components/steps/MonumentStep";
import ConditionStep from "@/components/steps/ConditionStep";
import IntentStep from "@/components/steps/IntentStep";
import ServiceStep from "@/components/steps/ServiceStep";
import AddOnsStep from "@/components/steps/AddOnsStep";
import ConsentStep from "@/components/steps/ConsentStep";
import CheckoutStep from "@/components/steps/CheckoutStep";
import { IntakeFormData, initialFormData } from "@/lib/pricing";
import { ArrowLeft, ArrowRight } from "lucide-react";

const TOTAL_STEPS = 8;

const IntakeFlow = () => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<IntakeFormData>(initialFormData);

  const update = (partial: Partial<IntakeFormData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return data.cemeteryName.trim().length > 0;
      case 1: return data.monumentType !== '' && data.material !== '';
      case 2: return true;
      case 3: return true;
      case 4: return data.selectedOffer !== '';
      case 5: return true;
      case 6: return data.consentBiological && data.consentAuthorize;
      default: return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0: return <CemeteryStep data={data} update={update} />;
      case 1: return <MonumentStep data={data} update={update} />;
      case 2: return <ConditionStep data={data} update={update} />;
      case 3: return <IntentStep data={data} update={update} />;
      case 4: return <ServiceStep data={data} update={update} />;
      case 5: return <AddOnsStep data={data} update={update} />;
      case 6: return <ConsentStep data={data} update={update} />;
      case 7: return <CheckoutStep data={data} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen gradient-dark">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-2">
          <h1 className="font-display text-xl font-bold">
            <span className="text-gradient-patina">Grave Detail</span>
          </h1>
          <p className="text-xs text-muted-foreground">Cleaning & Preservation</p>
        </div>

        <StepProgress currentStep={step} />

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

        {/* Navigation */}
        <div className="flex justify-between mt-10 max-w-md mx-auto">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          {step < TOTAL_STEPS - 1 ? (
            <Button
              variant="hero"
              onClick={() => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))}
              disabled={!canProceed()}
            >
              Continue <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default IntakeFlow;

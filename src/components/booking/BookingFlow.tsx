import { useState } from "react";
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
import ScheduleDateStep from "@/components/steps/ScheduleDateStep";
import ConsentStep from "@/components/steps/ConsentStep";
import CheckoutStep from "@/components/steps/CheckoutStep";
import { IntakeFormData, initialFormData } from "@/lib/pricing";

const TOTAL_STEPS = 10;

const BookingFlow = () => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<IntakeFormData>(initialFormData);

  const update = (partial: Partial<IntakeFormData>) => {
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
      case 0: // Cemetery
        return data.cemeteryName.trim().length > 0;
      case 1: // Contact Info
        return data.shopperName.trim().length > 0 && data.shopperEmail.trim().length > 0;
      case 2: // Monument
        if (data.isVeteran) return data.veteranMonumentType !== '' && data.veteranMaterial !== '';
        return data.monumentType !== '' && data.material !== '';
      case 3: // Condition
        return true;
      case 4: // Intent
        return true;
      case 5: // Service Selection
        return data.selectedOffer !== '';
      case 6: // Add-Ons
        return true;
      case 7: // Schedule Date
        return true;
      case 8: // Consent
        return data.consentBiological && data.consentAuthorize;
      case 9: // Checkout
        return true;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0: return <CemeteryStep data={data} update={update} />;
      case 1: return <ContactStep data={data} update={update} />;
      case 2: return <MonumentStep data={data} update={update} />;
      case 3: return <ConditionStep data={data} update={update} />;
      case 4: return <IntentStep data={data} update={update} />;
      case 5: return <ServiceStep data={data} update={update} />;
      case 6: return <AddOnsStep data={data} update={update} />;
      case 7: return <ScheduleDateStep data={data} update={update} />;
      case 8: return <ConsentStep data={data} update={update} />;
      case 9: return <CheckoutStep data={data} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen gradient-dark">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center mb-2">
          <h1 className="font-display text-xl font-bold">
            <span className="text-gradient-patina">Grave Detail</span>
          </h1>
          <p className="text-xs text-muted-foreground">Cleaning & Preservation</p>
        </div>

        <BookingProgress currentStep={step} totalSteps={TOTAL_STEPS} />

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

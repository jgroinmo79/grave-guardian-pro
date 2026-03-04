import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const PaymentCanceled = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-dark flex items-center justify-center px-4">
      <div className="text-center max-w-md space-y-6 animate-fade-in">
        <XCircle className="w-16 h-16 text-destructive mx-auto" />
        <h1 className="text-3xl font-display font-bold">Payment Canceled</h1>
        <p className="text-muted-foreground">
          Your payment was not processed. You can return to the intake form and try again.
        </p>
        <Button variant="hero" onClick={() => navigate("/")}>
          Back to Intake Form
        </Button>
      </div>
    </div>
  );
};

export default PaymentCanceled;

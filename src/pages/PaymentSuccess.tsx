import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const PaymentSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-dark flex items-center justify-center px-4">
      <div className="text-center max-w-md space-y-6 animate-fade-in">
        <CheckCircle className="w-16 h-16 text-primary mx-auto" />
        <h1 className="text-3xl font-display font-bold">Payment Successful!</h1>
        <p className="text-muted-foreground">
          Thank you for your order. Joshua will be in touch within 24 hours to confirm your service date.
        </p>
        <Button variant="hero" onClick={() => navigate("/")}>
          Back to Home
        </Button>
      </div>
    </div>
  );
};

export default PaymentSuccess;

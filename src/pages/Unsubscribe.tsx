import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "valid" | "already" | "invalid" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    const validate = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: anonKey } }
        );
        const data = await res.json();
        if (!res.ok) {
          setStatus("invalid");
        } else if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already");
        } else if (data.valid) {
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("error");
      }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) {
        setStatus("error");
      } else if (data?.success) {
        setStatus("success");
      } else if (data?.reason === "already_unsubscribed") {
        setStatus("already");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-bold text-foreground tracking-wide uppercase font-serif">
          Grave Detail
        </h1>

        {status === "loading" && (
          <p className="text-muted-foreground">Verifying your request...</p>
        )}

        {status === "valid" && (
          <div className="space-y-4">
            <p className="text-foreground">
              Would you like to unsubscribe from future emails?
            </p>
            <Button onClick={handleUnsubscribe} variant="default" size="lg">
              Confirm Unsubscribe
            </Button>
          </div>
        )}

        {status === "success" && (
          <p className="text-foreground">
            You've been unsubscribed. You won't receive any more emails from us.
          </p>
        )}

        {status === "already" && (
          <p className="text-muted-foreground">
            You're already unsubscribed from our emails.
          </p>
        )}

        {status === "invalid" && (
          <p className="text-destructive">
            This unsubscribe link is invalid or has expired.
          </p>
        )}

        {status === "error" && (
          <p className="text-destructive">
            Something went wrong. Please try again later.
          </p>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;

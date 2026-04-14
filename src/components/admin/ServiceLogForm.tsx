import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2 } from "lucide-react";

const SERVICE_OPTIONS = [
  "Basic Cleaning",
  "Deep Restoration",
  "Biological Growth Removal",
  "Endurance Cleaner Treatment",
  "Lettering Re-blackening",
  "Weeding & Edging",
  "Flag Placement",
  "Flower Placement",
  "Damage Documentation",
  "Inscription Repainting",
];

interface ServiceLogFormProps {
  monumentId: string;
  orderId?: string;
  userId: string;
  onComplete?: () => void;
}

const ServiceLogForm = ({ monumentId, orderId, userId, onComplete }: ServiceLogFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [services, setServices] = useState<string[]>([]);
  const [publicNotes, setPublicNotes] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");
  const [timeSpent, setTimeSpent] = useState("");

  const toggleService = (s: string) => {
    setServices((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const addLog = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("service_logs").insert({
        monument_id: monumentId,
        order_id: orderId || null,
        user_id: userId,
        service_date: serviceDate,
        services_performed: services,
        public_notes: publicNotes || null,
        private_notes: privateNotes || null,
        time_spent_minutes: timeSpent ? parseInt(timeSpent) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-service-logs"] });
      queryClient.invalidateQueries({ queryKey: ["monument-service-logs"] });
      toast({ title: "Service log added" });
      setServices([]);
      setPublicNotes("");
      setPrivateNotes("");
      setTimeSpent("");
      onComplete?.();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Service Date</Label>
          <Input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Time Spent (min)</Label>
          <Input type="number" value={timeSpent} onChange={(e) => setTimeSpent(e.target.value)} className="h-9 text-sm" placeholder="e.g. 90" />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Services Performed</Label>
        <div className="grid grid-cols-2 gap-2">
          {SERVICE_OPTIONS.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <Checkbox checked={services.includes(s)} onCheckedChange={() => toggleService(s)} id={`svc-${s}`} />
              <Label htmlFor={`svc-${s}`} className="text-xs cursor-pointer">{s}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Public Notes (visible to customer)</Label>
        <Textarea value={publicNotes} onChange={(e) => setPublicNotes(e.target.value)} className="text-sm min-h-[50px]" placeholder="Notes the customer will see…" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Private Notes (admin only)</Label>
        <Textarea value={privateNotes} onChange={(e) => setPrivateNotes(e.target.value)} className="text-sm min-h-[50px]" placeholder="Internal notes…" />
      </div>

      <Button onClick={() => addLog.mutate()} disabled={addLog.isPending || !services.length} size="sm" className="gap-1.5">
        {addLog.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
        Add Service Log
      </Button>
    </div>
  );
};

export default ServiceLogForm;

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, Loader2, Clock, CheckCircle, AlertCircle } from "lucide-react";

const CATEGORIES = [
  { value: "extra_cleaning", label: "Request an extra cleaning" },
  { value: "flowers", label: "Request flowers" },
  { value: "issue", label: "Report an issue or concern" },
  { value: "general", label: "General question" },
];

const SupportForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [monumentId, setMonumentId] = useState<string>("");

  const { data: monuments } = useQuery({
    queryKey: ["my-monuments-support", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monuments")
        .select("id, cemetery_name")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: tickets } = useQuery({
    queryKey: ["my-tickets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const submitTicket = useMutation({
    mutationFn: async () => {
      const catLabel = CATEGORIES.find((c) => c.value === category)?.label ?? category;
      const { error } = await supabase.from("support_tickets").insert({
        user_id: user!.id,
        monument_id: monumentId || null,
        category,
        subject: subject || catLabel,
        description: description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Request submitted", description: "We'll get back to you soon." });
      setCategory("");
      setSubject("");
      setDescription("");
      setMonumentId("");
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const statusIcons: Record<string, React.ReactNode> = {
    received: <Clock className="w-3.5 h-3.5 text-accent" />,
    in_progress: <AlertCircle className="w-3.5 h-3.5 text-primary" />,
    scheduled: <Clock className="w-3.5 h-3.5 text-primary" />,
    completed: <CheckCircle className="w-3.5 h-3.5 text-primary" />,
  };

  const statusColors: Record<string, string> = {
    received: "bg-accent/20 text-accent",
    in_progress: "bg-primary/20 text-primary",
    scheduled: "bg-primary/20 text-primary",
    completed: "bg-primary/20 text-primary",
  };

  return (
    <div className="space-y-6">
      {/* New request form */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h3 className="font-display font-semibold">New Request</h3>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">What do you need?</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select a category..." /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {monuments && monuments.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Related monument (optional)</Label>
              <Select value={monumentId} onValueChange={setMonumentId}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select monument..." /></SelectTrigger>
                <SelectContent>
                  {monuments.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.cemetery_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary..."
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Details</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide any details or special instructions..."
              className="text-sm min-h-[80px]"
            />
          </div>

          <Button
            size="sm"
            className="gap-1.5"
            disabled={!category || submitTicket.isPending}
            onClick={() => submitTicket.mutate()}
          >
            {submitTicket.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Submit Request
          </Button>
        </div>
      </div>

      {/* Existing tickets */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-sm">Your Requests</h3>
        {!tickets?.length ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">No requests yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <div key={t.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{t.subject}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${statusColors[t.status] ?? "bg-muted text-muted-foreground"}`}>
                    {statusIcons[t.status]}
                    {t.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</p>
                {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                {t.admin_response && (
                  <div className="bg-secondary/50 rounded-lg px-3 py-2 mt-2">
                    <p className="text-[10px] text-muted-foreground font-medium mb-1">Response:</p>
                    <p className="text-xs">{t.admin_response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportForm;

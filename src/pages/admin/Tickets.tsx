import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, MessageSquare, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const STATUSES = ["received", "in_progress", "scheduled", "completed"];

const AdminTickets = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("open");

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["admin-tickets", filter],
    queryFn: async () => {
      let query = supabase
        .from("support_tickets")
        .select("*, profiles:user_id (full_name, email), monuments (cemetery_name)")
        .order("created_at", { ascending: false });

      if (filter === "open") {
        query = query.in("status", ["received", "in_progress", "scheduled"]);
      } else if (filter === "completed") {
        query = query.eq("status", "completed");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const statusColors: Record<string, string> = {
    received: "bg-accent/20 text-accent",
    in_progress: "bg-primary/20 text-primary",
    scheduled: "bg-primary/20 text-primary",
    completed: "bg-primary/20 text-primary",
  };

  const statusIcons: Record<string, React.ReactNode> = {
    received: <Clock className="w-3 h-3" />,
    in_progress: <AlertCircle className="w-3 h-3" />,
    scheduled: <Clock className="w-3 h-3" />,
    completed: <CheckCircle className="w-3 h-3" />,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Support Tickets</h1>
          <p className="text-sm text-muted-foreground">Manage client requests and issues</p>
        </div>
        <div className="flex gap-2">
          {["open", "completed", "all"].map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              className="text-xs capitalize"
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !tickets?.length ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No tickets found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket: any) => (
            <TicketRow key={ticket.id} ticket={ticket} statusColors={statusColors} statusIcons={statusIcons} />
          ))}
        </div>
      )}
    </div>
  );
};

function TicketRow({ ticket, statusColors, statusIcons }: { ticket: any; statusColors: Record<string, string>; statusIcons: Record<string, React.ReactNode> }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(ticket.status);
  const [response, setResponse] = useState(ticket.admin_response ?? "");

  const updateTicket = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status, admin_response: response || null, updated_at: new Date().toISOString() })
        .eq("id", ticket.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Ticket updated" });
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      setOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const profile = ticket.profiles as any;
  const monument = ticket.monuments as any;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full rounded-xl border border-border bg-card p-4 flex items-center justify-between text-left hover:border-primary/30 transition-colors">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold truncate">{ticket.subject}</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground capitalize flex-shrink-0">
                {ticket.category.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {profile?.full_name || profile?.email || "Unknown"}
              {monument?.cemetery_name && ` · ${monument.cemetery_name}`}
              {" · "}{new Date(ticket.created_at).toLocaleDateString()}
            </p>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 flex-shrink-0 ${statusColors[ticket.status] ?? "bg-muted text-muted-foreground"}`}>
            {statusIcons[ticket.status]}
            {ticket.status.replace(/_/g, " ")}
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{ticket.subject}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm space-y-2">
            <p><span className="text-muted-foreground">From:</span> {profile?.full_name || profile?.email}</p>
            <p><span className="text-muted-foreground">Category:</span> {ticket.category.replace(/_/g, " ")}</p>
            {monument && <p><span className="text-muted-foreground">Monument:</span> {monument.cemetery_name}</p>}
            <p><span className="text-muted-foreground">Date:</span> {new Date(ticket.created_at).toLocaleString()}</p>
          </div>

          {ticket.description && (
            <div className="bg-secondary/50 rounded-lg px-3 py-2">
              <p className="text-xs text-muted-foreground font-medium mb-1">Client message:</p>
              <p className="text-sm">{ticket.description}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-sm capitalize">{s.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Response to client</Label>
            <Textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Write a response the client will see..."
              className="text-sm min-h-[80px]"
            />
          </div>

          <Button className="w-full" onClick={() => updateTicket.mutate()} disabled={updateTicket.isPending}>
            {updateTicket.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Update Ticket
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AdminTickets;

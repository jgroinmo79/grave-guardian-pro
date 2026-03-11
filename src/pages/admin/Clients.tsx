import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, Mail, Send, Plus, ChevronDown, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const AdminClients = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const { data: clients, isLoading } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // All orders with monument info
  const { data: allOrders } = useQuery({
    queryKey: ["admin-all-client-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, monuments (cemetery_name, monument_type)")
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // All service logs
  const { data: allServiceLogs } = useQuery({
    queryKey: ["admin-all-service-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_logs")
        .select("*, monuments (cemetery_name)")
        .order("service_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const inviteClient = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("invite-client", {
        body: { email: inviteEmail, name: inviteName },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Invite sent", description: `Invitation emailed to ${inviteEmail}` });
      setShowInvite(false);
      setInviteEmail("");
      setInviteName("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Group orders + service logs by date for a given user
  const getClientTimeline = (userId: string) => {
    const userOrders = allOrders?.filter((o) => o.user_id === userId) ?? [];
    const userLogs = allServiceLogs?.filter((l) => l.user_id === userId) ?? [];

    // Combine into date-keyed map
    const dateMap = new Map<string, { orders: any[]; logs: any[] }>();

    userOrders.forEach((o) => {
      const dateKey = o.scheduled_date || new Date(o.created_at).toISOString().slice(0, 10);
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, { orders: [], logs: [] });
      dateMap.get(dateKey)!.orders.push(o);
    });

    userLogs.forEach((l: any) => {
      const dateKey = l.service_date;
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, { orders: [], logs: [] });
      dateMap.get(dateKey)!.logs.push(l);
    });

    // Sort by date descending
    return Array.from(dateMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground">{clients?.length ?? 0} registered clients</p>
        </div>
        <Dialog open={showInvite} onOpenChange={setShowInvite}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> Invite Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a Client</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Send an email invitation with a magic sign-in link.</p>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Client Name</Label>
                <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Jane Doe" />
              </div>
              <div>
                <Label>Email Address</Label>
                <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="jane@example.com" />
              </div>
              <Button
                className="w-full gap-2"
                onClick={() => inviteClient.mutate()}
                disabled={!inviteEmail || inviteClient.isPending}
              >
                {inviteClient.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Invitation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!clients?.length ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No clients yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {clients.map((c) => {
            const isExpanded = expandedClient === c.user_id;
            const timeline = isExpanded ? getClientTimeline(c.user_id) : [];
            const orderCount = allOrders?.filter((o) => o.user_id === c.user_id).length ?? 0;

            return (
              <div key={c.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  className="w-full p-4 flex flex-wrap items-center justify-between gap-3 text-left hover:bg-secondary/30 transition-colors"
                  onClick={() => setExpandedClient(isExpanded ? null : c.user_id)}
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">{c.full_name || "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {c.email}
                    </p>
                    {(c.city || c.state) && (
                      <p className="text-xs text-muted-foreground">
                        {[c.city, c.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                      {orderCount} orders
                    </span>
                    <span className="text-muted-foreground">
                      Joined {new Date(c.created_at).toLocaleDateString()}
                    </span>
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border px-4 py-3 space-y-2 bg-secondary/10">
                    {timeline.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">No service history yet.</p>
                    ) : (
                      timeline.map(([dateKey, data]) => {
                        const isDateExpanded = expandedDate === `${c.user_id}-${dateKey}`;
                        const totalPaid = data.orders.reduce((s, o) => s + Number(o.total_price), 0);
                        const completedOrders = data.orders.filter((o) => o.status === "completed");
                        const isPast = new Date(dateKey) < new Date();

                        return (
                          <div key={dateKey} className="rounded-lg border border-border/50 bg-card overflow-hidden">
                            <button
                              className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-secondary/30 transition-colors"
                              onClick={() => setExpandedDate(isDateExpanded ? null : `${c.user_id}-${dateKey}`)}
                            >
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs font-semibold">{new Date(dateKey).toLocaleDateString()}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isPast ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'}`}>
                                  {isPast ? 'Completed' : 'Scheduled'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                {totalPaid > 0 && <span className="font-semibold">${totalPaid.toFixed(0)}</span>}
                                {isDateExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              </div>
                            </button>

                            {isDateExpanded && (
                              <div className="border-t border-border/50 px-3 py-2 space-y-2">
                                {data.orders.map((o: any) => (
                                  <div key={o.id} className="text-xs space-y-1 py-1">
                                    <div className="flex justify-between">
                                      <span className="font-medium">Offer {o.offer} — {(o.monuments as any)?.cemetery_name}</span>
                                      <span className="font-semibold">${Number(o.total_price).toFixed(2)}</span>
                                    </div>
                                    <div className="flex gap-2 text-muted-foreground">
                                      <span>{(o.monuments as any)?.monument_type?.replace(/_/g, ' ')}</span>
                                      <span>·</span>
                                      <span className="capitalize">{o.status.replace(/_/g, ' ')}</span>
                                    </div>
                                  </div>
                                ))}
                                {data.logs.map((l: any) => (
                                  <div key={l.id} className="text-xs space-y-1 py-1 border-t border-border/30 pt-2">
                                    <p className="font-medium text-muted-foreground">Service Log — {(l.monuments as any)?.cemetery_name}</p>
                                    {(l.services_performed as string[])?.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {(l.services_performed as string[]).map((s: string) => (
                                          <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{s}</span>
                                        ))}
                                      </div>
                                    )}
                                    {l.time_spent_minutes && <p className="text-muted-foreground">{l.time_spent_minutes} minutes</p>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminClients;

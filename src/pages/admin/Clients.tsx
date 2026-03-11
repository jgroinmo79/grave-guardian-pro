import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, Mail, Send, Plus } from "lucide-react";
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

  // Get monument counts per user
  const { data: monumentCounts } = useQuery({
    queryKey: ["admin-monument-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monuments")
        .select("user_id");
      if (error) throw error;
      const counts = new Map<string, number>();
      data?.forEach((m) => {
        counts.set(m.user_id, (counts.get(m.user_id) ?? 0) + 1);
      });
      return counts;
    },
  });

  // Get active subscription counts per user
  const { data: subCounts } = useQuery({
    queryKey: ["admin-sub-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("status", "active");
      if (error) throw error;
      const counts = new Map<string, number>();
      data?.forEach((s) => {
        counts.set(s.user_id, (counts.get(s.user_id) ?? 0) + 1);
      });
      return counts;
    },
  });

  const inviteClient = useMutation({
    mutationFn: async () => {
      // Use Supabase invite (sends magic link email)
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
          {clients.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
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
                  {monumentCounts?.get(c.user_id) ?? 0} graves
                </span>
                {(subCounts?.get(c.user_id) ?? 0) > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent font-medium">
                    {subCounts?.get(c.user_id)} plan{(subCounts?.get(c.user_id) ?? 0) > 1 ? "s" : ""}
                  </span>
                )}
                <span className="text-muted-foreground">
                  Joined {new Date(c.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminClients;

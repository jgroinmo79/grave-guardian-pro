import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { UserX, Mail, Phone, ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

const STEP_LABELS: Record<string, string> = {
  cemetery: "Cemetery",
  contact: "Contact Info",
  monument: "Monument",
  condition: "Condition",
  service: "Service",
  intent: "Intent",
  addons: "Add-Ons",
  holidays: "Holidays",
  "flower-dates": "Flower Dates",
  schedule: "Schedule",
  consent: "Consent",
  checkout: "Checkout",
};

const AdminLeads = () => {
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: leads, isLoading, refetch } = useQuery({
    queryKey: ["admin-abandoned-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("abandoned_leads" as any)
        .select("*")
        .eq("converted", false)
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from("abandoned_leads" as any).delete().eq("id", id);
    setDeleting(null);
    if (error) {
      toast.error("Failed to delete lead");
    } else {
      toast.success("Lead removed");
      refetch();
    }
  };

  const leadsWithContact = (leads ?? []).filter((l: any) => l.email || l.phone);
  const leadsWithoutContact = (leads ?? []).filter((l: any) => !l.email && !l.phone);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold">Abandoned Leads</h1>
        <p className="text-sm text-muted-foreground">
          People who started the booking flow but didn't complete it
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Abandoned</p>
          <p className="text-2xl font-display font-bold">{(leads ?? []).length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">With Contact Info</p>
          <p className="text-2xl font-display font-bold text-primary">{leadsWithContact.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">No Contact Info</p>
          <p className="text-2xl font-display font-bold text-muted-foreground">{leadsWithoutContact.length}</p>
        </div>
      </div>

      {/* Leads with contact info - actionable */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
          <UserX className="w-4 h-4 text-primary" /> Follow-Up Leads
        </h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : leadsWithContact.length === 0 ? (
          <p className="text-sm text-muted-foreground">No abandoned leads with contact info yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Contact</th>
                  <th className="pb-2 font-medium">Dropped At</th>
                  <th className="pb-2 font-medium">When</th>
                  <th className="pb-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leadsWithContact.map((lead: any) => {
                  const formData = lead.form_data || {};
                  return (
                    <tr key={lead.id} className="border-b border-border/50 last:border-0">
                      <td className="py-3 font-medium">
                        {lead.name || "Unknown"}
                        {formData.cemeteryName && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {formData.cemeteryName}
                          </div>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="space-y-1">
                          {lead.email && (
                            <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-primary hover:underline text-xs">
                              <Mail className="w-3 h-3" /> {lead.email}
                            </a>
                          )}
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-primary hover:underline text-xs">
                              <Phone className="w-3 h-3" /> {lead.phone}
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="flex items-center gap-1 text-xs">
                          <ArrowRight className="w-3 h-3 text-accent" />
                          {STEP_LABELS[lead.step_reached] || lead.step_reached}
                          <span className="text-muted-foreground">(step {lead.step_index + 1})</span>
                        </span>
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true })}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(lead.id)}
                          disabled={deleting === lead.id}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Anonymous leads */}
      {leadsWithoutContact.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-display font-semibold mb-4 text-muted-foreground">
            Anonymous Drop-offs ({leadsWithoutContact.length})
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Visitors who started the form but left before providing contact info.
          </p>
          {/* Step funnel */}
          <div className="space-y-2">
            {Object.entries(
              leadsWithoutContact.reduce((acc: Record<string, number>, l: any) => {
                const step = STEP_LABELS[l.step_reached] || l.step_reached;
                acc[step] = (acc[step] || 0) + 1;
                return acc;
              }, {})
            )
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([step, count]) => (
                <div key={step} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Dropped at: {step}</span>
                  <span className="text-foreground font-mono">{count as number}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLeads;

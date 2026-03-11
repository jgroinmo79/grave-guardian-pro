import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, Camera, Clock, FileText } from "lucide-react";
import { MONUMENT_PRICES } from "@/lib/pricing";
import type { MonumentType } from "@/lib/pricing";

interface GraveDetailProps {
  monumentId: string;
}

const GraveDetail = ({ monumentId }: GraveDetailProps) => {
  const { user } = useAuth();

  const { data: monument } = useQuery({
    queryKey: ["monument-detail", monumentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monuments")
        .select("*")
        .eq("id", monumentId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["monument-orders", monumentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("monument_id", monumentId)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: photos } = useQuery({
    queryKey: ["monument-photos", monumentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photo_records")
        .select("*")
        .eq("monument_id", monumentId)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: serviceLogs } = useQuery({
    queryKey: ["monument-service-logs", monumentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_logs")
        .select("*")
        .eq("monument_id", monumentId)
        .eq("user_id", user!.id)
        .order("service_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (!monument) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const conditions = [
    monument.condition_moss_algae && "Moss/Algae",
    monument.condition_chipping && "Chipping",
    monument.condition_leaning && "Leaning",
    monument.condition_faded_inscription && "Faded Inscription",
    monument.condition_not_cleaned && "Not Recently Cleaned",
    monument.known_damage && "Known Damage",
  ].filter(Boolean);

  const statusColors: Record<string, string> = {
    pending: "bg-accent/20 text-accent",
    confirmed: "bg-primary/20 text-primary",
    scheduled: "bg-primary/20 text-primary",
    in_progress: "bg-accent/20 text-accent",
    completed: "bg-primary/20 text-primary",
    cancelled: "bg-destructive/20 text-destructive",
  };

  const monumentLabel = MONUMENT_PRICES[monument.monument_type as MonumentType]?.label ?? monument.monument_type.replace(/_/g, " ");

  return (
    <div className="space-y-6">
      {/* Monument Info */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h2 className="font-display text-xl font-bold">{monument.cemetery_name}</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Type</p>
            <p className="font-medium capitalize">{monumentLabel}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Material</p>
            <p className="font-medium capitalize">{monument.material}</p>
          </div>
          {monument.section && (
            <div>
              <p className="text-xs text-muted-foreground">Section</p>
              <p className="font-medium">{monument.section}</p>
            </div>
          )}
          {monument.lot_number && (
            <div>
              <p className="text-xs text-muted-foreground">Lot</p>
              <p className="font-medium">{monument.lot_number}</p>
            </div>
          )}
        </div>
        {conditions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {conditions.map((c) => (
              <span key={c as string} className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                {c}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Service History */}
      <section className="space-y-3">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Service History
        </h3>
        {!serviceLogs?.length ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">No service logs yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {serviceLogs.map((log) => (
              <div key={log.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{new Date(log.service_date).toLocaleDateString()}</p>
                  {log.time_spent_minutes && (
                    <p className="text-xs text-muted-foreground">{log.time_spent_minutes} min</p>
                  )}
                </div>
                {(log.services_performed as string[])?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(log.services_performed as string[]).map((s: string) => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                {log.public_notes && (
                  <p className="text-xs text-muted-foreground">{log.public_notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Photos */}
      <section className="space-y-3">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" /> Photos
        </h3>
        {!photos?.length ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">No photos yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="rounded-xl border border-border overflow-hidden bg-card">
                <img
                  src={photo.photo_url}
                  alt={photo.description || "Monument photo"}
                  className="w-full aspect-square object-cover"
                  loading="lazy"
                />
                <div className="p-2 space-y-0.5">
                  {photo.description && (
                    <p className="text-xs font-medium">{photo.description}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {photo.taken_at ? new Date(photo.taken_at).toLocaleDateString() : new Date(photo.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Orders for this monument */}
      <section className="space-y-3">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" /> Orders
        </h3>
        {!orders?.length ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">No orders for this monument.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-mono text-muted-foreground">#{o.id.slice(0, 8)}</p>
                  <p className="text-sm">Offer {o.offer} · {new Date(o.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[o.status]}`}>
                    {o.status.replace(/_/g, " ")}
                  </span>
                  <p className="font-display font-bold text-sm">${Number(o.total_price).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default GraveDetail;

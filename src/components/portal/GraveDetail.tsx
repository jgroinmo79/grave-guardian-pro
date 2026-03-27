import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  MapPin, Camera, Clock, FileText, Download, Shield, Share2, Check,
  ClipboardList, Wrench, MessageSquare, ChevronDown, ChevronUp,
} from "lucide-react";
import { MONUMENT_PRICES } from "@/lib/pricing";
import type { MonumentType } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface GraveDetailProps {
  monumentId: string;
}

// ── Label maps ────────────────────────────────────────────────────────────────

const OFFER_LABELS: Record<string, string> = {
  A: "Standard Clean",
  B: "Restoration Clean",
};

const BUNDLE_LABELS: Record<string, string> = {
  memorial_day: "Memorial Day Bundle",
  remembrance_trio: "Remembrance Trio",
  memorial_year: "Memorial Year Bundle",
  single_arrangement: "Single Arrangement & Placement",
};

const ADD_ON_LABELS: Record<string, string> = {
  damage_report: "Damage Documentation Report",
  inscription_repainting: "Inscription Repainting",
  weeding: "Weeding & Plot Edging",
  flag_placement: "Flag Placement",
  bronze_cleaning: "Bronze Marker Specialized Cleaning",
  crack_repair: "Stone Crack / Chip Repair",
  video_documentation: "Video Documentation",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-accent/20 text-accent",
  confirmed: "bg-primary/20 text-primary",
  scheduled: "bg-primary/20 text-primary",
  in_progress: "bg-accent/20 text-accent",
  completed: "bg-primary/20 text-primary",
  cancelled: "bg-destructive/20 text-destructive",
};

const PLAN_STATUS_COLORS: Record<string, string> = {
  active: "bg-primary/20 text-primary",
  paused: "bg-accent/20 text-accent",
  cancelled: "bg-destructive/20 text-destructive",
  expired: "bg-muted text-muted-foreground",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getServicesRequested(order: any): string[] {
  const items: string[] = [];
  if (order.bundle_id && BUNDLE_LABELS[order.bundle_id]) {
    items.push(BUNDLE_LABELS[order.bundle_id]);
  } else if (order.offer) {
    items.push(OFFER_LABELS[order.offer] ?? `Offer ${order.offer}`);
  }
  if (Array.isArray(order.add_ons)) {
    for (const addon of order.add_ons) {
      const label =
        typeof addon === "string"
          ? (ADD_ON_LABELS[addon] ?? addon)
          : (ADD_ON_LABELS[addon?.id] ?? addon?.label ?? addon?.id ?? "Add-on");
      items.push(label);
    }
  }
  return items;
}

// ── Main component ────────────────────────────────────────────────────────────

const GraveDetail = ({ monumentId }: GraveDetailProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
        .eq("client_visible", true)
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

  const { data: subscription } = useQuery({
    queryKey: ["monument-subscription", monumentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("monument_id", monumentId)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (!monument) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const conditions = [
    monument.condition_moss_algae && "Moss / Algae",
    monument.condition_chipping && "Chipping",
    monument.condition_leaning && "Leaning",
    monument.condition_faded_inscription && "Faded Inscription",
    monument.condition_not_cleaned && "Not Recently Cleaned",
    monument.known_damage && "Known Damage",
  ].filter(Boolean);

  const monumentLabel =
    MONUMENT_PRICES[monument.monument_type as MonumentType]?.label ??
    monument.monument_type.replace(/_/g, " ");

  // Lookup helpers
  const logsByOrderId = (serviceLogs ?? []).reduce<Record<string, typeof serviceLogs>>((acc, log) => {
    const key = log.order_id ?? "__orphan__";
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(log);
    return acc;
  }, {});

  const photosByOrderId = (photos ?? []).reduce<Record<string, typeof photos>>((acc, p) => {
    const key = p.order_id ?? "__orphan__";
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(p);
    return acc;
  }, {});

  const orphanLogs = logsByOrderId["__orphan__"] ?? [];

  const handleCopyShare = (log: any) => {
    const url = `${window.location.origin}/report/${log.share_token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(log.id);
    toast({ title: "Share link copied — send it to family members" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Group photos by before/after for gallery
  const photosByOrder = (photos ?? []).reduce((map, p) => {
    const key = p.order_id ?? "unlinked";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
    return map;
  }, new Map<string, NonNullable<typeof photos>>());

  return (
    <div className="space-y-6">
      {/* ── Monument Info ─────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <h2 className="font-display text-xl font-bold">{monument.cemetery_name}</h2>
          </div>
          {subscription && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_STATUS_COLORS[subscription.status]}`}
            >
              <Shield className="w-3 h-3 inline mr-1" />
              {subscription.plan} · {subscription.status}
            </span>
          )}
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
          <div className="flex flex-wrap gap-1.5 pt-1">
            {conditions.map((c) => (
              <span
                key={c as string}
                className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent"
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList className="bg-secondary w-full grid grid-cols-3">
          <TabsTrigger value="history" className="text-xs gap-1">
            <Clock className="w-3 h-3" /> History
          </TabsTrigger>
          <TabsTrigger value="photos" className="text-xs gap-1">
            <Camera className="w-3 h-3" /> Photos
          </TabsTrigger>
          <TabsTrigger value="orders" className="text-xs gap-1">
            <FileText className="w-3 h-3" /> Orders
          </TabsTrigger>
        </TabsList>

        {/* ── Visit History ──────────────────────────────────────────────── */}
        <TabsContent value="history" className="space-y-4">
          {!orders?.length && !orphanLogs.length ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">No service history yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Orders with linked logs and photos */}
              {orders?.map((order) => {
                const logs = logsByOrderId[order.id] ?? [];
                const orderPhotos = photosByOrderId[order.id] ?? [];
                const servicesRequested = getServicesRequested(order);

                return (
                  <VisitCard
                    key={order.id}
                    order={order}
                    logs={logs}
                    orderPhotos={orderPhotos}
                    servicesRequested={servicesRequested}
                    copiedId={copiedId}
                    onCopyShare={handleCopyShare}
                  />
                );
              })}

              {/* Orphan logs (not tied to an order) */}
              {orphanLogs.map((log) => (
                <div key={log.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        Service Visit
                      </p>
                      <p className="text-sm font-semibold mt-0.5">
                        {new Date(log.service_date).toLocaleDateString("en-US", {
                          weekday: "short", month: "short", day: "numeric", year: "numeric",
                        })}
                      </p>
                    </div>
                    {log.time_spent_minutes && (
                      <span className="text-xs text-muted-foreground">{log.time_spent_minutes} min</span>
                    )}
                  </div>
                  <LogSection log={log} copiedId={copiedId} onCopyShare={handleCopyShare} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Photo Gallery ──────────────────────────────────────────────── */}
        <TabsContent value="photos" className="space-y-4">
          {!photos?.length ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">No photos yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {[...photosByOrder.entries()].map(([orderId, orderPhotos]) => {
                const beforePhotos = orderPhotos.filter((p) =>
                  p.description?.toLowerCase().includes("before")
                );
                const afterPhotos = orderPhotos.filter((p) =>
                  p.description?.toLowerCase().includes("after")
                );
                const otherPhotos = orderPhotos.filter(
                  (p) =>
                    !p.description?.toLowerCase().includes("before") &&
                    !p.description?.toLowerCase().includes("after")
                );

                return (
                  <div key={orderId} className="space-y-3">
                    {orderId !== "unlinked" && (
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        Service Visit ·{" "}
                        {orderPhotos[0]?.taken_at
                          ? new Date(orderPhotos[0].taken_at).toLocaleDateString()
                          : ""}
                      </p>
                    )}

                    {beforePhotos.length > 0 && afterPhotos.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {beforePhotos.map((p) => (
                          <PhotoCard key={p.id} photo={p} label="Before" />
                        ))}
                        {afterPhotos.map((p) => (
                          <PhotoCard key={p.id} photo={p} label="After" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {(beforePhotos.length > 0
                          ? beforePhotos
                          : afterPhotos.length > 0
                          ? afterPhotos
                          : otherPhotos
                        ).map((p) => (
                          <PhotoCard
                            key={p.id}
                            photo={p}
                            label={
                              p.description?.toLowerCase().includes("before")
                                ? "Before"
                                : p.description?.toLowerCase().includes("after")
                                ? "After"
                                : undefined
                            }
                          />
                        ))}
                      </div>
                    )}

                    {(beforePhotos.length > 0 || afterPhotos.length > 0) &&
                      otherPhotos.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                          {otherPhotos.map((p) => (
                            <PhotoCard key={p.id} photo={p} />
                          ))}
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Orders ─────────────────────────────────────────────────────── */}
        <TabsContent value="orders" className="space-y-3">
          {!orders?.length ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">No orders for this monument.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="rounded-xl border border-border bg-card p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-mono text-muted-foreground">
                        #{o.id.slice(0, 8)}
                      </p>
                      <p className="text-sm">
                        {o.bundle_id && BUNDLE_LABELS[o.bundle_id]
                          ? BUNDLE_LABELS[o.bundle_id]
                          : OFFER_LABELS[o.offer] ?? o.offer}{" "}
                        · {new Date(o.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status] ?? ""}`}
                      >
                        {o.status.replace(/_/g, " ")}
                      </span>
                      <p className="font-display font-bold text-sm">
                        ${Number(o.total_price).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {o.scheduled_date && (
                    <p className="text-xs text-muted-foreground">
                      📅 Scheduled for{" "}
                      <span className="font-medium text-foreground">
                        {new Date(o.scheduled_date + "T00:00:00").toLocaleDateString(
                          "en-US",
                          { weekday: "short", month: "short", day: "numeric", year: "numeric" }
                        )}
                      </span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ── VisitCard ─────────────────────────────────────────────────────────────────

interface VisitCardProps {
  order: any;
  logs: any[];
  orderPhotos: any[];
  servicesRequested: string[];
  copiedId: string | null;
  onCopyShare: (log: any) => void;
}

function VisitCard({
  order,
  logs,
  orderPhotos,
  servicesRequested,
  copiedId,
  onCopyShare,
}: VisitCardProps) {
  const [expanded, setExpanded] = useState(true);

  const hasLog = logs.length > 0;
  const hasPhotos = orderPhotos.length > 0;

  const beforePhotos = orderPhotos.filter((p) =>
    p.description?.toLowerCase().includes("before")
  );
  const afterPhotos = orderPhotos.filter((p) =>
    p.description?.toLowerCase().includes("after")
  );
  const otherPhotos = orderPhotos.filter(
    (p) =>
      !p.description?.toLowerCase().includes("before") &&
      !p.description?.toLowerCase().includes("after")
  );

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-secondary/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">
              {order.bundle_id && BUNDLE_LABELS[order.bundle_id]
                ? BUNDLE_LABELS[order.bundle_id]
                : OFFER_LABELS[order.offer] ?? order.offer}
            </p>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] ?? ""}`}
            >
              {order.status.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {order.scheduled_date
              ? `Scheduled ${new Date(order.scheduled_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
              : `Ordered ${new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
            {hasLog && " · Completed"}
            {hasPhotos && ` · ${orderPhotos.length} photo${orderPhotos.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <p className="font-display font-bold text-sm">${Number(order.total_price).toFixed(2)}</p>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border divide-y divide-border/60">
          {/* Services Requested */}
          {servicesRequested.length > 0 && (
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-semibold">Services Requested</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {servicesRequested.map((s, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Technician logs */}
          {logs.map((log) => (
            <LogSection
              key={log.id}
              log={log}
              copiedId={copiedId}
              onCopyShare={onCopyShare}
            />
          ))}

          {/* Before / After photos */}
          {hasPhotos && (
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-semibold">Photos</p>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {orderPhotos.length} photo{orderPhotos.length !== 1 ? "s" : ""}
                </span>
              </div>

              {beforePhotos.length > 0 && afterPhotos.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {beforePhotos.map((p) => (
                    <PhotoCard key={p.id} photo={p} label="Before" compact />
                  ))}
                  {afterPhotos.map((p) => (
                    <PhotoCard key={p.id} photo={p} label="After" compact />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {orderPhotos.map((p) => (
                    <PhotoCard
                      key={p.id}
                      photo={p}
                      label={
                        p.description?.toLowerCase().includes("before")
                          ? "Before"
                          : p.description?.toLowerCase().includes("after")
                          ? "After"
                          : undefined
                      }
                      compact
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* No technician activity yet */}
          {!hasLog && order.status !== "completed" && order.status !== "cancelled" && (
            <div className="px-4 py-3">
              <p className="text-xs text-muted-foreground italic">
                Service hasn't been performed yet — we'll update this when your visit is complete.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── LogSection ────────────────────────────────────────────────────────────────

interface LogSectionProps {
  log: any;
  copiedId: string | null;
  onCopyShare: (log: any) => void;
}

function LogSection({ log, copiedId, onCopyShare }: LogSectionProps) {
  return (
    <div className="px-4 py-3 space-y-3">
      {/* Technician header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Wrench className="w-3.5 h-3.5 text-primary" />
          <p className="text-xs font-semibold">Technician Performed</p>
          {log.time_spent_minutes && (
            <span className="text-[10px] text-muted-foreground ml-1">
              {log.time_spent_minutes} min
            </span>
          )}
        </div>
        {log.share_token && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] gap-1 px-2"
            onClick={() => onCopyShare(log)}
          >
            {copiedId === log.id ? (
              <Check className="w-3 h-3" />
            ) : (
              <Share2 className="w-3 h-3" />
            )}
            {copiedId === log.id ? "Copied" : "Share"}
          </Button>
        )}
      </div>

      {/* Services performed */}
      {(log.services_performed as string[])?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(log.services_performed as string[]).map((s: string) => (
            <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Date */}
      <p className="text-[10px] text-muted-foreground">
        Completed{" "}
        {new Date(log.service_date).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>

      {/* Public notes */}
      {log.public_notes && (
        <div className="flex items-start gap-1.5 pt-0.5">
          <MessageSquare className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground italic leading-relaxed">
            "{log.public_notes}"
          </p>
        </div>
      )}
    </div>
  );
}

// ── PhotoCard ─────────────────────────────────────────────────────────────────

function PhotoCard({
  photo,
  label,
  compact = false,
}: {
  photo: any;
  label?: string;
  compact?: boolean;
}) {
  const handleDownload = async () => {
    try {
      const response = await fetch(photo.photo_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `monument-${label?.toLowerCase() ?? "photo"}-${photo.id.slice(0, 8)}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(photo.photo_url, "_blank");
    }
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card group relative">
      {label && (
        <div
          className={`absolute top-2 left-2 z-10 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
            label === "Before"
              ? "bg-accent/90 text-accent-foreground"
              : "bg-primary/90 text-primary-foreground"
          }`}
        >
          {label}
        </div>
      )}
      <button
        onClick={handleDownload}
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-card/80 rounded-full p-1.5"
        title="Download"
      >
        <Download className="w-3 h-3" />
      </button>
      <img
        src={photo.photo_url}
        alt={photo.description || "Monument photo"}
        className="w-full aspect-square object-cover"
        loading="lazy"
      />
      {!compact && (
        <div className="p-2 space-y-0.5">
          {photo.description && (
            <p className="text-xs font-medium">{photo.description}</p>
          )}
          <p className="text-[10px] text-muted-foreground">
            {photo.taken_at
              ? new Date(photo.taken_at).toLocaleDateString()
              : new Date(photo.created_at).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}

export default GraveDetail;

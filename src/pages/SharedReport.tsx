import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Clock, Download, Wrench } from "lucide-react";
import { MONUMENT_PRICES } from "@/lib/pricing";
import type { MonumentType } from "@/lib/pricing";

const SharedReport = () => {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["shared-report", token],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("shared-report", {
        body: { token },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data as {
        report: {
          service_date: string;
          services_performed: string[];
          public_notes: string | null;
          time_spent_minutes: number | null;
        };
        monument: {
          cemetery_name: string;
          monument_type: string;
          material: string;
          section: string | null;
          lot_number: string | null;
        } | null;
        photos: Array<{
          id: string;
          photo_url: string;
          description: string | null;
          taken_at: string | null;
          created_at: string;
        }>;
      };
    },
    enabled: !!token,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-3 max-w-sm">
          <h1 className="font-display text-2xl font-bold">Report Not Found</h1>
          <p className="text-sm text-muted-foreground">
            This service report link may have expired or is invalid.
          </p>
        </div>
      </div>
    );
  }

  const { report, monument, photos } = data;
  const monumentLabel = monument
    ? MONUMENT_PRICES[monument.monument_type as MonumentType]?.label ?? monument.monument_type.replace(/_/g, " ")
    : "";

  const beforePhotos = photos.filter((p) => p.description?.toLowerCase().includes("before"));
  const afterPhotos = photos.filter((p) => p.description?.toLowerCase().includes("after"));
  const otherPhotos = photos.filter(
    (p) => !p.description?.toLowerCase().includes("before") && !p.description?.toLowerCase().includes("after")
  );

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="font-display text-2xl font-bold text-gradient-patina">
            Service Report
          </h1>
          <p className="text-xs text-muted-foreground">
            Grave Detail Cleaning & Restoration
          </p>
        </div>

        {/* Monument Info */}
        {monument && (
          <section className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <h2 className="font-display text-lg font-bold">{monument.cemetery_name}</h2>
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
          </section>
        )}

        {/* Service Details */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" />
            <h2 className="font-display text-lg font-bold">Service Details</h2>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <p>
              {new Date(report.service_date).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            {report.time_spent_minutes && (
              <span className="text-xs text-muted-foreground">· {report.time_spent_minutes} min</span>
            )}
          </div>
          {report.services_performed?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {report.services_performed.map((s) => (
                <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                  {s}
                </span>
              ))}
            </div>
          )}
          {report.public_notes && (
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1 font-medium">Technician Notes</p>
              <p className="text-sm">{report.public_notes}</p>
            </div>
          )}
        </section>

        {/* Photos */}
        {photos.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="font-display text-lg font-bold">Photos</h2>

            {beforePhotos.length > 0 && afterPhotos.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {beforePhotos.map((p) => (
                  <ReportPhotoCard key={p.id} photo={p} label="Before" />
                ))}
                {afterPhotos.map((p) => (
                  <ReportPhotoCard key={p.id} photo={p} label="After" />
                ))}
              </div>
            )}

            {(beforePhotos.length === 0 || afterPhotos.length === 0) && (
              <div className="grid grid-cols-2 gap-3">
                {[...beforePhotos, ...afterPhotos, ...otherPhotos].map((p) => (
                  <ReportPhotoCard key={p.id} photo={p} />
                ))}
              </div>
            )}

            {beforePhotos.length > 0 && afterPhotos.length > 0 && otherPhotos.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {otherPhotos.map((p) => (
                  <ReportPhotoCard key={p.id} photo={p} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Footer */}
        <div className="text-center pt-4 space-y-1">
          <p className="text-xs text-muted-foreground italic">"Time takes a toll. We take it back."</p>
          <p className="text-[10px] text-muted-foreground">Grave Detail Cleaning & Restoration</p>
        </div>
      </div>
    </div>
  );
};

function ReportPhotoCard({ photo, label }: { photo: any; label?: string }) {
  const handleDownload = async () => {
    try {
      const response = await fetch(photo.photo_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${label?.toLowerCase() ?? "photo"}-${photo.id.slice(0, 8)}.jpg`;
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
            label === "Before" ? "bg-accent/90 text-accent-foreground" : "bg-primary/90 text-primary-foreground"
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
        alt={photo.description || "Service photo"}
        className="w-full aspect-square object-cover"
        loading="lazy"
      />
      {photo.description && (
        <div className="p-2">
          <p className="text-xs font-medium">{photo.description}</p>
        </div>
      )}
    </div>
  );
}

export default SharedReport;

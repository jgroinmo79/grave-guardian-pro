import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const BENTON_MO: [number, number] = [37.0978, -89.5625];

const ZONES = [
  { radius: 25, label: "Zone 1: 0–25 mi", fee: "No charge", color: "#4ade80" },
  { radius: 50, label: "Zone 2: 26–50 mi", fee: "$35", color: "#C9976B" },
  { radius: 75, label: "Zone 3: 51–75 mi", fee: "$70", color: "#facc15" },
  { radius: 100, label: "Zone 4: 76–100 mi", fee: "$105", color: "#fb923c" },
  { radius: 125, label: "Zone 5: 101–125 mi", fee: "$140", color: "#f87171" },
  { radius: 160, label: "Zone 6: 126+ mi", fee: "$0.70/mi RT", color: "#a78bfa" },
];

const milesToMeters = (miles: number) => miles * 1609.34;

const TravelZones = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: BENTON_MO,
      zoom: 7,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Draw zones from largest to smallest so inner zones render on top
    [...ZONES].reverse().forEach((zone) => {
      const circle = L.circle(BENTON_MO, {
        radius: milesToMeters(zone.radius),
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: 0.12,
        weight: 2,
      }).addTo(map);

      circle.bindTooltip(`${zone.label}<br/>${zone.fee}`, {
        sticky: true,
        className: "zone-tooltip",
      });
    });

    // Benton marker
    L.circleMarker(BENTON_MO, {
      radius: 7,
      color: "#C9976B",
      fillColor: "#C9976B",
      fillOpacity: 1,
      weight: 2,
    })
      .addTo(map)
      .bindTooltip("Benton, MO (Home Base)", { permanent: true, direction: "top", offset: [0, -10] });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold font-serif text-foreground">Travel Zones</h1>
      <p className="text-sm text-muted-foreground">
        Concentric zones from Benton, MO. Hover a zone for fee details.
      </p>

      <div className="rounded-lg overflow-hidden border border-border" style={{ height: "70vh" }}>
        <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {ZONES.map((z) => (
          <div key={z.label} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className="inline-block w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: z.color }}
            />
            <span>
              {z.label} — {z.fee}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TravelZones;

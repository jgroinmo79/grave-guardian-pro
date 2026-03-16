import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue with bundlers
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const BENTON_MO: [number, number] = [37.0978, -89.5625];

interface Props {
  lat: number | null;
  lng: number | null;
  onMapClick: (lat: number, lng: number) => void;
  satellite?: boolean;
}

const CemeteryMap = ({ lat, lng, onMapClick, satellite = false }: Props) => {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: lat && lng ? [lat, lng] : BENTON_MO,
      zoom: lat && lng ? 16 : 8,
      scrollWheelZoom: true,
    });

    if (satellite) {
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles &copy; Esri",
          maxZoom: 19,
        }
      ).addTo(map);
      // Add labels overlay on satellite
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19 }
      ).addTo(map);
    } else {
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
    }

    // Add initial marker if we have coords
    if (lat && lng) {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current.on("dragend", () => {
        const pos = markerRef.current!.getLatLng();
        onMapClick(pos.lat, pos.lng);
      });
    }

    // Click to drop/move pin
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;

      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        markerRef.current = L.marker([clickLat, clickLng], { draggable: true }).addTo(map);
        markerRef.current.on("dragend", () => {
          const pos = markerRef.current!.getLatLng();
          onMapClick(pos.lat, pos.lng);
        });
      }

      onMapClick(clickLat, clickLng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker when lat/lng changes from outside (autocomplete)
  useEffect(() => {
    if (!mapRef.current) return;
    if (lat && lng) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
        markerRef.current.on("dragend", () => {
          const pos = markerRef.current!.getLatLng();
          onMapClick(pos.lat, pos.lng);
        });
      }
      mapRef.current.setView([lat, lng], 16);
    }
  }, [lat, lng, onMapClick]);

  return (
    <div
      ref={containerRef}
      style={{ height: 300, width: "100%" }}
      className="z-0"
    />
  );
};

export default CemeteryMap;

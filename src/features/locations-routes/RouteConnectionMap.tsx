import { MapPinned, Navigation, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import type { RouteRecord } from "@/shared/api/modules/locationsRoutes";
import { cn } from "@/shared/lib/cn";

type MapPoint = {
  lat: number;
  lng: number;
};

function parsePoint(location: RouteRecord["originLocation"]): MapPoint | null {
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function locationLabel(location: { city: string; countryCode: string }) {
  return `${location.city}, ${location.countryCode}`;
}

function fittedPoint(point: MapPoint, origin: MapPoint, destination: MapPoint) {
  const minLat = Math.min(origin.lat, destination.lat);
  const maxLat = Math.max(origin.lat, destination.lat);
  const minLng = Math.min(origin.lng, destination.lng);
  const maxLng = Math.max(origin.lng, destination.lng);
  const latRange = Math.max(maxLat - minLat, 0.01);
  const lngRange = Math.max(maxLng - minLng, 0.01);
  const padding = 14;

  return {
    x: padding + ((point.lng - minLng) / lngRange) * (100 - padding * 2),
    y: padding + ((maxLat - point.lat) / latRange) * (100 - padding * 2),
  };
}

export function RouteConnectionMap({ className, route }: { className?: string; route?: RouteRecord | null }) {
  const [zoom, setZoom] = useState(1);
  const origin = route ? parsePoint(route.originLocation) : null;
  const destination = route ? parsePoint(route.destinationLocation) : null;
  const shellClassName = "relative h-[clamp(220px,36vh,420px)] min-h-0 overflow-hidden rounded-lg border border-border bg-surface-pearl shadow-sm";

  if (!route) {
    return (
      <div className={cn("grid h-[clamp(200px,32vh,360px)] min-h-0 place-items-center rounded-lg border border-dashed border-border bg-surface-pearl p-5 text-center", className)}>
        <div>
          <div className="mx-auto grid size-11 place-items-center rounded-lg bg-card shadow-sm">
            <MapPinned className="size-5 text-primary" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Route map unavailable</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted">Add coordinates to both locations to preview a real map with the connected route lane.</p>
        </div>
      </div>
    );
  }

  if (!origin || !destination) {
    return (
      <div className={cn(shellClassName, "p-5", className)}>
        <div className="absolute inset-x-10 top-1/2 h-px -translate-y-1/2 bg-border" />
        <div className="absolute left-10 right-10 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary/20">
          <div className="h-full w-full animate-pulse rounded-full bg-primary/45" />
        </div>
        <div className="relative flex h-full items-center justify-between gap-5">
          <div className="max-w-[42%] rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-muted">Origin</p>
            <p className="mt-1 text-lg font-semibold">{locationLabel(route.originLocation)}</p>
          </div>
          <div className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <Navigation className="size-5" aria-hidden="true" />
          </div>
          <div className="max-w-[42%] rounded-xl border border-border bg-card p-4 text-right shadow-sm">
            <p className="text-xs font-semibold uppercase text-muted">Destination</p>
            <p className="mt-1 text-lg font-semibold">{locationLabel(route.destinationLocation)}</p>
          </div>
        </div>
        <div className="absolute bottom-3 right-3 rounded-md bg-card/90 px-2 py-1 text-[11px] font-medium text-muted shadow-sm">
          Add location coordinates for live OpenStreetMap tiles
        </div>
      </div>
    );
  }

  const originPixel = fittedPoint(origin, origin, destination);
  const destinationPixel = fittedPoint(destination, origin, destination);
  const controlX = (originPixel.x + destinationPixel.x) / 2;
  const controlY = Math.max(8, Math.min(originPixel.y, destinationPixel.y) - 14);
  const zoomLabel = `${Math.round(zoom * 100)}%`;

  return (
    <div className={cn(shellClassName, className)}>
      <div className="absolute inset-0 origin-center transition-transform duration-200" style={{ transform: `scale(${zoom})` }}>
        <div className="absolute inset-0 opacity-80">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.22)_1px,transparent_1px)] bg-[size:42px_42px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(9,105,218,0.10),transparent_30%),radial-gradient(circle_at_80%_60%,rgba(16,185,129,0.08),transparent_26%)]" />
        </div>
        <div className="absolute inset-x-4 bottom-8 top-16">
          <svg aria-hidden="true" className="size-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path
              d={`M ${originPixel.x} ${originPixel.y} Q ${controlX} ${controlY} ${destinationPixel.x} ${destinationPixel.y}`}
              fill="none"
              stroke="rgba(9, 105, 218, 0.22)"
              strokeLinecap="round"
              strokeWidth="5"
            />
            <path
              d={`M ${originPixel.x} ${originPixel.y} Q ${controlX} ${controlY} ${destinationPixel.x} ${destinationPixel.y}`}
              fill="none"
              stroke="#0969da"
              strokeDasharray="3 2.5"
              strokeLinecap="round"
              strokeWidth="1.6"
            >
              <animate attributeName="stroke-dashoffset" dur="1.2s" from="26" repeatCount="indefinite" to="0" />
            </path>
            <circle cx={originPixel.x} cy={originPixel.y} fill="#ffffff" r="3.2" stroke="#0969da" strokeWidth="1.2" />
            <circle cx={destinationPixel.x} cy={destinationPixel.y} fill="#0969da" r="3.2" stroke="#ffffff" strokeWidth="1.2" />
          </svg>
        </div>
      </div>

      <div className="absolute inset-x-4 top-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/95 px-3 py-2.5 shadow-sm backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase text-muted">Selected lane</p>
          <h3 className="mt-1 text-base font-semibold">{locationLabel(route.originLocation)} to {locationLabel(route.destinationLocation)}</h3>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg bg-surface-pearl px-3 py-2 text-xs font-semibold text-muted">
          <Navigation className="size-4 text-primary" />
          Truck route preview
        </div>
      </div>

      <div className="absolute bottom-3 right-3 rounded-md bg-card/90 px-2 py-1 text-[11px] font-medium text-muted shadow-sm">
        Fitted coordinate preview, not live road geometry
      </div>

      <div className="absolute bottom-3 left-3 inline-flex items-center rounded-lg border border-border bg-card/95 p-1 text-xs font-semibold text-muted shadow-sm">
        <button
          aria-label="Zoom route map out"
          className="grid size-7 place-items-center rounded-md transition hover:bg-surface-pearl disabled:opacity-40"
          disabled={zoom <= 1}
          onClick={() => setZoom((current) => Math.max(1, Number((current - 0.25).toFixed(2))))}
          type="button"
        >
          <ZoomOut className="size-4" aria-hidden="true" />
        </button>
        <span className="min-w-12 text-center">{zoomLabel}</span>
        <button
          aria-label="Zoom route map in"
          className="grid size-7 place-items-center rounded-md transition hover:bg-surface-pearl disabled:opacity-40"
          disabled={zoom >= 2.5}
          onClick={() => setZoom((current) => Math.min(2.5, Number((current + 0.25).toFixed(2))))}
          type="button"
        >
          <ZoomIn className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

import { MapPinned, Navigation } from "lucide-react";
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

function lonLatToWorld(point: MapPoint, zoom: number) {
  const latitude = Math.max(Math.min(point.lat, 85.05112878), -85.05112878);
  const latRad = latitude * Math.PI / 180;
  const scale = 2 ** zoom;
  return {
    x: (point.lng + 180) / 360 * scale,
    y: (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * scale,
  };
}

function pickZoom(origin: MapPoint, destination: MapPoint) {
  const delta = Math.max(Math.abs(origin.lat - destination.lat), Math.abs(origin.lng - destination.lng));
  if (delta > 18) return 4;
  if (delta > 8) return 5;
  if (delta > 3) return 6;
  if (delta > 1.2) return 7;
  return 8;
}

function projectedPoint(point: MapPoint, baseTileX: number, baseTileY: number, zoom: number) {
  const world = lonLatToWorld(point, zoom);
  return {
    x: (world.x - baseTileX) * 256,
    y: (world.y - baseTileY) * 256,
  };
}

export function RouteConnectionMap({ className, route }: { className?: string; route?: RouteRecord | null }) {
  const origin = route ? parsePoint(route.originLocation) : null;
  const destination = route ? parsePoint(route.destinationLocation) : null;

  if (!route) {
    return (
      <div className={cn("grid min-h-[280px] place-items-center rounded-xl border border-dashed border-border bg-surface-pearl p-6 text-center", className)}>
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
      <div className={cn("relative min-h-[280px] overflow-hidden rounded-xl border border-border bg-surface-pearl p-5", className)}>
        <div className="absolute inset-x-10 top-1/2 h-px -translate-y-1/2 bg-border" />
        <div className="absolute left-10 right-10 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary/20">
          <div className="h-full w-full animate-pulse rounded-full bg-primary/45" />
        </div>
        <div className="relative flex h-full min-h-[240px] items-center justify-between gap-5">
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

  const zoom = pickZoom(origin, destination);
  const center = { lat: (origin.lat + destination.lat) / 2, lng: (origin.lng + destination.lng) / 2 };
  const centerWorld = lonLatToWorld(center, zoom);
  const baseTileX = Math.floor(centerWorld.x) - 1;
  const baseTileY = Math.floor(centerWorld.y) - 1;
  const originPixel = projectedPoint(origin, baseTileX, baseTileY, zoom);
  const destinationPixel = projectedPoint(destination, baseTileX, baseTileY, zoom);
  const controlX = (originPixel.x + destinationPixel.x) / 2;
  const controlY = Math.min(originPixel.y, destinationPixel.y) - 52;
  const tiles = Array.from({ length: 9 }, (_, index) => {
    const dx = index % 3;
    const dy = Math.floor(index / 3);
    const x = baseTileX + dx;
    const y = baseTileY + dy;
    return { dx, dy, key: `${x}-${y}-${zoom}`, x, y };
  });

  return (
    <div className={cn("relative min-h-[320px] overflow-hidden rounded-xl border border-border bg-surface-pearl shadow-sm", className)}>
      <div className="absolute left-1/2 top-1/2 h-[768px] w-[768px] -translate-x-1/2 -translate-y-1/2">
        {tiles.map((tile) => (
          <img
            alt=""
            className="absolute size-64 select-none"
            draggable={false}
            key={tile.key}
            src={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`}
            style={{ left: tile.dx * 256, top: tile.dy * 256 }}
          />
        ))}
        <svg aria-hidden="true" className="absolute inset-0" viewBox="0 0 768 768">
          <path
            d={`M ${originPixel.x} ${originPixel.y} Q ${controlX} ${controlY} ${destinationPixel.x} ${destinationPixel.y}`}
            fill="none"
            stroke="rgba(9, 105, 218, 0.22)"
            strokeLinecap="round"
            strokeWidth="18"
          />
          <path
            d={`M ${originPixel.x} ${originPixel.y} Q ${controlX} ${controlY} ${destinationPixel.x} ${destinationPixel.y}`}
            fill="none"
            stroke="#0969da"
            strokeDasharray="14 12"
            strokeLinecap="round"
            strokeWidth="5"
          >
            <animate attributeName="stroke-dashoffset" dur="1.2s" from="26" repeatCount="indefinite" to="0" />
          </path>
          <circle cx={originPixel.x} cy={originPixel.y} fill="#ffffff" r="14" stroke="#0969da" strokeWidth="5" />
          <circle cx={destinationPixel.x} cy={destinationPixel.y} fill="#0969da" r="14" stroke="#ffffff" strokeWidth="5" />
        </svg>
      </div>

      <div className="absolute inset-x-4 top-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/95 px-4 py-3 shadow-sm backdrop-blur">
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
        Map data OpenStreetMap
      </div>
    </div>
  );
}

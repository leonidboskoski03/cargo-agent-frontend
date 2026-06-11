import type { VehicleMarketplaceListing } from "@/shared/api/modules/vehicleMarketplace";

export type MarketplaceImage = {
  name?: string;
  url: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseMarketplaceImages(value: unknown): MarketplaceImage[] {
  if (!value) return [];
  if (typeof value === "string") return value.trim() ? [{ url: value }] : [];
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim() ? { url: item } : null;
      if (isRecord(item) && typeof item.url === "string" && item.url.trim()) {
        return { name: typeof item.name === "string" ? item.name : undefined, url: item.url };
      }
      return null;
    })
    .filter((item): item is MarketplaceImage => Boolean(item));
}

export function listingImages(listing?: VehicleMarketplaceListing | null) {
  return parseMarketplaceImages(listing?.imageUrlsJson);
}

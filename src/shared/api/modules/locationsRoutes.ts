import { apiClient, unwrapData } from "@/shared/api/apiClient";

export type Location = {
  city: string;
  companyId?: string | null;
  countryCode: string;
  createdAt: string;
  deletedAt: string | null;
  id: string;
  lat?: string | null;
  lng?: string | null;
  postalCode?: string | null;
  region?: string | null;
  updatedAt: string;
};

export type RouteRecord = {
  createdAt: string;
  deletedAt: string | null;
  destinationLocation: Pick<Location, "city" | "countryCode" | "deletedAt" | "id" | "lat" | "lng">;
  destinationLocationId: string;
  distanceKm?: number | null;
  estimatedDurationMinutes?: number | null;
  id: string;
  isActive: boolean;
  originLocation: Pick<Location, "city" | "countryCode" | "deletedAt" | "id" | "lat" | "lng">;
  originLocationId: string;
  updatedAt: string;
};

export type RouteEstimate = {
  distanceKm: number;
  estimatedDurationMinutes: number;
  profile: string;
  provider: string;
};

export type CreateLocationInput = {
  city: string;
  countryCode: string;
  lat?: number | string;
  lng?: number | string;
  postalCode?: string;
  region?: string;
};

export type CreateRouteInput = {
  destinationLocationId: string;
  distanceKm?: number;
  estimatedDurationMinutes?: number;
  originLocationId: string;
};

export type LocationListParams = {
  city?: string;
  countryCode?: string;
  deleted?: "active" | "only" | "include";
};

export function listLocations(params?: LocationListParams) {
  return unwrapData<Location[]>(apiClient.get("/locations", { params }));
}

export function createLocation(input: CreateLocationInput) {
  return unwrapData<Location>(apiClient.post("/locations", input));
}

export function updateLocation(locationId: string, input: Partial<CreateLocationInput>) {
  return unwrapData<Location>(apiClient.patch(`/locations/${locationId}`, input));
}

export function deleteLocation(locationId: string) {
  return unwrapData<Location>(apiClient.delete(`/locations/${locationId}`));
}

export function restoreLocation(locationId: string) {
  return unwrapData<Location>(apiClient.post(`/locations/${locationId}/restore`, {}));
}

export type RouteListParams = {
  deleted?: "active" | "only" | "include";
  destinationLocationId?: string;
  originLocationId?: string;
};

export function listRoutes(params?: RouteListParams) {
  return unwrapData<RouteRecord[]>(apiClient.get("/routes", { params }));
}

export function createRoute(input: CreateRouteInput) {
  return unwrapData<RouteRecord>(apiClient.post("/routes", input));
}

export function updateRoute(routeId: string, input: Partial<CreateRouteInput>) {
  return unwrapData<RouteRecord>(apiClient.patch(`/routes/${routeId}`, input));
}

export function deleteRoute(routeId: string) {
  return unwrapData<RouteRecord>(apiClient.delete(`/routes/${routeId}`));
}

export function restoreRoute(routeId: string) {
  return unwrapData<RouteRecord>(apiClient.post(`/routes/${routeId}/restore`, {}));
}

export function estimateRoute(input: { destinationLocationId: string; originLocationId: string; vehicleProfile?: "TRUCK" }) {
  return unwrapData<RouteEstimate>(apiClient.post("/routes/estimate", input));
}

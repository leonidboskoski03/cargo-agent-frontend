import { apiClient, unwrapData } from "@/shared/api/apiClient";

export type SupportedCountry = {
  code: string;
  name: string;
  nativeName?: string | null;
};

export type SupportedCity = {
  countryCode: string;
  id: string;
  lat?: string | null;
  lng?: string | null;
  name: string;
  region?: string | null;
};

export function listSupportedCountries() {
  return unwrapData<SupportedCountry[]>(apiClient.get("/geo/countries"));
}

export function listSupportedCities(params?: { countryCode?: string; pageSize?: number; q?: string }) {
  return unwrapData<SupportedCity[]>(apiClient.get("/geo/cities", { params }));
}

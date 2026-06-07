import { z } from "zod";
import { countryCodeSchema, optionalNumberSchema, optionalStringSchema } from "@/shared/lib/forms";

export const locationSchema = z.object({
  city: z.string().trim().min(1, "City is required.").max(120),
  countryCode: countryCodeSchema,
  lat: optionalStringSchema,
  lng: optionalStringSchema,
  postalCode: optionalStringSchema.pipe(z.string().min(1).max(40).optional()),
  region: optionalStringSchema.pipe(z.string().min(1).max(120).optional()),
});

export const routeSchema = z
  .object({
    destinationLocationId: z.string().min(1, "Destination is required."),
    distanceKm: optionalNumberSchema,
    estimatedDurationMinutes: optionalNumberSchema,
    originLocationId: z.string().min(1, "Origin is required."),
  })
  .refine((body) => body.originLocationId !== body.destinationLocationId, {
    message: "Origin and destination must be different.",
    path: ["destinationLocationId"],
  });

export const inlineRouteSchema = z
  .object({
    destinationCity: z.string().trim().min(1, "Destination city is required.").max(120),
    destinationCountryCode: countryCodeSchema,
    distanceKm: optionalNumberSchema,
    estimatedDurationMinutes: optionalNumberSchema,
    originCity: z.string().trim().min(1, "Origin city is required.").max(120),
    originCountryCode: countryCodeSchema,
  })
  .refine(
    (body) =>
      `${body.originCity.trim().toLowerCase()}-${body.originCountryCode.toUpperCase()}` !==
      `${body.destinationCity.trim().toLowerCase()}-${body.destinationCountryCode.toUpperCase()}`,
    {
      message: "Origin and destination must be different.",
      path: ["destinationCity"],
    },
  );

export type LocationFormInput = z.input<typeof locationSchema>;
export type LocationFormValues = z.output<typeof locationSchema>;
export type InlineRouteFormInput = z.input<typeof inlineRouteSchema>;
export type InlineRouteFormValues = z.output<typeof inlineRouteSchema>;
export type RouteFormInput = z.input<typeof routeSchema>;
export type RouteFormValues = z.output<typeof routeSchema>;

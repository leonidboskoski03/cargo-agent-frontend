import { z } from "zod";

export const cuidSchema = z.string().min(8);
export const currencySchema = z.string().trim().length(3).transform((value) => value.toUpperCase());
export const countryCodeSchema = z.string().trim().length(2).transform((value) => value.toUpperCase());

export const optionalNumberSchema = z
  .union([z.literal(""), z.string().trim().regex(/^\d+$/, "Enter a positive whole number.").transform(Number)])
  .transform((value) => (value === "" ? undefined : value))
  .optional();

export const optionalStringSchema = z
  .string()
  .trim()
  .transform((value) => (value ? value : undefined))
  .optional();

import axios from "axios";
import { env } from "@/shared/config/env";

export type ApiEnvelope<T> = {
  success: true;
  data: T;
};

export type ApiErrorEnvelope = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    traceId?: string;
  };
};

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

export class ApiClientError extends Error {
  code: string;
  details?: unknown;
  status?: number;
  traceId?: string;

  constructor(input: { code: string; message: string; details?: unknown; status?: number; traceId?: string }) {
    super(input.message);
    this.name = "ApiClientError";
    this.code = input.code;
    this.details = input.details;
    this.status = input.status;
    this.traceId = input.traceId;
  }
}

export function toApiClientError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) return error;
  if (axios.isAxiosError<ApiErrorEnvelope>(error)) {
    const envelope = error.response?.data;
    return new ApiClientError({
      code: envelope?.error.code ?? "NETWORK_ERROR",
      details: envelope?.error.details,
      message: envelope?.error.message ?? error.message,
      status: error.response?.status,
      traceId: envelope?.meta?.traceId,
    });
  }

  return new ApiClientError({
    code: "UNKNOWN_ERROR",
    message: error instanceof Error ? error.message : "Unexpected error",
  });
}

export async function unwrapData<T>(request: Promise<{ data: ApiEnvelope<T> }>) {
  try {
    const response = await request;
    return response.data.data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

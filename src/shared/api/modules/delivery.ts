import { apiClient, unwrapData } from "@/shared/api/apiClient";

export type DeliveryStatus = {
  email: {
    configured: boolean;
    missing: string[];
    mode: "provider" | "simulated";
    provider: "resend" | "simulated";
  };
  invites: {
    acceptUrlBase: string;
    configured: boolean;
    provider: "resend" | "simulated";
  };
  otp: {
    configured: boolean;
    previewEnabled: boolean;
    provider: string;
  };
  storage: {
    allowedMimeTypes: string[];
    configured: boolean;
    maxUploadBytes: number;
    missing: string[];
    provider: "local" | "s3";
  };
};

export function getDeliveryStatus() {
  return unwrapData<DeliveryStatus>(apiClient.get("/delivery/status"));
}

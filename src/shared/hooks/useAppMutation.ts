import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { toApiClientError, type ApiClientError } from "@/shared/api/apiClient";

type MutationMessages<TData> = {
  error?: string;
  success?: string | ((data: TData) => string);
};

function profileSetupUrl(details: unknown) {
  if (details && typeof details === "object" && "onboardingUrl" in details) {
    const value = (details as { onboardingUrl?: unknown }).onboardingUrl;
    if (typeof value === "string" && value.startsWith("/")) return value;
  }
  return "/onboarding";
}

export function useAppMutation<TData, TVariables = void>(
  options: UseMutationOptions<TData, ApiClientError, TVariables> & { messages?: MutationMessages<TData> },
) {
  return useMutation({
    ...options,
    onError: (error, variables, context, mutationContext) => {
      const apiError = toApiClientError(error);
      const needsProfileSetup = apiError.code === "PROFILE_SETUP_REQUIRED";
      toast.error(options.messages?.error ?? apiError.message, {
        action: needsProfileSetup
          ? {
              label: "Open setup",
              onClick: () => {
                window.location.assign(profileSetupUrl(apiError.details));
              },
            }
          : undefined,
        description: needsProfileSetup ? "Finish the missing account fields, then retry this action." : apiError.traceId ? `Trace ID: ${apiError.traceId}` : apiError.code,
      });
      options.onError?.(apiError, variables, context, mutationContext);
    },
    onSuccess: (data, variables, context, mutationContext) => {
      const success = options.messages?.success;
      if (success) toast.success(typeof success === "function" ? success(data) : success);
      options.onSuccess?.(data, variables, context, mutationContext);
    },
  });
}

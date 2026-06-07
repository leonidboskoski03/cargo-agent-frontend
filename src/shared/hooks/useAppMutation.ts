import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { toApiClientError, type ApiClientError } from "@/shared/api/apiClient";

type MutationMessages<TData> = {
  error?: string;
  success?: string | ((data: TData) => string);
};

export function useAppMutation<TData, TVariables = void>(
  options: UseMutationOptions<TData, ApiClientError, TVariables> & { messages?: MutationMessages<TData> },
) {
  return useMutation({
    ...options,
    onError: (error, variables, context, mutationContext) => {
      const apiError = toApiClientError(error);
      toast.error(options.messages?.error ?? apiError.message, {
        description: apiError.traceId ? `Trace ID: ${apiError.traceId}` : apiError.code,
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

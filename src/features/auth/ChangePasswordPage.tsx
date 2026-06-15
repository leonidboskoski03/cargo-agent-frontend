import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, KeyRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { changePassword } from "@/shared/api/modules/auth";
import { Button } from "@/shared/components/ui/Button";
import { Field, Input } from "@/shared/components/ui/Form";
import { Surface } from "@/shared/components/ui/Page";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { changePasswordSchema, type ChangePasswordValues } from "./authSchemas";

export function ChangePasswordPage() {
  const [completed, setCompleted] = useState(false);
  const form = useForm<ChangePasswordValues>({
    defaultValues: { confirmPassword: "", currentPassword: "", newPassword: "" },
    resolver: zodResolver(changePasswordSchema),
  });

  const mutation = useAppMutation({
    messages: { success: "Password changed" },
    mutationFn: (values: ChangePasswordValues) => changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    }),
    onSuccess: () => {
      setCompleted(true);
      form.reset();
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase text-primary">Account security</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.28px] text-foreground">Change password</h1>
        <p className="mt-1 text-sm leading-6 text-muted">Update your signed-in account password without leaving the workspace.</p>
      </div>

      <Surface>
        {completed ? (
          <div>
            <div className="grid size-11 place-items-center rounded-lg bg-surface-pearl">
              <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold tracking-[-0.28px]">Password updated</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Use the new password the next time you sign in.</p>
            <Button className="mt-5" onClick={() => setCompleted(false)} type="button" variant="secondary">
              Change again
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <div className="grid size-11 place-items-center rounded-lg bg-surface-pearl">
              <KeyRound className="size-5 text-primary" aria-hidden="true" />
            </div>
            <Field error={form.formState.errors.currentPassword} label="Current password" required>
              <Input autoComplete="current-password" type="password" {...form.register("currentPassword")} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field error={form.formState.errors.newPassword} label="New password" required>
                <Input autoComplete="new-password" type="password" {...form.register("newPassword")} />
              </Field>
              <Field error={form.formState.errors.confirmPassword} label="Confirm password" required>
                <Input autoComplete="new-password" type="password" {...form.register("confirmPassword")} />
              </Field>
            </div>
            <Button disabled={mutation.isPending} type="submit">
              Change password
            </Button>
          </form>
        )}
      </Surface>
    </div>
  );
}

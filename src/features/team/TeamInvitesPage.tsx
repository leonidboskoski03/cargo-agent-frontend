import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MailPlus, RotateCcw, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { createCompanyInvite, listCompanyInvites, revokeCompanyInvite, type InviteStatus } from "@/shared/api/modules/companyInvites";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { Field, Input, Select } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { useAuthStore } from "@/features/auth/authStore";
import { canCreateInvite } from "./teamPermissions";
import { inviteSchema, type InviteFormInput, type InviteFormValues } from "./teamSchemas";

const statuses: Array<InviteStatus | "ALL"> = ["ALL", "PENDING", "ACCEPTED", "REVOKED", "EXPIRED"];

function inviteTone(status: InviteStatus): "neutral" | "success" | "warning" | "danger" {
  if (status === "ACCEPTED") return "success";
  if (status === "PENDING") return "warning";
  if (status === "REVOKED" || status === "EXPIRED") return "danger";
  return "neutral";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function TeamInvitesPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const requestedStatus = searchParams.get("status");
  const status = statuses.includes(requestedStatus as InviteStatus) && requestedStatus !== "ALL" ? requestedStatus as InviteStatus : null;
  const selectedStatus = status ?? "ALL";
  const canManageInvites = canCreateInvite(user?.role);
  const invitesQuery = useQuery({
    queryFn: () => listCompanyInvites(status ? { status } : undefined),
    queryKey: ["company-invites", status ?? "ALL"],
  });
  const invites = invitesQuery.data ?? [];
  const form = useForm<InviteFormInput, unknown, InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      invitedEmail: "",
      targetRole: "COMPANY_DRIVER",
    },
  });

  function updateStatus(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value === "ALL") next.delete("status");
    else next.set("status", value);
    setSearchParams(next);
  }

  const createMutation = useAppMutation({
    messages: { success: "Invite delivery started" },
    mutationFn: createCompanyInvite,
    onSuccess: () => {
      form.reset();
      void queryClient.invalidateQueries({ queryKey: ["company-invites"] });
    },
  });

  const revokeMutation = useAppMutation({
    messages: { success: "Invite revoked" },
    mutationFn: revokeCompanyInvite,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["company-invites"] }),
  });

  if (!canManageInvites) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Team invites" subtitle="Invite management is reserved for company admins." title="Invites" />
        <EmptyState description="Drivers do not create or revoke team invites." title="Admin access required" />
      </div>
    );
  }

  if (invitesQuery.isLoading) {
    return <LoadingState description="Loading company invite history and filters." title="Loading invites" />;
  }

  if (invitesQuery.error) {
    return <ErrorState description="The invite workspace could not be loaded." error={invitesQuery.error} title="Unable to load invites" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        action={<Link className="text-sm text-primary" to="/team">Back to Team</Link>}
        eyebrow="Team onboarding"
        subtitle="Create and revoke company invites while presenting delivery as real email, not local preview tokens."
        title="Invites"
      />

      <div className="grid gap-5 lg:grid-cols-[0.38fr_0.62fr]">
        <Surface>
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.28px]">Create invite</h2>
              <p className="mt-1 text-sm leading-6 text-muted">The user receives an invite through the configured delivery path.</p>
            </div>
            <Field error={form.formState.errors.invitedEmail} label="Email" required>
              <Input {...form.register("invitedEmail")} autoComplete="off" spellCheck={false} type="email" />
            </Field>
            <Field error={form.formState.errors.targetRole} label="Role" required>
              <Select {...form.register("targetRole")}>
                <option value="COMPANY_DRIVER">Company driver</option>
                <option value="COMPANY_ADMIN">Company admin</option>
              </Select>
            </Field>
            <Button disabled={createMutation.isPending} type="submit">
              <MailPlus aria-hidden="true" className="size-4" />
              Send Invite
            </Button>
          </form>
        </Surface>

        <Surface>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.28px]">Invite history</h2>
              <p className="mt-1 text-sm leading-6 text-muted">Filter state stays in the URL.</p>
            </div>
            <div className="w-full md:w-64">
              <Field label="Status filter">
                <Select onChange={(event) => updateStatus(event.target.value)} value={selectedStatus}>
                  {statuses.map((item) => (
                    <option key={item} value={item}>
                      {item === "ALL" ? "All invites" : item}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        </Surface>
      </div>

      {invites.length === 0 ? (
        <EmptyState
          action={selectedStatus !== "ALL" ? (
            <Button onClick={() => updateStatus("ALL")} type="button" variant="secondary">
              <RotateCcw aria-hidden="true" className="size-4" />
              Clear Filter
            </Button>
          ) : null}
          description="Invite records will appear after admins send company invitations."
          title="No invites found"
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Expires</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {invites.map((invite) => (
              <tr key={invite.id}>
                <Td>{invite.invitedEmail}</Td>
                <Td>{invite.targetRole}</Td>
                <Td><StatusBadge tone={inviteTone(invite.status)}>{invite.status}</StatusBadge></Td>
                <Td>{formatDate(invite.expiresAt)}</Td>
                <Td>
                  {invite.status === "PENDING" ? (
                    <Button
                      className="h-9 min-h-9 px-4"
                      disabled={revokeMutation.isPending}
                      onClick={() => revokeMutation.mutate(invite.id)}
                      type="button"
                      variant="danger"
                    >
                      <XCircle aria-hidden="true" className="size-4" />
                      Revoke
                    </Button>
                  ) : (
                    <span className="text-sm text-muted">No actions</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Send, Trash2, UserCog, Users } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { deleteUser, listUsers, restoreUser, updateUserMembership, type UserProfile } from "@/shared/api/modules/users";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { useAuthStore } from "@/features/auth/authStore";
import { canChangeMembership, canDeleteTeamUser, canManageTeam } from "./teamPermissions";

function userTone(user: UserProfile) {
  if (user.deletedAt) return "danger";
  if (user.isActive) return "success";
  return "neutral";
}

export function TeamPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const includeInactive = searchParams.get("includeInactive") === "true";
  const registryView = searchParams.get("deleted") === "only" ? "deleted" : "active";
  const isDeletedView = registryView === "deleted";
  const isAdmin = canManageTeam(user?.role);
  const usersQuery = useQuery({
    queryFn: () => listUsers({ deleted: isDeletedView ? "only" : "active", includeInactive: isDeletedView ? true : includeInactive }),
    queryKey: ["users", "team", registryView, includeInactive],
  });
  const users = usersQuery.data ?? [];

  function setRegistryView(value: "active" | "deleted") {
    const next = new URLSearchParams(searchParams);
    if (value === "deleted") {
      next.set("deleted", "only");
      next.delete("includeInactive");
    } else {
      next.delete("deleted");
    }
    setSearchParams(next);
  }

  function setIncludeInactive(value: boolean) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("includeInactive", "true");
    else next.delete("includeInactive");
    setSearchParams(next);
  }

  const membershipMutation = useAppMutation({
    messages: { success: "Team membership updated" },
    mutationFn: ({ role, target }: { role: "COMPANY_ADMIN" | "COMPANY_DRIVER"; target: UserProfile }) =>
      updateUserMembership(target.id, { companyId: target.companyId, role }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["users", "team"] }),
  });

  const restoreMutation = useAppMutation({
    messages: { success: "User restored" },
    mutationFn: restoreUser,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["users", "team"] }),
  });

  const deleteMutation = useAppMutation({
    mutationFn: deleteUser,
    onSuccess: (deletedUser) => {
      void queryClient.invalidateQueries({ queryKey: ["users", "team"] });
      toast.success("User deleted", {
        action: {
          label: "Undo",
          onClick: () => restoreMutation.mutate(deletedUser.id),
        },
      });
    },
  });

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Team"
          subtitle="Team management is reserved for company admins."
          title="Team workspace"
        />
        <EmptyState description="Drivers can work inside assigned marketplace and contract views without changing team membership." title="Admin access required" />
      </div>
    );
  }

  if (usersQuery.isLoading) {
    return <LoadingState description="Loading company users and membership controls." title="Loading team" />;
  }

  if (usersQuery.error) {
    return <ErrorState description="The team workspace could not be loaded." error={usersQuery.error} title="Unable to load team" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        action={
          <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground" to="/team/invites">
            <Send aria-hidden="true" className="size-4" />
            Manage Invites
          </Link>
        }
        eyebrow="Company admin"
        subtitle="Manage company users, role membership, inactive visibility, and deleted-user recovery from tenant-scoped views."
        title="Team"
      />

      <Surface>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-surface-pearl text-primary">
              <Users aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.28px]">Users</h2>
              <p className="mt-1 text-sm leading-6 text-muted">Self role changes are hidden before the backend rejects them.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-border bg-surface-pearl p-1" aria-label="Team registry view">
              <Button aria-pressed={!isDeletedView} className="min-h-8 px-3 py-1 text-sm" onClick={() => setRegistryView("active")} type="button" variant={!isDeletedView ? "secondary" : "ghost"}>
                Active
              </Button>
              <Button aria-pressed={isDeletedView} className="min-h-8 px-3 py-1 text-sm" onClick={() => setRegistryView("deleted")} type="button" variant={isDeletedView ? "secondary" : "ghost"}>
                Deleted
              </Button>
            </div>
            {!isDeletedView ? (
              <Button onClick={() => setIncludeInactive(!includeInactive)} type="button" variant="secondary">
                <RotateCcw aria-hidden="true" className="size-4" />
                {includeInactive ? "Hide Inactive" : "Show Inactive"}
              </Button>
            ) : null}
          </div>
        </div>
      </Surface>

      {users.length === 0 ? (
        <EmptyState
          description={isDeletedView ? "Deleted team users will appear here after an admin removes them from the active roster." : "No company users were returned for this workspace."}
          title={isDeletedView ? "No deleted users" : "No users found"}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>User</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Phone</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((target) => {
              const canEditMembership = canChangeMembership({ currentUserId: user?.id, role: user?.role, targetUserId: target.id });
              const canDelete = canDeleteTeamUser({ currentUserId: user?.id, role: user?.role, targetUserId: target.id });
              const canRestore = isDeletedView && Boolean(target.deletedAt) && target.companyId === user?.companyId;
              const nextRole = target.role === "COMPANY_ADMIN" ? "COMPANY_DRIVER" : "COMPANY_ADMIN";

              return (
                <tr key={target.id}>
                  <Td>
                    <span className="font-semibold">{target.firstName} {target.lastName}</span>
                    <p className="mt-1 break-words text-xs text-muted">{target.email}</p>
                  </Td>
                  <Td>{target.role}</Td>
                  <Td><StatusBadge tone={userTone(target)}>{target.deletedAt ? "DELETED" : target.isActive ? "ACTIVE" : "INACTIVE"}</StatusBadge></Td>
                  <Td>{target.phone ?? "Not set"}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      {!isDeletedView && canEditMembership ? (
                        <Button
                          className="h-9 min-h-9 px-4"
                          disabled={membershipMutation.isPending}
                          onClick={() => membershipMutation.mutate({ role: nextRole, target })}
                          type="button"
                          variant="secondary"
                        >
                          <UserCog aria-hidden="true" className="size-4" />
                          Make {nextRole === "COMPANY_ADMIN" ? "Admin" : "Driver"}
                        </Button>
                      ) : null}
                      {!isDeletedView && canDelete ? (
                        <Button
                          className="h-9 min-h-9 px-4"
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(target.id)}
                          type="button"
                          variant="danger"
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                          Delete
                        </Button>
                      ) : null}
                      {canRestore ? (
                        <Button
                          className="h-9 min-h-9 px-4"
                          disabled={restoreMutation.isPending}
                          onClick={() => restoreMutation.mutate(target.id)}
                          type="button"
                          variant="secondary"
                        >
                          <RotateCcw aria-hidden="true" className="size-4" />
                          Restore
                        </Button>
                      ) : null}
                      {(!isDeletedView && !canDelete && !canEditMembership) || (isDeletedView && !canRestore) ? (
                        <span className="text-sm text-muted">No actions</span>
                      ) : null}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Pencil, RotateCcw, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { listUsers } from "@/shared/api/modules/users";
import { createVehicleAssignment, deleteVehicleAssignment, listVehicleAssignments, restoreVehicleAssignment, updateVehicleAssignment, type VehicleAssignmentRecord } from "@/shared/api/modules/vehicleAssignments";
import { listVehicles } from "@/shared/api/modules/vehicles";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { Field, Input, Select } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { Tooltip } from "@/shared/components/ui/Tooltip";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { useAuthStore } from "@/features/auth/authStore";
import { formatDateTime, formatUser, formatVehicle } from "./fleetFormatters";
import { canManageFleet } from "./fleetPermissions";
import { assignmentSchema, type AssignmentFormInput, type AssignmentFormValues } from "./fleetSchemas";

const assignmentDefaults: AssignmentFormInput = {
  driverUserId: "",
  endsAt: "",
  startsAt: "",
  vehicleId: "",
};

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toAssignmentForm(assignment: VehicleAssignmentRecord): AssignmentFormInput {
  return {
    driverUserId: assignment.driverUserId,
    endsAt: toLocalInput(assignment.endsAt),
    startsAt: toLocalInput(assignment.startsAt),
    vehicleId: assignment.vehicleId,
  };
}

function toApiAssignment(values: AssignmentFormValues) {
  return {
    driverUserId: values.driverUserId,
    endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : null,
    startsAt: new Date(values.startsAt).toISOString(),
    vehicleId: values.vehicleId,
  };
}

export function FleetAssignmentsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canManage = canManageFleet(user?.role);
  const [editing, setEditing] = useState<VehicleAssignmentRecord | null>(null);
  const [deleted, setDeleted] = useState<VehicleAssignmentRecord | null>(null);
  const [registryView, setRegistryView] = useState<"active" | "deleted">("active");
  const usersQuery = useQuery({ queryFn: () => listUsers({ includeInactive: false }), queryKey: ["users", "active"] });
  const vehiclesQuery = useQuery({ queryFn: () => listVehicles(), queryKey: ["vehicles"] });
  const assignmentsQuery = useQuery({
    queryFn: () => listVehicleAssignments({ deleted: registryView === "deleted" ? "only" : "active" }),
    queryKey: ["vehicle-assignments", registryView],
  });
  const drivers = useMemo(() => (usersQuery.data ?? []).filter((item) => item.role === "COMPANY_DRIVER"), [usersQuery.data]);
  const vehicles = vehiclesQuery.data ?? [];
  const form = useForm<AssignmentFormInput, unknown, AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: assignmentDefaults,
  });

  useEffect(() => {
    form.reset(editing ? toAssignmentForm(editing) : assignmentDefaults);
  }, [editing, form]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["vehicle-assignments"] });
  const createMutation = useAppMutation({ messages: { success: "Assignment created" }, mutationFn: (values: AssignmentFormValues) => createVehicleAssignment(toApiAssignment(values)), onSuccess: () => { form.reset(assignmentDefaults); void refresh(); } });
  const updateMutation = useAppMutation({ messages: { success: "Assignment updated" }, mutationFn: (values: AssignmentFormValues) => updateVehicleAssignment(editing?.id ?? "", toApiAssignment(values)), onSuccess: () => { setEditing(null); void refresh(); } });
  const deleteMutation = useAppMutation({ messages: { success: "Assignment deleted" }, mutationFn: deleteVehicleAssignment, onSuccess: (record) => { setDeleted(record); void refresh(); } });
  const restoreMutation = useAppMutation({ messages: { success: "Assignment restored" }, mutationFn: restoreVehicleAssignment, onSuccess: () => { setDeleted(null); void refresh(); } });

  const isLoading = usersQuery.isLoading || vehiclesQuery.isLoading || assignmentsQuery.isLoading;
  const error = usersQuery.error ?? vehiclesQuery.error ?? assignmentsQuery.error;
  if (isLoading) return <LoadingState description="Loading vehicles, drivers, and assignment windows." title="Loading assignments" />;
  if (error) return <ErrorState description="Assignment data could not be loaded." error={error} title="Unable to load assignments" />;

  const assignments = assignmentsQuery.data ?? [];
  const isDeletedView = registryView === "deleted";

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Fleet operations" subtitle="Connect vehicles to drivers with clear operating windows." title="Assignments" />

      {deleted && canManage ? (
        <Surface className="flex flex-col gap-3 border-amber-200 bg-amber-50 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-semibold text-amber-800">Deleted assignment {deleted.id.slice(0, 8)}. Restore is available while this record is cached.</p>
          <Button disabled={restoreMutation.isPending} onClick={() => restoreMutation.mutate(deleted.id)} type="button" variant="secondary">
            <RotateCcw aria-hidden="true" className="size-4" />
            Restore
          </Button>
        </Surface>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.36fr_0.64fr]">
        {canManage ? (
          <Surface>
            <form className="space-y-4" onSubmit={form.handleSubmit((values) => editing ? updateMutation.mutate(values) : createMutation.mutate(values))}>
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.28px]">{editing ? "Edit assignment" : "Assign vehicle"}</h2>
                <p className="mt-1 text-sm leading-6 text-muted">Backend overlap checks protect driver schedules.</p>
              </div>
              <Field error={form.formState.errors.vehicleId?.message} label="Vehicle" required>
                <Select {...form.register("vehicleId")}>
                  <option value="">Select vehicle</option>
                  {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{formatVehicle(vehicle)}</option>)}
                </Select>
              </Field>
              <Field error={form.formState.errors.driverUserId?.message} label="Driver" required>
                <Select {...form.register("driverUserId")}>
                  <option value="">Select driver</option>
                  {drivers.map((driver) => <option key={driver.id} value={driver.id}>{formatUser(driver)}</option>)}
                </Select>
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field error={form.formState.errors.startsAt?.message} label="Starts at" required>
                  <Input {...form.register("startsAt")} type="datetime-local" />
                </Field>
                <Field error={form.formState.errors.endsAt?.message} label="Ends at">
                  <Input {...form.register("endsAt")} type="datetime-local" />
                </Field>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button disabled={createMutation.isPending || updateMutation.isPending} type="submit">
                  <Save aria-hidden="true" className="size-4" />
                  {editing ? "Save assignment" : "Add assignment"}
                </Button>
                {editing ? <Button onClick={() => setEditing(null)} type="button" variant="secondary">Cancel</Button> : null}
              </div>
            </form>
          </Surface>
        ) : (
          <Surface>
            <div className="grid size-11 place-items-center rounded-lg bg-surface-pearl"><ClipboardCheck aria-hidden="true" className="size-5 text-primary" /></div>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.28px]">Read-only assignment view</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Drivers can see assignment windows without seeing planning controls.</p>
          </Surface>
        )}

        <Surface>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.28px]">Assignment schedule</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                {isDeletedView ? "Restore deleted assignment windows from this dedicated view." : "Showing active, non-deleted assignment records returned by the backend."}
              </p>
            </div>
            {canManage ? (
              <div className="inline-flex w-fit rounded-lg border border-border bg-surface-pearl p-1" aria-label="Fleet assignment registry view">
                <Button
                  aria-pressed={!isDeletedView}
                  className="min-h-8 px-3 py-1 text-sm"
                  onClick={() => setRegistryView("active")}
                  type="button"
                  variant={!isDeletedView ? "secondary" : "ghost"}
                >
                  Active
                </Button>
                <Button
                  aria-pressed={isDeletedView}
                  className="min-h-8 px-3 py-1 text-sm"
                  onClick={() => setRegistryView("deleted")}
                  type="button"
                  variant={isDeletedView ? "secondary" : "ghost"}
                >
                  Deleted
                </Button>
              </div>
            ) : null}
          </div>
          <div className="mt-5">
            {assignments.length === 0 ? (
              <EmptyState
                description={isDeletedView ? "Deleted assignments will appear here after admins remove them from the active schedule." : "Assignments will appear after a vehicle is connected to a driver."}
                title={isDeletedView ? "No deleted assignments" : "No assignments yet"}
              />
            ) : (
              <Table>
                <thead><tr><Th>Vehicle</Th><Th>Driver</Th><Th>Window</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
                <tbody>
                  {assignments.map((assignment) => {
                    const vehicle = vehicles.find((item) => item.id === assignment.vehicleId);
                    const driver = drivers.find((item) => item.id === assignment.driverUserId);
                    const active = !assignment.endsAt || new Date(assignment.endsAt) > new Date();
                    return (
                      <tr key={assignment.id}>
                        <Td>{vehicle ? formatVehicle(vehicle) : assignment.vehicleId}</Td>
                        <Td>{driver ? formatUser(driver) : assignment.driverUserId}</Td>
                        <Td>{formatDateTime(assignment.startsAt)} to {formatDateTime(assignment.endsAt)}</Td>
                        <Td><StatusBadge tone={isDeletedView ? "danger" : active ? "success" : "neutral"}>{isDeletedView ? "DELETED" : active ? "ACTIVE" : "ENDED"}</StatusBadge></Td>
                        <Td>
                          {canManage ? (
                            <div className="flex flex-wrap gap-2">
                              {isDeletedView ? (
                                <Tooltip label="Restore assignment">
                                  <Button
                                    aria-label={`Restore assignment ${assignment.id.slice(0, 8)}`}
                                    className="h-9 min-h-9 px-3"
                                    disabled={restoreMutation.isPending}
                                    onClick={() => restoreMutation.mutate(assignment.id)}
                                    type="button"
                                    variant="secondary"
                                  >
                                    <RotateCcw aria-hidden="true" className="size-4" />
                                    Restore
                                  </Button>
                                </Tooltip>
                              ) : (
                                <>
                                  <Tooltip label="Edit assignment">
                                    <Button aria-label={`Edit assignment ${assignment.id.slice(0, 8)}`} className="h-9 min-h-9 px-3" onClick={() => setEditing(assignment)} type="button" variant="secondary">
                                      <Pencil aria-hidden="true" className="size-4" />
                                      Edit
                                    </Button>
                                  </Tooltip>
                                  <Tooltip label="Delete assignment">
                                    <Button aria-label={`Delete assignment ${assignment.id.slice(0, 8)}`} className="h-9 min-h-9 px-3" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(assignment.id)} type="button" variant="danger">
                                      <Trash2 aria-hidden="true" className="size-4" />
                                      Delete
                                    </Button>
                                  </Tooltip>
                                </>
                              )}
                            </div>
                          ) : <span className="text-sm text-muted">Read only</span>}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </div>
        </Surface>
      </div>
    </div>
  );
}

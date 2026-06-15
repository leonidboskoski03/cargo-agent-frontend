import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ClipboardCheck, IdCard, Truck } from "lucide-react";
import { listLicenses } from "@/shared/api/modules/licenses";
import { listVehicleAssignments } from "@/shared/api/modules/vehicleAssignments";
import { listVehicles } from "@/shared/api/modules/vehicles";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { useAuthStore } from "@/features/auth/authStore";
import { canViewFleet } from "./fleetPermissions";
import { formatDateTime } from "./fleetFormatters";

function Metric({ icon: Icon, label, value }: { icon: typeof Truck; label: string; value: number }) {
  return (
    <Surface>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.28px]">{value}</p>
        </div>
        <div className="grid size-11 place-items-center rounded-lg bg-surface-pearl">
          <Icon aria-hidden="true" className="size-5 text-primary" />
        </div>
      </div>
    </Surface>
  );
}

export function FleetPage() {
  const user = useAuthStore((state) => state.user);
  const vehiclesQuery = useQuery({ queryFn: () => listVehicles(), queryKey: ["vehicles"] });
  const licensesQuery = useQuery({ queryFn: () => listLicenses(), queryKey: ["licenses", "ALL"] });
  const assignmentsQuery = useQuery({ queryFn: () => listVehicleAssignments(), queryKey: ["vehicle-assignments"] });

  if (!canViewFleet(user?.role)) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Fleet operations" subtitle="Fleet access is reserved for company users." title="Fleet" />
        <EmptyState description="Use a company admin or driver account to view fleet resources." title="Company access required" />
      </div>
    );
  }

  const isLoading = vehiclesQuery.isLoading || licensesQuery.isLoading || assignmentsQuery.isLoading;
  const error = vehiclesQuery.error ?? licensesQuery.error ?? assignmentsQuery.error;

  if (isLoading) return <LoadingState description="Loading vehicles, licenses, and driver assignments." title="Loading fleet" />;
  if (error) return <ErrorState description="Fleet data could not be loaded." error={error} title="Unable to load fleet" />;

  const vehicles = vehiclesQuery.data ?? [];
  const licenses = licensesQuery.data ?? [];
  const assignments = assignmentsQuery.data ?? [];
  const activeAssignments = assignments.filter((assignment) => !assignment.endsAt || new Date(assignment.endsAt) > new Date());

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fleet operations"
        subtitle="Maintain company vehicles, driver credentials, and assignment windows from one operational workspace."
        title="Fleet"
      />

      <div className="grid gap-5 md:grid-cols-3">
        <Metric icon={Truck} label="Active vehicles" value={vehicles.filter((vehicle) => vehicle.isActive).length} />
        <Metric icon={IdCard} label="Valid licenses" value={licenses.filter((license) => license.isValid).length} />
        <Metric icon={ClipboardCheck} label="Active assignments" value={activeAssignments.length} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.4fr_0.6fr]">
        <Surface>
          <h2 className="text-2xl font-semibold tracking-[-0.28px]">Fleet workbench</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Admins can maintain records. Drivers can inspect company fleet context without mutation controls.
          </p>
          <div className="mt-5 grid gap-3">
            <Link className="rounded-[14px] border border-border bg-surface-pearl px-4 py-3 text-sm font-semibold text-foreground" to="/fleet/vehicles">Manage vehicles</Link>
            <Link className="rounded-[14px] border border-border bg-surface-pearl px-4 py-3 text-sm font-semibold text-foreground" to="/fleet/licenses">Review licenses</Link>
            <Link className="rounded-[14px] border border-border bg-surface-pearl px-4 py-3 text-sm font-semibold text-foreground" to="/fleet/assignments">Plan assignments</Link>
          </div>
        </Surface>

        <Surface>
          <h2 className="text-2xl font-semibold tracking-[-0.28px]">Recent assignment windows</h2>
          {assignments.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-muted">Assignments will appear once vehicles are connected to drivers.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {assignments.slice(0, 5).map((assignment) => (
                <div className="rounded-[14px] border border-border px-4 py-3" key={assignment.id}>
                  <p className="text-sm font-semibold">Vehicle {assignment.vehicleId.slice(0, 8)} · Driver {assignment.driverUserId.slice(0, 8)}</p>
                  <p className="mt-1 text-xs text-muted">{formatDateTime(assignment.startsAt)} to {formatDateTime(assignment.endsAt)}</p>
                </div>
              ))}
            </div>
          )}
        </Surface>
      </div>
    </div>
  );
}

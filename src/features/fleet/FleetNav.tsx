import { NavLink } from "react-router-dom";
import { cn } from "@/shared/lib/cn";

const fleetLinks = [
  { label: "Overview", to: "/fleet" },
  { label: "Vehicles", to: "/fleet/vehicles" },
  { label: "Licenses", to: "/fleet/licenses" },
  { label: "Assignments", to: "/fleet/assignments" },
];

export function FleetNav() {
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Fleet sections">
      {fleetLinks.map((link) => (
        <NavLink
          className={({ isActive }) =>
            cn(
              "inline-flex min-h-10 shrink-0 items-center rounded-lg border border-border bg-card px-4 text-sm font-semibold text-muted transition hover:text-foreground",
              isActive && "border-primary bg-primary text-primary-foreground hover:text-primary-foreground",
            )
          }
          end={link.to === "/fleet"}
          key={link.to}
          to={link.to}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

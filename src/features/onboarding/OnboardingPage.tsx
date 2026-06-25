import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, CheckCircle2, ClipboardList, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { getMyCompany } from "@/shared/api/modules/companies";
import { getMe, getMyProfileCompletion } from "@/shared/api/modules/users";
import { StatusBadge } from "@/shared/components/ui/DataTable";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { useAuthStore } from "@/features/auth/authStore";

type SetupItem = {
  description: string;
  keys: string[];
  label: string;
  to: string;
};

const baseItems: SetupItem[] = [
  {
    description: "Name, phone, and verified email are used on bids, jobs, and operational notifications.",
    keys: ["firstName", "lastName", "phone", "emailVerified"],
    label: "Contact identity",
    to: "/job-profile",
  },
];

const companyItems: SetupItem[] = [
  {
    description: "Keep the workspace name, type, registration, country, and city ready for marketplace actions.",
    keys: ["companyName", "companyType", "registrationNumber", "companyCountryCode", "companyCity"],
    label: "Company basics",
    to: "/company",
  },
  {
    description: "Address, website, phone, and shared email improve trust before partners respond.",
    keys: ["companyAddress", "companyWebsite", "companyPhone", "companyEmail"],
    label: "Company profile enrichment",
    to: "/company",
  },
];

const jobSeekerItems: SetupItem[] = [
  {
    description: "Country, city, headline, and experience help companies evaluate your applications.",
    keys: ["countryCode", "city", "headline", "yearsExperience"],
    label: "Driver profile",
    to: "/job-profile",
  },
  {
    description: "Availability and preferred routes help match you with the right work.",
    keys: ["availability", "preferredRoutes"],
    label: "Availability and routes",
    to: "/job-profile",
  },
];

function itemComplete(item: SetupItem, missingItems: string[]) {
  return item.keys.every((key) => !missingItems.includes(key));
}

function itemMissingCount(item: SetupItem, missingItems: string[]) {
  return item.keys.filter((key) => missingItems.includes(key)).length;
}

function setupItemsForRole(role?: string) {
  if (role === "JOB_SEEKER") return [...baseItems, ...jobSeekerItems];
  return [...baseItems.map((item) => ({ ...item, to: "/company" })), ...companyItems];
}

export function OnboardingPage() {
  const user = useAuthStore((state) => state.user);
  const isCompanyUser = user?.role === "COMPANY_ADMIN" || user?.role === "COMPANY_DRIVER";
  const profileQuery = useQuery({ queryFn: getMe, queryKey: ["users", "me"] });
  const completionQuery = useQuery({ queryFn: getMyProfileCompletion, queryKey: ["users", "me", "profile-completion"] });
  const companyQuery = useQuery({ enabled: isCompanyUser, queryFn: getMyCompany, queryKey: ["companies", "me"] });
  const isLoading = profileQuery.isLoading || completionQuery.isLoading || companyQuery.isLoading;
  const error = profileQuery.error ?? completionQuery.error ?? companyQuery.error;
  const completion = completionQuery.data;
  const missingItems = completion?.missingItems ?? [];
  const items = setupItemsForRole(user?.role);
  const nextItem = items.find((item) => !itemComplete(item, missingItems));

  if (isLoading) {
    return <LoadingState description="Loading setup requirements from your profile completion state." title="Loading setup" />;
  }

  if (error) {
    return <ErrorState description="The account setup checklist could not be loaded." error={error} title="Unable to load setup" />;
  }

  if (!user) {
    return <EmptyState description="Sign in to view account setup." title="Account required" />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        action={
          <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-primary bg-card px-4 py-2 text-sm font-semibold text-primary" to="/dashboard">
            Skip for now
          </Link>
        }
        eyebrow="Account setup"
        subtitle="Finish the operational fields that make marketplace activity trustworthy. You can continue to the app and return here anytime."
        title={user.role === "JOB_SEEKER" ? "Driver setup" : "Company setup"}
      />

      <Surface className="p-4">
        <div className="grid gap-4 lg:grid-cols-[0.36fr_0.64fr] lg:items-center">
          <div>
            <div className="grid size-11 place-items-center rounded-lg bg-surface-pearl text-primary">
              {user.role === "JOB_SEEKER" ? <UserRound className="size-5" aria-hidden="true" /> : <Building2 className="size-5" aria-hidden="true" />}
            </div>
            <p className="mt-4 text-4xl font-semibold tracking-[-0.28px]">{completion?.percent ?? 0}%</p>
            <p className="mt-1 text-sm text-muted">Profile completion</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-surface-pearl p-3">
              <p className="text-xs font-semibold uppercase text-muted">Workspace</p>
              <p className="mt-1 text-sm font-semibold">{isCompanyUser ? companyQuery.data?.name ?? "Company workspace" : `${profileQuery.data?.firstName ?? user.firstName} ${profileQuery.data?.lastName ?? user.lastName}`}</p>
            </div>
            <div className="rounded-lg bg-surface-pearl p-3">
              <p className="text-xs font-semibold uppercase text-muted">Next step</p>
              <p className="mt-1 text-sm font-semibold">{nextItem?.label ?? "Setup complete"}</p>
            </div>
          </div>
        </div>
      </Surface>

      <div className="grid gap-3">
        {items.map((item, index) => {
          const complete = itemComplete(item, missingItems);
          const missingCount = itemMissingCount(item, missingItems);
          return (
            <Surface className="p-4" key={item.label}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-pearl text-primary">
                    {complete ? <CheckCircle2 className="size-5" aria-hidden="true" /> : <ClipboardList className="size-5" aria-hidden="true" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold">{index + 1}. {item.label}</h2>
                      <StatusBadge tone={complete ? "success" : "warning"}>{complete ? "Complete" : `${missingCount} missing`}</StatusBadge>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted">{item.description}</p>
                  </div>
                </div>
                <Link className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground md:w-32" to={item.to}>
                  {complete ? "Review" : "Continue"}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </Surface>
          );
        })}
      </div>
    </div>
  );
}

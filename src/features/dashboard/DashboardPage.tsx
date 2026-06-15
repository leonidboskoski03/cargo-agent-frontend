import { Activity, ArrowUpRight, Bell, BriefcaseBusiness, Building2, ClipboardCheck, CreditCard, FileText, MapPinned, Star, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listBids } from "@/shared/api/modules/bids";
import { listContracts } from "@/shared/api/modules/contracts";
import { listDocuments } from "@/shared/api/modules/documents";
import { listNotifications } from "@/shared/api/modules/notifications";
import { listPosts } from "@/shared/api/modules/posts";
import { getMySubscription } from "@/shared/api/modules/subscriptions";
import { getMyProfileCompletion } from "@/shared/api/modules/users";
import { PageHeader, Surface } from "@/shared/components/ui/Page";
import { StatCard } from "@/shared/components/ui/StatCard";
import { useAuthStore } from "@/features/auth/authStore";

function countByStatus<T extends { status: string }>(items: T[], status: string) {
  return items.filter((item) => item.status === status).length;
}

const profileActionCopy: Record<string, string> = {
  city: "Add your city",
  companyAddress: "Complete company address",
  companyCity: "Add company city",
  companyCountryCode: "Add company country",
  companyEmail: "Add company email",
  companyName: "Add company name",
  companyPhone: "Add company phone",
  companyType: "Choose company type",
  companyWebsite: "Add company website",
  countryCode: "Add your country",
  emailVerified: "Verify email",
  firstName: "Add first name",
  lastName: "Add last name",
  phone: "Add phone number",
  registrationNumber: "Add registration number",
};

function profileCompletionMeta(nextBestAction?: string | null) {
  if (!nextBestAction) return "Profile basics complete";
  return profileActionCopy[nextBestAction] ?? "Continue profile setup";
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

function countCreatedOnDay(items: Array<{ createdAt: string }>, day: Date) {
  const dayStart = day.getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  return items.filter((item) => {
    const createdAt = new Date(item.createdAt).getTime();
    return Number.isFinite(createdAt) && createdAt >= dayStart && createdAt < dayEnd;
  }).length;
}

function statusShare(count: number, total: number) {
  if (total === 0) return 0;
  return Math.round(count / total * 100);
}

function MiniBarChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...data.map((item) => item.value));

  return (
    <div className="mt-4 grid h-36 grid-cols-7 items-end gap-2">
      {data.map((item) => {
        const height = Math.max(8, Math.round(item.value / max * 100));
        return (
          <div className="flex h-full flex-col items-center justify-end gap-2" key={item.label}>
            <div className="flex h-full w-full items-end rounded-md bg-surface-pearl px-1.5 pb-1.5">
              <div
                aria-label={`${item.label}: ${item.value} activities`}
                className="w-full rounded-sm bg-primary/80"
                style={{ height: `${height}%` }}
                title={`${item.label}: ${item.value}`}
              />
            </div>
            <span className="text-[11px] font-semibold text-muted">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function MixRow({ count, label, total }: { count: number; label: string; total: number }) {
  const share = statusShare(count, total);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-foreground">{label}</span>
        <span className="text-muted">{count}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-surface-pearl">
        <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "COMPANY_ADMIN";
  const postsQuery = useQuery({ queryFn: () => listPosts(), queryKey: ["posts"] });
  const bidsQuery = useQuery({ queryFn: () => listBids(), queryKey: ["bids"] });
  const contractsQuery = useQuery({ queryFn: () => listContracts(), queryKey: ["contracts"] });
  const subscriptionQuery = useQuery({ queryFn: () => getMySubscription(), queryKey: ["subscriptions", "me"] });
  const notificationsQuery = useQuery({ queryFn: () => listNotifications({ pageSize: 20, unreadOnly: true }), queryKey: ["notifications", "dashboard", "unread"] });
  const documentsQuery = useQuery({ queryFn: () => listDocuments({ pageSize: 20 }), queryKey: ["documents", "dashboard"] });
  const completionQuery = useQuery({ queryFn: () => getMyProfileCompletion(), queryKey: ["users", "me", "profile-completion"] });

  const posts = postsQuery.data ?? [];
  const bids = bidsQuery.data ?? [];
  const contracts = contractsQuery.data ?? [];
  const completion = completionQuery.data;
  const openPosts = countByStatus(posts, "OPEN");
  const pendingBids = countByStatus(bids, "PENDING");
  const activeContracts = contracts.filter((contract) => contract.status === "CONFIRMED" || contract.status === "IN_PROGRESS").length;
  const subscription = subscriptionQuery.data;
  const unreadNotifications = notificationsQuery.data?.filter((notification) => !notification.isRead).length ?? 0;
  const documentCount = documentsQuery.data?.length ?? 0;
  const completedContracts = countByStatus(contracts, "COMPLETED");
  const cancelledContracts = countByStatus(contracts, "CANCELLED");
  const rejectedBids = countByStatus(bids, "REJECTED");
  const acceptedBids = countByStatus(bids, "ACCEPTED");
  const totalPipelineItems = posts.length + bids.length + contracts.length;
  const activityTrend = Array.from({ length: 7 }, (_, index) => {
    const day = startOfDay(new Date());
    day.setDate(day.getDate() - (6 - index));
    return {
      label: formatDayLabel(day),
      value: countCreatedOnDay(posts, day) + countCreatedOnDay(bids, day) + countCreatedOnDay(contracts, day),
    };
  });
  const activityTotal = activityTrend.reduce((sum, item) => sum + item.value, 0);
  const quickLinks = [
    { icon: Truck, label: "Fleet control", meta: "Vehicles, licenses, assignments", to: "/fleet" },
    { icon: CreditCard, label: "Billing", meta: subscription ? `${subscription.planCode} / ${subscription.status}` : "Subscription state", to: "/billing" },
    { icon: Bell, label: "Notifications", meta: `${unreadNotifications} unread`, to: "/notifications" },
    { icon: FileText, label: "Documents", meta: `${documentCount} visible records`, to: "/documents" },
    { icon: Star, label: "Reviews", meta: "Completed-contract feedback", to: "/reviews" },
  ];
  const profileSetupLink = (completion?.percent ?? 0) < 100 ? "/onboarding" : user?.role === "JOB_SEEKER" ? "/job-profile" : "/company";
  const actionQueue = [
    { label: "Profile", meta: profileCompletionMeta(completion?.nextBestAction), to: profileSetupLink, value: `${completion?.percent ?? 0}%` },
    { label: "Bids", meta: "Pending review", to: "/bids?scope=all&status=PENDING", value: String(pendingBids) },
    { label: "Messages", meta: "Unread notifications", to: "/notifications", value: String(unreadNotifications) },
    { label: "Plan", meta: subscription ? `${subscription.planCode} / ${subscription.status}` : "Subscription state", to: "/billing", value: subscription?.planCode ?? "FREE" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        subtitle={user ? `Operational overview for ${user.firstName} ${user.lastName}` : "Operational overview for your workspace."}
        title="Dashboard"
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={MapPinned} label="Open posts" meta="Ready for bids" value={String(openPosts)} />
        <Link className="block rounded-xl transition hover:-translate-y-0.5" to="/bids?scope=all&status=PENDING">
          <StatCard icon={ClipboardCheck} label="Pending bids" meta="Need review or action" value={String(pendingBids)} />
        </Link>
        <StatCard icon={BriefcaseBusiness} label="Active contracts" meta="Confirmed or in progress" value={String(activeContracts)} />
        <StatCard icon={Building2} label="Profile completion" meta={profileCompletionMeta(completion?.nextBestAction)} value={`${completion?.percent ?? 0}%`} />
      </section>
      <div className="grid gap-4 xl:grid-cols-[0.58fr_0.42fr]">
        <Surface className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">7-day activity</h2>
              <p className="mt-1 text-sm text-muted">New posts, bids, and contracts created from live workspace records.</p>
            </div>
            <div className="grid size-10 place-items-center rounded-lg bg-surface-pearl">
              <Activity className="size-5 text-primary" aria-hidden="true" />
            </div>
          </div>
          {activityTotal > 0 ? (
            <MiniBarChart data={activityTrend} />
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-border bg-surface-pearl px-4 py-8 text-center">
              <p className="text-sm font-semibold text-foreground">No activity in the last 7 days</p>
              <p className="mt-1 text-sm text-muted">Create posts, receive bids, or confirm contracts to populate this chart.</p>
            </div>
          )}
        </Surface>

        <Surface className="p-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Pipeline mix</h2>
            <p className="mt-1 text-sm text-muted">A compact view of current operational load.</p>
          </div>
          <div className="mt-4 space-y-4">
            <MixRow count={openPosts} label="Open posts" total={Math.max(1, totalPipelineItems)} />
            <MixRow count={pendingBids} label="Pending bids" total={Math.max(1, totalPipelineItems)} />
            <MixRow count={acceptedBids + activeContracts} label="Accepted / active" total={Math.max(1, totalPipelineItems)} />
            <MixRow count={rejectedBids + cancelledContracts} label="Rejected / cancelled" total={Math.max(1, totalPipelineItems)} />
            <MixRow count={completedContracts} label="Completed contracts" total={Math.max(1, totalPipelineItems)} />
          </div>
        </Surface>
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.52fr_0.48fr]">
        <Surface className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Action queue</h2>
              <p className="mt-1 text-sm text-muted">The few items most likely to need attention now.</p>
            </div>
            <Link className="text-sm font-semibold text-primary" to={isAdmin ? "/posts/planned" : "/posts/marketplace"}>
              {isAdmin ? "Create post" : "Open marketplace"}
            </Link>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {actionQueue.map((item) => (
              <Link className="rounded-lg border border-border bg-surface-pearl px-3 py-2.5 transition hover:border-primary" key={item.label} to={item.to}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <span className="text-sm font-semibold text-primary">{item.value}</span>
                </div>
                <p className="mt-1 truncate text-xs text-muted">{item.meta}</p>
              </Link>
            ))}
          </div>
        </Surface>

        <Surface className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Workspace shortcuts</h2>
              <p className="mt-1 text-sm text-muted">Jump to operational pages without scanning the sidebar.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {quickLinks.map((item) => (
              <Link
                className="rounded-lg border border-border bg-card px-3 py-2.5 transition hover:border-primary"
                key={item.to}
                to={item.to}
              >
                  <div className="flex items-center justify-between gap-3">
                    <item.icon className="size-4 text-primary" aria-hidden="true" />
                    <ArrowUpRight className="size-4 text-muted" aria-hidden="true" />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="mt-1 truncate text-xs text-muted">{item.meta}</p>
              </Link>
            ))}
          </div>
        </Surface>
      </div>
    </div>
  );
}

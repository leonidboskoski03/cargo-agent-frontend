import { ArrowUpRight, Bell, BriefcaseBusiness, Building2, ClipboardCheck, CreditCard, FileText, MapPinned, Star, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { listBids } from "@/shared/api/modules/bids";
import { getMyCompany } from "@/shared/api/modules/companies";
import { listContracts } from "@/shared/api/modules/contracts";
import { listDocuments } from "@/shared/api/modules/documents";
import { listNotifications } from "@/shared/api/modules/notifications";
import { listPosts } from "@/shared/api/modules/posts";
import { getMySubscription } from "@/shared/api/modules/subscriptions";
import { getMyProfileCompletion } from "@/shared/api/modules/users";
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { EmptyState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { StatCard } from "@/shared/components/ui/StatCard";
import { useAuthStore } from "@/features/auth/authStore";
import { contractTone, formatCurrency } from "@/features/contracts/contractFormatters";

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

export function DashboardPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "COMPANY_ADMIN";
  const companyQuery = useQuery({ queryFn: () => getMyCompany(), queryKey: ["companies", "me"] });
  const postsQuery = useQuery({ queryFn: () => listPosts(), queryKey: ["posts"] });
  const bidsQuery = useQuery({ queryFn: () => listBids(), queryKey: ["bids"] });
  const contractsQuery = useQuery({ queryFn: () => listContracts(), queryKey: ["contracts"] });
  const subscriptionQuery = useQuery({ queryFn: () => getMySubscription(), queryKey: ["subscriptions", "me"] });
  const notificationsQuery = useQuery({ queryFn: () => listNotifications({ pageSize: 20, unreadOnly: true }), queryKey: ["notifications", "dashboard", "unread"] });
  const documentsQuery = useQuery({ queryFn: () => listDocuments({ pageSize: 20 }), queryKey: ["documents", "dashboard"] });
  const completionQuery = useQuery({ queryFn: () => getMyProfileCompletion(), queryKey: ["users", "me", "profile-completion"] });

  const company = companyQuery.data;
  const posts = postsQuery.data ?? [];
  const bids = bidsQuery.data ?? [];
  const contracts = contractsQuery.data ?? [];
  const recentPosts = posts.slice(0, 5);
  const recentContracts = contracts.slice(0, 4);
  const completion = completionQuery.data;
  const openPosts = countByStatus(posts, "OPEN");
  const pendingBids = countByStatus(bids, "PENDING");
  const activeContracts = contracts.filter((contract) => contract.status === "CONFIRMED" || contract.status === "IN_PROGRESS").length;
  const subscription = subscriptionQuery.data;
  const unreadNotifications = notificationsQuery.data?.filter((notification) => !notification.isRead).length ?? 0;
  const documentCount = documentsQuery.data?.length ?? 0;
  const quickLinks = [
    { icon: Truck, label: "Fleet control", meta: "Vehicles, licenses, assignments", to: "/fleet" },
    { icon: CreditCard, label: "Billing", meta: subscription ? `${subscription.planCode} / ${subscription.status}` : "Subscription state", to: "/billing" },
    { icon: Bell, label: "Notifications", meta: `${unreadNotifications} unread`, to: "/notifications" },
    { icon: FileText, label: "Documents", meta: `${documentCount} visible records`, to: "/documents" },
    { icon: Star, label: "Reviews", meta: "Completed-contract feedback", to: "/reviews" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        action={
          isAdmin ? (
            <Link
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-normal text-primary-foreground transition duration-200 active:scale-95"
              to="/posts"
            >
              {t("dashboard.primaryAction")}
              <ArrowUpRight className="size-4" />
            </Link>
          ) : null
        }
        eyebrow={t("dashboard.eyebrow")}
        subtitle={company ? `${company.name} - ${company.city}, ${company.countryCode}` : t("dashboard.heroBody")}
        title={t("dashboard.heroTitle")}
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={MapPinned} label="Open posts" meta="Ready for bids" value={String(openPosts)} />
        <StatCard icon={ClipboardCheck} label="Pending bids" meta="Need review or action" value={String(pendingBids)} />
        <StatCard icon={BriefcaseBusiness} label="Active contracts" meta="Confirmed or in progress" value={String(activeContracts)} />
        <StatCard icon={Building2} label="Profile completion" meta={profileCompletionMeta(completion?.nextBestAction)} value={`${completion?.percent ?? 0}%`} />
      </section>
      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {quickLinks.map((item) => (
          <Link
            className="rounded-xl border border-border bg-card p-3.5 transition hover:border-primary"
            key={item.to}
            to={item.to}
          >
            <div className="flex items-center justify-between gap-3">
              <item.icon className="size-5 text-primary" aria-hidden="true" />
              <ArrowUpRight className="size-4 text-muted" aria-hidden="true" />
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">{item.label}</p>
            <p className="mt-1 text-xs text-muted">{item.meta}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.64fr_0.36fr]">
        <Surface>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.28px]">Recent transport posts</h2>
              <p className="mt-1 text-sm text-muted">Live backend data from your company marketplace workspace.</p>
            </div>
            <Link className="text-sm text-primary" to="/posts">
              View all
            </Link>
          </div>

          {recentPosts.length === 0 ? (
            <EmptyState
              action={isAdmin ? <Link className="text-primary" to="/posts">Create the first post</Link> : null}
              description="Transport posts created by your company will appear here."
              title="No posts yet"
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Post</Th>
                  <Th>Status</Th>
                  <Th>Price</Th>
                </tr>
              </thead>
              <tbody>
                {recentPosts.map((post) => (
                  <tr key={post.id}>
                    <Td>
                      <Link className="font-semibold text-primary" to={`/posts/${post.id}`}>
                        {post.title || post.cargoDescription || "Untitled post"}
                      </Link>
                    </Td>
                    <Td><StatusBadge tone={post.status === "OPEN" ? "success" : post.status === "CANCELLED" ? "danger" : "neutral"}>{post.status}</StatusBadge></Td>
                    <Td>{post.priceAmount ? `${post.priceAmount} ${post.currency}` : post.priceType}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Surface>

        <Surface>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-lg bg-surface-pearl text-primary">
                <Building2 className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.28px]">Contract lifecycle</h2>
                <p className="text-sm text-muted">Recent agreements from accepted bids.</p>
              </div>
            </div>
            <Link className="text-sm text-primary" to="/contracts">
              View all
            </Link>
          </div>
          {recentContracts.length === 0 ? (
            <EmptyState
              description="Contracts created from accepted bids will appear here."
              title="No contracts yet"
            />
          ) : (
            <div className="space-y-3">
              {recentContracts.map((contract) => (
                <Link
                  className="block rounded-xl border border-border bg-surface-pearl px-4 py-3 transition hover:border-primary"
                  key={contract.id}
                  to={`/contracts/${contract.id}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-semibold text-foreground">Contract {contract.id.slice(0, 8)}</span>
                    <StatusBadge tone={contractTone(contract.status)}>{contract.status}</StatusBadge>
                  </div>
                  <p className="mt-2 text-sm text-muted">{formatCurrency(contract.agreedPriceAmount, contract.currency)}</p>
                </Link>
              ))}
            </div>
          )}
        </Surface>
      </div>
    </div>
  );
}

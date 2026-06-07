import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AppShell } from "@/app/layouts/AppShell";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";

const BillingPage = lazy(() => import("@/features/billing/BillingPage").then((module) => ({ default: module.BillingPage })));
const AuditLogsPage = lazy(() => import("@/features/support/AuditLogsPage").then((module) => ({ default: module.AuditLogsPage })));
const CompanyPage = lazy(() => import("@/features/company/CompanyPage").then((module) => ({ default: module.CompanyPage })));
const ContractDetailPage = lazy(() => import("@/features/contracts/ContractDetailPage").then((module) => ({ default: module.ContractDetailPage })));
const ContractsPage = lazy(() => import("@/features/contracts/ContractsPage").then((module) => ({ default: module.ContractsPage })));
const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const DocumentsPage = lazy(() => import("@/features/support/DocumentsPage").then((module) => ({ default: module.DocumentsPage })));
const FleetAssignmentsPage = lazy(() => import("@/features/fleet/FleetAssignmentsPage").then((module) => ({ default: module.FleetAssignmentsPage })));
const FleetLicensesPage = lazy(() => import("@/features/fleet/FleetLicensesPage").then((module) => ({ default: module.FleetLicensesPage })));
const FleetPage = lazy(() => import("@/features/fleet/FleetPage").then((module) => ({ default: module.FleetPage })));
const FleetVehiclesPage = lazy(() => import("@/features/fleet/FleetVehiclesPage").then((module) => ({ default: module.FleetVehiclesPage })));
const InviteAcceptPage = lazy(() => import("@/features/invites/InviteAcceptPage").then((module) => ({ default: module.InviteAcceptPage })));
const JobDetailPage = lazy(() => import("@/features/jobs/JobDetailPage").then((module) => ({ default: module.JobDetailPage })));
const JobsPage = lazy(() => import("@/features/jobs/JobsPage").then((module) => ({ default: module.JobsPage })));
const JobWalletPage = lazy(() => import("@/features/jobs/JobWalletPage").then((module) => ({ default: module.JobWalletPage })));
const LoginPage = lazy(() => import("@/features/auth/LoginPage").then((module) => ({ default: module.LoginPage })));
const LocationsPage = lazy(() => import("@/features/locations-routes/LocationsPage").then((module) => ({ default: module.LocationsPage })));
const NewJobPage = lazy(() => import("@/features/jobs/NewJobPage").then((module) => ({ default: module.NewJobPage })));
const NotificationsPage = lazy(() => import("@/features/support/NotificationsPage").then((module) => ({ default: module.NotificationsPage })));
const PostDetailPage = lazy(() => import("@/features/posts/PostDetailPage").then((module) => ({ default: module.PostDetailPage })));
const PostsPage = lazy(() => import("@/features/posts/PostsPage").then((module) => ({ default: module.PostsPage })));
const RegistrationStartPage = lazy(() => import("@/features/registration/RegistrationStartPage").then((module) => ({ default: module.RegistrationStartPage })));
const ReviewDetailPage = lazy(() => import("@/features/reviews/ReviewDetailPage").then((module) => ({ default: module.ReviewDetailPage })));
const ReviewsPage = lazy(() => import("@/features/reviews/ReviewsPage").then((module) => ({ default: module.ReviewsPage })));
const ReleaseReadinessPage = lazy(() => import("@/features/release/ReleaseReadinessPage").then((module) => ({ default: module.ReleaseReadinessPage })));
const RoutesPage = lazy(() => import("@/features/locations-routes/RoutesPage").then((module) => ({ default: module.RoutesPage })));
const TeamInvitesPage = lazy(() => import("@/features/team/TeamInvitesPage").then((module) => ({ default: module.TeamInvitesPage })));
const TeamPage = lazy(() => import("@/features/team/TeamPage").then((module) => ({ default: module.TeamPage })));

function withSuspense(element: React.ReactNode) {
  return (
    <Suspense fallback={<div className="grid min-h-[360px] place-items-center text-sm text-muted">Loading workspace...</div>}>
      {element}
    </Suspense>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "dashboard", element: withSuspense(<DashboardPage />) },
          { path: "locations", element: withSuspense(<LocationsPage />) },
          { path: "routes", element: withSuspense(<RoutesPage />) },
          { path: "posts", element: withSuspense(<PostsPage mode="planned" />) },
          { path: "posts/quick", element: withSuspense(<PostsPage mode="quick" />) },
          { path: "posts/planned", element: withSuspense(<PostsPage mode="planned" />) },
          { path: "posts/:postId", element: withSuspense(<PostDetailPage />) },
          { path: "contracts", element: withSuspense(<ContractsPage />) },
          { path: "contracts/:contractId", element: withSuspense(<ContractDetailPage />) },
          { path: "jobs", element: withSuspense(<JobsPage />) },
          { path: "jobs/mine", element: withSuspense(<JobsPage scope="mine" />) },
          { path: "jobs/new", element: withSuspense(<NewJobPage />) },
          { path: "jobs/:jobApplicationId", element: withSuspense(<JobDetailPage />) },
          { path: "job-wallet", element: withSuspense(<JobWalletPage />) },
          { path: "fleet", element: withSuspense(<FleetPage />) },
          { path: "fleet/vehicles", element: withSuspense(<FleetVehiclesPage />) },
          { path: "fleet/licenses", element: withSuspense(<FleetLicensesPage />) },
          { path: "fleet/assignments", element: withSuspense(<FleetAssignmentsPage />) },
          { path: "company", element: withSuspense(<CompanyPage />) },
          { path: "team", element: withSuspense(<TeamPage />) },
          { path: "team/invites", element: withSuspense(<TeamInvitesPage />) },
          { path: "billing", element: withSuspense(<BillingPage />) },
          { path: "release-readiness", element: withSuspense(<ReleaseReadinessPage />) },
          { path: "notifications", element: withSuspense(<NotificationsPage />) },
          { path: "documents", element: withSuspense(<DocumentsPage />) },
          { path: "audit-logs", element: withSuspense(<AuditLogsPage />) },
          { path: "reviews", element: withSuspense(<ReviewsPage />) },
          { path: "reviews/:reviewId", element: withSuspense(<ReviewDetailPage />) },
        ],
      },
    ],
  },
  { path: "/login", element: withSuspense(<LoginPage />) },
  { path: "/invites/accept", element: withSuspense(<InviteAcceptPage />) },
  { path: "/register", element: withSuspense(<RegistrationStartPage />) },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

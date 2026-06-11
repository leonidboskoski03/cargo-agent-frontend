# FRONTEND_ROADMAP_7_STAGES

## Summary

Build the Cargo Agent frontend in 7 staged releases, using the backend as the source of truth and keeping the app focused on a unified SaaS/marketplace experience for company admins and drivers first.

Current frontend coverage is about 90-95% of the company-logistics and staging smoke surface. Dashboard, locations/routes, posts, contracts, company/team/invites, fleet, billing, company credits, documents, notifications, audit logs, reviews, localization/geo catalogs, upload-backed media fields, release-readiness diagnostics, job seeker profile/wallet, job listings, checkout result pages, and vehicle marketplace screens are present. The remaining frontend gap is mostly UAT polish, direct-route smoke proof, checkout/provider evidence, and role-specific edge-case cleanup.

The backend MVP module surface is about 95-98% implemented for mounted `/api/v1` modules, but release docs still classify the platform as `NO-GO` because manual UAT, billing/webhook Stripe event evidence, CI proof, delivery-provider validation, and cross-functional signoff are not closed.

## Stage 1: Stabilize Current MVP

Focus: make the screens already built production-shaped.

- Improve dashboard with real counts for routes, posts, bids, company state, and recent activity.
- Finish post actions: edit, delete, restore, status changes.
- Finish bid actions: edit, delete, restore, status changes.
- Add inline route/location creation inside post creation.
- Improve loaders, empty states, error states, trace ID display, and responsive polish.
- Tighten `COMPANY_ADMIN` vs `COMPANY_DRIVER` role behavior in navigation and actions.

Success criteria:

- Admin can register/login, create locations, create routes, create posts, and manage bids.
- Driver can access allowed marketplace views without seeing admin-only billing/team actions.
- Build, lint, tests, and manual browser smoke pass.

## Stage 2: Contracts Flow

Focus: complete the core marketplace loop.

Backend loop:

```text
post -> bid -> accepted bid -> contract
```

- Add contracts API module.
- Add contracts list, detail, status change, delete, restore.
- Add "Create contract" flow from accepted bid where backend allows it.
- Link post detail and bid detail to related contract state.
- Add contract lifecycle labels and clear next actions.

Success criteria:

- Company can move from post creation to accepted bid to contract.
- Contract status is visible and manageable.
- Marketplace flow feels complete, not just post/bid isolated.

## Stage 3: Company Admin And Team

Focus: admin control center.

- Add company profile page using `/companies`.
- Add users/team management using `/users`.
- Add invite list/create/revoke using `/company-invites`.
- Add invite acceptance UX if backend contract supports it.
- Add admin-only route guards for company, team, billing, and audit-sensitive pages.

Success criteria:

- Company admin can manage company identity and onboarding.
- Driver/team user cannot mutate admin-only resources.
- Invite delivery UI behaves like real email delivery, without exposing placeholder/local preview internals.

## Stage 4: Fleet Operations

Focus: operational logistics resources.

- Add vehicles list/create/edit/delete/restore using `/vehicles`.
- Add licenses list/create/edit/delete/restore using `/licenses`.
- Add vehicle assignments using `/vehicle-assignments`.
- Connect fleet context into contracts or operational detail pages where useful.
- Keep UI utilitarian: tables, focused forms, detail drawers/pages.

Success criteria:

- Admin can maintain fleet records.
- Driver assignment data is visible where relevant.
- Fleet module is useful without overbuilding analytics.

## Stage 5: Billing Sandbox

Focus: Stripe test-mode subscription flow.

- Add plans page using `/plans`.
- Add current subscription page using `/subscriptions/me`.
- Wire checkout session using `/subscriptions/checkout-session`.
- Wire portal session using `/subscriptions/portal-session`.
- Add cancel-at-period-end and cancel-revert actions.
- Add billing events table using `/billing/events`.
- Clearly label sandbox/test behavior.

Success criteria:

- Admin can select plan, open Stripe Checkout sandbox, open portal, and view billing events.
- Driver cannot access billing authority actions.
- Billing UI exposes backend errors and trace IDs clearly.

## Stage 6: Platform Support Modules

Focus: cross-cutting product quality.

- Add documents module using `/documents`.
- Add notifications center using `/notifications`.
- Add audit log viewer using `/audit-logs`, admin-only.
- Add reviews module using `/reviews`, likely after completed contract states.
- Add global notification badge/count if backend supports it.
- Add admin release-readiness diagnostics for delivery/storage/billing provider state.
- Keep shared upload controls consistent for company, vehicle, license, document, and vehicle marketplace media.

Success criteria:

- Users can see system events, documents, and audit history.
- Admin has enough visibility for operational trust.
- Reviews are connected to completed contracts, not floating separately.

## Stage 7: Job Marketplace Lane

Focus: staging polish for the second product lane now that the first usable slice exists.

- Job application/company job post flows using `/job-applications` are implemented.
- Job seeker registration/login/profile flow is implemented for independent users without a company workspace.
- Job seeker billing/credits using `/job-seeker-billing` is implemented, including checkout result route.
- Job application apply flow includes billing metadata and insufficient-credit handling.
- Vehicle marketplace browse/detail/create/manage flows are implemented for company admins and job seekers, with drivers browse-only.
- Remaining work should prioritize UAT polish, direct-route refresh proof, provider-state messaging, and role-specific smoke coverage.

Success criteria:

- Job seeker can enter the platform, manage profile/credits, apply, and manage owned listings.
- Company users can manage company job posts/applications and vehicle listings where allowed.
- Dual-lane platform remains understandable under role-aware navigation.

## Test Plan

Run at every stage checkpoint:

- `npm run build`
- `npm run lint`
- `npm run test -- --run`

Add focused tests per stage:

- Stage 1: post/bid forms, role visibility, protected route behavior.
- Stage 2: contract creation/status validation and accepted-bid flow.
- Stage 3: invite/team permissions and admin-only guards.
- Stage 4: vehicle/license/assignment forms.
- Stage 5: subscription actions, billing event table, driver billing denial.
- Stage 6: documents, notifications, audit-log access rules.
- Stage 7: job application, job seeker billing, checkout result, vehicle marketplace owner workflow, and role visibility validation.

Manual smoke scenarios:

- Admin registers, logs in, creates route, creates post, receives/manages bids.
- Accepted bid becomes contract.
- Admin invites team member; driver has restricted navigation/actions.
- Admin manages fleet and vehicle assignments.
- Admin completes Stripe sandbox checkout and sees subscription/billing state.
- Notifications/documents/audit logs show expected platform activity.
- Job seeker lane works with profile, wallet, job application, and vehicle marketplace smoke flows.

## Assumptions

- Continue using React, Vite, TypeScript, Tailwind, shadcn-style components, TanStack Query, Zustand, React Hook Form, Zod, i18next, Sonner, date-fns, and lucide-react.
- `DESIGN.md`, `AGENTS.md`, `$frontend-design`, `$ui-ux-pro-max`, `$web-design-guidelines`, and light `$huashu-design` motion guidance remain mandatory.
- Backend stays at `VITE_API_BASE_URL=http://localhost:4000/api/v1`.
- Company admin/driver workflows remain first priority.
- Job seeker UI is implemented enough for staging smoke; future work should avoid broad expansion until MVP release evidence is collected.
- OTP and invite delivery stay designed as real delivery UX, even while backend delivery is simulated or placeholder.
- Stripe sandbox checkout remains test-mode until release evidence is captured.

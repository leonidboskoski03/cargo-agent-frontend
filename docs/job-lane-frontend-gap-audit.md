# Job-Lane Frontend Gap Audit

Last updated: 2026-06-07

## Scope

The job-seeker lane is backend-mounted and now has frontend API wrappers plus a first UI slice. This audit keeps remaining gaps explicit while the main MVP release remains governed by external evidence gates.

## Endpoint Coverage

| Backend surface | Frontend API wrapper | Future screen | Role assumption | MVP status |
| --- | --- | --- | --- | --- |
| `GET /api/v1/job-applications` | `listJobApplications` | `/jobs` marketplace feed | Authenticated job seekers and companies where backend allows | First UI slice implemented |
| `GET /api/v1/job-applications/mine` | `listMyJobApplications` | `/jobs/mine`, `/jobs/:id` lookup fallback | Job seeker | First UI slice implemented |
| `POST /api/v1/job-applications` | `createJobApplication` | `/jobs/new` | Job seeker | First UI slice implemented |
| `POST /api/v1/job-applications/:jobApplicationId/promote` | `promoteJobApplication` | `/jobs`, `/jobs/:id` owner action | Job seeker with credits | First UI slice implemented |
| `POST /api/v1/job-applications/:jobApplicationId/apply` | `applyToJobApplication` | `/jobs/:id` apply/respond panel | Company or eligible user per backend policy | First UI slice implemented |
| `POST /api/v1/job-applications/:jobApplicationId/submissions/:submissionId/promote` | `promoteJobApplicationSubmission` | `/jobs/:id` submission owner action | Submission owner with credits | First UI slice implemented |
| `GET /api/v1/job-applications/:jobApplicationId/submissions` | `listJobApplicationSubmissions` | `/jobs/:id` owner submissions table | Application owner/admin | First UI slice implemented |
| `GET /api/v1/job-seeker-billing/wallet` | `getJobSeekerWallet` | `/job-wallet` | Job seeker | First UI slice implemented |
| `GET /api/v1/job-seeker-billing/usage` | `getJobSeekerUsage` | `/job-wallet` quota cards | Job seeker | First UI slice implemented |
| `GET /api/v1/job-seeker-billing/packs` | `listJobSeekerCreditPacks` | `/job-wallet` credit pack cards | Job seeker | First UI slice implemented |
| `GET /api/v1/job-seeker-billing/transactions` | `listJobSeekerTransactions` | `/job-wallet` transaction table | Job seeker | First UI slice implemented |
| `POST /api/v1/job-seeker-billing/checkout-sessions` | `createJobSeekerCheckoutSession` | `/job-wallet` buy credits action | Job seeker | First UI slice implemented |
| `GET /api/v1/job-seeker-billing/checkout-sessions/:sessionId` | `getJobSeekerCheckoutSession` | Checkout result/return page | Job seeker | Deferred |
| `POST /api/v1/job-seeker-billing/admin/adjustments` | `adminAdjustJobSeekerCredits` | Admin credit adjustment tool | Platform/admin only | Deferred |

## Required Product Decisions Before UI

- Whether companies can browse and act on job applications from the same company workspace navigation.
- How promotion credits should be messaged alongside company billing so users do not confuse subscription billing with job-seeker wallet credits.
- Which job-seeker roles are part of MVP release UAT, if any.
- Whether job listing status management/edit/delete should be added to backend/frontend now or kept for a later hardening sprint.

## Recommendation

Keep the current first UI slice available behind role-aware navigation. Next job-lane work should add edit/status/delete flows only if the backend contract is extended; otherwise move to the planned truck/trailer vehicle marketplace.

# Job-Lane Frontend Gap Audit

Last updated: 2026-06-08

## Scope

The job-seeker lane is backend-mounted and now has frontend API wrappers plus usable profile, wallet, listing, checkout result, and vehicle marketplace entry points. This audit keeps remaining gaps explicit while the main MVP release remains governed by external evidence gates.

## Endpoint Coverage

| Backend surface | Frontend API wrapper | Future screen | Role assumption | MVP status |
| --- | --- | --- | --- | --- |
| `GET /api/v1/job-applications` | `listJobApplications` | `/jobs` marketplace feed | Authenticated job seekers and companies where backend allows | Implemented |
| `GET /api/v1/job-applications/mine` | `listMyJobApplications` | `/jobs/mine`, `/jobs/:id` lookup fallback | Job seeker | Implemented |
| `POST /api/v1/job-applications` | `createJobApplication` | `/jobs/new` | Job seeker | Implemented |
| `PATCH /api/v1/job-applications/:jobApplicationId` | `updateJobApplication` | `/jobs/mine` inline owner edit/status controls | Listing owner | Implemented |
| `DELETE /api/v1/job-applications/:jobApplicationId` | `deleteJobApplication` | `/jobs/mine` owner action | Listing owner | Implemented |
| `POST /api/v1/job-applications/:jobApplicationId/restore` | `restoreJobApplication` | `/jobs/mine` owner action for deleted listings | Listing owner | Implemented |
| `POST /api/v1/job-applications/:jobApplicationId/promote` | `promoteJobApplication` | `/jobs`, `/jobs/:id` owner action | Job seeker with credits | Implemented |
| `POST /api/v1/job-applications/:jobApplicationId/apply` | `applyToJobApplication` | `/jobs/:id` apply/respond panel | Company or eligible user per backend policy | Implemented |
| `POST /api/v1/job-applications/:jobApplicationId/submissions/:submissionId/promote` | `promoteJobApplicationSubmission` | `/jobs/:id` submission owner action | Submission owner with credits | Implemented |
| `GET /api/v1/job-applications/:jobApplicationId/submissions` | `listJobApplicationSubmissions` | `/jobs/:id` owner submissions table | Application owner/admin | Implemented |
| `GET /api/v1/job-seeker-billing/wallet` | `getJobSeekerWallet` | `/job-wallet` | Job seeker | Implemented |
| `GET /api/v1/job-seeker-billing/usage` | `getJobSeekerUsage` | `/job-wallet` quota cards | Job seeker | Implemented |
| `GET /api/v1/job-seeker-billing/packs` | `listJobSeekerCreditPacks` | `/job-wallet` credit pack cards | Job seeker | Implemented |
| `GET /api/v1/job-seeker-billing/transactions` | `listJobSeekerTransactions` | `/job-wallet` transaction table | Job seeker | Implemented |
| `POST /api/v1/job-seeker-billing/checkout-sessions` | `createJobSeekerCheckoutSession` | `/job-wallet` buy credits action | Job seeker | Implemented |
| `GET /api/v1/job-seeker-billing/checkout-sessions/:sessionId` | `getJobSeekerCheckoutSession` | `/job-wallet/checkout/:sessionId` | Job seeker | Implemented |
| `POST /api/v1/job-seeker-billing/admin/adjustments` | `adminAdjustJobSeekerCredits` | Admin credit adjustment tool | Platform/admin only | Deferred |
| `GET /api/v1/users/me` + `PATCH /api/v1/users/me` | `getMe`, `updateMyUser` | `/job-profile` | Job seeker | Implemented |
| `GET /api/v1/vehicle-marketplace` | `listVehicleMarketplaceListings` | `/vehicle-marketplace` | Authenticated users | Implemented |
| `POST /api/v1/vehicle-marketplace` | `createVehicleMarketplaceListing` | `/vehicle-marketplace/new` | Company admin or job seeker | Implemented |
| `GET /api/v1/vehicle-marketplace/mine` | `listMyVehicleMarketplaceListings` | `/vehicle-marketplace/mine` | Listing owner | Implemented |
| `GET /api/v1/vehicle-marketplace/:listingId` | `getVehicleMarketplaceListing` | `/vehicle-marketplace/:listingId` | Authenticated users for published listings, owner for own listings | Implemented |

## Required Product Decisions Before UI

- Whether companies can browse and act on job applications from the same company workspace navigation.
- How promotion credits should be messaged alongside company billing so users do not confuse subscription billing with job-seeker wallet credits.
- Which job-seeker roles are part of MVP release UAT, if any.
- Whether job seeker profile images should move from URL metadata to uploaded media assets everywhere.
- Whether job seeker license/owned-vehicle self-service should live primarily in `/job-profile` or stay split across fleet/license and vehicle-marketplace workflows.
- How much of the job-seeker lane must be included in formal MVP UAT versus kept as staging product expansion.

## Recommendation

Keep the current role-aware job lane available for staging smoke. Next job-lane work should focus on self-service license/vehicle attachment polish, Stripe sandbox evidence for wallet checkout, and company-to-job-seeker messaging/notification clarity around submissions.

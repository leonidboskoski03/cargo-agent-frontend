# Navigation IA Decisions

Date: 2026-06-14

## Audit Logs And Release Readiness

Decision: keep both pages, but treat them as company-admin/internal operational tools.

- They stay hidden from company drivers and job seekers.
- They remain inside the Company navigation group for company admins.
- They should not be promoted as primary daily-workflow destinations.
- They provide useful staging, support, and release diagnostics while the release remains NO-GO without real evidence.

## Billing And Credits

Decision: keep billing and credit surfaces role-specific instead of forcing one shared wallet model.

- Company admins use Company -> Billing for subscription/plan/provider state.
- Company admins use Company -> Credits for company marketplace credits.
- Job seekers use Jobs -> Job wallet for independent listing credits.
- Header credit shortcuts stay removed so financial actions live in navigation context, not global chrome.

Future improvement: Billing can become a grouped section with tabs/subroutes for Plan, Credits, Events/Usage, and Provider readiness after the payment setup work in Batch H is complete.

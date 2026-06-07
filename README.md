# Cargo Agent Frontend

Unified React + Vite frontend for Cargo Agent, starting with the company admin and company driver MVP surfaces.

## Stack

- React + Vite + TypeScript
- React Router
- TanStack Query
- Axios
- Zustand
- Tailwind CSS + shadcn/Radix-ready primitives
- React Hook Form + Zod
- i18next + react-i18next
- Framer Motion
- TanStack Table
- Sonner
- date-fns
- lucide-react
- Vitest + Testing Library

## Local Setup

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Default API target:

```txt
http://localhost:4000/api/v1
```

## Scripts

```powershell
npm run dev
npm run build
npm run lint
npm run test
```

## Current MVP Direction

- One unified app with role-aware navigation.
- First focus: `COMPANY_ADMIN` and `COMPANY_DRIVER`.
- Registration should use the backend wizard flow.
- OTP/invite UX should behave like real email/SMS delivery, even while local backend preview codes exist.
- Stripe flows are intended for sandbox checkout first.
- Localization foundation includes `en`, `mk`, `sr`, `tr`, `sq`, `bg`, `hr`, `ro`, and `bs`.
- Future frontend work must follow `DESIGN.md` and the agent rules in `AGENTS.md`.

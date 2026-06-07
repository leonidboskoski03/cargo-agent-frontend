# Cargo Agent Frontend Agent Rules

These rules apply to all future frontend development in this project.

## Required Design Sources

Before writing, editing, or reviewing UI code, always use:

- `DESIGN.md` as the visual source of truth.
- `$frontend-design` for frontend implementation quality and visual polish.
- `$ui-ux-pro-max` for UX structure, accessibility, responsive behavior, forms, tables, navigation, and SaaS interface decisions.
- `$web-design-guidelines` for web guidelines, accessibility checks, CSS quality, and UI review work.
- `$huashu-design` only when minor motion, interaction demos, or animation judgment is needed.

## Product Context

Cargo Agent is a SaaS logistics platform. The frontend should feel like a professional SaaS/marketplace operations app, not a marketing experiment.

## Visual Direction

- Follow the Apple-inspired rules in `DESIGN.md`.
- Use clean SaaS structure with marketplace clarity.
- Keep UI chrome restrained and purposeful.
- Prefer quiet hierarchy, precise spacing, strong typography, and obvious workflows.
- Use Action Blue from `DESIGN.md` as the primary interactive accent.
- Avoid decorative gradients, unnecessary shadows, and generic dashboard styling.

## Motion Rule

Animations must be light, purposeful, and rare.

Use `$huashu-design` for motion only when motion improves clarity, feedback, navigation continuity, or perceived quality. Do not add heavy animation systems or frequent decorative animation; this is a SaaS app and should remain calm and fast.

## Implementation Rule

When a task changes how the app looks, feels, moves, or is interacted with:

1. Read the relevant part of `DESIGN.md`.
2. Apply `$frontend-design` and `$ui-ux-pro-max`.
3. Use `$web-design-guidelines` for review/audit-style work.
4. Use `$huashu-design` only for minor animation decisions.
5. Keep the result consistent with a unified company admin/driver SaaS app.

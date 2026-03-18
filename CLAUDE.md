## Project Overview

NPWT Control — a Next.js 15 application for managing Negative Pressure Wound Therapy (TPN) procedures, machines, inventory, and patients. Built for Colombian healthcare institutions with multi-tenancy support. The UI is entirely in Spanish.

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Backend**: Supabase (auth, database, RLS policies)
- **UI**: shadcn/ui + Radix UI primitives, Tailwind CSS 3, Lucide icons
- **Forms**: react-hook-form + zod validation
- **Charts**: recharts
- **Toasts**: sonner

## Architecture

### Authentication & Authorization

- Supabase Auth with email/password. Auth logic in `lib/auth.ts` (AuthService class).
- `AuthProvider` (components/auth/auth-provider.tsx) wraps the entire app and provides `useAuth()` hook.
- `ProtectedRoute` component guards pages by required roles.
- Four roles: `administrador`, `soporte`, `asistente`, `gerente` — defined in `lib/roles.ts`.
- Permission checks via `usePermissions()` hook in `hooks/use-permissions.ts`.

### Multi-Institution Tenancy

- Users can belong to multiple institutions via `user_institutions` join table.
- `InstitutionProvider` (components/institutions/institution-provider.tsx) manages active institution context, persisted to localStorage key `tpn-active-institution-id`.
- All data queries filter by institution_id.

### Data Layer

- Direct Supabase client calls from client components (no API routes).
- Supabase client configured in `lib/supabase.ts` with retry logic (`executeWithRetry`) and mobile-aware timeouts.
- Database types are auto-generated in `lib/database.types.ts`.
- Core tables: institutions, users, user_institutions, patients, procedures, machines, machine_transfers, inventory_products, inventory_movements, procedure_products.

### Routing

All pages are client components ("use client"). Key routes:

- `/` — Main dashboard (stats, recent procedures, alerts)
- `/auth/login`, `/auth/register`, `/auth/forgot-password` — Auth pages
- `/auth/callback` — Email verification
- `/dashboard-global` — Global view for gerente/admin roles
- `/admin` — Administration panel
- `/pacientes` — Patient management
- `/maquinas` — Machine CRUD with filters
- `/inventario` — Inventory and stock alerts
- `/nuevo-procedimiento` — Create procedure
- `/procedimiento/[id]` — Procedure details/edit
- `/informes` — Reports

Gerente users are routed to `/dashboard-global` on login; all others to `/`.

### Providers (Root Layout)

`AuthProvider` → `InstitutionProvider` → page content. Both are React Context-based.

## Key Conventions

- **Timezone**: All dates use Colombia timezone (America/Bogota). Use helpers in `lib/utils.ts`: `getCurrentDateInColombia()`, `formatDateForColombia()`, `formatTimestampForColombia()`.
- **Currency**: Colombian Pesos (COP).
- **Styling**: Use `cn()` from `lib/utils.ts` (clsx + tailwind-merge) for conditional classes.
- **Machine display names**: Use `getMachineDisplayName()` from `lib/utils.ts` — appends (C) for Cassette or (P) for Peristaltic based on lote patterns.
- **Path alias**: `@/*` maps to project root.
- **Mobile**: Touch targets minimum 44x44px. Mobile detection at 768px breakpoint via `useMobile()` hook.
- **Supabase migrations**: Located in `supabase/` directory. See `INSTRUCCIONES_MIGRACION.md` for migration procedures.

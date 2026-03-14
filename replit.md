# VivaFrutaz B2B Ordering System

## Overview

VivaFrutaz is a B2B corporate fruit ordering platform built for companies to log in and place weekly fruit orders. The system supports role-based access with admin staff managing companies, products, pricing, and order windows, while client companies place and track orders through a separate interface.

Key features:
- Dual-portal system: Admin staff portal + Client company portal
- Role-based access control (ADMIN, DIRECTOR, OPERATIONS_MANAGER, PURCHASE_MANAGER, FINANCEIRO, DEVELOPER)
- Price groups tied strictly to individual companies; finalPrice = basePrice × (1 + adminFee/100)
- Time-windowed ordering (order windows with open/close/delivery dates) with delete support
- Purchasing and financial reports with CSV export (NF / Nimbi formats)
- Pedidos Pontuais (special orders): client requests + admin review workflow
- User management admin page (CRUD for all staff users; active/inactive toggle + login block)
- CNPJ + full delivery address on company profiles
- Day-lock in cart: cannot switch day when cart has items
- Automatic daily database backup (17:00) with up to 30 kept; admin download UI
- Automatic email system (nodemailer SMTP): order placed, status change, password reset, special orders
- Email status indicator on Backup page (shows if SMTP is configured)
- Full Brazilian Portuguese (PT-BR) interface
- Developer area (/admin/developer): System Logs, Audit system, AI Bug Detector tabs
- Financial panel with date filters (Hoje/Esta Semana/Este Mês/Período Personalizado) + Nimbi expiration filter
- NimbiExpiration date field on orders (editable inline in admin orders expanded detail)
- Double-click protection on order submission
- Duplicate order protection (in-memory, 60-second window per companyId:deliveryDate:orderWindowId)
- System logs table with level (INFO/WARN/ERROR), action, user, IP tracking
- Developer user auto-seeded: dev@vivafrutaz.com / dev
- Cart auto-save/recovery: localStorage (key vf_cart_{companyId}_{windowId}); toast on restore; cleared on submit
- Role-based route protection: per-route allowedRoles in ProtectedRoute; unauthorized access logs + redirect to /admin
- Maintenance mode: stored in systemSettings (key: maintenance_mode); toggle in admin dashboard; blocks all client routes; ADMIN/DIRECTOR/DEVELOPER bypass
- Secure password change: PUT /api/users/:id/password; only ADMIN/DIRECTOR/DEVELOPER can change passwords; confirmation dialog; full audit logging; temp password Viva2026@
- Test mode: stored in systemSettings (key: test_mode); orders intercepted to test_orders table with TESTE-{year}-{id} code; amber banner shown to staff; toggle in dashboard for ADMIN/DIRECTOR/DEVELOPER
- Tarefas (tasks): kanban board (Pendente/Em andamento/Concluída); ADMIN/DIRECTOR/DEVELOPER create/edit/delete; all staff see assigned tasks; priority LOW/MEDIUM/HIGH; deadline support; audit logs
- Ocorrências de Clientes: client portal (/client/incidents) to register incidents with type/description/photo/contact; admin panel (/admin/client-incidents) for ADMIN/DIRECTOR/DEVELOPER/OPS to view and update status + admin note; base64 photo storage
- Ocorrências Internas: all staff can create; visible to ADMIN/DIRECTOR/DEVELOPER/OPS; categories LOGISTICS/QUALITY/FINANCIAL/SYSTEM/OTHER; priority/status tracking; audit logs

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter (lightweight client-side router) with protected route wrappers
- **State/Data Fetching**: TanStack React Query for server state; sessions tracked via `/api/auth/me`
- **UI Components**: shadcn/ui component library (New York style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming; green primary + orange secondary palette
- **Forms**: React Hook Form with Zod validation via `@hookform/resolvers`
- **Charts**: Recharts for financial and purchasing dashboards
- **Custom Modals**: Custom `Modal.tsx` component used instead of Dialog for full styling control

#### Key Frontend Pages
- `/login` — Unified login for admin staff and client companies (type toggle)
- `/admin` — Dashboard, Companies, Products, Price Groups, Order Windows, Orders, Reports (Purchasing + Financial)
- `/client` — Client Dashboard, Create Order, Order History

#### Auth Flow
- `useAuth` hook queries `/api/auth/me` to determine session state
- Auth state determines route access via `ProtectedRoute` wrapper
- `isStaff` vs `isClient` drives sidebar navigation and page access

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript compiled via `tsx` in dev; esbuild bundled in production
- **Session Management**: `express-session` with `memorystore` (in-memory session store)
- **API Structure**: Centralized route definitions in `shared/routes.ts` with Zod-typed inputs and response schemas; actual route handlers in `server/routes.ts`
- **Storage Layer**: `server/storage.ts` defines an `IStorage` interface; implementation uses Drizzle ORM queries against PostgreSQL
- **Build**: `script/build.ts` runs Vite (client) + esbuild (server) bundling sequentially

#### API Design
- All API paths defined in `shared/routes.ts` as typed constants, shared between frontend and backend
- `buildUrl()` helper handles path parameter substitution
- Zod schemas used for both input validation and response parsing

### Data Storage
- **Database**: PostgreSQL via `drizzle-orm/node-postgres` (pg Pool)
- **ORM**: Drizzle ORM with schema defined in `shared/schema.ts`
- **Migrations**: Drizzle Kit (`drizzle-kit push` / `migrations/` folder)
- **Config**: `DATABASE_URL` environment variable required

#### Database Schema (key tables)
- `users` — Admin staff accounts (name, email, password, role)
- `price_groups` — Named pricing tiers (e.g., GRSA, Sodexo)
- `companies` — Client companies with `price_group_id` FK, `allowed_order_days`, financial config, admin fee
- `products` — Fruit catalog (name, category, unit, active flag)
- `product_prices` — Prices per product per price group (strict FK relationship)
- `order_windows` — Time-bounded ordering periods (open/close/delivery date ranges, forceOpen flag)
- `orders` — Company orders referencing an order window
- `order_items` — Line items on each order
- `system_settings` — Key-value system configuration

#### Important Business Rules
- Each company is strictly linked to exactly one `price_group_id`
- Product prices must be filtered by the company's price group only (never mix groups)
- Order windows control when companies can place orders; `forceOpen` can override the schedule
- Companies have `allowed_order_days` (JSONB) restricting which days they can order
- **Pricing formula**: `finalPrice = product.basePrice × (1 + company.adminFee / 100)`. Clients see only final price; admin sees base + fee breakdown
- **Order codes**: Auto-generated as `VF-YEAR-XXXXXX` (e.g., `VF-2026-000001`) when an order is created
- **Deadline rule**: Orders are blocked after Thursday 12:00 unless `orderWindows.forceOpen = true`
- **Global toggle**: `system_settings` table key `orders_enabled` = `"true"/"false"` controls all orders system-wide
- **Order notes**: Clients can add a free-text `orderNote` per order visible to admins in the orders table

### Authentication & Authorization
- Session-based auth using `express-session`
- Two session types: `userId` + `userType: 'admin'` for staff; `companyId` + `userType: 'company'` for clients
- Role values: `ADMIN`, `OPERATIONS_MANAGER`, `PURCHASE_MANAGER`
- Frontend `ProtectedRoute` checks `isStaff` / `isClient` and redirects accordingly
- Passwords currently stored as plain text in DB — should be hashed before production use

### Shared Code (`shared/`)
- `shared/schema.ts` — Single source of truth for DB schema and Zod insert schemas (used by both client and server)
- `shared/routes.ts` — Typed API route registry with paths, HTTP methods, input/output Zod schemas

## External Dependencies

### Core Infrastructure
- **PostgreSQL** — Primary database; requires `DATABASE_URL` environment variable
- **Node.js / Express 5** — Server runtime and HTTP framework

### Key npm Packages
| Package | Purpose |
|---|---|
| `drizzle-orm` + `drizzle-zod` | ORM and schema-to-Zod bridge |
| `drizzle-kit` | DB migrations and schema push |
| `pg` | PostgreSQL client |
| `express-session` + `memorystore` | Session management (in-memory store) |
| `wouter` | Client-side routing |
| `@tanstack/react-query` | Server state management |
| `react-hook-form` + `@hookform/resolvers` | Form handling with Zod validation |
| `zod` | Schema validation shared across client/server |
| `recharts` | Charts for reports |
| `date-fns` | Date manipulation |
| `lucide-react` | Icon library |
| `nanoid` | ID generation |
| `memorystore` | In-memory session store (not persistent across restarts) |

### Replit-Specific Plugins (dev only)
- `@replit/vite-plugin-runtime-error-modal` — Runtime error overlay
- `@replit/vite-plugin-cartographer` — Code mapping tool
- `@replit/vite-plugin-dev-banner` — Dev environment banner

### Fonts (Google Fonts CDN)
- Plus Jakarta Sans (body)
- Outfit (display/headings)

### Notes for Development
- `SESSION_SECRET` env var should be set; falls back to hardcoded string (not safe for production)
- `memorystore` sessions are lost on server restart — consider `connect-pg-simple` with the existing PostgreSQL DB for persistence if needed
- The `allowlist` in `script/build.ts` controls which dependencies get bundled into the server binary vs. kept as externals
# VivaFrutaz B2B Ordering System

## Overview

VivaFrutaz is a B2B corporate fruit ordering platform designed for companies to place weekly fruit orders. It features a dual-portal system for admin staff and client companies, supporting role-based access, time-windowed ordering, and comprehensive reporting. The platform aims to streamline the fruit procurement process for businesses, offering features like customized pricing, special order workflows, and robust user and order management. It includes a built-in logistics module, executive dashboard, virtual assistant, and incident management for both internal and client-related issues. The system is entirely in Brazilian Portuguese (PT-BR).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite.
- **Routing**: Wouter, with `ProtectedRoute` for access control.
- **State Management**: TanStack React Query for server state.
- **UI Components**: shadcn/ui (New York style) built on Radix UI, styled with Tailwind CSS (green/orange palette).
- **Forms**: React Hook Form with Zod validation.
- **Charts**: Recharts for data visualization in dashboards.
- **Modals**: Custom `Modal.tsx` component.
- **Auth Flow**: `useAuth` hook and `ProtectedRoute` determine session type (`isStaff`/`isClient`) and manage access.

### Backend Architecture
- **Runtime**: Node.js with Express 5.
- **Language**: TypeScript, compiled with `tsx` (dev) and esbuild (prod).
- **Session Management**: `express-session` with `memorystore`.
- **API Design**: Centralized, typed API definitions (`shared/routes.ts`) with Zod schemas for validation and `buildUrl()` for path parameter handling.
- **Storage Layer**: `IStorage` interface implemented using Drizzle ORM and PostgreSQL.
- **Build**: `script/build.ts` orchestrates client (Vite) and server (esbuild) bundling.

### Data Storage
- **Database**: PostgreSQL, accessed via `drizzle-orm/node-postgres`.
- **ORM**: Drizzle ORM, with schema defined in `shared/schema.ts`.
- **Migrations**: Drizzle Kit.
- **Key Tables**: `users`, `price_groups`, `companies`, `products`, `product_prices`, `order_windows`, `orders`, `order_items`, `system_settings`.
- **Business Rules**: Companies linked to one `price_group_id`. Product prices filtered by company's price group. `finalPrice = product.basePrice × (1 + company.adminFee / 100)`. Order codes are auto-generated (`VF-YEAR-XXXXXX`). Orders blocked after Thursday 12:00 (unless `forceOpen`). `orders_enabled` in `system_settings` controls system-wide ordering.

### Authentication & Authorization
- Session-based authentication using `express-session`.
- Supports `admin` and `company` user types with distinct roles (e.g., ADMIN, OPERATIONS_MANAGER, PURCHASE_MANAGER, LOGISTICS).
- Role-based route protection implemented via `ProtectedRoute`.
- Passwords are currently plain text and require hashing for production.

### Shared Code (`shared/`)
- `schema.ts`: Defines DB schema and Zod insert schemas for both client and server.
- `routes.ts`: Typed API route registry with paths, HTTP methods, and Zod schemas.

### Core Features
- **Role-Based Access**: ADMIN, DIRECTOR, OPERATIONS_MANAGER, PURCHASE_MANAGER, FINANCEIRO, DEVELOPER, LOGISTICS.
- **Price Management**: Price groups, `adminFee` calculation, product pricing per group.
- **Ordering System**: Time-windowed orders, special orders (Pedidos Pontuais), cart auto-save/recovery, duplicate order protection, order notes.
- **Reporting**: Purchasing and financial reports with CSV export (NF/Nimbi formats).
- **User Management**: CRUD for staff, login blocking, password management.
- **System Automation**: Daily DB backups (with UI management), automatic email system (order status, password reset, etc.), cron for log cleanup.
- **Developer Tools**: System Logs (advanced filtering, export, cleanup), Auditoria (KPIs), System Sync (`Sincronização Global`) for verifying system dimensions, AI Bug Detector, System Health.
- **Logistics Module (`Módulo Logística`)**: Routes, Drivers, Vehicles, Maintenance, Quotations (`Cotações`) with delivery windows management.
- **Executive Dashboard (`Dashboard Executivo`)**: KPIs, charts, alerts, top companies/products.
- **Virtual Assistant (`Assistente Virtual`)**: Floating chat widget with FAQ-based answers.
- **Incident Management**: Client incidents (`Ocorrências de Clientes`) and internal incidents (`Ocorrências Internas`) with workflows and status tracking.
- **Maintenance/Test Modes**: System-wide toggles with bypass for privileged roles.

## External Dependencies

### Core Infrastructure
- **PostgreSQL**: Primary database.
- **Node.js / Express 5**: Server runtime and framework.

### Key npm Packages
- `drizzle-orm`, `drizzle-zod`, `drizzle-kit`: ORM and database tooling.
- `pg`: PostgreSQL client.
- `express-session`, `memorystore`: Session management.
- `wouter`: Frontend routing.
- `@tanstack/react-query`: Server state management.
- `react-hook-form`, `@hookform/resolvers`: Form handling.
- `zod`: Schema validation.
- `recharts`: Charting library.
- `date-fns`: Date utility library.
- `lucide-react`: Icon library.
- `nanoid`: ID generation.

### Fonts
- Plus Jakarta Sans (body) and Outfit (display/headings) via Google Fonts CDN.
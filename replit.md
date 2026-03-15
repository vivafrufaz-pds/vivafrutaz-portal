# VivaFrutaz B2B Ordering System

## Overview
VivaFrutaz is a B2B corporate fruit ordering platform in Brazilian Portuguese (PT-BR), designed for companies to place weekly fruit orders. It features a dual-portal system for admin and client companies, supporting role-based access, time-windowed ordering, comprehensive reporting, and a built-in logistics module. Key capabilities include an executive dashboard, Flora IA (an intelligent chat assistant with smart export and intelligence modules), and an incident management system for both internal and client-related issues. The project aims to streamline the B2B fruit ordering process, improve logistics, and provide advanced analytics for better decision-making.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and Vite.
- **Routing**: Wouter, with `ProtectedRoute` for access control.
- **State Management**: TanStack React Query for server state.
- **UI Components**: shadcn/ui (New York style) based on Radix UI, styled with Tailwind CSS (green/orange palette).
- **Forms**: React Hook Form with Zod validation.
- **Charts**: Recharts for data visualization.
- **Modals**: Custom `Modal.tsx` component.
- **Authentication**: `useAuth` hook and `ProtectedRoute` manage session types (`isStaff`/`isClient`) and access.
- **PWA Support**: Manifest and service worker for offline capabilities and install prompt.
- **Push Notifications**: Integrated system with VAPID keys, database tables for subscriptions/settings, and event-driven notifications.

### Backend Architecture
- **Runtime**: Node.js with Express 5.
- **Language**: TypeScript, compiled with `tsx` (dev) and esbuild (prod).
- **Session Management**: `express-session` with `memorystore`.
- **API Design**: Centralized, typed API definitions (`shared/routes.ts`) with Zod schemas for validation.
- **Storage Layer**: `IStorage` interface implemented using Drizzle ORM and PostgreSQL.
- **Build**: `script/build.ts` orchestrates client (Vite) and server (esbuild) bundling.

### Data Storage
- **Database**: PostgreSQL, accessed via `drizzle-orm/node-postgres`.
- **ORM**: Drizzle ORM, with schema defined in `shared/schema.ts` and migrations via Drizzle Kit.
- **Key Tables**: `users`, `price_groups`, `companies`, `products`, `orders`, `system_settings`, `order_windows`, `order_items`, `push_subscriptions`, `notification_settings`, `waste_control`, `purchase_plan_status`, `danfe_records`, `company_config`, `inventory_settings`, `inventory_entries`, `inventory_movements`, `inventory_physical_counts`, `about_us`, `smtp_config`.
- **Business Rules**: Companies linked to price groups; `finalPrice` calculation includes `adminFee`; auto-generated order codes; time-windowed order blocking with override.

### Authentication & Authorization
- Session-based authentication with `express-session`.
- Role-based access control for `admin` and `company` user types (ADMIN, OPERATIONS_MANAGER, PURCHASE_MANAGER, LOGISTICS, FINANCEIRO, DIRECTOR, DEVELOPER).
- Role-based route and tab protection enforced by `ProtectedRoute` and `tabPermissions`.

### Core Features
- **Role-Based Access**: Granular permissions across various roles.
- **Price Management**: Dynamic pricing via price groups and `adminFee`.
- **Ordering System**: Time-windowed orders, special orders, cart features, order notes, and an order date-lock/reopen workflow.
- **Reporting & Exports**: Purchasing and financial reports with CSV export, DANFE Internal PDF generator, ERP Bling Export, and Fiscal Export Module (XML/XLSX).
- **User Management**: CRUD operations for staff, login blocking, password management.
- **System Automation**: Daily DB backups, automated email system, cron for log cleanup.
- **Developer Tools**: System Logs, Auditoria (KPIs), System Sync, AI Bug Detector, System Health.
- **Logistics Module**: Manages routes, drivers, vehicles, maintenance, quotations, and includes a Route Assistant with geocoding integration for optimized delivery planning.
- **Contratual Client Module**: Dedicated experience for companies with `clientType='contratual'`:
  - Blocked manual ordering (redirect with explanation on `/client/order`)
  - "Meu Escopo Contratual" tab replacing "Novo Pedido" in both dashboard and sidebar navigation
  - View-only scope page (`/client/contract-scope`) with summary cards (valor semanal, mensal, entregas/semana, volume) and items grouped by day
  - "Solicitar alteração de escopo" dialog → creates admin task via `POST /api/client/scope-change-request`
  - Email scheduler already blocks window/order emails for contratual clients
  - Flora IA updated with scope query handling: product queries, volume, value, delivery days, change requests via chat (multi-turn confirmation flow)
- **Executive Dashboard**: Provides KPIs, charts, and alerts.
- **Virtual Assistant (Flora IA)**: Panel-first interface with smart export capabilities (e.g., "exportar pedidos da semana"), intelligence modules (commercial risk, financial forecast), and a trainable chat mode.
- **Incident Management**: Tracks client and internal incidents with workflows and status.
- **Maintenance/Test Modes**: System-wide toggles and a `SISTEMA_TESTE` role for testing.
- **Company Features**: GPS coordinates for logistics, various contract types (semanal, mensal, pontual, contratual with `contractModel` and `contract_scopes`), minimum weekly billing validation.
- **Waste Control Module**: Tracks waste events, reasons, and financial impact.
- **Purchase Planning Module**: Aggregates order items for procurement planning, including per-product-week purchase statuses.
- **Fiscal Management**: Product fiscal fields (NCM, CFOP, commercialUnit), fiscal status tracking, pre-nota generation, and ERP integration.
- **Inventory Module**: Comprehensive system for managing inventory entries, movements, physical counts, and low-stock alerts.
- **Institutional Page**: Customizable "Quem Somos Nós" page.
- **SMTP Configuration**: Dynamic configuration of email settings.
- **IA Operacional — Central de Inteligência**: Predictive analysis across inventory, clients, products, logistics, and system, generating actionable alerts.

## External Dependencies

### Core Infrastructure
- **PostgreSQL**: Primary relational database.
- **Node.js / Express 5**: Backend runtime and web application framework.

### Key npm Packages
- `drizzle-orm`, `drizzle-zod`, `drizzle-kit`: ORM and database schema tools.
- `pg`: PostgreSQL client.
- `express-session`, `memorystore`: Session management for Express.
- `wouter`: Lightweight client-side router for React.
- `@tanstack/react-query`: Data fetching and state management.
- `react-hook-form`, `@hookform/resolvers`: Form management and validation.
- `zod`: Schema declaration and validation library.
- `recharts`: Composable charting library built with React and D3.
- `date-fns`: Modern JavaScript date utility library.
- `lucide-react`: Collection of beautiful open-source icons.
- `nanoid`: Tiny, secure, URL-friendly, unique string ID generator.
- `jspdf`, `jspdf-autotable`: Libraries for client-side PDF generation.
- `qrcode`: Library for generating QR codes.
- `xlsx`: Library for reading and writing Excel (XLSX) files.

### Fonts
- Plus Jakarta Sans (body) and Outfit (display/headings) via Google Fonts CDN.
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
- **Logistics Module (`Módulo Logística`)**: Routes, Drivers, Vehicles, Maintenance, Quotations (`Cotações`) with delivery windows management. Includes **Route Assistant** tab (`🧠 Assistente`) at `/admin/logistics` — select a day of week + optional delivery date, endpoint `GET /api/logistics/route-assistant?day=...&date=...` returns companies sorted by delivery window start time, user can reorder manually, print a formatted manifesto PDF, or create a logistics route directly. Each saved route also has a print manifesto (🖨️) button in the Rotas tab.
- **Executive Dashboard (`Dashboard Executivo`)**: KPIs, charts, alerts, top companies/products.
- **Virtual Assistant (`Assistente Virtual`)**: Floating chat widget with FAQ-based answers.
- **Incident Management**: Client incidents (`Ocorrências de Clientes`) and internal incidents (`Ocorrências Internas`) with workflows and status tracking.
- **Maintenance/Test Modes**: System-wide toggles with bypass for privileged roles.
- **Tab-Level Permissions**: `tabPermissions jsonb` on users; admin UI checkboxes per-role; `Layout.tsx` filters sidebar; `ProtectedRoute` enforces per-tab access. ADMIN/DIRECTOR/DEVELOPER can configure.
- **Order Date-Lock & Reopen Workflow**: New orders start as `CONFIRMED` (locked). Clients request reopening from history page; admins (ADMIN/DIRECTOR/OPERATIONS_MANAGER/LOGISTICS) approve/deny from `/admin/orders`; approved orders enter `OPEN_FOR_EDITING` state, client edits via `/client/order/edit/:id`, and finalizes back to `CONFIRMED`. Status flow: `CONFIRMED → REOPEN_REQUESTED → OPEN_FOR_EDITING → CONFIRMED`. Date-lock blocks duplicate delivery date orders on create page.
- **Quotation → Company Conversion**: APPROVED quotations show a green "Converter" button. Opens `ConvertToCompanyModal` with pre-filled company form from quotation data. On submit: POST `/api/companies`, then PATCH quotation status. Invalidates both caches. Shows success screen with default password reminder.
- **SISTEMA_TESTE Role**: Staff users with role `SISTEMA_TESTE` always have their orders redirected to `test_orders` table (same as test_mode for clients), regardless of test mode setting. Check is in `POST /api/orders` before test_mode check.
- **Company GPS Coordinates**: `latitude` and `longitude` numeric fields added to `companies` table and company edit form (under "Endereço de Entrega" section). Used by Route Assistant for geographic grouping. Optional — existing companies work without coordinates.
- **Company Contract Types**: Companies can be `semanal`, `mensal`, `pontual`, or `contratual`. Contratual companies have a `contractModel` (fixo/variável/alternado/rotacao4) and a contract scope (`contract_scopes` table) defining weekly product quantities per day/week rotation. `rotacao4` shows a 4-option week selector (Semana 1–4 / Listas A–D) in the ContractScopeManager. Managed via the "Escopo Contratual" tab in the admin companies panel.
- **Waste Control Module (`Controle de Desperdício`)**: Table `waste_control` tracks waste events with date, product, quantity, reason (expired/damaged/overripe/separation_error/logistics_error/other), description, and financial impact. API: `GET/POST/PATCH/DELETE /api/waste-control`. Page at `/admin/waste-control` shows KPI cards (total events, total quantity, total financial impact), filters by reason/month, full CRUD table with create/edit dialog. Nav item added for ADMIN, DIRECTOR, OPERATIONS_MANAGER.
- **Purchase Planning Module (`Planejamento de Compras`)**: API `GET /api/purchase-planning?startDate=&endDate=&weekRef=` aggregates confirmed order items grouped by product across the date range, `GET /api/purchase-planning/status` + `PATCH /api/purchase-planning/status` + `GET /api/purchase-planning/statuses` manage per-product-week purchase statuses (`purchase_plan_status` table: productName, weekRef, status PENDING/BUYING/BOUGHT/UNAVAILABLE). Page at `/admin/purchase-planning` shows a week picker, aggregated list of all products needed, expandable company breakdown per product, status chips per product with a dialog to change status. Nav item added for ADMIN, DIRECTOR, PURCHASE_MANAGER.
- **Logistics Company Auto-Fill**: Route creation dialog in the RoutesTab (logistics.tsx) uses a company picker Select (populated from `/api/companies`) instead of a plain text field. Selecting a company auto-appends to the `companyNames` field and shows the company's address in a toast.
- **Geocoding via Backend Proxy**: `GET /api/geocode?q=...` proxies Nominatim OpenStreetMap with proper `User-Agent` header from the server (browsers can't set User-Agent). The "Buscar Coordenadas" button in the company form calls this proxy with the full address + "Brasil" appended.
- **Faturamento Mínimo Semanal**: In `create-order.tsx`, weekly billing validation uses `companyOrders` filtered by `weekReference === activeWindow.weekReference` to compute `weeklyOrdersTotal`. A progress bar in the cart shows current week total vs minimum. When `projectedWeeklyTotal < minWeeklyBilling` on submit, a warning modal appears with "Adicionar Mais Produtos" (dismiss) and "Continuar Pedido" (force submit) options.
- **Janela de Entrega**: In companies.tsx Config tab, the "Horário de Entrega" single time picker is replaced by a "Janela de Entrega" read-only view that displays all enabled days from `deliveryConfigJson` with their start–end time windows. The `deliveryTime` field is preserved in the schema for legacy compatibility.
- **DANFE Internal PDF Generator**: Client-side PDF generation using jsPDF + jspdf-autotable + QRCode. Available in the expanded order view on `/admin/orders` for ADMIN, DIRECTOR, FINANCEIRO, LOGISTICS, DEVELOPER, OPERATIONS_MANAGER roles. Generates a styled DANFE Interno document with company info, client info, product table (with NCM/CFOP columns when available), totals, logistics info, and a QR code linking to the order. Includes pre-nota number, natureza da operação, IE for both sender and recipient. Generation history is logged in the `danfe_records` table. Library at `client/src/lib/danfe-generator.ts`. Remetente block automatically populates from `company_config` table.
- **Fiscal Export Module (ERP)**: Fully integrated fiscal management per order in the expanded order view. Includes: (1) DANFE section for PDF download/view, (2) ERP Export section with Excel (.xlsx via xlsx library) and XML NF-e export buttons, (3) Fiscal Status panel with 4 status options (nota_pendente/nota_exportada/nota_emitida/nota_cancelada) — each can be set via toggle buttons, (4) Pre-nota number display with auto-generation button (VF-NF-XXXXXX format). Fiscal status badge appears in the order table rows. Filter by fiscal status with dropdown filter. Backend routes: `PATCH /api/orders/:id/fiscal`, `POST /api/orders/:id/generate-prenota`, `GET /api/orders/:id/export-erp`. Orders table now has `fiscalStatus` (default: nota_pendente) and `preNotaNumber` columns.
- **Fiscal Fields on Products**: Products now have `ncm` (Nomenclatura Comum do Mercosul), `cfop` (Código Fiscal de Operações), and `commercialUnit` fields. These are shown in the product form under a "Dados Fiscais" section and are included in DANFE/Excel/XML exports. 
- **Client Incident Delete & PDF**: Admins (ADMIN/DIRECTOR/DEVELOPER) can delete client incidents with a confirmation dialog. All users can download a PDF report of any incident via `client/src/lib/incident-pdf-generator.ts`. Deletion syncs instantly — the record is removed from DB so the client no longer sees it.
- **Company Config (Suporte/DANFE)**: `company_config` table stores company name, fantasy name, address, city, state, CEP, phone, email, CNPJ, IE (stateRegistration), support phone/email, default help message, defaultCfop, and defaultNatureza. Managed at `/admin/support` (ADMIN/DIRECTOR/DEVELOPER only). API: `GET/PATCH /api/company-config`. DANFE automatically reads this config for the Remetente block including all fiscal fields.
- **Inventory Module (Módulo Estoque)**: Tables `inventory_settings`, `inventory_entries`, `inventory_movements`, `inventory_physical_counts`. Full CRUD API (10 endpoints). Page at `/admin/inventory` with 4 tabs: Painel (KPIs + low-stock alerts), Entradas (product entry records), Movimentações (stock movements with type tracking), Inventário Físico (physical count sessions with discrepancy tracking). Auto-deduction on order CONFIRM. CSV export.

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
- `jspdf`, `jspdf-autotable`: Client-side PDF generation for DANFE documents.
- `qrcode`: QR code generation embedded in DANFE PDFs.
- `xlsx`: Excel (.xlsx) spreadsheet generation for ERP fiscal export.

### Fonts
- Plus Jakarta Sans (body) and Outfit (display/headings) via Google Fonts CDN.
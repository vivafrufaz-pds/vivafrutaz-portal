import { pgTable, text, serial, integer, boolean, timestamp, numeric, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(),
  active: boolean("active").default(true).notNull(),
  tabPermissions: jsonb("tab_permissions"), // string[] | null — null means no restriction (use role defaults)
});

export const priceGroups = pgTable("price_groups", {
  id: serial("id").primaryKey(),
  groupName: text("group_name").notNull(),
  description: text("description"),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  // Dados Básicos
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull().unique(),
  notificationEmail: text("notification_email"),
  password: text("password").notNull(),
  phone: text("phone"),
  cnpj: text("cnpj"),
  priceGroupId: integer("price_group_id").references(() => priceGroups.id),
  allowedOrderDays: jsonb("allowed_order_days").notNull(),
  // Endereço
  addressStreet: text("address_street"),
  addressNumber: text("address_number"),
  addressNeighborhood: text("address_neighborhood"),
  addressCity: text("address_city"),
  addressZip: text("address_zip"),
  // Configurações
  active: boolean("active").default(true).notNull(),
  clientType: text("client_type").default("mensal"),
  contractModel: text("contract_model"), // "fixo" | "variavel" | "alternado" — only for clientType "contratual"
  minWeeklyBilling: numeric("min_weekly_billing", { precision: 10, scale: 2 }),
  deliveryTime: text("delivery_time"),
  // Coordenadas geográficas (para cálculo de rota)
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  // Configuração de janela de entrega por dia da semana
  // JSON: { "Segunda-feira": { enabled: boolean, startTime: string, endTime: string }, ... }
  deliveryConfigJson: text("delivery_config_json"),
  // Taxa administrativa (%)
  adminFee: numeric("admin_fee", { precision: 5, scale: 2 }).default("0"),
  // Financeiro
  billingTerm: text("billing_term"),
  billingType: text("billing_type"),
  billingFormat: text("billing_format"),
  paymentDates: text("payment_dates"),
  financialNotes: text("financial_notes"),
  // Dados fiscais do cliente
  stateRegistration: text("state_registration"), // Inscrição Estadual
  addressState: text("address_state"), // UF, ex: "SP"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Contract scopes: define the product list per day for contractual companies
export const contractScopes = pgTable("contract_scopes", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  dayOfWeek: text("day_of_week").notNull(), // "Segunda-feira", "Terça-feira", etc.
  weekNumber: integer("week_number"), // null = all weeks; 1 or 2 for "alternado" contracts
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  observation: text("observation"),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  unit: text("unit").notNull(),
  active: boolean("active").default(true).notNull(),
  // Preço base interno da VivaFrutaz
  basePrice: numeric("base_price", { precision: 10, scale: 2 }),
  // Flags
  isIndustrialized: boolean("is_industrialized").default(false).notNull(),
  isSeasonal: boolean("is_seasonal").default(false).notNull(),
  // Observação exibida ao cliente no catálogo e nos relatórios
  observation: text("observation"),
  // Dias da semana em que o produto está disponível (null = todos os dias)
  // ex: ["Segunda-feira","Quarta-feira","Sexta-feira"]
  availableDays: jsonb("available_days"),
  // Dados fiscais
  ncm: text("ncm"), // Nomenclatura Comum do Mercosul, ex: "08039000"
  cfop: text("cfop"), // Código Fiscal de Operações, ex: "5102"
  commercialUnit: text("commercial_unit"), // Unidade comercial para NF, ex: "KG"
  // Curiosidade educativa do produto
  curiosity: text("curiosity"),
});

export const productPrices = pgTable("product_prices", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  priceGroupId: integer("price_group_id").references(() => priceGroups.id).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
});

export const orderWindows = pgTable("order_windows", {
  id: serial("id").primaryKey(),
  weekReference: text("week_reference").notNull(),
  orderOpenDate: timestamp("order_open_date").notNull(),
  orderCloseDate: timestamp("order_close_date").notNull(),
  deliveryStartDate: timestamp("delivery_start_date").notNull(),
  deliveryEndDate: timestamp("delivery_end_date").notNull(),
  active: boolean("active").default(true).notNull(),
  forceOpen: boolean("force_open").default(false).notNull(),
});

// Empresas com exceção de pedidos (podem pedir mesmo com a janela fechada)
export const orderExceptions = pgTable("order_exceptions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  reason: text("reason").notNull(),
  expiryDate: date("expiry_date"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderCode: text("order_code").unique(),
  status: text("status").default("ACTIVE").notNull(),
  // status values: ACTIVE (legacy), CONFIRMED, REOPEN_REQUESTED, OPEN_FOR_EDITING, CANCELLED, DELIVERED
  adminNote: text("admin_note"),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  orderDate: timestamp("order_date").defaultNow().notNull(),
  deliveryDate: timestamp("delivery_date").notNull(),
  weekReference: text("week_reference").notNull(),
  totalValue: numeric("total_value", { precision: 10, scale: 2 }).notNull(),
  orderNote: text("order_note"),
  allowReplication: boolean("allow_replication").default(false).notNull(),
  nimbiExpiration: date("nimbi_expiration"),
  reopenReason: text("reopen_reason"),
  reopenRequestedAt: timestamp("reopen_requested_at"),
  // Dados fiscais
  fiscalStatus: text("fiscal_status").default("nota_pendente"), // nota_pendente | nota_exportada | nota_emitida | nota_cancelada
  preNotaNumber: text("pre_nota_number"), // VF-NF-000001
  // Exportação ERP Bling
  erpExportStatus: text("status_exportacao_erp").default("nao_exportado"), // nao_exportado | exportando | exportado | erro
  erpExportedAt: timestamp("data_exportacao_erp"),
  erpId: text("id_erp"),
  erpExportError: text("erro_exportacao_erp"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
});

export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// Solicitações de pedidos pontuais (clientes)
export const specialOrderRequests = pgTable("special_order_requests", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  requestedDay: text("requested_day").notNull(),
  requestedDate: text("requested_date"),
  description: text("description").notNull(),
  quantity: text("quantity").notNull(),
  observations: text("observations"),
  status: text("status").default("PENDING").notNull(), // PENDING, APPROVED, REJECTED
  adminNote: text("admin_note"),
  // Multi-item support: JSON array of {productName, quantity, brand?, category, productType, approvedQuantity?}
  items: jsonb("items"),
  estimatedDeliveryDate: text("estimated_delivery_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

// Solicitações de recuperação de senha (clientes)
export const passwordResetRequests = pgTable("password_reset_requests", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  status: text("status").default("PENDING").notNull(), // PENDING, APPROVED, REJECTED
  newPassword: text("new_password"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

// ─── Pedidos de Teste (modo teste) ────────────────────────────
export const testOrders = pgTable("test_orders", {
  id: serial("id").primaryKey(),
  orderCode: text("order_code").unique(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  companyName: text("company_name").notNull(),
  deliveryDate: timestamp("delivery_date").notNull(),
  weekReference: text("week_reference").notNull(),
  totalValue: numeric("total_value", { precision: 10, scale: 2 }).notNull(),
  orderNote: text("order_note"),
  items: jsonb("items").notNull(),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Tarefas da Diretoria ──────────────────────────────────────
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  assignedToId: integer("assigned_to_id").references(() => users.id),
  assignedToName: text("assigned_to_name"),
  createdById: integer("created_by_id").references(() => users.id),
  createdByName: text("created_by_name"),
  deadline: date("deadline"),
  priority: text("priority").notNull().default("MEDIUM"), // LOW, MEDIUM, HIGH
  status: text("status").notNull().default("PENDING"),    // PENDING, IN_PROGRESS, DONE
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Ocorrências de Clientes ───────────────────────────────────
export const clientIncidents = pgTable("client_incidents", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  companyName: text("company_name").notNull(),
  type: text("type").notNull(), // DELIVERY_PROBLEM, DEFECTIVE_PRODUCT, MISSING_PRODUCT, QUALITY, COMPLAINT, OTHER
  description: text("description").notNull(),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  photoBase64: text("photo_base64"), // base64 encoded image (legacy single)
  photoMime: text("photo_mime"),
  photosJson: text("photos_json"), // JSON array of {base64, mime, name} for multiple photos
  status: text("status").notNull().default("OPEN"), // OPEN, ANALYZING, RESPONDED, RESOLVED
  adminNote: text("admin_note"),
  responseMessage: text("response_message"),   // official response visible to client
  respondedByName: text("responded_by_name"),   // staff member who responded
  respondedAt: timestamp("responded_at"),        // when response was sent
  resolvedAt: timestamp("resolved_at"),
  hasUnreadAdminReply: boolean("has_unread_admin_reply").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Mensagens de Ocorrências de Clientes ─────────────────────
export const incidentMessages = pgTable("incident_messages", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").references(() => clientIncidents.id).notNull(),
  senderType: text("sender_type").notNull(), // ADMIN | CLIENT
  senderName: text("sender_name").notNull(),
  message: text("message").notNull(),
  photosJson: text("photos_json"), // JSON array of {base64, mime, name}
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type IncidentMessage = typeof incidentMessages.$inferSelect;

// ─── Ocorrências Internas ──────────────────────────────────────
export const internalIncidents = pgTable("internal_incidents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // LOGISTICS, QUALITY, FINANCIAL, SYSTEM, OTHER
  assignedToId: integer("assigned_to_id").references(() => users.id),
  assignedToName: text("assigned_to_name"),
  createdById: integer("created_by_id").references(() => users.id),
  createdByName: text("created_by_name"),
  priority: text("priority").notNull().default("MEDIUM"), // LOW, MEDIUM, HIGH
  status: text("status").notNull().default("OPEN"),       // OPEN, ANALYZING, RESOLVED
  adminNote: text("admin_note"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Logística ────────────────────────────────────────────────
export const logisticsDrivers = pgTable("logistics_drivers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cpf: text("cpf"),
  phone: text("phone"),
  email: text("email"),
  licenseNumber: text("license_number"),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const logisticsVehicles = pgTable("logistics_vehicles", {
  id: serial("id").primaryKey(),
  plate: text("plate").notNull().unique(),
  model: text("model").notNull(),
  brand: text("brand").notNull(),
  year: integer("year"),
  type: text("type").notNull().default("VAN"), // VAN, TRUCK, MOTORCYCLE, CAR
  capacity: text("capacity"),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const logisticsRoutes = pgTable("logistics_routes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  driverId: integer("driver_id").references(() => logisticsDrivers.id),
  driverName: text("driver_name"),
  vehicleId: integer("vehicle_id").references(() => logisticsVehicles.id),
  vehiclePlate: text("vehicle_plate"),
  deliveryDate: date("delivery_date"),
  status: text("status").notNull().default("SCHEDULED"), // SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
  companyIds: jsonb("company_ids").default([]),
  companyNames: text("company_names"),
  notes: text("notes"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const logisticsMaintenance = pgTable("logistics_maintenance", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => logisticsVehicles.id),
  vehiclePlate: text("vehicle_plate"),
  type: text("type").notNull(), // PREVENTIVE, CORRECTIVE, INSPECTION
  description: text("description").notNull(),
  cost: numeric("cost", { precision: 10, scale: 2 }),
  scheduledDate: date("scheduled_date"),
  completedDate: date("completed_date"),
  status: text("status").notNull().default("SCHEDULED"), // SCHEDULED, IN_PROGRESS, COMPLETED
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Cotação de Empresas ───────────────────────────────────────
export const companyQuotations = pgTable("company_quotations", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone"),
  email: text("email"),
  cnpj: text("cnpj"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  estimatedVolume: text("estimated_volume"),
  productInterest: text("product_interest"),
  logisticsNote: text("logistics_note"),
  orderWindowIds: jsonb("order_window_ids").default([]),
  priceGroupId: integer("price_group_id").references(() => priceGroups.id),
  priceGroupName: text("price_group_name"),
  status: text("status").notNull().default("PENDING"), // PENDING, IN_ANALYSIS, APPROVED, REJECTED, HORARIOS_DISPONIVEIS
  adminNote: text("admin_note"),
  deliveryWindowsJson: text("delivery_windows_json"), // JSON array of {startTime, endTime}
  deliveryWindowsRespondedBy: text("delivery_windows_responded_by"),
  deliveryWindowsRespondedAt: timestamp("delivery_windows_responded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Insert Schemas ───────────────────────────────────────────
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertPriceGroupSchema = createInsertSchema(priceGroups).omit({ id: true });
export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertProductPriceSchema = createInsertSchema(productPrices).omit({ id: true });
export const insertOrderWindowSchema = createInsertSchema(orderWindows).omit({ id: true });
export const insertOrderExceptionSchema = createInsertSchema(orderExceptions).omit({ id: true, createdAt: true });
// ─── System Logs ─────────────────────────────────────────────
export const systemLogs = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  description: text("description").notNull(),
  userId: integer("user_id"),
  companyId: integer("company_id"),
  userEmail: text("user_email"),
  userRole: text("user_role"),
  ip: text("ip"),
  level: text("level").notNull().default("INFO"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({ id: true, createdAt: true });
export type SystemLog = typeof systemLogs.$inferSelect;
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, orderCode: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertSpecialOrderRequestSchema = createInsertSchema(specialOrderRequests).omit({ id: true, createdAt: true, resolvedAt: true });
export const insertContractScopeSchema = createInsertSchema(contractScopes).omit({ id: true });
export const insertPasswordResetRequestSchema = createInsertSchema(passwordResetRequests).omit({ id: true, createdAt: true, resolvedAt: true });

// ─── DANFE Records ───────────────────────────────────────────
export const danfeRecords = pgTable("danfe_records", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  orderCode: text("order_code"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  generatedByUserId: integer("generated_by_user_id"),
  generatedByEmail: text("generated_by_email"),
});

export const insertDanfeRecordSchema = createInsertSchema(danfeRecords).omit({ id: true, generatedAt: true });
export type DanfeRecord = typeof danfeRecords.$inferSelect;
export type InsertDanfeRecord = z.infer<typeof insertDanfeRecordSchema>;

// ─── Types ────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type PriceGroup = typeof priceGroups.$inferSelect;
export type InsertPriceGroup = z.infer<typeof insertPriceGroupSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type ProductPrice = typeof productPrices.$inferSelect;
export type InsertProductPrice = z.infer<typeof insertProductPriceSchema>;
export type OrderWindow = typeof orderWindows.$inferSelect;
export type InsertOrderWindow = z.infer<typeof insertOrderWindowSchema>;
export type OrderException = typeof orderExceptions.$inferSelect;
export type InsertOrderException = z.infer<typeof insertOrderExceptionSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type SpecialOrderRequest = typeof specialOrderRequests.$inferSelect;
export type InsertSpecialOrderRequest = z.infer<typeof insertSpecialOrderRequestSchema>;
export type PasswordResetRequest = typeof passwordResetRequests.$inferSelect;
export type InsertPasswordResetRequest = z.infer<typeof insertPasswordResetRequestSchema>;
export type TestOrder = typeof testOrders.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type ClientIncident = typeof clientIncidents.$inferSelect;
export type InternalIncident = typeof internalIncidents.$inferSelect;
export type LogisticsDriver = typeof logisticsDrivers.$inferSelect;
export type LogisticsVehicle = typeof logisticsVehicles.$inferSelect;
export type LogisticsRoute = typeof logisticsRoutes.$inferSelect;
export type LogisticsMaintenance = typeof logisticsMaintenance.$inferSelect;
export type CompanyQuotation = typeof companyQuotations.$inferSelect;
export type ContractScope = typeof contractScopes.$inferSelect;
export type InsertContractScope = z.infer<typeof insertContractScopeSchema>;

// ─── Painel de Avisos ──────────────────────────────────────────
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"), // "info" | "important" | "maintenance" | "logistics"
  priority: text("priority").notNull().default("normal"), // "normal" | "high"
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  active: boolean("active").default(true).notNull(),
  targetAll: boolean("target_all").default(true).notNull(),
  targetClientTypes: text("target_client_types").array(), // e.g. ["mensal","sodexo","grsa"]
  targetCompanyIds: integer("target_company_ids").array(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, createdAt: true });
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;

// ─── Configuração da Empresa ───────────────────────────────────
export const companyConfig = pgTable("company_config", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull().default("VivaFrutaz"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  cep: text("cep"),
  phone: text("phone"),
  email: text("email"),
  cnpj: text("cnpj"),
  stateRegistration: text("state_registration"), // Inscrição Estadual
  fantasyName: text("fantasy_name"), // Nome Fantasia
  supportPhone: text("support_phone"),
  supportEmail: text("support_email"),
  supportMessage: text("support_message"),
  // Dados fiscais padrão
  defaultCfop: text("default_cfop").default("5102"),
  defaultNatureza: text("default_natureza").default("Venda de mercadoria adquirida"),
  // Logo da empresa
  logoBase64: text("logo_base64"),
  logoType: text("logo_type").default("image/png"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CompanyConfig = typeof companyConfig.$inferSelect;
export const insertCompanyConfigSchema = createInsertSchema(companyConfig).omit({ id: true, updatedAt: true });
export type InsertCompanyConfig = z.infer<typeof insertCompanyConfigSchema>;

// ─── Controle de Desperdício ───────────────────────────────────
export const wasteControl = pgTable("waste_control", {
  id: serial("id").primaryKey(),
  productId: integer("product_id"),
  productName: text("product_name").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
  unit: text("unit").notNull().default("kg"),
  reason: text("reason").notNull(), // expired | damaged | overripe | separation_error | logistics_error | other
  notes: text("notes"),
  date: date("date").notNull(),
  registeredBy: text("registered_by").notNull(),
  registeredById: integer("registered_by_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWasteControlSchema = createInsertSchema(wasteControl).omit({ id: true, createdAt: true });
export type WasteControl = typeof wasteControl.$inferSelect;
export type InsertWasteControl = z.infer<typeof insertWasteControlSchema>;

// ─── Planejamento de Compras — Status de Item ──────────────────
export const purchasePlanStatus = pgTable("purchase_plan_status", {
  id: serial("id").primaryKey(),
  weekRef: text("week_ref").notNull(), // e.g. "2026-W12"
  productId: integer("product_id"),
  productName: text("product_name").notNull(),
  status: text("status").notNull().default("PENDING"), // PENDING | BUYING | BOUGHT | UNAVAILABLE
  supplier: text("supplier"),
  expectedArrival: date("expected_arrival"),
  notes: text("notes"),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPurchasePlanStatusSchema = createInsertSchema(purchasePlanStatus).omit({ id: true, createdAt: true, updatedAt: true });
export type PurchasePlanStatus = typeof purchasePlanStatus.$inferSelect;
export type InsertPurchasePlanStatus = z.infer<typeof insertPurchasePlanStatusSchema>;

// ─── Estoque / Inventário ────────────────────────────────────────

// Configuração de estoque por produto (estoque atual + mínimo)
export const inventorySettings = pgTable("inventory_settings", {
  id: serial("id").primaryKey(),
  productId: integer("product_id"),
  productName: text("product_name").notNull(),
  unit: text("unit").notNull().default("kg"),
  currentStock: numeric("current_stock", { precision: 10, scale: 3 }).notNull().default("0"),
  minStock: numeric("min_stock", { precision: 10, scale: 3 }).notNull().default("0"),
  avgPurchasePrice: numeric("avg_purchase_price", { precision: 10, scale: 2 }).default("0"),
  category: text("category"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const insertInventorySettingsSchema = createInsertSchema(inventorySettings).omit({ id: true, updatedAt: true });
export type InventorySettings = typeof inventorySettings.$inferSelect;
export type InsertInventorySettings = z.infer<typeof insertInventorySettingsSchema>;

// Entradas de estoque (NF ou manual)
export const inventoryEntries = pgTable("inventory_entries", {
  id: serial("id").primaryKey(),
  productId: integer("product_id"),
  productName: text("product_name").notNull(),
  category: text("category"),
  supplier: text("supplier"),
  quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
  unit: text("unit").notNull().default("kg"),
  purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }),
  invoiceNumber: text("invoice_number"),
  invoiceDate: date("invoice_date"),
  entryDate: date("entry_date").notNull(),
  expiryDate: date("expiry_date"),
  notes: text("notes"),
  createdBy: text("created_by").notNull(),
  createdById: integer("created_by_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertInventoryEntrySchema = createInsertSchema(inventoryEntries).omit({ id: true, createdAt: true });
export type InventoryEntry = typeof inventoryEntries.$inferSelect;
export type InsertInventoryEntry = z.infer<typeof insertInventoryEntrySchema>;

// Movimentações de estoque (entradas, saídas, ajustes, desperdícios)
export const inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id"),
  productName: text("product_name").notNull(),
  movementType: text("movement_type").notNull(), // ENTRY | EXIT | ADJUSTMENT | WASTE
  quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
  balanceAfter: numeric("balance_after", { precision: 10, scale: 3 }),
  unit: text("unit").notNull().default("kg"),
  referenceType: text("reference_type"), // order | entry | waste | adjustment
  referenceId: integer("reference_id"),
  notes: text("notes"),
  date: date("date").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertInventoryMovementSchema = createInsertSchema(inventoryMovements).omit({ id: true, createdAt: true });
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = z.infer<typeof insertInventoryMovementSchema>;

// Inventário Físico (conferência manual)
export const inventoryPhysicalCounts = pgTable("inventory_physical_counts", {
  id: serial("id").primaryKey(),
  productId: integer("product_id"),
  productName: text("product_name").notNull(),
  unit: text("unit").notNull().default("kg"),
  systemStock: numeric("system_stock", { precision: 10, scale: 3 }).notNull(),
  physicalStock: numeric("physical_stock", { precision: 10, scale: 3 }).notNull(),
  difference: numeric("difference", { precision: 10, scale: 3 }).notNull(),
  notes: text("notes"),
  date: date("date").notNull(),
  createdBy: text("created_by").notNull(),
  createdById: integer("created_by_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertInventoryPhysicalCountSchema = createInsertSchema(inventoryPhysicalCounts).omit({ id: true, createdAt: true });
export type InventoryPhysicalCount = typeof inventoryPhysicalCounts.$inferSelect;
export type InsertInventoryPhysicalCount = z.infer<typeof insertInventoryPhysicalCountSchema>;

// ─── Notas Fiscais Importadas (OCR) ─────────────────────────────────────────
export const fiscalInvoices = pgTable("fiscal_invoices", {
  id: serial("id").primaryKey(),
  // NF-e header info
  invoiceNumber: text("invoice_number").notNull(),
  supplier: text("supplier").notNull(),
  supplierCnpj: text("supplier_cnpj"),
  issueDate: text("issue_date"),
  totalValue: numeric("total_value", { precision: 12, scale: 2 }),
  // Items as JSONB: [{name, quantity, unit, unitPrice, totalPrice, linkedProductId?, linkedProductName?}]
  items: jsonb("items").notNull().default([]),
  // Status: PENDING (review), CONFIRMED (imported to stock)
  status: text("status").notNull().default("CONFIRMED"),
  // Audit
  importedBy: integer("imported_by").references(() => users.id),
  importedAt: timestamp("imported_at").defaultNow().notNull(),
  notes: text("notes"),
  // Original file stored as base64 for display
  fileType: text("file_type"), // 'pdf' | 'image'
  fileName: text("file_name"),
  // Check duplicate key
  duplicateKey: text("duplicate_key"), // `${invoiceNumber}_${cnpj}`
});

export const insertFiscalInvoiceSchema = createInsertSchema(fiscalInvoices).omit({ id: true, importedAt: true });
export type FiscalInvoice = typeof fiscalInvoices.$inferSelect;
export type InsertFiscalInvoice = z.infer<typeof insertFiscalInvoiceSchema>;

// ─── Email Schedules ─────────────────────────────────────────────────────────
// Configurable schedules for automated email dispatch
export const emailSchedules = pgTable("email_schedules", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  // "window_open_reminder" | "unfinalised_reminder" | "confirmed_notification" | "cancelled_notification"
  label: text("label").notNull(),
  dayOfWeek: integer("day_of_week"), // 0=Sun..6=Sat; null = every day
  timeOfDay: text("time_of_day").notNull(), // "15:00" 24h format
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const insertEmailScheduleSchema = createInsertSchema(emailSchedules).omit({ id: true, createdAt: true, updatedAt: true });
export type EmailSchedule = typeof emailSchedules.$inferSelect;
export type InsertEmailSchedule = z.infer<typeof insertEmailScheduleSchema>;

// ─── Email Logs ──────────────────────────────────────────────────────────────
// Historical record of all emails sent / attempted
export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  // "window_open_reminder" | "unfinalised_reminder" | "order_confirmed" | "order_rejected" | "admin_broadcast" | "test"
  toEmail: text("to_email").notNull(),
  toName: text("to_name"),
  companyId: integer("company_id").references(() => companies.id),
  orderId: integer("order_id"),
  subject: text("subject").notNull(),
  status: text("status").notNull(), // "sent" | "failed" | "skipped"
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  metadata: jsonb("metadata"), // extra context
});
export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({ id: true, sentAt: true });
export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;

// ─── Quem Somos Nós (Institutional Info) ─────────────────────────────────────
export const aboutUs = pgTable("about_us", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default("Quem Somos Nós"),
  content: text("content").notNull().default(""),
  foundingYear: text("founding_year"),
  mission: text("mission"),
  vision: text("vision"),
  values: text("values"),
  imageBase64: text("image_base64"), // uploaded logo/photo as base64
  imageType: text("image_type"),     // e.g. "image/png"
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const insertAboutUsSchema = createInsertSchema(aboutUs).omit({ id: true, updatedAt: true });
export type AboutUs = typeof aboutUs.$inferSelect;
export type InsertAboutUs = z.infer<typeof insertAboutUsSchema>;

// ─── SMTP Configuration ───────────────────────────────────────────────────────
export const smtpConfig = pgTable("smtp_config", {
  id: serial("id").primaryKey(),
  host: text("host").notNull().default(""),
  port: integer("port").notNull().default(587),
  user: text("user").notNull().default(""),
  password: text("password").notNull().default(""), // stored plain; masked in API response
  senderEmail: text("sender_email").notNull().default(""),
  senderName: text("sender_name").notNull().default("VivaFrutaz"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const insertSmtpConfigSchema = createInsertSchema(smtpConfig).omit({ id: true, updatedAt: true });
export type SmtpConfig = typeof smtpConfig.$inferSelect;
export type InsertSmtpConfig = z.infer<typeof insertSmtpConfigSchema>;

// ─── Flora Training (IA Treinamento) ────────────────────────────────────────
export const floraTraining = pgTable("flora_training", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  userId: integer("user_id"),
  userName: text("user_name"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type FloraTraining = typeof floraTraining.$inferSelect;
export const insertFloraTrainingSchema = createInsertSchema(floraTraining).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFloraTraining = z.infer<typeof insertFloraTrainingSchema>;

// ─── IA Interações ─────────────────────────────────────────────────────────
export const aiInteractions = pgTable("ai_interactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  companyId: integer("company_id"),
  userRole: text("user_role"),
  userName: text("user_name"),
  message: text("message").notNull(),
  response: text("response").notNull(),
  intent: text("intent"),
  actionExecuted: text("action_executed"),
  actionData: jsonb("action_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type AiInteraction = typeof aiInteractions.$inferSelect;
export const insertAiInteractionSchema = createInsertSchema(aiInteractions).omit({ id: true, createdAt: true });
export type InsertAiInteraction = z.infer<typeof insertAiInteractionSchema>;

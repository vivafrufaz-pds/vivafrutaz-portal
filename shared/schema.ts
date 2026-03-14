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
  minWeeklyBilling: numeric("min_weekly_billing", { precision: 10, scale: 2 }),
  deliveryTime: text("delivery_time"),
  // Taxa administrativa (%)
  adminFee: numeric("admin_fee", { precision: 5, scale: 2 }).default("0"),
  // Financeiro
  billingTerm: text("billing_term"),
  billingType: text("billing_type"),
  billingFormat: text("billing_format"),
  paymentDates: text("payment_dates"),
  financialNotes: text("financial_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  adminNote: text("admin_note"),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  orderDate: timestamp("order_date").defaultNow().notNull(),
  deliveryDate: timestamp("delivery_date").notNull(),
  weekReference: text("week_reference").notNull(),
  totalValue: numeric("total_value", { precision: 10, scale: 2 }).notNull(),
  orderNote: text("order_note"),
  allowReplication: boolean("allow_replication").default(false).notNull(),
  nimbiExpiration: date("nimbi_expiration"),
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
  photoBase64: text("photo_base64"), // base64 encoded image
  photoMime: text("photo_mime"),
  status: text("status").notNull().default("OPEN"), // OPEN, ANALYZING, RESPONDED, RESOLVED
  adminNote: text("admin_note"),
  responseMessage: text("response_message"),   // official response visible to client
  respondedByName: text("responded_by_name"),   // staff member who responded
  respondedAt: timestamp("responded_at"),        // when response was sent
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
  status: text("status").notNull().default("PENDING"), // PENDING, IN_ANALYSIS, APPROVED, REJECTED
  adminNote: text("admin_note"),
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
export const insertPasswordResetRequestSchema = createInsertSchema(passwordResetRequests).omit({ id: true, createdAt: true, resolvedAt: true });

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

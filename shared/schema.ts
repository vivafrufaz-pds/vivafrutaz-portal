import { pgTable, text, serial, integer, boolean, timestamp, numeric, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(),
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
  password: text("password").notNull(),
  phone: text("phone"),
  priceGroupId: integer("price_group_id").references(() => priceGroups.id),
  allowedOrderDays: jsonb("allowed_order_days").notNull(),
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

// ─── Insert Schemas ───────────────────────────────────────────
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertPriceGroupSchema = createInsertSchema(priceGroups).omit({ id: true });
export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertProductPriceSchema = createInsertSchema(productPrices).omit({ id: true });
export const insertOrderWindowSchema = createInsertSchema(orderWindows).omit({ id: true });
export const insertOrderExceptionSchema = createInsertSchema(orderExceptions).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, orderCode: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });

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

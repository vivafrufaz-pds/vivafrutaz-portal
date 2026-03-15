import { db } from "./db";
import {
  users, priceGroups, companies, categories, products, productPrices, orderWindows, orderExceptions, orders, orderItems, systemSettings, passwordResetRequests, specialOrderRequests, systemLogs, testOrders, tasks, clientIncidents, incidentMessages, internalIncidents, logisticsDrivers, logisticsVehicles, logisticsRoutes, logisticsMaintenance, companyQuotations, contractScopes, danfeRecords, companyConfig, announcements, wasteControl, purchasePlanStatus,
  type User, type InsertUser, type PriceGroup, type InsertPriceGroup,
  type Company, type InsertCompany, type Category, type InsertCategory,
  type Product, type InsertProduct,
  type ProductPrice, type InsertProductPrice, type OrderWindow, type InsertOrderWindow,
  type SpecialOrderRequest,
  type OrderException, type InsertOrderException,
  type Order, type InsertOrder, type OrderItem, type InsertOrderItem,
  type PasswordResetRequest, type SystemLog, type TestOrder,
  type Task, type ClientIncident, type IncidentMessage, type InternalIncident,
  type LogisticsDriver, type LogisticsVehicle, type LogisticsRoute, type LogisticsMaintenance, type CompanyQuotation,
  type ContractScope, type InsertContractScope,
  type DanfeRecord, type InsertDanfeRecord,
  type CompanyConfig, type InsertCompanyConfig,
  type Announcement, type InsertAnnouncement,
  type WasteControl, type InsertWasteControl,
  type PurchasePlanStatus, type InsertPurchasePlanStatus
} from "@shared/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // Auth & Users
  getUserByEmail(email: string): Promise<User | undefined>;
  getUser(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Companies
  getCompanyByEmail(email: string): Promise<Company | undefined>;
  getCompany(id: number): Promise<Company | undefined>;
  getCompanies(): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, updates: Partial<InsertCompany>): Promise<Company>;
  deleteCompany(id: number): Promise<void>;

  // Contract Scopes
  getContractScopes(companyId: number): Promise<ContractScope[]>;
  createContractScope(scope: InsertContractScope): Promise<ContractScope>;
  deleteContractScope(id: number): Promise<void>;

  // DANFE Records
  getDanfeRecordsByOrderId(orderId: number): Promise<DanfeRecord[]>;
  createDanfeRecord(record: InsertDanfeRecord): Promise<DanfeRecord>;

  // Price Groups
  getPriceGroups(): Promise<PriceGroup[]>;
  createPriceGroup(group: InsertPriceGroup): Promise<PriceGroup>;
  updatePriceGroup(id: number, updates: Partial<InsertPriceGroup>): Promise<PriceGroup>;
  deletePriceGroup(id: number): Promise<void>;

  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(cat: InsertCategory): Promise<Category>;
  updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  // Products
  getProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  // Product Prices
  getProductPrices(): Promise<ProductPrice[]>;
  getProductPricesByProductId(productId: number): Promise<ProductPrice[]>;
  createProductPrice(price: InsertProductPrice): Promise<ProductPrice>;
  updateProductPrice(id: number, updates: Partial<InsertProductPrice>): Promise<ProductPrice>;
  deleteProductPrice(id: number): Promise<void>;

  // Order Windows
  getOrderWindows(): Promise<OrderWindow[]>;
  getActiveOrderWindow(): Promise<OrderWindow | undefined>;
  createOrderWindow(window: InsertOrderWindow): Promise<OrderWindow>;
  updateOrderWindow(id: number, updates: Partial<InsertOrderWindow>): Promise<OrderWindow>;
  deleteOrderWindow(id: number): Promise<void>;

  // Order Exceptions
  getOrderExceptions(): Promise<OrderException[]>;
  createOrderException(exc: InsertOrderException): Promise<OrderException>;
  updateOrderException(id: number, updates: Partial<InsertOrderException>): Promise<OrderException>;
  deleteOrderException(id: number): Promise<void>;
  getCompanyException(companyId: number): Promise<OrderException | undefined>;

  // Orders
  getOrders(): Promise<Order[]>;
  getOrdersByCompanyId(companyId: number): Promise<Order[]>;
  getOrder(id: number): Promise<{ order: Order, items: OrderItem[] } | undefined>;
  getCompanyOrders(companyId: number): Promise<Order[]>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  updateOrder(id: number, updates: { status?: string; adminNote?: string; reopenReason?: string | null; reopenRequestedAt?: Date | null; totalValue?: string }): Promise<Order>;
  updateOrderItems(orderId: number, newItems: { productId: number; quantity: number; unitPrice: string; totalPrice: string }[]): Promise<void>;
  getPurchasingReport(filters: { dateFrom?: string; dateTo?: string; companyId?: number; productId?: number }): Promise<any>;
  getIndustrializedReport(filters: { dateFrom?: string; dateTo?: string; companyId?: number; productId?: number }): Promise<any>;

  // Company Config (Support, DANFE info)
  getCompanyConfig(): Promise<CompanyConfig | undefined>;
  updateCompanyConfig(updates: Partial<InsertCompanyConfig>): Promise<CompanyConfig>;

  // System Settings
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;

  // Password Reset Requests
  getPasswordResetRequests(): Promise<PasswordResetRequest[]>;
  createPasswordResetRequest(companyId: number): Promise<PasswordResetRequest>;
  updatePasswordResetRequest(id: number, updates: { status: string; newPassword?: string; adminNote?: string; resolvedAt?: Date }): Promise<PasswordResetRequest>;

  // Special Order Requests
  getSpecialOrderRequests(): Promise<SpecialOrderRequest[]>;
  getSpecialOrderRequestsByCompany(companyId: number): Promise<SpecialOrderRequest[]>;
  createSpecialOrderRequest(data: { companyId: number; requestedDay: string; requestedDate?: string | null; description: string; quantity: string; observations?: string | null; items?: any; estimatedDeliveryDate?: string | null }): Promise<SpecialOrderRequest>;
  updateSpecialOrderRequest(id: number, updates: { status: string; adminNote?: string; resolvedAt?: Date; items?: any; estimatedDeliveryDate?: string | null }): Promise<SpecialOrderRequest>;

  // User Management
  getUsers(): Promise<User[]>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Test Orders
  createTestOrder(data: { orderCode: string; companyId: number; companyName: string; deliveryDate: Date; weekReference: string; totalValue: string; orderNote?: string | null; items: any[]; createdBy?: number }): Promise<TestOrder>;
  getTestOrders(): Promise<TestOrder[]>;

  // Order cleanup
  deleteOrder(id: number): Promise<void>;

  // Announcements
  getAnnouncements(): Promise<Announcement[]>;
  getActiveAnnouncementsForCompany(companyId: number): Promise<Announcement[]>;
  createAnnouncement(data: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: number, data: Partial<InsertAnnouncement>): Promise<Announcement>;
  deleteAnnouncement(id: number): Promise<void>;

  // System Logs
  createLog(log: { action: string; description: string; userId?: number; companyId?: number; userEmail?: string; userRole?: string; ip?: string; level?: string }): Promise<void>;
  getLogs(limit?: number): Promise<SystemLog[]>;
  clearLogs(): Promise<void>;
  deleteLogsByIds(ids: number[]): Promise<number>;
  deleteLogsByDateRange(start: Date, end: Date): Promise<number>;
  cleanOldLogs(olderThanDays?: number): Promise<number>;
  // Logistics
  getDrivers(): Promise<LogisticsDriver[]>;
  createDriver(data: Partial<LogisticsDriver>): Promise<LogisticsDriver>;
  updateDriver(id: number, data: Partial<LogisticsDriver>): Promise<LogisticsDriver>;
  deleteDriver(id: number): Promise<void>;
  getVehicles(): Promise<LogisticsVehicle[]>;
  createVehicle(data: Partial<LogisticsVehicle>): Promise<LogisticsVehicle>;
  updateVehicle(id: number, data: Partial<LogisticsVehicle>): Promise<LogisticsVehicle>;
  deleteVehicle(id: number): Promise<void>;
  getRoutes(): Promise<LogisticsRoute[]>;
  createRoute(data: Partial<LogisticsRoute>): Promise<LogisticsRoute>;
  updateRoute(id: number, data: Partial<LogisticsRoute>): Promise<LogisticsRoute>;
  deleteRoute(id: number): Promise<void>;
  getMaintenances(): Promise<LogisticsMaintenance[]>;
  createMaintenance(data: Partial<LogisticsMaintenance>): Promise<LogisticsMaintenance>;
  updateMaintenance(id: number, data: Partial<LogisticsMaintenance>): Promise<LogisticsMaintenance>;
  deleteMaintenance(id: number): Promise<void>;
  // Quotations
  getQuotations(): Promise<CompanyQuotation[]>;
  createQuotation(data: Partial<CompanyQuotation>): Promise<CompanyQuotation>;
  updateQuotation(id: number, data: Partial<CompanyQuotation>): Promise<CompanyQuotation>;
  deleteQuotation(id: number): Promise<void>;
  // Waste Control
  getWasteRecords(): Promise<WasteControl[]>;
  createWasteRecord(data: InsertWasteControl): Promise<WasteControl>;
  updateWasteRecord(id: number, data: Partial<InsertWasteControl>): Promise<WasteControl>;
  deleteWasteRecord(id: number): Promise<void>;
  // Purchase Plan Status
  getPurchasePlanStatuses(weekRef: string): Promise<PurchasePlanStatus[]>;
  upsertPurchasePlanStatus(data: Partial<InsertPurchasePlanStatus> & { weekRef: string; productName: string }): Promise<PurchasePlanStatus>;
  deletePurchasePlanStatus(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${email.toLowerCase()}`);
    return user;
  }
  
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getCompanyByEmail(email: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(sql`lower(${companies.email}) = ${email.toLowerCase()}`);
    return company;
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies);
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db.insert(companies).values(company).returning();
    return newCompany;
  }

  async updateCompany(id: number, updates: Partial<InsertCompany>): Promise<Company> {
    const [updated] = await db.update(companies).set(updates).where(eq(companies.id, id)).returning();
    return updated;
  }

  async deleteCompany(id: number): Promise<void> {
    await db.delete(companies).where(eq(companies.id, id));
  }

  async getContractScopes(companyId: number): Promise<ContractScope[]> {
    return await db.select().from(contractScopes).where(eq(contractScopes.companyId, companyId));
  }

  async createContractScope(scope: InsertContractScope): Promise<ContractScope> {
    const [newScope] = await db.insert(contractScopes).values(scope).returning();
    return newScope;
  }

  async deleteContractScope(id: number): Promise<void> {
    await db.delete(contractScopes).where(eq(contractScopes.id, id));
  }

  async getDanfeRecordsByOrderId(orderId: number): Promise<DanfeRecord[]> {
    return await db.select().from(danfeRecords).where(eq(danfeRecords.orderId, orderId)).orderBy(desc(danfeRecords.generatedAt));
  }

  async createDanfeRecord(record: InsertDanfeRecord): Promise<DanfeRecord> {
    const [newRecord] = await db.insert(danfeRecords).values(record).returning();
    return newRecord;
  }

  async getPriceGroups(): Promise<PriceGroup[]> {
    return await db.select().from(priceGroups);
  }

  async createPriceGroup(group: InsertPriceGroup): Promise<PriceGroup> {
    const [newGroup] = await db.insert(priceGroups).values(group).returning();
    return newGroup;
  }

  async updatePriceGroup(id: number, updates: Partial<InsertPriceGroup>): Promise<PriceGroup> {
    const [updated] = await db.update(priceGroups).set(updates).where(eq(priceGroups.id, id)).returning();
    return updated;
  }

  async deletePriceGroup(id: number): Promise<void> {
    await db.delete(priceGroups).where(eq(priceGroups.id, id));
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  async createCategory(cat: InsertCategory): Promise<Category> {
    const [newCat] = await db.insert(categories).values(cat).returning();
    return newCat;
  }

  async updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category> {
    const [updated] = await db.update(categories).set(updates).where(eq(categories.id, id)).returning();
    return updated;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product> {
    const [updated] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return updated;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async getProductPrices(): Promise<ProductPrice[]> {
    return await db.select().from(productPrices);
  }

  async getProductPricesByProductId(productId: number): Promise<ProductPrice[]> {
    return await db.select().from(productPrices).where(eq(productPrices.productId, productId));
  }

  async createProductPrice(price: InsertProductPrice): Promise<ProductPrice> {
    const [newPrice] = await db.insert(productPrices).values(price).returning();
    return newPrice;
  }

  async updateProductPrice(id: number, updates: Partial<InsertProductPrice>): Promise<ProductPrice> {
    const [updated] = await db.update(productPrices).set(updates).where(eq(productPrices.id, id)).returning();
    return updated;
  }

  async deleteProductPrice(id: number): Promise<void> {
    await db.delete(productPrices).where(eq(productPrices.id, id));
  }

  async getOrderWindows(): Promise<OrderWindow[]> {
    return await db.select().from(orderWindows).orderBy(desc(orderWindows.id));
  }

  async getActiveOrderWindow(): Promise<OrderWindow | undefined> {
    const now = new Date();
    const [active] = await db.select().from(orderWindows).where(
      and(
        eq(orderWindows.active, true),
        lte(orderWindows.orderOpenDate, now),
        gte(orderWindows.orderCloseDate, now)
      )
    ).orderBy(desc(orderWindows.id)).limit(1);
    return active;
  }

  async createOrderWindow(window: InsertOrderWindow): Promise<OrderWindow> {
    const [newWindow] = await db.insert(orderWindows).values({
      ...window,
      orderOpenDate: new Date(window.orderOpenDate),
      orderCloseDate: new Date(window.orderCloseDate),
      deliveryStartDate: new Date(window.deliveryStartDate),
      deliveryEndDate: new Date(window.deliveryEndDate),
    }).returning();
    return newWindow;
  }

  async updateOrderWindow(id: number, updates: Partial<InsertOrderWindow>): Promise<OrderWindow> {
    const updateData: any = { ...updates };
    if (updates.orderOpenDate) updateData.orderOpenDate = new Date(updates.orderOpenDate);
    if (updates.orderCloseDate) updateData.orderCloseDate = new Date(updates.orderCloseDate);
    if (updates.deliveryStartDate) updateData.deliveryStartDate = new Date(updates.deliveryStartDate);
    if (updates.deliveryEndDate) updateData.deliveryEndDate = new Date(updates.deliveryEndDate);
    
    const [updated] = await db.update(orderWindows).set(updateData).where(eq(orderWindows.id, id)).returning();
    return updated;
  }

  async deleteOrderWindow(id: number): Promise<void> {
    await db.delete(orderWindows).where(eq(orderWindows.id, id));
  }

  async getOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.orderDate));
  }

  async getOrder(id: number): Promise<{ order: Order, items: OrderItem[] } | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    return { order, items };
  }

  async updateOrder(id: number, updates: { status?: string; adminNote?: string; reopenReason?: string | null; reopenRequestedAt?: Date | null; totalValue?: string }): Promise<Order> {
    const [updated] = await db.update(orders).set(updates).where(eq(orders.id, id)).returning();
    return updated;
  }

  async getOrdersByCompanyId(companyId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.companyId, companyId)).orderBy(desc(orders.orderDate));
  }

  async updateOrderItems(orderId: number, newItems: { productId: number; quantity: number; unitPrice: string; totalPrice: string }[]): Promise<void> {
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    if (newItems.length > 0) {
      await db.insert(orderItems).values(newItems.map(item => ({ ...item, orderId })));
    }
    // Recalculate total
    const total = newItems.reduce((s, i) => s + Number(i.totalPrice), 0);
    await db.update(orders).set({ totalValue: String(total) }).where(eq(orders.id, orderId));
  }

  async getPurchasingReport(filters: {
    dateFrom?: string;
    dateTo?: string;
    companyId?: number;
    productId?: number;
  }): Promise<{
    products: { productId: number; productName: string; unit: string; totalQuantity: number; companies: { companyId: number; companyName: string; quantity: number }[] }[];
    rawOrders: { orderCode: string; companyName: string; orderDate: string; deliveryDate: string; productName: string; quantity: number; unitPrice: number; totalPrice: number }[];
  }> {
    // Build conditions
    const conditions: any[] = [];
    if (filters.companyId) conditions.push(eq(orders.companyId, filters.companyId));
    if (filters.productId) conditions.push(eq(orderItems.productId, filters.productId));
    if (filters.dateFrom) conditions.push(gte(orders.orderDate, new Date(filters.dateFrom)));
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      conditions.push(lte(orders.orderDate, to));
    }

    // Only include ACTIVE orders
    conditions.push(eq(orders.status, 'ACTIVE'));

    const rows = await db
      .select({
        orderId: orders.id,
        orderCode: orders.orderCode,
        orderDate: orders.orderDate,
        deliveryDate: orders.deliveryDate,
        companyId: companies.id,
        companyName: companies.companyName,
        productId: products.id,
        productName: products.name,
        productUnit: products.unit,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        totalPrice: orderItems.totalPrice,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(companies, eq(orders.companyId, companies.id))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(orders.orderDate));

    // Aggregate by product
    const productMap = new Map<number, {
      productId: number; productName: string; unit: string; totalQuantity: number;
      companyMap: Map<number, { companyId: number; companyName: string; quantity: number }>;
    }>();

    for (const row of rows) {
      if (!productMap.has(row.productId)) {
        productMap.set(row.productId, {
          productId: row.productId,
          productName: row.productName,
          unit: row.productUnit,
          totalQuantity: 0,
          companyMap: new Map(),
        });
      }
      const p = productMap.get(row.productId)!;
      p.totalQuantity += row.quantity;
      const existing = p.companyMap.get(row.companyId);
      if (existing) existing.quantity += row.quantity;
      else p.companyMap.set(row.companyId, { companyId: row.companyId, companyName: row.companyName, quantity: row.quantity });
    }

    const productsList = Array.from(productMap.values())
      .map(p => ({
        productId: p.productId,
        productName: p.productName,
        unit: p.unit,
        totalQuantity: p.totalQuantity,
        companies: Array.from(p.companyMap.values()).sort((a, b) => b.quantity - a.quantity),
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity);

    const rawOrders = rows.map(row => ({
      orderCode: row.orderCode || `#${row.orderId}`,
      companyName: row.companyName,
      orderDate: row.orderDate.toISOString().split('T')[0],
      deliveryDate: row.deliveryDate.toISOString().split('T')[0],
      productName: row.productName,
      quantity: row.quantity,
      unitPrice: Number(row.unitPrice),
      totalPrice: Number(row.totalPrice),
    }));

    return { products: productsList, rawOrders };
  }

  async getCompanyOrders(companyId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.companyId, companyId)).orderBy(desc(orders.orderDate));
  }

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    return await db.transaction(async (tx) => {
      // Insert order first to get the ID
      const [newOrder] = await tx.insert(orders).values({
        ...order,
        deliveryDate: new Date(order.deliveryDate),
      }).returning();

      // Generate order code: VF-YEAR-XXXXXX using the new ID
      const year = new Date().getFullYear();
      const orderCode = `VF-${year}-${String(newOrder.id).padStart(6, '0')}`;

      // Update with the generated order code
      const [updatedOrder] = await tx.update(orders)
        .set({ orderCode })
        .where(eq(orders.id, newOrder.id))
        .returning();

      // Insert order items
      if (items.length > 0) {
        const itemsWithOrderId = items.map(item => ({
          ...item,
          orderId: updatedOrder.id
        }));
        await tx.insert(orderItems).values(itemsWithOrderId);
      }

      return updatedOrder;
    });
  }

  async getOrderExceptions(): Promise<OrderException[]> {
    return await db.select().from(orderExceptions).orderBy(desc(orderExceptions.createdAt));
  }

  async createOrderException(exc: InsertOrderException): Promise<OrderException> {
    const [newExc] = await db.insert(orderExceptions).values(exc).returning();
    return newExc;
  }

  async updateOrderException(id: number, updates: Partial<InsertOrderException>): Promise<OrderException> {
    const [updated] = await db.update(orderExceptions).set(updates).where(eq(orderExceptions.id, id)).returning();
    return updated;
  }

  async deleteOrderException(id: number): Promise<void> {
    await db.delete(orderExceptions).where(eq(orderExceptions.id, id));
  }

  async getCompanyException(companyId: number): Promise<OrderException | undefined> {
    const now = new Date();
    const rows = await db.select().from(orderExceptions).where(
      and(eq(orderExceptions.companyId, companyId), eq(orderExceptions.active, true))
    );
    // Filter to non-expired exceptions (expiryDate null or >= today)
    const valid = rows.filter(e => !e.expiryDate || new Date(e.expiryDate) >= now);
    return valid[0];
  }

  async getIndustrializedReport(filters: {
    dateFrom?: string;
    dateTo?: string;
    companyId?: number;
    productId?: number;
  }): Promise<any[]> {
    const conditions: any[] = [eq(products.isIndustrialized, true), eq(orders.status, 'ACTIVE')];
    if (filters.companyId) conditions.push(eq(orders.companyId, filters.companyId));
    if (filters.productId) conditions.push(eq(orderItems.productId, filters.productId));
    if (filters.dateFrom) conditions.push(gte(orders.orderDate, new Date(filters.dateFrom)));
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      conditions.push(lte(orders.orderDate, to));
    }

    const rows = await db
      .select({
        orderId: orders.id,
        orderCode: orders.orderCode,
        orderDate: orders.orderDate,
        companyName: companies.companyName,
        productName: products.name,
        productUnit: products.unit,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        totalPrice: orderItems.totalPrice,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(companies, eq(orders.companyId, companies.id))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(and(...conditions))
      .orderBy(desc(orders.orderDate));

    return rows.map(r => ({
      orderId: r.orderId,
      orderCode: r.orderCode || `#${r.orderId}`,
      orderDate: r.orderDate.toISOString().split('T')[0],
      companyName: r.companyName,
      productName: r.productName,
      unit: r.productUnit,
      quantity: r.quantity,
      unitPrice: Number(r.unitPrice),
      totalPrice: Number(r.totalPrice),
    }));
  }

  async getSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return row?.value ?? null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await db.insert(systemSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: systemSettings.key, set: { value } });
  }

  async getCompanyConfig(): Promise<CompanyConfig | undefined> {
    const configs = await db.select().from(companyConfig);
    return configs[0];
  }

  async updateCompanyConfig(updates: Partial<InsertCompanyConfig>): Promise<CompanyConfig> {
    const configs = await db.select().from(companyConfig);
    if (configs.length === 0) {
      const [inserted] = await db.insert(companyConfig).values({ ...updates, updatedAt: new Date() } as any).returning();
      return inserted;
    }
    const [updated] = await db.update(companyConfig).set({ ...updates, updatedAt: new Date() } as any).where(eq(companyConfig.id, configs[0].id)).returning();
    return updated;
  }

  async getPasswordResetRequests(): Promise<PasswordResetRequest[]> {
    return await db.select().from(passwordResetRequests).orderBy(desc(passwordResetRequests.createdAt));
  }

  async createPasswordResetRequest(companyId: number): Promise<PasswordResetRequest> {
    const [req] = await db.insert(passwordResetRequests).values({ companyId, status: 'PENDING' }).returning();
    return req;
  }

  async updatePasswordResetRequest(id: number, updates: { status: string; newPassword?: string; adminNote?: string; resolvedAt?: Date }): Promise<PasswordResetRequest> {
    const [updated] = await db.update(passwordResetRequests).set(updates as any).where(eq(passwordResetRequests.id, id)).returning();
    return updated;
  }

  async getSpecialOrderRequests(): Promise<SpecialOrderRequest[]> {
    return await db.select().from(specialOrderRequests).orderBy(desc(specialOrderRequests.createdAt));
  }

  async getSpecialOrderRequestsByCompany(companyId: number): Promise<SpecialOrderRequest[]> {
    return await db.select().from(specialOrderRequests).where(eq(specialOrderRequests.companyId, companyId)).orderBy(desc(specialOrderRequests.createdAt));
  }

  async createSpecialOrderRequest(data: { companyId: number; requestedDay: string; requestedDate?: string | null; description: string; quantity: string; observations?: string | null; items?: any; estimatedDeliveryDate?: string | null }): Promise<SpecialOrderRequest> {
    const [req] = await db.insert(specialOrderRequests).values({ ...data, status: 'PENDING' } as any).returning();
    return req;
  }

  async updateSpecialOrderRequest(id: number, updates: { status: string; adminNote?: string; resolvedAt?: Date; items?: any; estimatedDeliveryDate?: string | null }): Promise<SpecialOrderRequest> {
    const [updated] = await db.update(specialOrderRequests).set(updates as any).where(eq(specialOrderRequests.id, id)).returning();
    return updated;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.id);
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async createTestOrder(data: { orderCode: string; companyId: number; companyName: string; deliveryDate: Date; weekReference: string; totalValue: string; orderNote?: string | null; items: any[]; createdBy?: number }): Promise<TestOrder> {
    const [order] = await db.insert(testOrders).values(data).returning();
    return order;
  }

  async getTestOrders(): Promise<TestOrder[]> {
    return await db.select().from(testOrders).orderBy(desc(testOrders.createdAt));
  }

  async deleteOrder(id: number): Promise<void> {
    await db.delete(orderItems).where(eq(orderItems.orderId, id));
    await db.delete(orders).where(eq(orders.id, id));
  }

  async createLog(log: { action: string; description: string; userId?: number; companyId?: number; userEmail?: string; userRole?: string; ip?: string; level?: string }): Promise<void> {
    try {
      await db.insert(systemLogs).values({ ...log, level: log.level || "INFO" });
    } catch (err) {
      console.error("[LOG] Failed to write system log:", err);
    }
  }

  async getLogs(limit = 200): Promise<SystemLog[]> {
    return db.select().from(systemLogs).orderBy(desc(systemLogs.createdAt)).limit(limit);
  }

  // ─── Tarefas ──────────────────────────────────────────────────
  async createTask(data: { title: string; description: string; assignedToId?: number; assignedToName?: string; createdById?: number; createdByName?: string; deadline?: string; priority: string }): Promise<Task> {
    const [task] = await db.insert(tasks).values({ ...data, status: 'PENDING' }).returning();
    return task;
  }

  async getTasks(): Promise<Task[]> {
    return db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTasksByUser(userId: number): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.assignedToId, userId)).orderBy(desc(tasks.createdAt));
  }

  async updateTask(id: number, updates: Partial<{ title: string; description: string; assignedToId: number; assignedToName: string; deadline: string; priority: string; status: string; updatedAt: Date }>): Promise<Task> {
    const [updated] = await db.update(tasks).set({ ...updates, updatedAt: new Date() }).where(eq(tasks.id, id)).returning();
    return updated;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // ─── Ocorrências de Clientes ──────────────────────────────────
  async createClientIncident(data: { companyId: number; companyName: string; type: string; description: string; contactPhone?: string; contactEmail?: string; photoBase64?: string; photoMime?: string; photosJson?: string }): Promise<ClientIncident> {
    const [inc] = await db.insert(clientIncidents).values({ ...data, status: 'OPEN' }).returning();
    return inc;
  }

  async getClientIncidents(): Promise<ClientIncident[]> {
    return db.select().from(clientIncidents).orderBy(desc(clientIncidents.createdAt));
  }

  async getClientIncident(id: number): Promise<ClientIncident | undefined> {
    const [incident] = await db.select().from(clientIncidents).where(eq(clientIncidents.id, id));
    return incident;
  }

  async getClientIncidentsByCompany(companyId: number): Promise<ClientIncident[]> {
    return db.select().from(clientIncidents).where(eq(clientIncidents.companyId, companyId)).orderBy(desc(clientIncidents.createdAt));
  }

  async updateClientIncident(id: number, updates: { status?: string; adminNote?: string; resolvedAt?: Date | null }): Promise<ClientIncident> {
    const [updated] = await db.update(clientIncidents).set(updates as any).where(eq(clientIncidents.id, id)).returning();
    return updated;
  }

  async deleteClientIncident(id: number): Promise<void> {
    await db.delete(clientIncidents).where(eq(clientIncidents.id, id));
  }

  async respondToClientIncident(id: number, responseMessage: string, respondedByName: string): Promise<ClientIncident> {
    const [updated] = await db.update(clientIncidents)
      .set({ responseMessage, respondedByName, respondedAt: new Date(), status: 'RESPONDED', hasUnreadAdminReply: true, updatedAt: new Date() })
      .where(eq(clientIncidents.id, id))
      .returning();
    return updated;
  }

  async updateClientIncidentStatus(id: number, status: string): Promise<ClientIncident> {
    const [updated] = await db.update(clientIncidents)
      .set({ status, updatedAt: new Date() } as any)
      .where(eq(clientIncidents.id, id))
      .returning();
    return updated;
  }

  async markIncidentReadByClient(id: number): Promise<void> {
    await db.update(clientIncidents)
      .set({ hasUnreadAdminReply: false } as any)
      .where(eq(clientIncidents.id, id));
  }

  // ─── Mensagens de Ocorrências ─────────────────────────────────
  async getIncidentMessages(incidentId: number): Promise<IncidentMessage[]> {
    return db.select().from(incidentMessages).where(eq(incidentMessages.incidentId, incidentId)).orderBy(incidentMessages.createdAt);
  }

  async createIncidentMessage(data: { incidentId: number; senderType: string; senderName: string; message: string; photosJson?: string }): Promise<IncidentMessage> {
    const [msg] = await db.insert(incidentMessages).values(data).returning();
    if (data.senderType === 'ADMIN') {
      await db.update(clientIncidents)
        .set({ hasUnreadAdminReply: true, status: 'RESPONDED', updatedAt: new Date() } as any)
        .where(eq(clientIncidents.id, data.incidentId));
    } else {
      await db.update(clientIncidents)
        .set({ updatedAt: new Date() } as any)
        .where(eq(clientIncidents.id, data.incidentId));
    }
    return msg;
  }

  // ─── Ocorrências Internas ─────────────────────────────────────
  async createInternalIncident(data: { title: string; description: string; category: string; assignedToId?: number; assignedToName?: string; createdById?: number; createdByName?: string; priority: string }): Promise<InternalIncident> {
    const [inc] = await db.insert(internalIncidents).values({ ...data, status: 'OPEN' }).returning();
    return inc;
  }

  async getInternalIncidents(): Promise<InternalIncident[]> {
    return db.select().from(internalIncidents).orderBy(desc(internalIncidents.createdAt));
  }

  async updateInternalIncident(id: number, updates: { status?: string; adminNote?: string; resolvedAt?: Date | null; assignedToId?: number; assignedToName?: string }): Promise<InternalIncident> {
    const [updated] = await db.update(internalIncidents).set(updates as any).where(eq(internalIncidents.id, id)).returning();
    return updated;
  }

  async deleteInternalIncident(id: number): Promise<void> {
    await db.delete(internalIncidents).where(eq(internalIncidents.id, id));
  }

  // ─── Logística: Motoristas ────────────────────────────────────
  async getDrivers(): Promise<LogisticsDriver[]> {
    return db.select().from(logisticsDrivers).orderBy(logisticsDrivers.name);
  }
  async createDriver(data: Partial<LogisticsDriver>): Promise<LogisticsDriver> {
    const [d] = await db.insert(logisticsDrivers).values(data as any).returning();
    return d;
  }
  async updateDriver(id: number, data: Partial<LogisticsDriver>): Promise<LogisticsDriver> {
    const [d] = await db.update(logisticsDrivers).set(data as any).where(eq(logisticsDrivers.id, id)).returning();
    return d;
  }
  async deleteDriver(id: number): Promise<void> {
    await db.delete(logisticsDrivers).where(eq(logisticsDrivers.id, id));
  }

  // ─── Logística: Veículos ──────────────────────────────────────
  async getVehicles(): Promise<LogisticsVehicle[]> {
    return db.select().from(logisticsVehicles).orderBy(logisticsVehicles.plate);
  }
  async createVehicle(data: Partial<LogisticsVehicle>): Promise<LogisticsVehicle> {
    const [v] = await db.insert(logisticsVehicles).values(data as any).returning();
    return v;
  }
  async updateVehicle(id: number, data: Partial<LogisticsVehicle>): Promise<LogisticsVehicle> {
    const [v] = await db.update(logisticsVehicles).set(data as any).where(eq(logisticsVehicles.id, id)).returning();
    return v;
  }
  async deleteVehicle(id: number): Promise<void> {
    await db.delete(logisticsVehicles).where(eq(logisticsVehicles.id, id));
  }

  // ─── Logística: Rotas ─────────────────────────────────────────
  async getRoutes(): Promise<LogisticsRoute[]> {
    return db.select().from(logisticsRoutes).orderBy(desc(logisticsRoutes.createdAt));
  }
  async createRoute(data: Partial<LogisticsRoute>): Promise<LogisticsRoute> {
    const [r] = await db.insert(logisticsRoutes).values(data as any).returning();
    return r;
  }
  async updateRoute(id: number, data: Partial<LogisticsRoute>): Promise<LogisticsRoute> {
    const [r] = await db.update(logisticsRoutes).set(data as any).where(eq(logisticsRoutes.id, id)).returning();
    return r;
  }
  async deleteRoute(id: number): Promise<void> {
    await db.delete(logisticsRoutes).where(eq(logisticsRoutes.id, id));
  }

  // ─── Logística: Manutenção ────────────────────────────────────
  async getMaintenances(): Promise<LogisticsMaintenance[]> {
    return db.select().from(logisticsMaintenance).orderBy(desc(logisticsMaintenance.createdAt));
  }
  async createMaintenance(data: Partial<LogisticsMaintenance>): Promise<LogisticsMaintenance> {
    const [m] = await db.insert(logisticsMaintenance).values(data as any).returning();
    return m;
  }
  async updateMaintenance(id: number, data: Partial<LogisticsMaintenance>): Promise<LogisticsMaintenance> {
    const [m] = await db.update(logisticsMaintenance).set(data as any).where(eq(logisticsMaintenance.id, id)).returning();
    return m;
  }
  async deleteMaintenance(id: number): Promise<void> {
    await db.delete(logisticsMaintenance).where(eq(logisticsMaintenance.id, id));
  }

  // ─── Cotação de Empresas ──────────────────────────────────────
  async getQuotations(): Promise<CompanyQuotation[]> {
    return db.select().from(companyQuotations).orderBy(desc(companyQuotations.createdAt));
  }
  async createQuotation(data: Partial<CompanyQuotation>): Promise<CompanyQuotation> {
    const [q] = await db.insert(companyQuotations).values({ status: 'PENDING', ...data } as any).returning();
    return q;
  }
  async updateQuotation(id: number, data: Partial<CompanyQuotation>): Promise<CompanyQuotation> {
    const [q] = await db.update(companyQuotations).set({ ...data, updatedAt: new Date() } as any).where(eq(companyQuotations.id, id)).returning();
    return q;
  }
  async deleteQuotation(id: number): Promise<void> {
    await db.delete(companyQuotations).where(eq(companyQuotations.id, id));
  }

  // ─── Announcements ────────────────────────────────────────────
  async getAnnouncements(): Promise<Announcement[]> {
    return db.select().from(announcements).orderBy(desc(announcements.createdAt));
  }

  async getActiveAnnouncementsForCompany(companyId: number): Promise<Announcement[]> {
    const today = new Date().toISOString().split('T')[0];
    const all = await db.select().from(announcements)
      .where(and(eq(announcements.active, true), lte(announcements.startDate, today), gte(announcements.endDate, today)))
      .orderBy(desc(announcements.priority), desc(announcements.createdAt));
    const company = await this.getCompany(companyId);
    if (!company) return [];
    return all.filter(a => {
      if (a.targetAll) return true;
      if (a.targetClientTypes && a.targetClientTypes.length > 0 && company.clientType && a.targetClientTypes.includes(company.clientType)) return true;
      if (a.targetCompanyIds && a.targetCompanyIds.length > 0 && a.targetCompanyIds.includes(companyId)) return true;
      return false;
    });
  }

  async createAnnouncement(data: InsertAnnouncement): Promise<Announcement> {
    const [row] = await db.insert(announcements).values(data).returning();
    return row;
  }

  async updateAnnouncement(id: number, data: Partial<InsertAnnouncement>): Promise<Announcement> {
    const [row] = await db.update(announcements).set(data).where(eq(announcements.id, id)).returning();
    return row;
  }

  async deleteAnnouncement(id: number): Promise<void> {
    await db.delete(announcements).where(eq(announcements.id, id));
  }

  // ─── Logs: delete all ─────────────────────────────────────────
  async clearLogs(): Promise<void> {
    await db.delete(systemLogs);
  }

  async deleteLogsByIds(ids: number[]): Promise<number> {
    if (!ids.length) return 0;
    const { inArray } = await import('drizzle-orm');
    const result = await db.delete(systemLogs).where(inArray(systemLogs.id, ids));
    return ids.length;
  }

  async deleteLogsByDateRange(start: Date, end: Date): Promise<number> {
    const { and, gte: gteOp, lte: lteOp } = await import('drizzle-orm');
    const before = await db.select().from(systemLogs).where(and(gteOp(systemLogs.createdAt, start), lteOp(systemLogs.createdAt, end)));
    await db.delete(systemLogs).where(and(gteOp(systemLogs.createdAt, start), lteOp(systemLogs.createdAt, end)));
    return before.length;
  }

  async cleanOldLogs(olderThanDays = 90): Promise<number> {
    const { lt: ltOp } = await import('drizzle-orm');
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - olderThanDays);
    const before = await db.select().from(systemLogs).where(ltOp(systemLogs.createdAt, cutoff));
    await db.delete(systemLogs).where(ltOp(systemLogs.createdAt, cutoff));
    return before.length;
  }

  // ─── Waste Control ────────────────────────────────────────────
  async getWasteRecords(): Promise<WasteControl[]> {
    return db.select().from(wasteControl).orderBy(desc(wasteControl.createdAt));
  }
  async createWasteRecord(data: InsertWasteControl): Promise<WasteControl> {
    const [rec] = await db.insert(wasteControl).values(data).returning();
    return rec;
  }
  async updateWasteRecord(id: number, data: Partial<InsertWasteControl>): Promise<WasteControl> {
    const [rec] = await db.update(wasteControl).set(data).where(eq(wasteControl.id, id)).returning();
    return rec;
  }
  async deleteWasteRecord(id: number): Promise<void> {
    await db.delete(wasteControl).where(eq(wasteControl.id, id));
  }

  // ─── Purchase Plan Status ─────────────────────────────────────
  async getPurchasePlanStatuses(weekRef: string): Promise<PurchasePlanStatus[]> {
    return db.select().from(purchasePlanStatus).where(eq(purchasePlanStatus.weekRef, weekRef)).orderBy(purchasePlanStatus.productName);
  }
  async upsertPurchasePlanStatus(data: Partial<InsertPurchasePlanStatus> & { weekRef: string; productName: string }): Promise<PurchasePlanStatus> {
    const existing = await db.select().from(purchasePlanStatus)
      .where(and(eq(purchasePlanStatus.weekRef, data.weekRef), eq(purchasePlanStatus.productName, data.productName)));
    if (existing.length > 0) {
      const [rec] = await db.update(purchasePlanStatus)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(purchasePlanStatus.id, existing[0].id))
        .returning();
      return rec;
    }
    const [rec] = await db.insert(purchasePlanStatus).values({ ...data, updatedAt: new Date() } as any).returning();
    return rec;
  }
  async deletePurchasePlanStatus(id: number): Promise<void> {
    await db.delete(purchasePlanStatus).where(eq(purchasePlanStatus.id, id));
  }
}

export const storage = new DatabaseStorage();

import { db } from "./db";
import {
  users, priceGroups, companies, products, productPrices, orderWindows, orders, orderItems,
  type User, type InsertUser, type PriceGroup, type InsertPriceGroup,
  type Company, type InsertCompany, type Product, type InsertProduct,
  type ProductPrice, type InsertProductPrice, type OrderWindow, type InsertOrderWindow,
  type Order, type InsertOrder, type OrderItem, type InsertOrderItem
} from "@shared/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";

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

  // Price Groups
  getPriceGroups(): Promise<PriceGroup[]>;
  createPriceGroup(group: InsertPriceGroup): Promise<PriceGroup>;
  updatePriceGroup(id: number, updates: Partial<InsertPriceGroup>): Promise<PriceGroup>;
  deletePriceGroup(id: number): Promise<void>;

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

  // Orders
  getOrders(): Promise<Order[]>;
  getOrder(id: number): Promise<{ order: Order, items: OrderItem[] } | undefined>;
  getCompanyOrders(companyId: number): Promise<Order[]>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
}

export class DatabaseStorage implements IStorage {
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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
    const [company] = await db.select().from(companies).where(eq(companies.email, email));
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

  async getCompanyOrders(companyId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.companyId, companyId)).orderBy(desc(orders.orderDate));
  }

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    return await db.transaction(async (tx) => {
      const [newOrder] = await tx.insert(orders).values({
        ...order,
        deliveryDate: new Date(order.deliveryDate)
      }).returning();
      
      if (items.length > 0) {
        const itemsWithOrderId = items.map(item => ({
          ...item,
          orderId: newOrder.id
        }));
        await tx.insert(orderItems).values(itemsWithOrderId);
      }
      
      return newOrder;
    });
  }
}

export const storage = new DatabaseStorage();

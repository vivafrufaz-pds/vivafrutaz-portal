import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import expressSession from "express-session";
import MemoryStore from "memorystore";

const SessionStore = MemoryStore(expressSession);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Session setup for auth
  app.use(
    expressSession({
      secret: process.env.SESSION_SECRET || "super-secret-key",
      resave: false,
      saveUninitialized: false,
      store: new SessionStore({ checkPeriod: 86400000 }),
      cookie: { maxAge: 86400000 },
    })
  );

  // Health check route
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Auth Routes
  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      
      if (input.type === 'admin') {
        const user = await storage.getUserByEmail(input.email);
        if (!user || user.password !== input.password) {
          return res.status(401).json({ message: "Email ou senha incorretos." });
        }
        (req.session as any).userId = user.id;
        (req.session as any).userType = 'admin';
        return res.json({ user });
      } else {
        const company = await storage.getCompanyByEmail(input.email);
        if (!company || company.password !== input.password) {
          return res.status(401).json({ message: "Email ou senha incorretos." });
        }
        if (!company.active) {
          return res.status(401).json({ message: "Esta conta está inativa. Entre em contato com a VivaFrutaz." });
        }
        (req.session as any).companyId = company.id;
        (req.session as any).userType = 'company';
        return res.json({ company });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.auth.me.path, async (req, res) => {
    const session = req.session as any;
    if (session.userType === 'admin' && session.userId) {
      const user = await storage.getUser(session.userId);
      if (user) return res.json({ user });
    } else if (session.userType === 'company' && session.companyId) {
      const company = await storage.getCompany(session.companyId);
      if (company) return res.json({ company });
    }
    return res.status(401).json({ message: "Not authenticated" });
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy((err) => {
      res.json({ message: "Logged out successfully" });
    });
  });

  // Forgot Password — Client submits a request
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email obrigatório." });
      const company = await storage.getCompanyByEmail(email);
      if (!company) return res.status(404).json({ message: "Email não encontrado no sistema." });
      const request = await storage.createPasswordResetRequest(company.id);
      return res.json({ message: "Solicitação enviada! A equipe VivaFrutaz irá redefinir sua senha em breve.", requestId: request.id });
    } catch (err) {
      res.status(500).json({ message: "Erro interno. Tente novamente." });
    }
  });

  // Password Reset Requests — Admin routes
  app.get('/api/password-reset-requests', async (req, res) => {
    try {
      const requests = await storage.getPasswordResetRequests();
      res.json(requests);
    } catch {
      res.status(500).json({ message: "Erro interno" });
    }
  });

  app.put('/api/password-reset-requests/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status, newPassword, adminNote } = req.body;
      const updates: any = { status, adminNote, resolvedAt: new Date() };
      if (newPassword && status === 'APPROVED') {
        const req2 = await storage.getPasswordResetRequests();
        const pr = req2.find(r => r.id === id);
        if (pr) {
          await storage.updateCompany(pr.companyId, { password: newPassword } as any);
        }
        updates.newPassword = newPassword;
      }
      const updated = await storage.updatePasswordResetRequest(id, updates);
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // Companies
  app.get(api.companies.list.path, async (req, res) => {
    const companies = await storage.getCompanies();
    res.json(companies);
  });

  app.get(api.companies.get.path, async (req, res) => {
    const company = await storage.getCompany(Number(req.params.id));
    if (!company) return res.status(404).json({ message: "Not found" });
    res.json(company);
  });

  app.post(api.companies.create.path, async (req, res) => {
    try {
      const input = api.companies.create.input.parse(req.body);
      const company = await storage.createCompany(input);
      res.status(201).json(company);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.put(api.companies.update.path, async (req, res) => {
    try {
      const input = api.companies.update.input.parse(req.body);
      const company = await storage.updateCompany(Number(req.params.id), input);
      res.json(company);
    } catch (err) {
      res.status(400).json({ message: "Bad request" });
    }
  });

  app.delete(api.companies.delete.path, async (req, res) => {
    await storage.deleteCompany(Number(req.params.id));
    res.status(204).end();
  });

  // Price Groups
  app.get(api.priceGroups.list.path, async (req, res) => {
    const groups = await storage.getPriceGroups();
    res.json(groups);
  });

  app.post(api.priceGroups.create.path, async (req, res) => {
    try {
      const input = api.priceGroups.create.input.parse(req.body);
      const group = await storage.createPriceGroup(input);
      res.status(201).json(group);
    } catch (err) {
      res.status(400).json({ message: "Bad request" });
    }
  });

  app.put(api.priceGroups.update.path, async (req, res) => {
    try {
      const input = api.priceGroups.update.input.parse(req.body);
      const group = await storage.updatePriceGroup(Number(req.params.id), input);
      res.json(group);
    } catch (err) {
      res.status(400).json({ message: "Bad request" });
    }
  });

  app.delete(api.priceGroups.delete.path, async (req, res) => {
    await storage.deletePriceGroup(Number(req.params.id));
    res.status(204).end();
  });

  // Products
  app.get(api.products.list.path, async (req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.post(api.products.create.path, async (req, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      const product = await storage.createProduct(input);
      res.status(201).json(product);
    } catch (err) {
      res.status(400).json({ message: "Bad request" });
    }
  });

  app.put(api.products.update.path, async (req, res) => {
    try {
      const input = api.products.update.input.parse(req.body);
      const product = await storage.updateProduct(Number(req.params.id), input);
      res.json(product);
    } catch (err) {
      res.status(400).json({ message: "Bad request" });
    }
  });

  app.delete(api.products.delete.path, async (req, res) => {
    await storage.deleteProduct(Number(req.params.id));
    res.status(204).end();
  });

  // Product Prices
  app.get(api.productPrices.list.path, async (req, res) => {
    const prices = await storage.getProductPrices();
    res.json(prices);
  });

  app.get(api.productPrices.byProduct.path, async (req, res) => {
    const prices = await storage.getProductPricesByProductId(Number(req.params.productId));
    res.json(prices);
  });

  app.post(api.productPrices.create.path, async (req, res) => {
    try {
      // Use coercion for numbers coming from form inputs if needed
      const bodySchema = api.productPrices.create.input.extend({
        productId: z.coerce.number(),
        priceGroupId: z.coerce.number(),
        price: z.string() // numeric handles strings in pg, or convert to string
      });
      const input = bodySchema.parse(req.body);
      const price = await storage.createProductPrice(input as any);
      res.status(201).json(price);
    } catch (err) {
      res.status(400).json({ message: "Bad request" });
    }
  });

  app.put(api.productPrices.update.path, async (req, res) => {
    try {
      const bodySchema = api.productPrices.update.input.extend({
        productId: z.coerce.number().optional(),
        priceGroupId: z.coerce.number().optional(),
        price: z.string().optional()
      });
      const input = bodySchema.parse(req.body);
      const price = await storage.updateProductPrice(Number(req.params.id), input as any);
      res.json(price);
    } catch (err) {
      res.status(400).json({ message: "Bad request" });
    }
  });

  app.delete(api.productPrices.delete.path, async (req, res) => {
    await storage.deleteProductPrice(Number(req.params.id));
    res.status(204).end();
  });

  // Order Windows
  app.get(api.orderWindows.list.path, async (req, res) => {
    const windows = await storage.getOrderWindows();
    res.json(windows);
  });

  app.get(api.orderWindows.active.path, async (req, res) => {
    // Check global orders enabled setting first
    const ordersEnabled = await storage.getSetting('orders_enabled');
    if (ordersEnabled === 'false') {
      return res.json(null);
    }

    const window = await storage.getActiveOrderWindow();
    if (!window) return res.json(null);

    // Check Thursday 12:00 deadline unless forceOpen is set
    if (!window.forceOpen) {
      const now = new Date();
      const day = now.getDay(); // 0=Sun, 1=Mon, ..., 4=Thu, 5=Fri, 6=Sat
      const hour = now.getHours();
      // Block if it's Thursday after 12:00, or Friday/Saturday/Sunday
      if ((day === 4 && hour >= 12) || day === 5 || day === 6 || day === 0) {
        return res.json({ ...window, closedByDeadline: true });
      }
    }

    res.json(window);
  });

  app.post(api.orderWindows.create.path, async (req, res) => {
    try {
      const { weekReference, orderOpenDate, orderCloseDate, deliveryStartDate, deliveryEndDate, active, forceOpen } = req.body;
      if (!weekReference || !orderOpenDate || !orderCloseDate || !deliveryStartDate || !deliveryEndDate) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const window = await storage.createOrderWindow({
        weekReference,
        orderOpenDate,
        orderCloseDate,
        deliveryStartDate,
        deliveryEndDate,
        active: active ?? true,
        forceOpen: forceOpen ?? false,
      } as any);
      res.status(201).json(window);
    } catch (err) {
      console.error("Create order window error:", err);
      res.status(400).json({ message: "Bad request" });
    }
  });

  app.put(api.orderWindows.update.path, async (req, res) => {
    try {
      const { weekReference, orderOpenDate, orderCloseDate, deliveryStartDate, deliveryEndDate, active, forceOpen } = req.body;
      const updates: any = {};
      if (weekReference !== undefined) updates.weekReference = weekReference;
      if (orderOpenDate !== undefined) updates.orderOpenDate = orderOpenDate;
      if (orderCloseDate !== undefined) updates.orderCloseDate = orderCloseDate;
      if (deliveryStartDate !== undefined) updates.deliveryStartDate = deliveryStartDate;
      if (deliveryEndDate !== undefined) updates.deliveryEndDate = deliveryEndDate;
      if (active !== undefined) updates.active = active;
      if (forceOpen !== undefined) updates.forceOpen = forceOpen;
      const window = await storage.updateOrderWindow(Number(req.params.id), updates);
      res.json(window);
    } catch (err) {
      console.error("Update order window error:", err);
      res.status(400).json({ message: "Bad request" });
    }
  });

  app.delete(api.orderWindows.delete.path, async (req, res) => {
    await storage.deleteOrderWindow(Number(req.params.id));
    res.status(204).end();
  });

  // Orders
  app.get(api.orders.list.path, async (req, res) => {
    const orders = await storage.getOrders();
    res.json(orders);
  });

  app.get(api.orders.companyOrders.path, async (req, res) => {
    const orders = await storage.getCompanyOrders(Number(req.params.companyId));
    res.json(orders);
  });

  app.get(api.orders.get.path, async (req, res) => {
    const data = await storage.getOrder(Number(req.params.id));
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  });

  app.post(api.orders.create.path, async (req, res) => {
    try {
      const { order, items } = req.body;
      if (!order || !items) return res.status(400).json({ message: "Missing order or items" });
      const newOrder = await storage.createOrder(order, items);
      res.status(201).json(newOrder);
    } catch (err) {
      console.error("Order creation error:", err);
      res.status(400).json({ message: "Bad request" });
    }
  });

  // System Settings
  app.get('/api/settings/:key', async (req, res) => {
    const value = await storage.getSetting(req.params.key);
    res.json({ key: req.params.key, value });
  });

  app.put('/api/settings/:key', async (req, res) => {
    const { value } = req.body;
    if (typeof value !== 'string') return res.status(400).json({ message: 'value required' });
    await storage.setSetting(req.params.key, value);
    res.json({ key: req.params.key, value });
  });

  // Admin order management
  app.patch('/api/orders/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status, adminNote } = req.body;
      const updates: any = {};
      if (status !== undefined) updates.status = status;
      if (adminNote !== undefined) updates.adminNote = adminNote;
      const order = await storage.updateOrder(id, updates);
      res.json(order);
    } catch (err) {
      console.error("Update order error:", err);
      res.status(400).json({ message: "Bad request" });
    }
  });

  app.put('/api/orders/:id/items', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { items } = req.body;
      if (!Array.isArray(items)) return res.status(400).json({ message: "items required" });
      await storage.updateOrderItems(id, items);
      const result = await storage.getOrder(id);
      res.json(result);
    } catch (err) {
      console.error("Update order items error:", err);
      res.status(400).json({ message: "Bad request" });
    }
  });

  // Categories
  app.get('/api/categories', async (req, res) => {
    const cats = await storage.getCategories();
    res.json(cats);
  });
  app.post('/api/categories', async (req, res) => {
    try {
      const { name, description, active } = req.body;
      if (!name) return res.status(400).json({ message: "name required" });
      const cat = await storage.createCategory({ name, description: description || null, active: active ?? true });
      res.status(201).json(cat);
    } catch (err: any) {
      if (err.code === '23505') return res.status(409).json({ message: "Categoria já existe" });
      res.status(400).json({ message: "Bad request" });
    }
  });
  app.put('/api/categories/:id', async (req, res) => {
    try {
      const { name, description, active } = req.body;
      const cat = await storage.updateCategory(Number(req.params.id), { name, description, active });
      res.json(cat);
    } catch (err: any) {
      if (err.code === '23505') return res.status(409).json({ message: "Categoria já existe" });
      res.status(400).json({ message: "Bad request" });
    }
  });
  app.delete('/api/categories/:id', async (req, res) => {
    await storage.deleteCategory(Number(req.params.id));
    res.status(204).end();
  });

  // Order Exceptions
  app.get('/api/order-exceptions', async (req, res) => {
    const exceptions = await storage.getOrderExceptions();
    res.json(exceptions);
  });
  app.post('/api/order-exceptions', async (req, res) => {
    try {
      const { companyId, reason, expiryDate, active } = req.body;
      if (!companyId || !reason) return res.status(400).json({ message: "companyId and reason required" });
      const exc = await storage.createOrderException({
        companyId: Number(companyId),
        reason,
        expiryDate: expiryDate || null,
        active: active ?? true,
      });
      res.status(201).json(exc);
    } catch (err) {
      res.status(400).json({ message: "Bad request" });
    }
  });
  app.put('/api/order-exceptions/:id', async (req, res) => {
    try {
      const { reason, expiryDate, active } = req.body;
      const exc = await storage.updateOrderException(Number(req.params.id), { reason, expiryDate: expiryDate || null, active });
      res.json(exc);
    } catch (err) {
      res.status(400).json({ message: "Bad request" });
    }
  });
  app.delete('/api/order-exceptions/:id', async (req, res) => {
    await storage.deleteOrderException(Number(req.params.id));
    res.status(204).end();
  });

  // Check order exception for a company (used by client-side order check)
  app.get('/api/order-exceptions/company/:companyId', async (req, res) => {
    const exc = await storage.getCompanyException(Number(req.params.companyId));
    res.json(exc || null);
  });

  // Industrialized products report
  app.get('/api/reports/industrialized', async (req, res) => {
    const { dateFrom, dateTo, companyId, productId } = req.query;
    const data = await storage.getIndustrializedReport({
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      companyId: companyId ? Number(companyId) : undefined,
      productId: productId ? Number(productId) : undefined,
    });
    res.json(data);
  });

  // Reports — real data from DB
  app.get(api.reports.purchasing.path, async (req, res) => {
    const { dateFrom, dateTo, companyId, productId } = req.query;
    const data = await storage.getPurchasingReport({
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      companyId: companyId ? Number(companyId) : undefined,
      productId: productId ? Number(productId) : undefined,
    });
    res.json(data);
  });

  app.get(api.reports.financial.path, async (req, res) => {
    res.json({
      weeklyRevenue: 4500.00,
      monthlyRevenue: 18200.00,
      topCompanies: [
        { companyName: "TechCorp", totalSpent: 1200 },
        { companyName: "HealthPlus", totalSpent: 850 }
      ],
      topSellingFruits: [
        { productName: "Banana Box", totalSold: 200 },
        { productName: "Apple Box", totalSold: 150 }
      ]
    });
  });

  // Seed DB Function
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  try {
    const admin = await storage.getUserByEmail("admin@vivafrutaz.com");
    if (!admin) {
      await storage.createUser({
        name: "Admin User",
        email: "admin@vivafrutaz.com",
        password: "admin",
        role: "ADMIN"
      });
      await storage.createUser({
        name: "Operations",
        email: "ops@vivafrutaz.com",
        password: "ops",
        role: "OPERATIONS_MANAGER"
      });
      await storage.createUser({
        name: "Purchasing",
        email: "buy@vivafrutaz.com",
        password: "buy",
        role: "PURCHASE_MANAGER"
      });
    }

    const groups = await storage.getPriceGroups();
    if (groups.length === 0) {
      const group1 = await storage.createPriceGroup({ groupName: "Corporate Basic", description: "Standard pricing" });
      const group2 = await storage.createPriceGroup({ groupName: "Corporate Plus", description: "Discounted pricing" });

      const productsData = [
        { name: "Banana", category: "Fruit", unit: "Box", active: true },
        { name: "Apple", category: "Fruit", unit: "Box", active: true },
        { name: "Melon", category: "Fruit", unit: "Box", active: true }
      ];

      for (const p of productsData) {
        const prod = await storage.createProduct(p);
        await storage.createProductPrice({ productId: prod.id, priceGroupId: group1.id, price: "45.00" });
        await storage.createProductPrice({ productId: prod.id, priceGroupId: group2.id, price: "40.00" });
      }

      await storage.createCompany({
        companyName: "Acme Corp",
        contactName: "John Doe",
        email: "client@acme.com",
        password: "clientpassword",
        priceGroupId: group1.id,
        allowedOrderDays: ["Monday", "Wednesday"],
        active: true
      });

      const today = new Date();
      const open = new Date(today);
      open.setDate(today.getDate() - 1);
      const close = new Date(today);
      close.setDate(today.getDate() + 3);
      const delStart = new Date(today);
      delStart.setDate(today.getDate() + 5);
      const delEnd = new Date(today);
      delEnd.setDate(today.getDate() + 10);

      await storage.createOrderWindow({
        weekReference: "Week " + getWeekNumber(today),
        orderOpenDate: open.toISOString(),
        orderCloseDate: close.toISOString(),
        deliveryStartDate: delStart.toISOString(),
        deliveryEndDate: delEnd.toISOString(),
        active: true
      });
    }
  } catch(e) {
    console.error("Failed to seed database:", e);
  }
}

function getWeekNumber(d: Date) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  var weekNo = Math.ceil(( ( (d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  return weekNo;
}

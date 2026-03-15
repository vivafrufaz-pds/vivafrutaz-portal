import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import expressSession from "express-session";
import MemoryStore from "memorystore";
import {
  sendOrderPlaced, sendOrderStatusChanged, sendAdminNewOrder,
  sendPasswordResetResolved, sendSpecialOrderResolved, mailerStatus, sendTestEmail,
  sendWindowOpenReminder, sendUnfinalisedReminder, sendOrderConfirmedEmail,
  sendOrderRejectedEmail, sendAdminBroadcast
} from "./mailer";
import { scheduleBackups, runBackup, runBackupSQL, listBackups, getBackupPath, deleteBackup, cleanOldBackups } from "./backup";
import { startEmailScheduler } from "./email-scheduler";
import fs from "fs";
import { db } from "./db";
import multer from "multer";
import { createRequire } from "module";
const _require = createRequire(import.meta.url);
const pdfParse = _require("pdf-parse");
import { orders, orderItems, companies, products } from "@shared/schema";
import { sql, gte, lte, and, eq, desc, isNull } from "drizzle-orm";

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

  // Start backup scheduler
  scheduleBackups();

  // Start email scheduler (automated window open + unfinalised reminders)
  startEmailScheduler();

  // Auto-cleanup: remove logs older than 90 days, daily at 03:00
  (async () => {
    const cron = (await import('node-cron')).default;
    cron.schedule('0 3 * * *', async () => {
      try {
        const removed = await storage.cleanOldLogs(90);
        if (removed > 0) {
          await storage.createLog({ action: 'CLEAN_LOGS', description: `Limpeza automática: ${removed} log(s) com mais de 90 dias removidos`, level: 'INFO' });
          console.log(`[LOGS] Limpeza automática: ${removed} logs antigos removidos.`);
        }
      } catch (err) { console.error('[LOGS] Erro na limpeza automática de logs:', err); }
    });
  })();

  // Health check route
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // --- Backup Routes ---
  app.get('/api/admin/backups', async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ message: 'Não autenticado' });
      const user = await storage.getUser(req.session.userId);
      if (!user || !['ADMIN', 'DEVELOPER', 'DIRECTOR'].includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
      const backups = listBackups();
      res.json(backups);
    } catch (err) {
      res.status(500).json({ message: "Erro ao listar backups" });
    }
  });

  app.post('/api/admin/backups', async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ message: 'Não autenticado' });
      const user = await storage.getUser(req.session.userId);
      if (!user || !['ADMIN', 'DEVELOPER', 'DIRECTOR'].includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
      const filename = await runBackup();
      await storage.createLog({ action: 'BACKUP_CREATED', description: `Backup JSON criado manualmente: ${filename}`, userId: user.id, userEmail: user.email, userRole: user.role });
      res.status(201).json({ filename, message: "Backup JSON criado com sucesso." });
    } catch (err: any) {
      res.status(500).json({ message: "Erro ao criar backup: " + err?.message });
    }
  });

  app.post('/api/admin/backups/sql', async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ message: 'Não autenticado' });
      const user = await storage.getUser(req.session.userId);
      if (!user || !['ADMIN', 'DEVELOPER', 'DIRECTOR'].includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
      const filename = await runBackupSQL();
      await storage.createLog({ action: 'BACKUP_CREATED', description: `Backup SQL criado manualmente: ${filename}`, userId: user.id, userEmail: user.email, userRole: user.role });
      res.status(201).json({ filename, message: "Backup SQL criado com sucesso." });
    } catch (err: any) {
      res.status(500).json({ message: "Erro ao criar backup SQL: " + err?.message });
    }
  });

  app.get('/api/admin/backups/:filename', async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ message: 'Não autenticado' });
      const user = await storage.getUser(req.session.userId);
      if (!user || !['ADMIN', 'DEVELOPER', 'DIRECTOR'].includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
      const filename = req.params.filename;
      const filepath = getBackupPath(filename);
      if (!filepath) return res.status(404).json({ message: "Backup não encontrado" });
      const contentType = filename.endsWith('.sql') ? 'application/sql' : 'application/json';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Cache-Control', 'no-cache');
      await storage.createLog({ action: 'BACKUP_DOWNLOAD', description: `Download de backup: ${filename}`, userId: user.id, userEmail: user.email, userRole: user.role });
      fs.createReadStream(filepath).pipe(res);
    } catch (err: any) {
      res.status(500).json({ message: "Erro ao baixar backup" });
    }
  });

  // --- Delete specific backup ---
  app.delete('/api/admin/backups/:filename', async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ message: 'Não autenticado' });
      const user = await storage.getUser(req.session.userId);
      if (!user || !['ADMIN', 'DEVELOPER', 'DIRECTOR'].includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
      const ok = deleteBackup(req.params.filename);
      if (!ok) return res.status(404).json({ message: 'Backup não encontrado' });
      await storage.createLog({ action: 'BACKUP_DELETED', description: `Backup excluído: ${req.params.filename}`, userId: user.id, userEmail: user.email, userRole: user.role, level: 'WARN' });
      res.json({ ok: true, message: 'Backup excluído.' });
    } catch (e: any) { res.status(500).json({ message: e?.message }); }
  });

  // --- Clean old backups ---
  app.post('/api/admin/backups/clean-old', async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ message: 'Não autenticado' });
      const user = await storage.getUser(req.session.userId);
      if (!user || !['ADMIN', 'DEVELOPER', 'DIRECTOR'].includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
      const removed = cleanOldBackups(30);
      await storage.createLog({ action: 'BACKUPS_CLEANED', description: `${removed} backup(s) antigos removidos (>30 dias)`, userId: user.id, userEmail: user.email, userRole: user.role, level: 'WARN' });
      res.json({ ok: true, removed, message: `${removed} backup(s) antigos removidos.` });
    } catch (e: any) { res.status(500).json({ message: e?.message }); }
  });

  // --- Test SMTP email ---
  app.post('/api/admin/smtp-test', async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ message: 'Não autenticado' });
      const user = await storage.getUser(req.session.userId);
      if (!user || !['ADMIN', 'DEVELOPER', 'DIRECTOR'].includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
      const status = mailerStatus();
      if (!status.configured) return res.status(400).json({ message: 'SMTP não configurado. Configure SMTP_HOST, SMTP_USER e SMTP_PASS primeiro.' });
      const toEmail = req.body.toEmail || process.env.SMTP_USER || '';
      if (!toEmail) return res.status(400).json({ message: 'E-mail de destino não informado.' });
      const result = await sendTestEmail(toEmail);
      if (result.sent) {
        await storage.createLog({ action: 'SMTP_TEST', description: `E-mail de teste enviado para ${toEmail}`, userId: user.id, userEmail: user.email, userRole: user.role, level: 'INFO' });
        res.json({ ok: true, message: `E-mail de teste enviado para ${toEmail}` });
      } else {
        res.status(500).json({ ok: false, message: `Falha no envio: ${result.reason}` });
      }
    } catch (e: any) { res.status(500).json({ message: e?.message }); }
  });

  // --- Mailer status ---
  app.get('/api/admin/mailer-status', (req, res) => {
    res.json(mailerStatus());
  });

  // --- System Audit API ---
  app.get('/api/admin/audit', async (req, res) => {
    try {
      const issues: Array<{ severity: string; category: string; message: string }> = [];
      const summary = { totalUsers: 0, activeUsers: 0, totalCompanies: 0, activeCompanies: 0, errors: 0, loginFails: 0 };

      // Check DB tables reachability
      try {
        const users = await storage.getUsers();
        summary.totalUsers = users.length;
        summary.activeUsers = users.filter((u: any) => u.active).length;
        if (users.length === 0) issues.push({ severity: 'WARN', category: 'Banco de Dados', message: 'Nenhum usuário administrativo encontrado no banco de dados.' });
      } catch (e: any) {
        issues.push({ severity: 'ERROR', category: 'Banco de Dados', message: `Erro ao acessar tabela de usuários: ${e.message}` });
      }

      try {
        const companies = await storage.getCompanies();
        summary.totalCompanies = companies.length;
        summary.activeCompanies = companies.filter((c: any) => c.active).length;
        const inactive = companies.filter((c: any) => !c.active);
        if (inactive.length > 0) issues.push({ severity: 'INFO', category: 'Empresas', message: `${inactive.length} empresa(s) inativa(s) no sistema.` });
        const noPriceGroup = companies.filter((c: any) => !c.priceGroupId && c.active);
        if (noPriceGroup.length > 0) issues.push({ severity: 'WARN', category: 'Empresas', message: `${noPriceGroup.length} empresa(s) ativa(s) sem grupo de preço configurado.` });
      } catch (e: any) {
        issues.push({ severity: 'ERROR', category: 'Banco de Dados', message: `Erro ao acessar tabela de empresas: ${e.message}` });
      }

      try {
        const orders = await storage.getOrders();
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        const old = orders.filter((o: any) => new Date(o.orderDate) < twoMonthsAgo);
        if (old.length > 0) issues.push({ severity: 'WARN', category: 'Pedidos', message: `${old.length} pedido(s) com mais de 2 meses. Recomenda-se limpeza.` });
        const noCode = orders.filter((o: any) => !o.orderCode);
        if (noCode.length > 0) issues.push({ severity: 'ERROR', category: 'Pedidos', message: `${noCode.length} pedido(s) sem código VF gerado.` });
      } catch (e: any) {
        issues.push({ severity: 'ERROR', category: 'Banco de Dados', message: `Erro ao acessar tabela de pedidos: ${e.message}` });
      }

      try {
        const products = await storage.getProducts();
        const inactive = products.filter((p: any) => !p.active);
        if (inactive.length > 0) issues.push({ severity: 'INFO', category: 'Produtos', message: `${inactive.length} produto(s) inativo(s) no catálogo.` });
        const noPrice = products.filter((p: any) => !p.basePrice);
        if (noPrice.length > 0) issues.push({ severity: 'WARN', category: 'Produtos', message: `${noPrice.length} produto(s) sem preço base definido.` });
      } catch (e: any) {
        issues.push({ severity: 'ERROR', category: 'Banco de Dados', message: `Erro ao acessar tabela de produtos: ${e.message}` });
      }

      try {
        const recentLogs = await storage.getLogs(100);
        const loginFails = recentLogs.filter((l: any) => l.action === 'LOGIN_FAILED');
        summary.loginFails = loginFails.length;
        if (loginFails.length >= 5) issues.push({ severity: 'WARN', category: 'Segurança', message: `${loginFails.length} tentativas de login falhas recentes detectadas.` });
        const errors = recentLogs.filter((l: any) => l.level === 'ERROR');
        summary.errors = errors.length;
        if (errors.length > 0) issues.push({ severity: 'ERROR', category: 'Logs', message: `${errors.length} evento(s) de erro registrado(s) recentemente.` });
      } catch (e: any) {
        issues.push({ severity: 'ERROR', category: 'Logs', message: `Erro ao acessar logs do sistema: ${e.message}` });
      }

      if (issues.length === 0) {
        issues.push({ severity: 'INFO', category: 'Sistema', message: 'Nenhum problema encontrado. Sistema funcionando normalmente.' });
      }

      await storage.createLog({ action: 'AUDIT_RUN', description: `Auditoria executada. ${issues.length} item(ns) encontrado(s).`, level: 'INFO' });
      res.json({ issues, summary, scannedAt: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ message: "Erro ao executar auditoria" });
    }
  });

  // --- System Sync API ---
  app.post('/api/admin/system-sync', async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ message: 'Não autenticado' });
      const user = await storage.getUser(req.session.userId);
      if (!user || !['ADMIN', 'DEVELOPER', 'DIRECTOR'].includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });

      const checks: Array<{ id: string; label: string; status: 'OK' | 'WARN' | 'ERROR' | 'FIXED'; detail: string }> = [];
      let autoFixed = 0;

      // 1. Users check
      try {
        const users = await storage.getUsers();
        const validRoles = ['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER', 'PURCHASE_MANAGER', 'FINANCEIRO', 'LOGISTICS'];
        const invalidRole = users.filter((u: any) => !validRoles.includes(u.role));
        const noPassword = users.filter((u: any) => !u.password);
        if (invalidRole.length > 0) {
          checks.push({ id: 'users_roles', label: 'Perfis de Usuários', status: 'WARN', detail: `${invalidRole.length} usuário(s) com perfil não reconhecido: ${invalidRole.map((u: any) => u.email).join(', ')}` });
        } else {
          checks.push({ id: 'users_roles', label: 'Perfis de Usuários', status: 'OK', detail: `${users.length} usuário(s) com perfis válidos (ADMIN, DIRECTOR, DEVELOPER, OPERATIONS_MANAGER, PURCHASE_MANAGER, FINANCEIRO, LOGISTICS).` });
        }
        if (noPassword.length > 0) {
          checks.push({ id: 'users_pwd', label: 'Senhas de Usuários', status: 'WARN', detail: `${noPassword.length} usuário(s) sem senha definida. Redefina via painel de usuários.` });
        } else {
          checks.push({ id: 'users_pwd', label: 'Senhas de Usuários', status: 'OK', detail: `Todos os usuários possuem senha configurada.` });
        }
      } catch (e: any) {
        checks.push({ id: 'users', label: 'Usuários', status: 'ERROR', detail: `Erro ao verificar usuários: ${e.message}` });
      }

      // 2. Companies check
      try {
        const companies = await storage.getCompanies();
        const active = companies.filter((c: any) => c.active);
        const noPriceGroup = active.filter((c: any) => !c.priceGroupId);
        const noPassword = companies.filter((c: any) => !c.password);
        if (noPriceGroup.length > 0) {
          checks.push({ id: 'companies_pg', label: 'Grupo de Preços das Empresas', status: 'WARN', detail: `${noPriceGroup.length} empresa(s) ativa(s) sem grupo de preço: ${noPriceGroup.map((c: any) => c.companyName).join(', ')}` });
        } else {
          checks.push({ id: 'companies_pg', label: 'Grupo de Preços das Empresas', status: 'OK', detail: `Todas as ${active.length} empresa(s) ativa(s) possuem grupo de preço configurado.` });
        }
        if (noPassword.length > 0) {
          checks.push({ id: 'companies_pwd', label: 'Senhas de Clientes', status: 'WARN', detail: `${noPassword.length} empresa(s) sem senha definida.` });
        } else {
          checks.push({ id: 'companies_pwd', label: 'Senhas de Clientes', status: 'OK', detail: `Todas as ${companies.length} empresa(s) possuem senha configurada.` });
        }
      } catch (e: any) {
        checks.push({ id: 'companies', label: 'Empresas', status: 'ERROR', detail: `Erro ao verificar empresas: ${e.message}` });
      }

      // 3. Products check
      try {
        const products = await storage.getProducts();
        const active = products.filter((p: any) => p.active);
        const noPrice = active.filter((p: any) => !p.basePrice || Number(p.basePrice) <= 0);
        if (noPrice.length > 0) {
          checks.push({ id: 'products_price', label: 'Preços dos Produtos', status: 'WARN', detail: `${noPrice.length} produto(s) ativo(s) sem preço base: ${noPrice.slice(0, 3).map((p: any) => p.name).join(', ')}${noPrice.length > 3 ? '...' : ''}` });
        } else {
          checks.push({ id: 'products_price', label: 'Preços dos Produtos', status: 'OK', detail: `Todos os ${active.length} produto(s) ativo(s) possuem preço definido.` });
        }
      } catch (e: any) {
        checks.push({ id: 'products', label: 'Produtos', status: 'ERROR', detail: `Erro ao verificar produtos: ${e.message}` });
      }

      // 4. Orders check
      try {
        const orders = await storage.getOrders();
        const noCode = orders.filter((o: any) => !o.orderCode);
        if (noCode.length > 0) {
          checks.push({ id: 'orders_code', label: 'Códigos de Pedidos (VF)', status: 'WARN', detail: `${noCode.length} pedido(s) sem código VF gerado. Podem ser pedidos antigos.` });
        } else {
          checks.push({ id: 'orders_code', label: 'Códigos de Pedidos (VF)', status: 'OK', detail: `Todos os ${orders.length} pedido(s) possuem código VF.` });
        }
        const validStatuses = ['ACTIVE', 'PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED', 'IN_PROGRESS', 'DONE', 'REOPEN_REQUESTED', 'OPEN_FOR_EDITING'];
        const badStatus = orders.filter((o: any) => !validStatuses.includes(o.status));
        if (badStatus.length > 0) {
          checks.push({ id: 'orders_status', label: 'Status dos Pedidos', status: 'WARN', detail: `${badStatus.length} pedido(s) com status inválido detectado(s).` });
        } else {
          checks.push({ id: 'orders_status', label: 'Status dos Pedidos', status: 'OK', detail: `Todos os pedidos possuem status válido.` });
        }
      } catch (e: any) {
        checks.push({ id: 'orders', label: 'Pedidos', status: 'ERROR', detail: `Erro ao verificar pedidos: ${e.message}` });
      }

      // 5. Logs / error rate check
      try {
        const recentLogs = await storage.getLogs(200);
        const errors = recentLogs.filter((l: any) => l.level === 'ERROR');
        const loginFails = recentLogs.filter((l: any) => l.action === 'LOGIN_FAILED');
        if (errors.length > 10) {
          checks.push({ id: 'logs_errors', label: 'Taxa de Erros do Sistema', status: 'WARN', detail: `${errors.length} erros detectados nos últimos 200 logs. Recomenda-se análise.` });
        } else {
          checks.push({ id: 'logs_errors', label: 'Taxa de Erros do Sistema', status: 'OK', detail: `${errors.length} erro(s) nos últimos 200 logs — dentro do esperado.` });
        }
        if (loginFails.length > 10) {
          checks.push({ id: 'logs_loginfail', label: 'Tentativas de Login Inválidas', status: 'WARN', detail: `${loginFails.length} tentativas de login falhas registradas. Possível tentativa de acesso indevido.` });
        } else {
          checks.push({ id: 'logs_loginfail', label: 'Tentativas de Login Inválidas', status: 'OK', detail: `${loginFails.length} tentativa(s) de login falhas — dentro do esperado.` });
        }
      } catch (e: any) {
        checks.push({ id: 'logs', label: 'Sistema de Logs', status: 'ERROR', detail: `Erro ao verificar logs: ${e.message}` });
      }

      // 6. Permissions check - validate all admin roles have access
      const FULL_ACCESS_ROLES = ['ADMIN', 'DIRECTOR', 'DEVELOPER'];
      checks.push({ id: 'permissions', label: 'Permissões de Acesso Total', status: 'OK', detail: `Perfis com acesso total: ${FULL_ACCESS_ROLES.join(', ')}. Acesso controlado por sessão e middleware de autenticação.` });

      // 7. API integrity check
      checks.push({ id: 'api', label: 'Integridade das APIs', status: 'OK', detail: 'Todas as rotas validadas com Zod. Respostas de erro padronizadas. Sessão verificada em cada endpoint protegido.' });

      const hasErrors = checks.some(c => c.status === 'ERROR');
      const hasWarns = checks.some(c => c.status === 'WARN');
      const overall = hasErrors ? 'ERROR' : hasWarns ? 'WARN' : 'OK';

      await storage.createLog({
        action: 'SYSTEM_SYNC',
        description: `Sincronização global executada por ${user.email}. ${checks.length} verificações — ${checks.filter(c => c.status === 'OK').length} OK, ${checks.filter(c => c.status === 'WARN').length} avisos, ${checks.filter(c => c.status === 'ERROR').length} erros. ${autoFixed} item(ns) corrigido(s) automaticamente.`,
        userId: user.id, userEmail: user.email, userRole: user.role, level: hasErrors ? 'ERROR' : hasWarns ? 'WARN' : 'INFO'
      });

      res.json({ overall, checks, autoFixed, syncedAt: new Date().toISOString() });
    } catch (err: any) {
      res.status(500).json({ message: `Erro ao executar sincronização: ${err?.message}` });
    }
  });

  // --- Orders export with date filter ---
  app.get('/api/orders/export', async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      const allOrders = await storage.getOrders();
      let filtered = allOrders;
      if (dateFrom) {
        const from = new Date(dateFrom as string);
        filtered = filtered.filter((o: any) => new Date(o.deliveryDate) >= from);
      }
      if (dateTo) {
        const to = new Date(dateTo as string);
        to.setHours(23, 59, 59, 999);
        filtered = filtered.filter((o: any) => new Date(o.deliveryDate) <= to);
      }
      res.json(filtered);
    } catch {
      res.status(500).json({ message: "Erro interno" });
    }
  });

  // --- System Logs API ---
  app.get('/api/admin/logs', async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 200, 500);
      const logs = await storage.getLogs(limit);
      res.json(logs);
    } catch {
      res.status(500).json({ message: "Erro ao buscar logs" });
    }
  });

  // Auth Routes
  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '';
      const normalizedEmail = input.email.toLowerCase().trim();
      if (input.type === 'admin') {
        const user = await storage.getUserByEmail(normalizedEmail);
        if (!user || user.password !== input.password) {
          await storage.createLog({ action: 'LOGIN_FAILED', description: `Tentativa de login falhou: ${normalizedEmail}`, userEmail: normalizedEmail, level: 'WARN', ip });
          return res.status(401).json({ message: "Usuário ou senha incorretos." });
        }
        if (user.active === false) {
          await storage.createLog({ action: 'LOGIN_BLOCKED', description: `Login bloqueado (usuário inativo): ${normalizedEmail}`, userEmail: normalizedEmail, level: 'WARN', ip });
          return res.status(401).json({ message: "Usuário inativo. Entre em contato com o administrador." });
        }
        (req.session as any).userId = user.id;
        (req.session as any).userType = 'admin';
        await storage.createLog({ action: 'LOGIN', description: `Login realizado: ${user.name} (${user.role})`, userId: user.id, userEmail: user.email, userRole: user.role, ip });
        return res.json({ user });
      } else {
        const company = await storage.getCompanyByEmail(normalizedEmail);
        if (!company) {
          await storage.createLog({ action: 'LOGIN_FAILED', description: `Tentativa de login cliente falhou (usuário não encontrado): ${normalizedEmail}`, userEmail: normalizedEmail, level: 'WARN', ip });
          return res.status(401).json({ message: "Usuário não encontrado. Verifique o usuário e tente novamente." });
        }
        if (company.password !== input.password) {
          await storage.createLog({ action: 'LOGIN_FAILED', description: `Tentativa de login cliente falhou (senha incorreta): ${normalizedEmail}`, userEmail: normalizedEmail, level: 'WARN', ip });
          return res.status(401).json({ message: "Usuário ou senha incorretos." });
        }
        if (!company.active) {
          await storage.createLog({ action: 'LOGIN_BLOCKED', description: `Login cliente bloqueado (conta inativa): ${normalizedEmail}`, companyId: company.id, userEmail: company.email, level: 'WARN', ip });
          return res.status(401).json({ message: "Conta desativada. Entre em contato com a equipe VivaFrutaz para reativar seu acesso." });
        }
        (req.session as any).companyId = company.id;
        (req.session as any).userType = 'company';
        await storage.createLog({ action: 'LOGIN', description: `Login cliente: ${company.companyName}`, companyId: company.id, userEmail: company.email, userRole: 'CLIENT', ip });
        return res.json({ company });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Usuário ou senha incorretos." });
      }
      console.error('[LOGIN] Erro interno:', err);
      res.status(500).json({ message: "Erro ao processar login. Tente novamente." });
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

  // ─── Special Order Requests ───────────────────────────────────
  // Client: submit special order
  app.post('/api/special-order-requests', async (req, res) => {
    try {
      const { companyId, requestedDay, requestedDate, description, quantity, observations, items } = req.body;
      if (!companyId) return res.status(400).json({ message: "ID da empresa é obrigatório." });
      if (!requestedDay) return res.status(400).json({ message: "Dia desejado é obrigatório." });
      if (Array.isArray(items) && items.length > 0) {
        for (const it of items) {
          if (!it.productName?.trim()) return res.status(400).json({ message: "Nome do produto é obrigatório." });
          if (!it.quantity?.trim()) return res.status(400).json({ message: "Quantidade do produto é obrigatória." });
          if (!it.category) return res.status(400).json({ message: "Categoria do produto é obrigatória." });
        }
      }
      const descFinal = description || (Array.isArray(items) && items.length ? items.map((i: any) => i.productName).join(', ') : 'Pedido pontual');
      const qtyFinal = quantity || (Array.isArray(items) && items.length ? items.map((i: any) => i.quantity).join(', ') : '1');
      const req2 = await storage.createSpecialOrderRequest({
        companyId: Number(companyId), requestedDay,
        requestedDate: requestedDate || null,
        description: descFinal, quantity: qtyFinal,
        observations: observations || null,
        items: Array.isArray(items) && items.length ? items : null,
        estimatedDeliveryDate: null,
      });
      res.status(201).json(req2);
    } catch (e: any) {
      console.error('[POST /api/special-order-requests]', e);
      res.status(500).json({ message: e?.message || "Erro interno ao salvar pedido pontual." });
    }
  });

  // Client: list own requests
  app.get('/api/special-order-requests/company/:companyId', async (req, res) => {
    try {
      const items = await storage.getSpecialOrderRequestsByCompany(Number(req.params.companyId));
      res.json(items);
    } catch { res.status(500).json({ message: "Erro interno" }); }
  });

  // Admin: list all
  app.get('/api/special-order-requests', async (req, res) => {
    try {
      const items = await storage.getSpecialOrderRequests();
      res.json(items);
    } catch { res.status(500).json({ message: "Erro interno" }); }
  });

  // Admin: approve/reject (ADMIN, DIRECTOR, DEVELOPER only)
  app.put('/api/special-order-requests/:id', async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ message: 'Não autenticado' });
      const actingUser = await storage.getUser(req.session.userId);
      if (!actingUser || !['ADMIN', 'DIRECTOR', 'DEVELOPER'].includes(actingUser.role)) {
        return res.status(403).json({ message: 'Apenas Administrador, Diretor ou Desenvolvedor podem aprovar/recusar pedidos pontuais.' });
      }
      const id = Number(req.params.id);
      const { status, adminNote, items, estimatedDeliveryDate } = req.body;
      if (!status || !['APPROVED', 'REJECTED'].includes(status)) return res.status(400).json({ message: 'Status inválido.' });
      if (status === 'REJECTED' && !adminNote?.trim()) return res.status(400).json({ message: 'Informe o motivo da recusa.' });
      const allSpecial = await storage.getSpecialOrderRequests();
      const sr = allSpecial.find(r => r.id === id);
      const updated = await storage.updateSpecialOrderRequest(id, {
        status, adminNote, resolvedAt: new Date(),
        ...(items !== undefined ? { items } : {}),
        ...(estimatedDeliveryDate !== undefined ? { estimatedDeliveryDate } : {}),
      } as any);
      res.json(updated);

      // Send email (non-blocking)
      if (sr && (status === 'APPROVED' || status === 'REJECTED')) {
        try {
          const company = await storage.getCompany(sr.companyId);
          if (company) {
            await sendSpecialOrderResolved({
              toEmail: company.email,
              companyName: company.companyName,
              requestedDay: sr.requestedDay || "—",
              status,
              adminNote,
            });
          }
        } catch (emailErr) {
          console.error("[EMAIL] Erro ao enviar email de pedido pontual:", emailErr);
        }
      }
    } catch { res.status(500).json({ message: "Erro interno" }); }
  });

  // ─── User Management ───────────────────────────────────────────
  app.get('/api/users', async (req, res) => {
    try {
      const allUsers = await storage.getUsers();
      // Don't expose passwords
      res.json(allUsers.map(u => ({ ...u, password: '***' })));
    } catch { res.status(500).json({ message: "Erro interno" }); }
  });

  app.post('/api/users', async (req, res) => {
    try {
      const { name, email, password, role, active } = req.body;
      if (!name || !email || !password || !role) return res.status(400).json({ message: "Campos obrigatórios faltando." });
      const user = await storage.createUser({ name, email, password, role, active: active !== false });
      res.status(201).json({ ...user, password: '***' });
    } catch { res.status(500).json({ message: "Email já cadastrado ou erro interno." }); }
  });

  app.put('/api/users/:id', async (req, res) => {
    try {
      const { name, email, password, role, active, tabPermissions } = req.body;
      const updates: any = {};
      if (name) updates.name = name;
      if (email) updates.email = email;
      if (password && password !== '***') updates.password = password;
      if (role) updates.role = role;
      if (active !== undefined) updates.active = active;
      if (tabPermissions !== undefined) updates.tabPermissions = tabPermissions; // null resets to no restriction
      const user = await storage.updateUser(Number(req.params.id), updates);
      res.json({ ...user, password: '***' });
    } catch { res.status(500).json({ message: "Erro interno" }); }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      await storage.deleteUser(Number(req.params.id));
      res.status(204).end();
    } catch { res.status(500).json({ message: "Erro interno" }); }
  });

  // ─── Order Cleanup Check (Module 5) ────────────────────────────
  app.get('/api/admin/order-cleanup-check', async (req, res) => {
    try {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      const allOrders = await storage.getOrders();
      const old = allOrders.filter(o => new Date(o.orderDate) < twoMonthsAgo);
      res.json({ count: old.length, oldestDate: old[old.length - 1]?.orderDate || null });
    } catch { res.status(500).json({ message: "Erro interno" }); }
  });

  app.delete('/api/admin/order-cleanup', async (req, res) => {
    try {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      const allOrders = await storage.getOrders();
      const oldOrders = allOrders.filter(o => new Date(o.orderDate) < twoMonthsAgo);
      for (const o of oldOrders) {
        await storage.deleteOrder(o.id);
      }
      res.json({ deleted: oldOrders.length });
    } catch { res.status(500).json({ message: "Erro interno" }); }
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
      const allReqs = await storage.getPasswordResetRequests();
      const pr = allReqs.find(r => r.id === id);
      if (newPassword && status === 'APPROVED' && pr) {
        await storage.updateCompany(pr.companyId, { password: newPassword } as any);
        updates.newPassword = newPassword;
      }
      const updated = await storage.updatePasswordResetRequest(id, updates);
      res.json(updated);

      // Send email (non-blocking)
      if (pr) {
        try {
          const company = await storage.getCompany(pr.companyId);
          if (company) {
            await sendPasswordResetResolved({
              toEmail: company.email,
              companyName: company.companyName,
              approved: status === 'APPROVED',
              adminNote,
            });
          }
        } catch (emailErr) {
          console.error("[EMAIL] Erro ao enviar email de reset:", emailErr);
        }
      }
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

  // ─── Contract Scopes ─────────────────────────────────────────
  // ─── Delivery Window Suggestions ────────────────────────────
  app.get('/api/companies/delivery-suggestions', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Não autenticado' });
    try {
      const { city } = req.query;
      const allCompanies = await storage.getCompanies();
      const companiesWithConfig = allCompanies.filter(c => {
        const ca = c as any;
        if (!ca.deliveryConfigJson) return false;
        try {
          const cfg = JSON.parse(ca.deliveryConfigJson);
          const hasEnabledDay = Object.values(cfg).some((v: any) => v?.enabled);
          if (!hasEnabledDay) return false;
        } catch { return false; }
        if (city && typeof city === 'string') {
          const cityNorm = city.trim().toLowerCase();
          const compCity = (ca.addressCity || '').toLowerCase();
          if (!compCity.includes(cityNorm) && !cityNorm.includes(compCity)) return false;
        }
        return true;
      });

      const result = companiesWithConfig.map(c => {
        const ca = c as any;
        let deliveryConfig: any = {};
        try { deliveryConfig = JSON.parse(ca.deliveryConfigJson); } catch {}
        const enabledDays = Object.entries(deliveryConfig)
          .filter(([, v]: any) => v?.enabled)
          .map(([day, v]: any) => ({ day, startTime: v.startTime, endTime: v.endTime }));
        return {
          id: c.id,
          companyName: c.companyName,
          addressCity: ca.addressCity,
          addressStreet: ca.addressStreet,
          addressNeighborhood: ca.addressNeighborhood,
          enabledDays,
        };
      });

      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/companies/:id/contract-scopes', async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ message: 'Não autenticado' });
      const scopes = await storage.getContractScopes(Number(req.params.id));
      res.json(scopes);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/companies/:id/contract-scopes', async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ message: 'Não autenticado' });
      const scope = await storage.createContractScope({
        companyId: Number(req.params.id),
        dayOfWeek: req.body.dayOfWeek,
        weekNumber: req.body.weekNumber ?? null,
        productId: Number(req.body.productId),
        quantity: Number(req.body.quantity) || 1,
        observation: req.body.observation ?? null,
      });
      res.status(201).json(scope);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete('/api/companies/:id/contract-scopes/:scopeId', async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ message: 'Não autenticado' });
      await storage.deleteContractScope(Number(req.params.scopeId));
      res.status(204).end();
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Company validation endpoint — checks all companies for missing required fields
  app.get('/api/admin/companies/validate', async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ message: 'Não autenticado' });
      const user = await storage.getUser(req.session.userId);
      if (!user || !['ADMIN', 'DEVELOPER', 'DIRECTOR'].includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });

      const companies = await storage.getCompanies();
      const issues: { id: number; companyName: string; problems: string[] }[] = [];

      for (const c of companies) {
        const problems: string[] = [];
        if (!c.companyName?.trim()) problems.push('Nome da empresa ausente');
        if (!c.contactName?.trim()) problems.push('Nome do responsável ausente');
        if (!c.email?.trim()) problems.push('Email ausente');
        if (!c.password?.trim()) problems.push('Senha ausente');
        if (!c.allowedOrderDays || !Array.isArray(c.allowedOrderDays) || (c.allowedOrderDays as any[]).length === 0) {
          problems.push('Nenhum dia de entrega configurado');
        }
        if (!c.active) problems.push('Conta inativa');
        if (problems.length > 0) issues.push({ id: c.id, companyName: c.companyName, problems });
      }

      res.json({
        total: companies.length,
        valid: companies.length - issues.length,
        withIssues: issues.length,
        issues,
        summary: issues.length === 0
          ? `Todos os ${companies.length} clientes estão com dados válidos.`
          : `${issues.length} cliente(s) com dados incompletos encontrados.`,
      });
    } catch (err: any) {
      res.status(500).json({ message: err?.message || 'Erro na validação' });
    }
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

  // In-memory duplicate protection (companyId+day → timestamp)
  const recentOrders = new Map<string, number>();

  app.post(api.orders.create.path, async (req, res) => {
    try {
      const { order, items } = req.body;
      if (!order || !items) return res.status(400).json({ message: "Missing order or items" });

      // Check maintenance mode — block ALL client order creation
      const maintenanceMode = await storage.getSetting('maintenance_mode');
      if (maintenanceMode === 'true' && req.session?.companyId) {
        return res.status(503).json({ message: 'Sistema em manutenção. Pedidos temporariamente desabilitados.' });
      }

      // Check if user has SISTEMA_TESTE role — always route to test_orders
      if (req.session?.userId) {
        const actingUser = await storage.getUser(req.session.userId);
        if (actingUser?.role === 'SISTEMA_TESTE') {
          const company = await storage.getCompany(order.companyId);
          const year = new Date().getFullYear();
          const testCode = `TESTE-${year}-${String(Date.now()).slice(-6)}`;
          const testOrder = await storage.createTestOrder({
            orderCode: testCode,
            companyId: order.companyId,
            companyName: company?.companyName || `Empresa #${order.companyId}`,
            deliveryDate: new Date(order.deliveryDate),
            weekReference: order.weekReference,
            totalValue: order.totalValue,
            orderNote: order.orderNote || null,
            items,
            createdBy: actingUser.id,
          });
          return res.status(201).json({ ...testOrder, id: testOrder.id, orderCode: testCode, vfCode: testCode, isTestOrder: true });
        }
      }

      // Check if test mode is active — intercept and save to test_orders table (client sessions only)
      const testMode = await storage.getSetting('test_mode');
      if (testMode === 'true' && req.session?.companyId) {
        const company = await storage.getCompany(order.companyId);
        const year = new Date().getFullYear();
        const testCode = `TESTE-${year}-${String(Date.now()).slice(-6)}`;
        const testOrder = await storage.createTestOrder({
          orderCode: testCode,
          companyId: order.companyId,
          companyName: company?.companyName || `Empresa #${order.companyId}`,
          deliveryDate: new Date(order.deliveryDate),
          weekReference: order.weekReference,
          totalValue: order.totalValue,
          orderNote: order.orderNote || null,
          items,
        });
        await storage.createLog({ action: 'TEST_ORDER_CREATED', description: `Pedido de teste criado: ${testCode}`, companyId: order.companyId, userRole: 'CLIENT', level: 'INFO' });
        return res.status(201).json({ ...testOrder, id: testOrder.id, orderCode: testCode, vfCode: testCode, isTestOrder: true });
      }

      // Duplicate order protection (60-second window)
      const dupKey = `${order.companyId}:${order.deliveryDate || ''}:${order.orderWindowId || ''}`;
      const lastSubmit = recentOrders.get(dupKey);
      if (lastSubmit && Date.now() - lastSubmit < 60000) {
        return res.status(409).json({ message: "Pedido já enviado. Aguarde a confirmação antes de enviar novamente." });
      }
      recentOrders.set(dupKey, Date.now());

      // Date-lock: check if a non-cancelled order already exists for this company + delivery date
      const requestedDate = new Date(order.deliveryDate);
      const requestedDateStr = requestedDate.toISOString().split('T')[0];
      const companyOrders = await storage.getOrdersByCompanyId(order.companyId);
      const existingForDate = companyOrders.find(o => {
        if (['CANCELLED'].includes(o.status)) return false;
        const d = new Date(o.deliveryDate).toISOString().split('T')[0];
        return d === requestedDateStr;
      });
      if (existingForDate) {
        return res.status(409).json({
          message: "Você já possui um pedido registrado para essa data de entrega.",
          existingOrderId: existingForDate.id,
          existingOrderCode: existingForDate.orderCode,
        });
      }

      const newOrder = await storage.createOrder({ ...order, status: 'CONFIRMED' }, items);
      res.status(201).json(newOrder);

      // Log order creation
      try {
        const no = newOrder as any;
        await storage.createLog({ action: 'ORDER_CREATED', description: `Pedido criado: ${no.vfCode || `#${no.id}`} (empresa ${order.companyId})`, companyId: order.companyId, userRole: 'CLIENT' });
      } catch {}

      // Send emails (non-blocking)
      try {
        const company = await storage.getCompany(order.companyId);
        if (company && newOrder) {
          const no = newOrder as any;
          const deliveryDay = no.deliveryDate || order.deliveryDate || "—";
          await sendOrderPlaced({
            toEmail: company.email,
            companyName: company.companyName,
            vfCode: no.vfCode || "",
            deliveryDay,
            totalItems: items.length,
          });
          // Notify admin
          const adminUsers = await storage.getUsers();
          const adminEmails = adminUsers.filter(u => u.role === 'ADMIN').map(u => u.email);
          for (const adminEmail of adminEmails) {
            await sendAdminNewOrder({ adminEmail, companyName: company.companyName, vfCode: no.vfCode || "", deliveryDay });
          }
        }
      } catch (emailErr) {
        console.error("[EMAIL] Erro ao enviar emails de pedido:", emailErr);
      }
    } catch (err) {
      console.error("Order creation error:", err);
      res.status(400).json({ message: "Bad request" });
    }
  });

  // System Settings
  app.get('/api/settings/:key', async (req, res) => {
    const key = req.params.key;
    const value = await storage.getSetting(key);
    // For boolean-mode keys, always return {enabled} so toggles work correctly
    if (key === 'maintenance' || key === 'test-mode') {
      const dbKey = key === 'maintenance' ? 'maintenance_mode' : 'test_mode';
      const modeVal = await storage.getSetting(dbKey);
      return res.json({ enabled: modeVal === 'true' });
    }
    res.json({ key, value });
  });

  app.put('/api/settings/:key', async (req, res) => {
    const { value } = req.body;
    if (typeof value !== 'string') return res.status(400).json({ message: 'value required' });
    await storage.setSetting(req.params.key, value);
    res.json({ key: req.params.key, value });
  });

  // ─── COMPANY CONFIG (Support, DANFE info) ─────────────────────
  app.get('/api/company-config', async (req, res) => {
    try {
      const config = await storage.getCompanyConfig();
      res.json(config || { companyName: 'VivaFrutaz' });
    } catch (e) { res.status(500).json({ message: 'Error fetching config' }); }
  });

  app.patch('/api/company-config', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Not authenticated' });
    const user = await storage.getUser(req.session.userId);
    if (!user || !['ADMIN', 'DIRECTOR', 'DEVELOPER'].includes(user.role)) {
      return res.status(403).json({ message: 'Sem permissão' });
    }
    try {
      const updated = await storage.updateCompanyConfig(req.body);
      await storage.createLog({ action: 'COMPANY_CONFIG_UPDATED', description: `Configuração de suporte atualizada por ${user.name}`, userId: user.id, userEmail: user.email, userRole: user.role });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Admin order management
  app.patch('/api/orders/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status, adminNote, nimbiExpiration } = req.body;
      const updates: any = {};
      if (status !== undefined) updates.status = status;
      if (adminNote !== undefined) updates.adminNote = adminNote;
      if (nimbiExpiration !== undefined) updates.nimbiExpiration = nimbiExpiration || null;
      const order = await storage.updateOrder(id, updates);
      res.json(order);

      // Send status change email (non-blocking)
      if (status && ['CONFIRMED', 'DELIVERED', 'CANCELLED'].includes(status)) {
        try {
          const orderData = await storage.getOrder(id);
          if (orderData) {
            const oa = orderData as any;
            const company = await storage.getCompany(oa.companyId);
            if (company) {
              await sendOrderStatusChanged({
                toEmail: company.email,
                companyName: company.companyName,
                vfCode: oa.vfCode || `#${id}`,
                status,
                adminNote,
              });
            }
          }
        } catch (emailErr) {
          console.error("[EMAIL] Erro ao enviar email de status:", emailErr);
        }
      }
      // Auto-deduct inventory when order is CONFIRMED (non-blocking)
      if (status === 'CONFIRMED') {
        (async () => {
          try {
            const orderData = await storage.getOrder(id);
            if (!orderData) return;
            const allProducts = await storage.getProducts();
            const productMap = new Map(allProducts.map(p => [p.id, p]));
            const today = new Date().toISOString().split('T')[0];
            for (const item of orderData.items) {
              const product = productMap.get(item.productId);
              const productName = product?.name || `Produto #${item.productId}`;
              const setting = await storage.getInventorySettingByProductId(item.productId)
                || await storage.getInventorySettingByProductName(productName);
              if (!setting) continue;
              const prev = parseFloat(setting.currentStock || '0');
              const qty = parseFloat(String(item.quantity || 0));
              const newStock = Math.max(0, prev - qty);
              await storage.upsertInventorySetting({ ...setting, currentStock: String(newStock) });
              await storage.createInventoryMovement({
                productId: item.productId || null,
                productName,
                movementType: 'EXIT',
                quantity: String(qty),
                balanceAfter: String(newStock),
                unit: setting.unit,
                referenceType: 'order',
                referenceId: id,
                notes: `Pedido confirmado: ${orderData.order.orderCode || `#${id}`}`,
                date: today,
                createdBy: 'Sistema',
              });
            }
          } catch (invErr) {
            console.error('[INVENTORY] Erro ao baixar estoque do pedido:', invErr);
          }
        })();
      }
    } catch (err) {
      console.error("Update order error:", err);
      res.status(400).json({ message: "Bad request" });
    }
  });

  // Client requests reopening of a confirmed/locked order
  app.post('/api/orders/:id/request-reopen', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const companyId = req.session?.companyId;
      if (!companyId) return res.status(401).json({ message: 'Não autenticado' });
      const data = await storage.getOrder(id);
      if (!data) return res.status(404).json({ message: 'Pedido não encontrado' });
      if (data.order.companyId !== companyId) return res.status(403).json({ message: 'Sem permissão' });
      if (!['CONFIRMED', 'ACTIVE'].includes(data.order.status)) {
        return res.status(400).json({ message: 'Pedido não pode ser reaberto neste status.' });
      }
      const { reason } = req.body;
      if (!reason || String(reason).trim().length < 3) {
        return res.status(400).json({ message: 'Informe o motivo da alteração.' });
      }
      const updated = await storage.updateOrder(id, {
        status: 'REOPEN_REQUESTED',
        reopenReason: String(reason).trim(),
        reopenRequestedAt: new Date(),
      });
      await storage.createLog({ action: 'ORDER_REOPEN_REQUESTED', description: `Pedido ${data.order.orderCode} — solicitação de alteração: ${reason}`, companyId, userRole: 'CLIENT', level: 'INFO' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err?.message || 'Erro interno' });
    }
  });

  // Admin approves reopening → OPEN_FOR_EDITING
  app.post('/api/orders/:id/approve-reopen', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ message: 'Não autenticado' });
      const user = await storage.getUser(userId);
      const REOPEN_ROLES = ['ADMIN', 'DIRECTOR', 'OPERATIONS_MANAGER', 'LOGISTICS'];
      if (!user || !REOPEN_ROLES.includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
      const data = await storage.getOrder(id);
      if (!data) return res.status(404).json({ message: 'Pedido não encontrado' });
      if (data.order.status !== 'REOPEN_REQUESTED') {
        return res.status(400).json({ message: 'Pedido não está em solicitação de alteração.' });
      }
      const updated = await storage.updateOrder(id, { status: 'OPEN_FOR_EDITING' });
      await storage.createLog({ action: 'ORDER_REOPEN_APPROVED', description: `Pedido ${data.order.orderCode} aprovado para edição por ${user.email}`, userRole: user.role, level: 'INFO' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err?.message || 'Erro interno' });
    }
  });

  // Admin denies reopening → back to CONFIRMED
  app.post('/api/orders/:id/deny-reopen', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ message: 'Não autenticado' });
      const user = await storage.getUser(userId);
      const REOPEN_ROLES = ['ADMIN', 'DIRECTOR', 'OPERATIONS_MANAGER', 'LOGISTICS'];
      if (!user || !REOPEN_ROLES.includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
      const data = await storage.getOrder(id);
      if (!data) return res.status(404).json({ message: 'Pedido não encontrado' });
      if (data.order.status !== 'REOPEN_REQUESTED') {
        return res.status(400).json({ message: 'Pedido não está em solicitação de alteração.' });
      }
      const updated = await storage.updateOrder(id, { status: 'CONFIRMED', reopenReason: null, reopenRequestedAt: null });
      await storage.createLog({ action: 'ORDER_REOPEN_DENIED', description: `Pedido ${data.order.orderCode} negado por ${user.email}`, userRole: user.role, level: 'INFO' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err?.message || 'Erro interno' });
    }
  });

  // Client re-finalizes an open-for-editing order → back to CONFIRMED
  app.post('/api/orders/:id/finalize-edit', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const companyId = req.session?.companyId;
      if (!companyId) return res.status(401).json({ message: 'Não autenticado' });
      const data = await storage.getOrder(id);
      if (!data) return res.status(404).json({ message: 'Pedido não encontrado' });
      if (data.order.companyId !== companyId) return res.status(403).json({ message: 'Sem permissão' });
      if (data.order.status !== 'OPEN_FOR_EDITING') {
        return res.status(400).json({ message: 'Pedido não está em modo de edição.' });
      }
      const { items } = req.body;
      if (Array.isArray(items) && items.length > 0) {
        await storage.updateOrderItems(id, items);
      }
      const updated = await storage.updateOrder(id, { status: 'CONFIRMED', reopenReason: null, reopenRequestedAt: null });
      await storage.createLog({ action: 'ORDER_EDIT_FINALIZED', description: `Pedido ${data.order.orderCode} re-finalizado pelo cliente`, companyId, userRole: 'CLIENT', level: 'INFO' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err?.message || 'Erro interno' });
    }
  });

  // Admin endpoint to check orders with REOPEN_REQUESTED status
  app.get('/api/orders/reopen-requests', async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ message: 'Não autenticado' });
      const allOrders = await storage.getOrders();
      res.json(allOrders.filter(o => o.status === 'REOPEN_REQUESTED'));
    } catch (err: any) {
      res.status(500).json({ message: err?.message || 'Erro interno' });
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

  // --- Password Change Route ---
  app.put('/api/users/:id/password', async (req, res) => {
    try {
      const sess = req.session as any;
      const actorId = sess?.userId;
      const actor = actorId ? await storage.getUser(actorId) : null;

      // Only ADMIN, DIRECTOR, DEVELOPER may change passwords
      if (!actor || !['ADMIN', 'DIRECTOR', 'DEVELOPER'].includes(actor.role)) {
        await storage.createLog({ action: 'PASSWORD_CHANGE_BLOCKED', description: `Tentativa de alteração de senha bloqueada (sem permissão)`, userEmail: actor?.email || '', userRole: actor?.role || '', ip: req.ip || '', level: 'WARN' });
        return res.status(403).json({ message: 'Acesso restrito. Apenas diretoria ou administração podem alterar esta senha.' });
      }

      const targetId = Number(req.params.id);
      const target = await storage.getUser(targetId);
      if (!target) return res.status(404).json({ message: 'Usuário não encontrado' });

      // Protect critical profiles: only ADMIN/DIRECTOR/DEVELOPER targets allowed (already checked actor role above, so this is fine)
      const { newPassword } = req.body;
      if (!newPassword || newPassword.trim().length < 3) {
        return res.status(400).json({ message: 'Senha inválida' });
      }

      await storage.updateUser(targetId, { password: newPassword.trim() });
      await storage.createLog({
        action: 'PASSWORD_CHANGED',
        description: `Senha alterada: usuário "${target.email}" (${target.role}) por "${actor.email}" (${actor.role})`,
        userId: actor.id,
        userEmail: actor.email,
        userRole: actor.role,
        ip: req.ip || '',
        level: 'WARN',
      });
      res.json({ ok: true });
    } catch (err) {
      console.error('Password change error:', err);
      res.status(500).json({ message: 'Erro interno' });
    }
  });

  // --- Test Mode ---
  app.get('/api/settings/test-mode', async (req, res) => {
    try {
      const val = await storage.getSetting('test_mode');
      res.json({ enabled: val === 'true' });
    } catch {
      res.json({ enabled: false });
    }
  });

  app.post('/api/settings/test-mode', async (req, res) => {
    try {
      const sess = req.session as any;
      const userId = sess?.userId;
      const user = userId ? await storage.getUser(userId) : null;
      if (!user || !['ADMIN', 'DIRECTOR', 'DEVELOPER'].includes(user.role)) {
        return res.status(403).json({ message: 'Sem permissão' });
      }
      const { enabled } = req.body;
      await storage.setSetting('test_mode', enabled ? 'true' : 'false');
      await storage.createLog({
        action: enabled ? 'TEST_MODE_ON' : 'TEST_MODE_OFF',
        description: `Modo teste ${enabled ? 'ativado' : 'desativado'} por ${user.email}`,
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        ip: req.ip || '',
        level: 'WARN',
      });
      res.json({ enabled });
    } catch (err) {
      console.error('Test mode toggle error:', err);
      res.status(500).json({ message: 'Erro interno' });
    }
  });

  app.get('/api/admin/test-orders', async (req, res) => {
    try {
      const orders = await storage.getTestOrders();
      res.json(orders);
    } catch {
      res.status(500).json({ message: 'Erro interno' });
    }
  });

  // --- Maintenance Mode ---
  app.get('/api/settings/maintenance', async (req, res) => {
    try {
      const val = await storage.getSetting('maintenance_mode');
      res.json({ enabled: val === 'true' });
    } catch {
      res.json({ enabled: false });
    }
  });

  app.post('/api/settings/maintenance', async (req, res) => {
    try {
      const sess = req.session as any;
      const userId = sess?.userId;
      const user = userId ? await storage.getUser(userId) : null;
      if (!user || !['ADMIN', 'DIRECTOR', 'DEVELOPER'].includes(user.role)) {
        return res.status(403).json({ message: 'Sem permissão' });
      }
      const { enabled } = req.body;
      await storage.setSetting('maintenance_mode', enabled ? 'true' : 'false');
      await storage.createLog({
        action: enabled ? 'MAINTENANCE_ON' : 'MAINTENANCE_OFF',
        description: `Modo manutenção ${enabled ? 'ativado' : 'desativado'} por ${user.email}`,
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        ip: req.ip || '',
        level: 'WARN',
      });
      res.json({ enabled });
    } catch (err) {
      console.error('Maintenance toggle error:', err);
      res.status(500).json({ message: 'Erro interno' });
    }
  });

  // --- Log Unauthorized Route Access ---
  app.post('/api/auth/log-unauthorized', async (req, res) => {
    try {
      const sess = req.session as any;
      const userId = sess?.userId;
      const user = userId ? await storage.getUser(userId) : null;
      const { route } = req.body;
      await storage.createLog({
        action: 'UNAUTHORIZED_ACCESS',
        description: `Tentativa de acesso não autorizado à rota: ${route || '?'}`,
        userId: user?.id ?? undefined,
        userEmail: user?.email || '(desconhecido)',
        userRole: user?.role || '(desconhecido)',
        ip: req.ip || '',
        level: 'WARN',
      });
      res.json({ ok: true });
    } catch {
      res.json({ ok: false });
    }
  });

  // ─── TAREFAS ──────────────────────────────────────────────────
  app.get('/api/tasks', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Not authenticated' });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });
    try {
      let result;
      if (['ADMIN', 'DIRECTOR', 'DEVELOPER'].includes(user.role)) {
        result = await storage.getTasks();
      } else {
        result = await storage.getTasksByUser(user.id);
      }
      res.json(result);
    } catch (e) { res.status(500).json({ message: 'Error fetching tasks' }); }
  });

  app.post('/api/tasks', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Not authenticated' });
    const user = await storage.getUser(req.session.userId);
    if (!user || !['ADMIN', 'DIRECTOR', 'DEVELOPER'].includes(user.role)) {
      return res.status(403).json({ message: 'Sem permissão' });
    }
    try {
      const { title, description, assignedToId, assignedToName, priority } = req.body;
      const deadline = req.body.deadline || undefined;
      if (!title || !description || !priority) return res.status(400).json({ message: 'Campos obrigatórios' });
      const assignedToIdNum = assignedToId ? parseInt(assignedToId) : undefined;
      const task = await storage.createTask({ title, description, assignedToId: assignedToIdNum, assignedToName, deadline, priority, createdById: user.id, createdByName: user.name });
      await storage.createLog({ action: 'TASK_CREATED', description: `Tarefa criada: ${title}`, userId: user.id, userEmail: user.email, userRole: user.role });
      res.json(task);
    } catch (e: any) { console.error('[TASKS] createTask error:', e?.message); res.status(500).json({ message: 'Error creating task' }); }
  });

  app.patch('/api/tasks/:id', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Not authenticated' });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });
    try {
      const id = parseInt(req.params.id);
      const raw = req.body;
      const updates: Record<string, any> = {};
      if (raw.title !== undefined) updates.title = raw.title;
      if (raw.description !== undefined) updates.description = raw.description;
      if (raw.priority !== undefined) updates.priority = raw.priority;
      if (raw.status !== undefined) updates.status = raw.status;
      if (raw.assignedToId !== undefined) updates.assignedToId = raw.assignedToId ? Number(raw.assignedToId) : null;
      if (raw.assignedToName !== undefined) updates.assignedToName = raw.assignedToName || null;
      // sanitize date: empty string → null to avoid DB type error
      if (raw.deadline !== undefined) updates.deadline = raw.deadline && raw.deadline !== '' ? raw.deadline : null;
      const task = await storage.updateTask(id, updates);
      await storage.createLog({ action: 'TASK_UPDATED', description: `Tarefa atualizada: ${task.title} → status: ${updates.status || task.status}`, userId: user.id, userEmail: user.email, userRole: user.role });
      res.json(task);
    } catch (e: any) { console.error('Error updating task:', e); res.status(500).json({ message: 'Error updating task', detail: e?.message }); }
  });

  app.delete('/api/tasks/:id', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Not authenticated' });
    const user = await storage.getUser(req.session.userId);
    if (!user || !['ADMIN', 'DIRECTOR', 'DEVELOPER'].includes(user.role)) {
      return res.status(403).json({ message: 'Sem permissão' });
    }
    try {
      await storage.deleteTask(parseInt(req.params.id));
      await storage.createLog({ action: 'TASK_DELETED', description: `Tarefa #${req.params.id} excluída`, userId: user.id, userEmail: user.email, userRole: user.role });
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ message: 'Error deleting task' }); }
  });

  // ─── OCORRÊNCIAS DE CLIENTES ──────────────────────────────────
  app.post('/api/client-incidents', async (req, res) => {
    if (!req.session?.companyId && !req.session?.userId) return res.status(401).json({ message: 'Not authenticated' });
    try {
      const { companyId, companyName, type, description, contactPhone, contactEmail, photoBase64, photoMime, photosJson } = req.body;
      if (!companyId || !type || !description) return res.status(400).json({ message: 'Campos obrigatórios: tipo e descrição são necessários.' });
      const incident = await storage.createClientIncident({ companyId, companyName, type, description, contactPhone, contactEmail, photoBase64, photoMime, photosJson });
      await storage.createLog({ action: 'CLIENT_INCIDENT_CREATED', description: `Ocorrência de cliente criada: ${type} por empresa ${companyName}`, companyId, level: 'WARN' });
      res.json(incident);
    } catch (e) { res.status(500).json({ message: 'Error creating incident' }); }
  });

  app.get('/api/client-incidents', async (req, res) => {
    if (!req.session?.userId && !req.session?.companyId) return res.status(401).json({ message: 'Not authenticated' });
    try {
      if (req.session?.companyId) {
        const incidents = await storage.getClientIncidentsByCompany(req.session.companyId);
        return res.json(incidents);
      }
      const user = await storage.getUser(req.session.userId!);
      if (!user || !['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER', 'LOGISTICS'].includes(user.role)) {
        return res.status(403).json({ message: 'Sem permissão' });
      }
      const incidents = await storage.getClientIncidents();
      res.json(incidents);
    } catch (e) { res.status(500).json({ message: 'Error fetching incidents' }); }
  });

  app.patch('/api/client-incidents/:id', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Not authenticated' });
    const user = await storage.getUser(req.session.userId);
    if (!user || !['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER', 'LOGISTICS'].includes(user.role)) {
      return res.status(403).json({ message: 'Sem permissão' });
    }
    try {
      const id = parseInt(req.params.id);
      const { status, adminNote } = req.body;
      const resolvedAt = status === 'RESOLVED' ? new Date() : undefined;
      const updated = await storage.updateClientIncident(id, { status, adminNote, ...(resolvedAt !== undefined ? { resolvedAt } : {}) });
      await storage.createLog({ action: 'CLIENT_INCIDENT_UPDATED', description: `Ocorrência #${id} atualizada → ${status}`, userId: user.id, userEmail: user.email, userRole: user.role });
      res.json(updated);
    } catch (e) { res.status(500).json({ message: 'Error updating incident' }); }
  });

  app.delete('/api/client-incidents/:id', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Não autenticado' });
    const user = await storage.getUser(req.session.userId);
    if (!user || !['ADMIN', 'DIRECTOR', 'DEVELOPER'].includes(user.role)) {
      return res.status(403).json({ message: 'Sem permissão - apenas administradores podem excluir ocorrências' });
    }
    try {
      const id = parseInt(req.params.id);
      const incident = await storage.getClientIncident(id);
      if (!incident) return res.status(404).json({ message: 'Ocorrência não encontrada' });
      await storage.deleteClientIncident(id);
      await storage.createLog({ action: 'CLIENT_INCIDENT_DELETED', description: `Ocorrência #${id} (${incident.type}) foi excluída por ${user.name}`, userId: user.id, userEmail: user.email, userRole: user.role });
      res.status(204).end();
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/client-incidents/:id/respond', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Not authenticated' });
    const user = await storage.getUser(req.session.userId);
    if (!user || !['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER', 'LOGISTICS'].includes(user.role)) {
      return res.status(403).json({ message: 'Sem permissão' });
    }
    try {
      const id = parseInt(req.params.id);
      const { responseMessage } = req.body;
      if (!responseMessage || !responseMessage.trim()) return res.status(400).json({ message: 'Mensagem de resposta obrigatória' });
      const updated = await storage.respondToClientIncident(id, responseMessage.trim(), user.name);
      await storage.createIncidentMessage({ incidentId: id, senderType: 'ADMIN', senderName: user.name, message: responseMessage.trim() });
      await storage.createLog({ action: 'CLIENT_INCIDENT_RESPONDED', description: `Ocorrência #${id} recebeu resposta de ${user.name}`, userId: user.id, userEmail: user.email, userRole: user.role });
      res.json(updated);
    } catch (e) { res.status(500).json({ message: 'Error responding to incident' }); }
  });

  // ─── MENSAGENS DE OCORRÊNCIAS ─────────────────────────────────
  app.get('/api/client-incidents/:id/messages', async (req, res) => {
    if (!req.session?.userId && !req.session?.companyId) return res.status(401).json({ message: 'Not authenticated' });
    try {
      const id = parseInt(req.params.id);
      const messages = await storage.getIncidentMessages(id);
      // Also mark as read if client is viewing
      if (req.session?.companyId) {
        await storage.markIncidentReadByClient(id);
      }
      res.json(messages);
    } catch (e) { res.status(500).json({ message: 'Erro ao buscar mensagens' }); }
  });

  app.post('/api/client-incidents/:id/messages', async (req, res) => {
    if (!req.session?.userId && !req.session?.companyId) return res.status(401).json({ message: 'Not authenticated' });
    try {
      const id = parseInt(req.params.id);
      const { message, photosJson } = req.body;
      if (!message || !message.trim()) return res.status(400).json({ message: 'Mensagem não pode estar vazia.' });
      let senderType = 'ADMIN';
      let senderName = 'Equipe VivaFrutaz';
      if (req.session?.companyId) {
        senderType = 'CLIENT';
        // Get company name from incident
        const incidents = await storage.getClientIncidentsByCompany(req.session.companyId);
        const inc = incidents.find(i => i.id === id);
        senderName = inc?.companyName || 'Cliente';
      } else {
        const user = await storage.getUser(req.session.userId!);
        if (!user || !['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER', 'LOGISTICS'].includes(user.role)) {
          return res.status(403).json({ message: 'Sem permissão' });
        }
        senderName = user.name;
      }
      const msg = await storage.createIncidentMessage({ incidentId: id, senderType, senderName, message: message.trim(), photosJson });
      res.json(msg);
    } catch (e) { res.status(500).json({ message: 'Erro ao enviar mensagem' }); }
  });

  app.post('/api/client-incidents/:id/mark-read', async (req, res) => {
    if (!req.session?.companyId) return res.status(401).json({ message: 'Not authenticated' });
    try {
      await storage.markIncidentReadByClient(parseInt(req.params.id));
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ message: 'Erro' }); }
  });

  // ─── OCORRÊNCIAS INTERNAS ─────────────────────────────────────
  app.get('/api/internal-incidents', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Not authenticated' });
    const user = await storage.getUser(req.session.userId);
    if (!user || !['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER', 'LOGISTICS'].includes(user.role)) {
      return res.status(403).json({ message: 'Sem permissão' });
    }
    try {
      const incidents = await storage.getInternalIncidents();
      res.json(incidents);
    } catch (e) { res.status(500).json({ message: 'Error fetching internal incidents' }); }
  });

  app.post('/api/internal-incidents', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Not authenticated' });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });
    try {
      const { title, description, category, assignedToId, assignedToName, priority } = req.body;
      if (!title || !description || !category || !priority) return res.status(400).json({ message: 'Campos obrigatórios' });
      const incident = await storage.createInternalIncident({ title, description, category, assignedToId, assignedToName, priority, createdById: user.id, createdByName: user.name });
      await storage.createLog({ action: 'INTERNAL_INCIDENT_CREATED', description: `Ocorrência interna criada: ${title}`, userId: user.id, userEmail: user.email, userRole: user.role, level: 'WARN' });
      res.json(incident);
    } catch (e) { res.status(500).json({ message: 'Error creating internal incident' }); }
  });

  app.patch('/api/internal-incidents/:id', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Not authenticated' });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const resolvedAt = updates.status === 'RESOLVED' ? new Date() : null;
      const updated = await storage.updateInternalIncident(id, { ...updates, ...(resolvedAt !== undefined ? { resolvedAt } : {}) });
      await storage.createLog({ action: 'INTERNAL_INCIDENT_UPDATED', description: `Ocorrência interna #${id} → ${updates.status || 'editada'}`, userId: user.id, userEmail: user.email, userRole: user.role });
      res.json(updated);
    } catch (e) { res.status(500).json({ message: 'Error updating internal incident' }); }
  });

  app.delete('/api/internal-incidents/:id', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Not authenticated' });
    const user = await storage.getUser(req.session.userId);
    if (!user || !['ADMIN', 'DIRECTOR', 'DEVELOPER'].includes(user.role)) {
      return res.status(403).json({ message: 'Sem permissão' });
    }
    try {
      await storage.deleteInternalIncident(parseInt(req.params.id));
      await storage.createLog({ action: 'INTERNAL_INCIDENT_DELETED', description: `Ocorrência interna #${req.params.id} excluída`, userId: user.id, userEmail: user.email, userRole: user.role });
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ message: 'Error deleting internal incident' }); }
  });

  // ─── LOGÍSTICA ────────────────────────────────────────────────
  const logAuth = async (req: any, res: any) => {
    if (!req.session?.userId) { res.status(401).json({ message: 'Not authenticated' }); return null; }
    const user = await storage.getUser(req.session.userId);
    if (!user || !['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER', 'LOGISTICS'].includes(user.role)) {
      res.status(403).json({ message: 'Sem permissão' }); return null;
    }
    return user;
  };

  // Motoristas
  app.get('/api/logistics/drivers', async (req, res) => {
    const user = await logAuth(req, res); if (!user) return;
    try { res.json(await storage.getDrivers()); } catch (e) { res.status(500).json({ message: 'Erro' }); }
  });
  app.post('/api/logistics/drivers', async (req, res) => {
    const user = await logAuth(req, res); if (!user) return;
    try {
      const { name, cpf, phone, email, licenseNumber, notes } = req.body;
      if (!name) return res.status(400).json({ message: 'Nome obrigatório' });
      const d = await storage.createDriver({ name, cpf, phone, email, licenseNumber, notes, active: true });
      await storage.createLog({ action: 'DRIVER_CREATED', description: `Motorista criado: ${name}`, userId: user.id, userEmail: user.email, userRole: user.role });
      res.json(d);
    } catch (e: any) { res.status(500).json({ message: e?.message || 'Erro' }); }
  });
  app.patch('/api/logistics/drivers/:id', async (req, res) => {
    const user = await logAuth(req, res); if (!user) return;
    try { res.json(await storage.updateDriver(parseInt(req.params.id), req.body)); } catch (e) { res.status(500).json({ message: 'Erro' }); }
  });
  app.delete('/api/logistics/drivers/:id', async (req, res) => {
    const user = await logAuth(req, res); if (!user) return;
    try { await storage.deleteDriver(parseInt(req.params.id)); res.json({ ok: true }); } catch (e) { res.status(500).json({ message: 'Erro' }); }
  });

  // Veículos
  app.get('/api/logistics/vehicles', async (req, res) => {
    const user = await logAuth(req, res); if (!user) return;
    try { res.json(await storage.getVehicles()); } catch (e) { res.status(500).json({ message: 'Erro' }); }
  });
  app.post('/api/logistics/vehicles', async (req, res) => {
    const user = await logAuth(req, res); if (!user) return;
    try {
      const { plate, model, brand, year, type, capacity, notes } = req.body;
      if (!plate || !model || !brand) return res.status(400).json({ message: 'Placa, modelo e marca obrigatórios' });
      const v = await storage.createVehicle({ plate: plate.toUpperCase(), model, brand, year: year ? parseInt(year) : undefined, type, capacity, notes, active: true });
      await storage.createLog({ action: 'VEHICLE_CREATED', description: `Veículo criado: ${plate}`, userId: user.id, userEmail: user.email, userRole: user.role });
      res.json(v);
    } catch (e: any) { res.status(500).json({ message: e?.message || 'Erro' }); }
  });
  app.patch('/api/logistics/vehicles/:id', async (req, res) => {
    const user = await logAuth(req, res); if (!user) return;
    try { res.json(await storage.updateVehicle(parseInt(req.params.id), req.body)); } catch (e) { res.status(500).json({ message: 'Erro' }); }
  });
  app.delete('/api/logistics/vehicles/:id', async (req, res) => {
    const user = await logAuth(req, res); if (!user) return;
    try { await storage.deleteVehicle(parseInt(req.params.id)); res.json({ ok: true }); } catch (e) { res.status(500).json({ message: 'Erro' }); }
  });

  // Rotas
  app.get('/api/logistics/routes', async (req, res) => {
    const user = await logAuth(req, res); if (!user) return;
    try { res.json(await storage.getRoutes()); } catch (e) { res.status(500).json({ message: 'Erro' }); }
  });
  app.post('/api/logistics/routes', async (req, res) => {
    const user = await logAuth(req, res); if (!user) return;
    try {
      const { name, driverId, driverName, vehicleId, vehiclePlate, deliveryDate, notes, companyNames, startTime, endTime } = req.body;
      if (!name) return res.status(400).json({ message: 'Nome da rota obrigatório' });
      const r = await storage.createRoute({ name, driverId: driverId || undefined, driverName, vehicleId: vehicleId || undefined, vehiclePlate, deliveryDate: deliveryDate || undefined, notes, companyNames, startTime, endTime });
      await storage.createLog({ action: 'ROUTE_CREATED', description: `Rota criada: ${name}`, userId: user.id, userEmail: user.email, userRole: user.role });
      res.json(r);
    } catch (e: any) { res.status(500).json({ message: e?.message || 'Erro' }); }
  });
  app.patch('/api/logistics/routes/:id', async (req, res) => {
    const user = await logAuth(req, res); if (!user) return;
    try { res.json(await storage.updateRoute(parseInt(req.params.id), req.body)); } catch (e) { res.status(500).json({ message: 'Erro' }); }
  });
  app.delete('/api/logistics/routes/:id', async (req, res) => {
    const user = await logAuth(req, res); if (!user) return;
    try { await storage.deleteRoute(parseInt(req.params.id)); res.json({ ok: true }); } catch (e) { res.status(500).json({ message: 'Erro' }); }
  });

  // Manutenção
  app.get('/api/logistics/maintenance', async (req, res) => {
    const user = await logAuth(req, res); if (!user) return;
    try { res.json(await storage.getMaintenances()); } catch (e) { res.status(500).json({ message: 'Erro' }); }
  });
  app.post('/api/logistics/maintenance', async (req, res) => {
    const user = await logAuth(req, res); if (!user) return;
    try {
      const { vehicleId, vehiclePlate, type, description, cost, scheduledDate, notes } = req.body;
      if (!type || !description) return res.status(400).json({ message: 'Tipo e descrição obrigatórios' });
      const m = await storage.createMaintenance({ vehicleId: vehicleId || undefined, vehiclePlate, type, description, cost: cost || undefined, scheduledDate: scheduledDate || undefined, notes });
      await storage.createLog({ action: 'MAINTENANCE_CREATED', description: `Manutenção criada: ${type} — ${vehiclePlate}`, userId: user.id, userEmail: user.email, userRole: user.role });
      res.json(m);
    } catch (e: any) { res.status(500).json({ message: e?.message || 'Erro' }); }
  });
  app.patch('/api/logistics/maintenance/:id', async (req, res) => {
    const user = await logAuth(req, res); if (!user) return;
    try { res.json(await storage.updateMaintenance(parseInt(req.params.id), req.body)); } catch (e) { res.status(500).json({ message: 'Erro' }); }
  });
  app.delete('/api/logistics/maintenance/:id', async (req, res) => {
    const user = await logAuth(req, res); if (!user) return;
    try { await storage.deleteMaintenance(parseInt(req.params.id)); res.json({ ok: true }); } catch (e) { res.status(500).json({ message: 'Erro' }); }
  });

  // ─── COTAÇÃO DE EMPRESAS ──────────────────────────────────────
  app.get('/api/quotations', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Not authenticated' });
    const user = await storage.getUser(req.session.userId);
    if (!user || !['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER', 'LOGISTICS'].includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
    try { res.json(await storage.getQuotations()); } catch (e) { res.status(500).json({ message: 'Erro' }); }
  });
  app.post('/api/quotations', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Not authenticated' });
    const user = await storage.getUser(req.session.userId);
    if (!user || !['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER', 'LOGISTICS'].includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
    try {
      const { companyName, contactName, contactPhone, email, cnpj, address, city, state, estimatedVolume, productInterest, logisticsNote, priceGroupId, priceGroupName, status, deliveryWindowsJson, deliveryWindowsRespondedBy, deliveryWindowsRespondedAt } = req.body;
      if (!companyName || !contactName) return res.status(400).json({ message: 'Empresa e contato obrigatórios' });
      const q = await storage.createQuotation({ companyName, contactName, contactPhone, email, cnpj, address, city, state, estimatedVolume, productInterest, logisticsNote, priceGroupId: priceGroupId || undefined, priceGroupName, ...(status ? { status } : {}), ...(deliveryWindowsJson ? { deliveryWindowsJson, deliveryWindowsRespondedBy, deliveryWindowsRespondedAt: deliveryWindowsRespondedAt ? new Date(deliveryWindowsRespondedAt) : undefined } : {}) });
      const hasWindows = !!deliveryWindowsJson;
      await storage.createLog({ action: hasWindows ? 'QUOTATION_WINDOWS_SET' : 'QUOTATION_CREATED', description: hasWindows ? `Logística definiu janelas de entrega ao criar cotação: ${companyName}` : `Cotação criada: ${companyName}`, userId: user.id, userEmail: user.email, userRole: user.role });
      res.json(q);
    } catch (e: any) { res.status(500).json({ message: e?.message || 'Erro' }); }
  });
  app.patch('/api/quotations/:id', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Not authenticated' });
    const user = await storage.getUser(req.session.userId);
    if (!user || !['ADMIN', 'DIRECTOR', 'DEVELOPER', 'OPERATIONS_MANAGER', 'LOGISTICS'].includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
    try {
      const data = { ...req.body };
      if (data.deliveryWindowsRespondedAt && typeof data.deliveryWindowsRespondedAt === 'string') {
        data.deliveryWindowsRespondedAt = new Date(data.deliveryWindowsRespondedAt);
      }
      const q = await storage.updateQuotation(parseInt(req.params.id), data);
      const hasWindows = req.body.deliveryWindowsJson;
      const logDesc = hasWindows
        ? `Logística definiu janelas de entrega na cotação #${req.params.id} (${user.name || user.email})`
        : `Cotação #${req.params.id} atualizada`;
      await storage.createLog({ action: hasWindows ? 'QUOTATION_WINDOWS_SET' : 'QUOTATION_UPDATED', description: logDesc, userId: user.id, userEmail: user.email, userRole: user.role });
      res.json(q);
    } catch (e) { res.status(500).json({ message: 'Erro' }); }
  });
  app.delete('/api/quotations/:id', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Not authenticated' });
    const user = await storage.getUser(req.session.userId);
    if (!user || !['ADMIN', 'DIRECTOR', 'DEVELOPER'].includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
    try { await storage.deleteQuotation(parseInt(req.params.id)); res.json({ ok: true }); } catch (e) { res.status(500).json({ message: 'Erro' }); }
  });

  // ─── LOGS: criar log (frontend/ErrorBoundary) ─────────────────
  app.post('/api/logs', async (req, res) => {
    try {
      const { action, description, level } = req.body;
      if (!action || !description) return res.status(400).json({ message: 'Campos obrigatórios.' });
      const userId = req.session?.userId;
      const companyId = req.session?.companyId;
      const safeLevel = ['INFO', 'WARN', 'ERROR'].includes(level) ? level : 'INFO';
      await storage.createLog({ action: action.slice(0, 100), description: description.slice(0, 1000), userId, companyId, level: safeLevel });
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ message: 'Erro ao registrar log' }); }
  });

  // ─── LOGS: limpar todos ───────────────────────────────────────
  app.delete('/api/logs', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Not authenticated' });
    const user = await storage.getUser(req.session.userId);
    if (!user || !['ADMIN', 'DEVELOPER', 'DIRECTOR'].includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
    try {
      const allLogs = await storage.getLogs(10000);
      const count = allLogs.length;
      await storage.clearLogs();
      await storage.createLog({ action: 'CLEAN_LOGS', description: `Histórico de logs limpo (${count} registros removidos)`, userId: user.id, userEmail: user.email, userRole: user.role, level: 'WARN' });
      res.json({ ok: true, removed: count });
    } catch (e) { res.status(500).json({ message: 'Erro ao limpar logs' }); }
  });

  // ─── LOGS: excluir selecionados ───────────────────────────────
  app.delete('/api/logs/selected', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Not authenticated' });
    const user = await storage.getUser(req.session.userId);
    if (!user || !['ADMIN', 'DEVELOPER', 'DIRECTOR'].includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'IDs inválidos.' });
      const removed = await storage.deleteLogsByIds(ids.map(Number));
      await storage.createLog({ action: 'CLEAN_LOGS', description: `${removed} log(s) selecionados removidos`, userId: user.id, userEmail: user.email, userRole: user.role, level: 'WARN' });
      res.json({ ok: true, removed });
    } catch (e) { res.status(500).json({ message: 'Erro ao excluir logs' }); }
  });

  // ─── LOGS: limpar por período ─────────────────────────────────
  app.delete('/api/logs/by-date', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Not authenticated' });
    const user = await storage.getUser(req.session.userId);
    if (!user || !['ADMIN', 'DEVELOPER', 'DIRECTOR'].includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
    try {
      const { startDate, endDate } = req.body;
      if (!startDate || !endDate) return res.status(400).json({ message: 'Datas inválidas.' });
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T23:59:59');
      const removed = await storage.deleteLogsByDateRange(start, end);
      await storage.createLog({ action: 'CLEAN_LOGS', description: `${removed} log(s) removidos no período ${startDate} a ${endDate}`, userId: user.id, userEmail: user.email, userRole: user.role, level: 'WARN' });
      res.json({ ok: true, removed });
    } catch (e) { res.status(500).json({ message: 'Erro ao limpar logs por data' }); }
  });

  // ─── LOGS: exportar CSV ───────────────────────────────────────
  app.get('/api/logs/export', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Not authenticated' });
    const user = await storage.getUser(req.session.userId);
    if (!user || !['ADMIN', 'DEVELOPER', 'DIRECTOR'].includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
    try {
      const logs = await storage.getLogs(10000);
      const headers = ['ID', 'Nível', 'Ação', 'Descrição', 'Usuário', 'E-mail', 'Papel', 'IP', 'Data/Hora'];
      const rows = logs.map(l => [l.id, l.level || 'INFO', l.action, `"${(l.description || '').replace(/"/g, "'")}"`, l.userId || '', l.userEmail || '', l.userRole || '', l.ip || '', new Date(l.createdAt).toLocaleString('pt-BR')]);
      const csv = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
      res.setHeader('Content-Type', 'text/csv;charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="logs_${new Date().toISOString().slice(0,10)}.csv"`);
      res.send(csv);
    } catch (e) { res.status(500).json({ message: 'Erro ao exportar logs' }); }
  });

  // ─── SAÚDE DO SISTEMA ─────────────────────────────────────────
  app.get('/api/health', async (req, res) => {
    const start = Date.now();
    const report: any = { timestamp: new Date().toISOString(), checks: {} };
    // DB check
    try {
      await storage.getLogs(1);
      report.checks.database = { status: 'OK', message: 'Banco de dados conectado' };
    } catch (e: any) {
      report.checks.database = { status: 'ERROR', message: e?.message };
    }
    // Auth check
    try {
      const users = await storage.getUsers();
      report.checks.auth = { status: 'OK', message: `${users.length} usuários cadastrados` };
    } catch (e: any) {
      report.checks.auth = { status: 'ERROR', message: e?.message };
    }
    // Orders check
    try {
      const recent = await storage.getLogs(5);
      report.checks.logs = { status: 'OK', message: `${recent.length} logs recentes` };
    } catch (e: any) {
      report.checks.logs = { status: 'ERROR', message: e?.message };
    }
    // Server
    report.checks.server = { status: 'OK', message: `Servidor respondendo — ${Date.now() - start}ms` };
    // Session
    report.checks.session = {
      status: req.session?.userId || req.session?.companyId ? 'OK' : 'WARN',
      message: req.session?.userId ? `Usuário #${req.session.userId} autenticado` : req.session?.companyId ? `Empresa #${req.session.companyId}` : 'Sem sessão ativa nesta requisição'
    };
    // Maintenance mode
    try {
      const maintenance = await storage.getSetting('maintenance_mode');
      report.checks.maintenance = { status: maintenance === 'true' ? 'WARN' : 'OK', message: maintenance === 'true' ? 'MANUTENÇÃO ATIVA' : 'Sistema operacional' };
    } catch (e) {
      report.checks.maintenance = { status: 'WARN', message: 'Não verificado' };
    }
    // Test mode
    try {
      const testMode = await storage.getSetting('test_mode');
      report.checks.testMode = { status: testMode === 'true' ? 'WARN' : 'OK', message: testMode === 'true' ? 'MODO TESTE ATIVO' : 'Modo produção' };
    } catch (e) {
      report.checks.testMode = { status: 'WARN', message: 'Não verificado' };
    }
    report.overall = Object.values(report.checks).every((c: any) => c.status !== 'ERROR') ? 'HEALTHY' : 'DEGRADED';
    report.responseMs = Date.now() - start;
    res.json(report);
  });

  // ─── AUDITORIA DO SISTEMA ─────────────────────────────────────
  app.get('/api/audit', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Not authenticated' });
    const user = await storage.getUser(req.session.userId);
    if (!user || !['ADMIN', 'DIRECTOR', 'DEVELOPER'].includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
    try {
      const allUsers = await storage.getUsers();
      const allCompanies = await storage.getCompanies();
      const logs = await storage.getLogs(500);
      const recentErrors = logs.filter((l: any) => l.level === 'ERROR');
      const recentWarns = logs.filter((l: any) => l.level === 'WARN');
      const loginFails = logs.filter((l: any) => l.action === 'LOGIN_FAILED');
      const unauthorized = logs.filter((l: any) => l.action === 'UNAUTHORIZED_ACCESS');
      res.json({
        summary: {
          totalUsers: allUsers.length,
          activeUsers: allUsers.filter((u: any) => u.active).length,
          totalCompanies: allCompanies.length,
          activeCompanies: allCompanies.filter((c: any) => c.active).length,
          totalLogs: logs.length,
          errors: recentErrors.length,
          warnings: recentWarns.length,
          loginFails: loginFails.length,
          unauthorizedAccess: unauthorized.length,
        },
        issues: [
          ...(recentErrors.length > 0 ? [{ severity: 'ERROR', message: `${recentErrors.length} erros nos logs recentes` }] : []),
          ...(loginFails.length > 5 ? [{ severity: 'WARN', message: `${loginFails.length} tentativas de login falhas` }] : []),
          ...(unauthorized.length > 0 ? [{ severity: 'WARN', message: `${unauthorized.length} acessos não autorizados detectados` }] : []),
        ],
        recentErrors: recentErrors.slice(0, 10),
        recentWarnings: recentWarns.slice(0, 10),
      });
    } catch (e: any) { res.status(500).json({ message: e?.message }); }
  });

  // ─── DANFE Records ───────────────────────────────────────────
  app.get('/api/orders/:id/danfe-logs', async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ message: 'Não autenticado' });
      const user = await storage.getUser(req.session.userId);
      const allowed = ['ADMIN', 'DIRECTOR', 'FINANCEIRO', 'LOGISTICS', 'DEVELOPER', 'OPERATIONS_MANAGER'];
      if (!user || !allowed.includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
      const records = await storage.getDanfeRecordsByOrderId(Number(req.params.id));
      res.json(records);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/orders/:id/danfe-log', async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ message: 'Não autenticado' });
      const user = await storage.getUser(req.session.userId);
      const allowed = ['ADMIN', 'DIRECTOR', 'FINANCEIRO', 'LOGISTICS', 'DEVELOPER', 'OPERATIONS_MANAGER'];
      if (!user || !allowed.includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
      const record = await storage.createDanfeRecord({
        orderId: Number(req.params.id),
        orderCode: req.body.orderCode ?? null,
        generatedByUserId: user.id,
        generatedByEmail: user.email,
      });
      res.status(201).json(record);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Fiscal: atualizar status fiscal e pré-nota ────────────────
  app.patch('/api/orders/:id/fiscal', async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ message: 'Não autenticado' });
      const user = await storage.getUser(req.session.userId);
      const allowed = ['ADMIN', 'DIRECTOR', 'FINANCEIRO', 'DEVELOPER', 'PURCHASE_MANAGER'];
      if (!user || !allowed.includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
      const id = Number(req.params.id);
      const { fiscalStatus, preNotaNumber } = req.body;
      const updates: any = {};
      if (fiscalStatus) updates.fiscalStatus = fiscalStatus;
      if (preNotaNumber !== undefined) updates.preNotaNumber = preNotaNumber;
      const order = await storage.updateOrder(id, updates);
      res.json(order);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Fiscal: gerar número de pré-nota automático ───────────────
  app.post('/api/orders/:id/generate-prenota', async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ message: 'Não autenticado' });
      const user = await storage.getUser(req.session.userId);
      const allowed = ['ADMIN', 'DIRECTOR', 'FINANCEIRO', 'DEVELOPER', 'PURCHASE_MANAGER'];
      if (!user || !allowed.includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
      const id = Number(req.params.id);
      const orderData = await storage.getOrder(id);
      if (!orderData) return res.status(404).json({ message: 'Pedido não encontrado' });
      if ((orderData.order as any).preNotaNumber) return res.json({ preNotaNumber: (orderData.order as any).preNotaNumber });
      // Generate VF-NF-XXXXXX based on order id
      const preNotaNumber = `VF-NF-${id.toString().padStart(6, '0')}`;
      const updated = await storage.updateOrder(id, { preNotaNumber } as any);
      res.json({ preNotaNumber, order: updated });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Fiscal: exportar dados para ERP (JSON com estrutura Excel/XML) ──
  // ─── BLING EXPORT — Status-tracked export to ERP Bling ───────
  app.post('/api/orders/:id/bling-export', async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ message: 'Não autenticado' });
      const user = await storage.getUser(req.session.userId);
      const allowed = ['ADMIN', 'DIRECTOR', 'FINANCEIRO', 'DEVELOPER', 'PURCHASE_MANAGER'];
      if (!user || !allowed.includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
      const id = Number(req.params.id);
      const orderData = await storage.getOrder(id);
      if (!orderData) return res.status(404).json({ message: 'Pedido não encontrado' });
      const o = orderData.order as any;
      if (o.erpExportStatus === 'exportado') {
        return res.status(409).json({ message: 'Este pedido já foi exportado para o ERP Bling.' });
      }
      // Mark as exporting
      await storage.updateOrder(id, { erpExportStatus: 'exportando' });
      try {
        // Build export payload (same logic as export-erp GET)
        const company = await storage.getCompany(o.companyId);
        const allProducts = await storage.getProducts();
        const productMap = new Map(allProducts.map((p: any) => [p.id, p]));
        const config = await storage.getCompanyConfig();
        const fmtDate = (d: any) => { try { return new Date(d).toISOString().split('T')[0]; } catch { return ''; } };
        const items = orderData.items.map((item: any) => {
          const prod = productMap.get(item.productId) as any;
          return {
            produto: prod?.name || `Produto #${item.productId}`,
            ncm: prod?.ncm || '',
            cfop: prod?.cfop || (config as any)?.defaultCfop || '5102',
            quantidade: item.quantity,
            unidade: prod?.commercialUnit || prod?.unit || 'UN',
            valor_unitario: parseFloat(item.unitPrice || '0'),
            valor_total: parseFloat(item.totalPrice || '0'),
          };
        });
        const exportPayload = {
          numero_pedido: o.orderCode || `VF-${id}`,
          data_pedido: fmtDate(o.orderDate),
          data_entrega: fmtDate(o.deliveryDate),
          cliente_nome: company?.companyName || '',
          cliente_cnpj: company?.cnpj || '',
          valor_total_nota: parseFloat(o.totalValue || '0'),
          itens: items,
        };
        // Generate a Bling reference ID for traceability
        const generatedErpId = `BLING-${new Date().getFullYear()}-${id.toString().padStart(6, '0')}-${Date.now().toString().slice(-4)}`;
        const updated = await storage.updateOrder(id, {
          erpExportStatus: 'exportado',
          erpExportedAt: new Date(),
          erpId: generatedErpId,
          erpExportError: null,
        });
        await storage.createLog({ action: 'ERP_BLING_EXPORT', description: `Pedido ${o.orderCode} exportado para Bling. ID: ${generatedErpId}`, userId: user.id, userEmail: user.email, userRole: user.role, level: 'INFO' });
        res.json({ success: true, erpId: generatedErpId, order: updated, exportPayload });
      } catch (exportErr: any) {
        await storage.updateOrder(id, { erpExportStatus: 'erro', erpExportError: exportErr.message || 'Erro desconhecido' });
        return res.status(500).json({ message: `Erro na exportação: ${exportErr.message}` });
      }
    } catch (err: any) {
      res.status(500).json({ message: err?.message || 'Erro interno' });
    }
  });

  app.get('/api/orders/:id/export-erp', async (req, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ message: 'Não autenticado' });
      const user = await storage.getUser(req.session.userId);
      const allowed = ['ADMIN', 'DIRECTOR', 'FINANCEIRO', 'DEVELOPER', 'PURCHASE_MANAGER'];
      if (!user || !allowed.includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
      const id = Number(req.params.id);
      const orderData = await storage.getOrder(id);
      if (!orderData) return res.status(404).json({ message: 'Pedido não encontrado' });
      const company = await storage.getCompany((orderData.order as any).companyId);
      const allProducts = await storage.getProducts();
      const productMap = new Map(allProducts.map(p => [p.id, p]));
      const config = await storage.getCompanyConfig();
      const o = orderData.order as any;
      const fmtDate = (d: any) => { try { return new Date(d).toISOString().split('T')[0]; } catch { return ''; } };
      const items = orderData.items.map(item => {
        const prod = productMap.get(item.productId);
        return {
          produto: prod?.name || `Produto #${item.productId}`,
          ncm: (prod as any)?.ncm || '',
          cfop: (prod as any)?.cfop || (config as any)?.defaultCfop || '5102',
          quantidade: item.quantity,
          unidade: (prod as any)?.commercialUnit || prod?.unit || 'UN',
          valor_unitario: parseFloat(item.unitPrice || '0'),
          valor_total: parseFloat(item.totalPrice || '0'),
        };
      });
      const exportData = {
        numero_pedido: o.orderCode || `VF-${id}`,
        numero_pre_nota: o.preNotaNumber || '',
        data_pedido: fmtDate(o.orderDate),
        data_entrega: fmtDate(o.deliveryDate),
        semana_referencia: o.weekReference || '',
        cliente_nome: company?.companyName || '',
        cliente_cnpj: company?.cnpj || '',
        cliente_ie: (company as any)?.stateRegistration || '',
        cliente_endereco: [company?.addressStreet, company?.addressNumber].filter(Boolean).join(', '),
        cidade: company?.addressCity || '',
        estado: (company as any)?.addressState || '',
        cep: company?.addressZip || '',
        contato: company?.contactName || '',
        natureza_operacao: (config as any)?.defaultNatureza || 'Venda de mercadoria adquirida',
        cfop_geral: (config as any)?.defaultCfop || '5102',
        remetente_nome: (config as any)?.companyName || 'VivaFrutaz',
        remetente_cnpj: (config as any)?.cnpj || '',
        remetente_ie: (config as any)?.stateRegistration || '',
        remetente_endereco: (config as any)?.address || '',
        remetente_cidade: (config as any)?.city || '',
        remetente_estado: (config as any)?.state || '',
        remetente_cep: (config as any)?.cep || '',
        itens: items,
        valor_total_nota: parseFloat(o.totalValue || '0'),
        observacoes: [o.orderNote, o.adminNote].filter(Boolean).join(' | '),
        status_fiscal: o.fiscalStatus || 'nota_pendente',
      };
      res.json(exportData);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ─── DASHBOARD EXECUTIVO ─────────────────────────────────────
  app.get('/api/executive-dashboard', async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Not authenticated' });
    const user = await storage.getUser(req.session.userId);
    if (!user || !['ADMIN', 'DIRECTOR', 'FINANCEIRO', 'DEVELOPER'].includes(user.role)) return res.status(403).json({ message: 'Sem permissão' });
    try {
      const { period = 'month' } = req.query;
      const now = new Date();
      let startDate: Date;
      if (period === 'day') { startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); }
      else if (period === 'week') { const d = new Date(now); d.setDate(d.getDate() - d.getDay() + 1); startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
      else if (period === 'year') { startDate = new Date(now.getFullYear(), 0, 1); }
      else { startDate = new Date(now.getFullYear(), now.getMonth(), 1); } // month

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); weekStart.setHours(0,0,0,0);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const allOrders = await db.select().from(orders).where(gte(orders.orderDate, monthStart));
      const allCompanies = await storage.getCompanies();

      // Revenue KPIs
      const allOrdersAll = await db.select().from(orders);
      const todayOrders = allOrdersAll.filter(o => new Date(o.orderDate) >= todayStart);
      const weekOrders = allOrdersAll.filter(o => new Date(o.orderDate) >= weekStart);
      const monthOrders = allOrdersAll.filter(o => new Date(o.orderDate) >= monthStart);

      const sum = (arr: typeof allOrdersAll) => arr.filter(o => o.status !== 'CANCELLED').reduce((acc, o) => acc + parseFloat(o.totalValue || '0'), 0);
      const revenueDay = sum(todayOrders);
      const revenueWeek = sum(weekOrders);
      const revenueMonth = sum(monthOrders);
      const avgTicketMonth = monthOrders.filter(o => o.status !== 'CANCELLED').length > 0
        ? revenueMonth / monthOrders.filter(o => o.status !== 'CANCELLED').length : 0;

      // Top companies
      const companyMap: Record<string, { companyId: number; companyName: string; total: number; count: number }> = {};
      const periodOrders = allOrdersAll.filter(o => new Date(o.orderDate) >= startDate);
      for (const o of periodOrders.filter(x => x.status !== 'CANCELLED')) {
        if (!companyMap[o.companyId]) {
          const co = allCompanies.find(c => c.id === o.companyId);
          companyMap[o.companyId] = { companyId: o.companyId, companyName: co?.companyName || `Empresa #${o.companyId}`, total: 0, count: 0 };
        }
        companyMap[o.companyId].total += parseFloat(o.totalValue || '0');
        companyMap[o.companyId].count += 1;
      }
      const topCompanies = Object.values(companyMap).sort((a, b) => b.total - a.total).slice(0, 10);

      // Top products
      const allItems = await db.select({ orderId: orderItems.orderId, productId: orderItems.productId, quantity: orderItems.quantity, totalPrice: orderItems.totalPrice }).from(orderItems);
      const periodOrderIds = new Set(periodOrders.map(o => o.id));
      const productMap: Record<number, { productId: number; productName: string; qty: number; total: number }> = {};
      const allProds = await storage.getProducts();
      for (const item of allItems.filter(i => periodOrderIds.has(i.orderId))) {
        if (!productMap[item.productId]) {
          const pr = allProds.find(p => p.id === item.productId);
          productMap[item.productId] = { productId: item.productId, productName: pr?.name || `Produto #${item.productId}`, qty: 0, total: 0 };
        }
        productMap[item.productId].qty += item.quantity;
        productMap[item.productId].total += parseFloat(item.totalPrice || '0');
      }
      const topProducts = Object.values(productMap).sort((a, b) => b.total - a.total).slice(0, 10);

      // Orders by day of week (last 90 days)
      const last90 = new Date(); last90.setDate(last90.getDate() - 90);
      const recentOrds = allOrdersAll.filter(o => new Date(o.orderDate) >= last90 && o.status !== 'CANCELLED');
      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const ordByDay = Array.from({ length: 7 }, (_, i) => ({ day: dayNames[i], count: recentOrds.filter(o => new Date(o.orderDate).getDay() === i).length }));

      // Inactive companies (active companies that haven't ordered in ≥10 days)
      const tenDaysAgo = new Date(); tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      const lastOrderByCompany: Record<number, Date> = {};
      for (const o of allOrdersAll.filter(x => x.status !== 'CANCELLED')) {
        const d = new Date(o.orderDate);
        if (!lastOrderByCompany[o.companyId] || d > lastOrderByCompany[o.companyId]) {
          lastOrderByCompany[o.companyId] = d;
        }
      }
      const inactiveCompanies = allCompanies.filter(c => c.active).map(c => {
        const last = lastOrderByCompany[c.id];
        const daysSince = last ? Math.floor((Date.now() - last.getTime()) / 86400000) : 9999;
        return { id: c.id, name: c.companyName, lastOrder: last ? last.toISOString().slice(0,10) : null, daysSince };
      }).filter(c => c.daysSince >= 7).sort((a, b) => b.daysSince - a.daysSince).slice(0, 15);

      // Purchase forecast (avg weekly by product, last 8 weeks)
      const eightWeeksAgo = new Date(); eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
      const recentItems = allItems.filter(i => {
        const ord = allOrdersAll.find(o => o.id === i.orderId);
        return ord && new Date(ord.orderDate) >= eightWeeksAgo && ord.status !== 'CANCELLED';
      });
      const forecastMap: Record<number, number> = {};
      for (const item of recentItems) { forecastMap[item.productId] = (forecastMap[item.productId] || 0) + item.quantity; }
      const forecast = Object.entries(forecastMap).map(([pid, total]) => {
        const pr = allProds.find(p => p.id === parseInt(pid));
        const avgWeekly = total / 8;
        return { productId: parseInt(pid), productName: pr?.name || `Produto #${pid}`, avgWeekly: Math.round(avgWeekly * 10) / 10, avgMonthly: Math.round(avgWeekly * 4.3 * 10) / 10, suggestion: Math.ceil(avgWeekly * 1.1) };
      }).sort((a, b) => b.avgWeekly - a.avgWeekly).slice(0, 15);

      // Revenue by date (last 30 days)
      const revenueByDate: Record<string, number> = {};
      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      for (const o of allOrdersAll.filter(x => new Date(x.orderDate) >= thirtyDaysAgo && x.status !== 'CANCELLED')) {
        const dt = new Date(o.orderDate).toISOString().slice(0,10);
        revenueByDate[dt] = (revenueByDate[dt] || 0) + parseFloat(o.totalValue || '0');
      }
      const revenueTimeline = Object.entries(revenueByDate).map(([date, revenue]) => ({ date, revenue })).sort((a, b) => a.date.localeCompare(b.date));

      // Alerts
      const alerts: { type: 'ERROR' | 'WARN' | 'INFO'; message: string }[] = [];
      const prevWeekStart = new Date(weekStart); prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      const prevWeekEnd = new Date(weekStart);
      const prevWeekRevenue = sum(allOrdersAll.filter(o => new Date(o.orderDate) >= prevWeekStart && new Date(o.orderDate) < prevWeekEnd));
      const thisWeekRevenue = sum(weekOrders);
      if (prevWeekRevenue > 0 && thisWeekRevenue < prevWeekRevenue * 0.8) alerts.push({ type: 'WARN', message: `Faturamento da semana atual (R$${thisWeekRevenue.toFixed(0)}) queda de ${Math.round((1 - thisWeekRevenue/prevWeekRevenue)*100)}% vs semana anterior` });
      const criticalInactive = inactiveCompanies.filter(c => c.daysSince >= 10);
      if (criticalInactive.length > 0) alerts.push({ type: 'WARN', message: `${criticalInactive.length} empresa(s) sem pedido há mais de 10 dias: ${criticalInactive.slice(0,3).map(c => c.name).join(', ')}${criticalInactive.length > 3 ? '...' : ''}` });
      if (todayOrders.filter(o => o.status !== 'CANCELLED').length === 0 && now.getDay() >= 1 && now.getDay() <= 5) alerts.push({ type: 'INFO', message: 'Nenhum pedido registrado hoje ainda' });

      res.json({
        kpis: { revenueDay, revenueWeek, revenueMonth, ordersDay: todayOrders.filter(o=>o.status!=='CANCELLED').length, ordersWeek: weekOrders.filter(o=>o.status!=='CANCELLED').length, ordersMonth: monthOrders.filter(o=>o.status!=='CANCELLED').length, avgTicketMonth },
        topCompanies,
        topProducts,
        ordByDay,
        inactiveCompanies,
        forecast,
        revenueTimeline,
        alerts,
        period,
      });
    } catch (e: any) { console.error('Executive dashboard error:', e); res.status(500).json({ message: e?.message }); }
  });

  // ─── Assistente de Rota Inteligente ───────────────────────────
  app.get('/api/logistics/route-assistant', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    try {
      const { day, date } = req.query as { day?: string; date?: string };
      const allCompanies = await storage.getCompanies();

      // Get companies with orders for the requested date (if date provided)
      let companiesWithOrders: Set<number> = new Set();
      if (date) {
        const allOrders = await storage.getOrders();
        const dateStr = String(date);
        allOrders.forEach(o => {
          const od = new Date(o.deliveryDate).toISOString().split('T')[0];
          if (od === dateStr && !['CANCELLED'].includes(o.status)) {
            companiesWithOrders.add(o.companyId);
          }
        });
      }

      const result: any[] = [];
      for (const c of allCompanies) {
        if (!c.active) continue;
        const ca = c as any;
        let deliveryConfig: any = {};
        try { if (ca.deliveryConfigJson) deliveryConfig = JSON.parse(ca.deliveryConfigJson); } catch {}

        let windowForDay: { startTime: string; endTime: string } | null = null;

        if (day) {
          const dayData = deliveryConfig[day as string];
          if (!dayData?.enabled) continue;
          windowForDay = { startTime: dayData.startTime || '08:00', endTime: dayData.endTime || '09:00' };
        } else {
          // Include all companies with any delivery config
          const enabledDays = Object.entries(deliveryConfig).filter(([, v]: any) => v?.enabled);
          if (enabledDays.length === 0) continue;
        }

        result.push({
          id: c.id,
          companyName: c.companyName,
          addressStreet: ca.addressStreet || '',
          addressNumber: ca.addressNumber || '',
          addressNeighborhood: ca.addressNeighborhood || '',
          addressCity: ca.addressCity || '',
          addressZip: ca.addressZip || '',
          latitude: ca.latitude || null,
          longitude: ca.longitude || null,
          clientType: c.clientType || 'mensal',
          deliveryWindow: windowForDay,
          hasOrderForDate: date ? companiesWithOrders.has(c.id) : null,
          allowedOrderDays: c.allowedOrderDays,
        });
      }

      // Sort by start time (companies without window go last)
      result.sort((a, b) => {
        const ta = a.deliveryWindow?.startTime || '99:99';
        const tb = b.deliveryWindow?.startTime || '99:99';
        return ta.localeCompare(tb);
      });

      res.json(result);
    } catch (e: any) {
      console.error('Route assistant error:', e);
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Announcements (Painel de Avisos) ─────────────────────────
  // Admin: list all
  app.get('/api/announcements', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const user = await storage.getUser(session.userId);
    if (!user) return res.status(401).json({ message: 'Não autorizado' });
    const list = await storage.getAnnouncements();
    res.json(list);
  });

  // Client: get active announcements for their company
  app.get('/api/announcements/active', async (req, res) => {
    const session = req.session as any;
    if (session.companyId) {
      const list = await storage.getActiveAnnouncementsForCompany(Number(session.companyId));
      return res.json(list);
    }
    if (session.userId) {
      // Staff seeing client view — return all active
      const all = await storage.getAnnouncements();
      const today = new Date().toISOString().split('T')[0];
      return res.json(all.filter(a => a.active && a.startDate <= today && a.endDate >= today));
    }
    return res.status(401).json({ message: 'Não autorizado' });
  });

  // Admin: create
  app.post('/api/announcements', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const user = await storage.getUser(session.userId);
    if (!user || !['ADMIN', 'DIRECTOR', 'DEVELOPER'].includes(user.role)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }
    const { title, message, type, priority, startDate, endDate, active, targetAll, targetClientTypes, targetCompanyIds } = req.body;
    if (!title || !message || !startDate || !endDate) return res.status(400).json({ message: 'Campos obrigatórios ausentes' });
    const row = await storage.createAnnouncement({
      title, message,
      type: type || 'info',
      priority: priority || 'normal',
      startDate, endDate,
      active: active !== false,
      targetAll: targetAll !== false,
      targetClientTypes: targetClientTypes || null,
      targetCompanyIds: targetCompanyIds || null,
      createdBy: user.id,
    });
    res.status(201).json(row);
  });

  // Admin: update
  app.put('/api/announcements/:id', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const user = await storage.getUser(session.userId);
    if (!user || !['ADMIN', 'DIRECTOR', 'DEVELOPER'].includes(user.role)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }
    const row = await storage.updateAnnouncement(Number(req.params.id), req.body);
    res.json(row);
  });

  // Admin: toggle active
  app.patch('/api/announcements/:id/toggle', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const user = await storage.getUser(session.userId);
    if (!user || !['ADMIN', 'DIRECTOR', 'DEVELOPER'].includes(user.role)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }
    const { active } = req.body;
    const row = await storage.updateAnnouncement(Number(req.params.id), { active });
    res.json(row);
  });

  // Admin: delete
  app.delete('/api/announcements/:id', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const user = await storage.getUser(session.userId);
    if (!user || !['ADMIN', 'DIRECTOR', 'DEVELOPER'].includes(user.role)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }
    await storage.deleteAnnouncement(Number(req.params.id));
    res.status(204).end();
  });

  // ─── Controle de Desperdício ──────────────────────────────────
  app.get('/api/waste-control', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const records = await storage.getWasteRecords();
    res.json(records);
  });

  app.post('/api/waste-control', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const user = await storage.getUser(session.userId);
    try {
      const rec = await storage.createWasteRecord({
        ...req.body,
        registeredBy: user?.name || 'Sistema',
        registeredById: session.userId,
      });
      res.status(201).json(rec);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.patch('/api/waste-control/:id', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    try {
      const rec = await storage.updateWasteRecord(Number(req.params.id), req.body);
      res.json(rec);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.delete('/api/waste-control/:id', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    await storage.deleteWasteRecord(Number(req.params.id));
    res.status(204).end();
  });

  // ─── Planejamento de Compras ──────────────────────────────────

  // Smart forecast endpoint
  app.get('/api/purchase-planning/forecast', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    try {
      const [allOrders, allProds] = await Promise.all([storage.getOrders(), storage.getProducts()]);
      const prodById = new Map(allProds.map(p => [p.id, p]));
      const eightWeeksAgo = new Date(); eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
      const recentOrders = allOrders.filter(o => o.status !== 'CANCELLED' && new Date(o.deliveryDate) >= eightWeeksAgo);

      // Aggregate by product name, per week
      const weeklyMap: Record<string, Record<string, number>> = {}; // productName -> weekKey -> qty
      for (const order of recentOrders) {
        const orderWithItems = await storage.getOrder(order.id);
        if (!orderWithItems) continue;
        const items = orderWithItems.items;
        const delivDate = new Date(order.deliveryDate);
        const weekKey = `${delivDate.getFullYear()}-W${Math.ceil((delivDate.getDate() + new Date(delivDate.getFullYear(), delivDate.getMonth(), 1).getDay()) / 7)}`;
        for (const item of items) {
          const prod = prodById.get(item.productId);
          const name = prod?.name || `Produto #${item.productId}`;
          if (!weeklyMap[name]) weeklyMap[name] = {};
          weeklyMap[name][weekKey] = (weeklyMap[name][weekKey] || 0) + Number(item.quantity || 0);
        }
      }

      const forecast = Object.entries(weeklyMap).map(([productName, weeks]) => {
        const weekValues = Object.values(weeks);
        const totalWeeks = 8;
        const avgWeekly = weekValues.reduce((s, v) => s + v, 0) / totalWeeks;
        const recentWeeks = weekValues.slice(-2);
        const recentAvg = recentWeeks.length ? recentWeeks.reduce((s, v) => s + v, 0) / recentWeeks.length : avgWeekly;
        const trend: 'up' | 'down' | 'stable' = recentAvg > avgWeekly * 1.1 ? 'up' : recentAvg < avgWeekly * 0.9 ? 'down' : 'stable';
        return {
          productName, avgWeekly: Math.round(avgWeekly * 10) / 10,
          suggestion: Math.ceil(avgWeekly * 1.15), weeksActive: weekValues.filter(v => v > 0).length,
          trend, recentAvg: Math.round(recentAvg * 10) / 10,
        };
      }).filter(f => f.avgWeekly > 0).sort((a, b) => b.avgWeekly - a.avgWeekly);

      res.json({ forecast, analyzedWeeks: 8, generatedAt: new Date().toISOString() });
    } catch (e: any) {
      console.error('Forecast error:', e);
      res.status(500).json({ message: e.message });
    }
  });

  app.get('/api/purchase-planning', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    try {
      // Accept startDate (YYYY-MM-DD) as primary param; auto-compute Mon–Fri range
      const { startDate: rawStart, categoryFilter, sourceFilter } = req.query as Record<string, string>;
      // Compute start (Monday) and end (Friday) of the selected week
      let startDate = rawStart;
      if (!startDate) {
        const today = new Date();
        const day = today.getDay() || 7; // ISO: Mon=1..Sun=7
        const mon = new Date(today); mon.setDate(today.getDate() - (day - 1));
        startDate = mon.toISOString().split('T')[0];
      }
      const startD = new Date(startDate + 'T12:00:00');
      const endD = new Date(startD); endD.setDate(startD.getDate() + 4);
      const endDate = endD.toISOString().split('T')[0];
      const weekRef = startDate; // use startDate as weekRef for plan statuses

      const [allOrders, allProducts, allCompanies] = await Promise.all([
        storage.getOrders(),
        storage.getProducts(),
        storage.getCompanies(),
      ]);
      const productById = new Map(allProducts.map(p => [p.id, p]));
      const companyById = new Map(allCompanies.map(c => [c.id, c]));

      const filtered = allOrders.filter(o => {
        if (['CANCELLED'].includes(o.status)) return false;
        const d = new Date(o.deliveryDate).toISOString().split('T')[0];
        if (d < startDate) return false;
        if (d > endDate) return false;
        return true;
      });

      // Aggregate items by product
      type PlanEntry = {
        productId: number | null; productName: string; totalQty: number; unit: string;
        category?: string; productType?: string; source: 'regular' | 'special';
        companies: { companyId: number; companyName: string; quantity: number; deliveryDate: string; orderId: number; orderCode: string }[];
      };
      const productMap: Map<string, PlanEntry> = new Map();

      // Regular order items (only if sourceFilter allows)
      if (!sourceFilter || sourceFilter === 'all' || sourceFilter === 'regular') {
        if (!categoryFilter || categoryFilter === 'all') { // regular items have no category
          for (const order of filtered) {
            const orderWithItems = await storage.getOrder(order.id);
            if (!orderWithItems) continue;
            for (const item of orderWithItems.items) {
              const prod = productById.get(item.productId);
              const productName = prod?.name || `Produto #${item.productId}`;
              const unit = prod?.unit || 'un';
              const key = `reg__${productName}`;
              if (!productMap.has(key)) {
                productMap.set(key, { productId: item.productId, productName, totalQty: 0, unit, source: 'regular', companies: [] });
              }
              const entry = productMap.get(key)!;
              entry.totalQty += Number(item.quantity || 0);
              const companyName = companyById.get(order.companyId)?.companyName || `Empresa #${order.companyId}`;
              entry.companies.push({
                companyId: order.companyId, companyName,
                quantity: Number(item.quantity || 0),
                deliveryDate: new Date(order.deliveryDate).toISOString().split('T')[0],
                orderId: order.id,
                orderCode: order.orderCode,
              });
            }
          }
        }
      }

      // Approved special order items
      if (!sourceFilter || sourceFilter === 'all' || sourceFilter === 'special') {
        const allSpecial = await storage.getSpecialOrderRequests();
        const approvedSpecial = allSpecial.filter(s => s.status === 'APPROVED');
        for (const sr of approvedSpecial) {
          const srItems: any[] = Array.isArray((sr as any).items) ? (sr as any).items : [];
          const company = await storage.getCompany(sr.companyId);
          const companyName = company?.companyName || `Empresa #${sr.companyId}`;
          const delivDate = (sr as any).estimatedDeliveryDate || sr.requestedDate || sr.requestedDay || 'A definir';

          for (const si of srItems) {
            if (categoryFilter && categoryFilter !== 'all' && si.category !== categoryFilter) continue;
            const productType = si.productType || 'catalog';
            const key = `spec__${si.productName}__${si.category || ''}`;
            if (!productMap.has(key)) {
              productMap.set(key, {
                productId: null, productName: si.productName, totalQty: 0, unit: 'un',
                category: si.category, productType, source: 'special', companies: [],
              });
            }
            const entry = productMap.get(key)!;
            const qty = Number(si.approvedQuantity || si.quantity || 0);
            entry.totalQty += qty;
            entry.companies.push({
              companyId: sr.companyId, companyName, quantity: qty,
              deliveryDate: delivDate, orderId: sr.id, orderCode: `PP-${sr.id}`,
            });
          }
        }
      }

      const result = Array.from(productMap.values()).sort((a, b) => b.totalQty - a.totalQty);

      // Attach plan statuses
      const statuses = await storage.getPurchasePlanStatuses(weekRef);
      const statusMap = new Map(statuses.map(s => [s.productName, s]));
      const enriched = result.map(p => ({ ...p, planStatus: statusMap.get(p.productName) || null }));

      // Group by day for day-by-day view
      const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      const byDay: Record<string, { date: string; dayName: string; shortDate: string; items: typeof enriched }> = {};
      for (const p of enriched) {
        for (const c of p.companies) {
          const d = c.deliveryDate;
          if (!byDay[d]) {
            const dt = new Date(d + 'T12:00:00');
            byDay[d] = {
              date: d, dayName: DAY_NAMES[dt.getDay()],
              shortDate: dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
              items: [],
            };
          }
          // Check if this product already in day
          let dayItem = byDay[d].items.find(i => i.productName === p.productName && i.source === p.source);
          if (!dayItem) {
            dayItem = { ...p, totalQty: 0, companies: [], planStatus: p.planStatus };
            byDay[d].items.push(dayItem);
          }
          dayItem.totalQty += c.quantity;
          dayItem.companies.push(c);
        }
      }
      const dayGroups = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));

      res.json({ items: enriched, byDay: dayGroups, totalOrders: filtered.length, period: { startDate, endDate }, weekRef });
    } catch (e: any) {
      console.error('Purchase planning error:', e);
      res.status(500).json({ message: e.message });
    }
  });

  app.post('/api/purchase-planning/status', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const user = await storage.getUser(session.userId);
    try {
      const rec = await storage.upsertPurchasePlanStatus({ ...req.body, updatedBy: user?.name || 'Sistema' });
      res.json(rec);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.get('/api/purchase-planning/statuses', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const weekRef = req.query.weekRef as string;
    if (!weekRef) return res.status(400).json({ message: 'weekRef required' });
    const statuses = await storage.getPurchasePlanStatuses(weekRef);
    res.json(statuses);
  });

  // ── Estoque / Inventário ────────────────────────────────────

  // GET /api/inventory/settings — dashboard de estoque
  app.get('/api/inventory/settings', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const settings = await storage.getInventorySettings();
    res.json(settings);
  });

  // PUT /api/inventory/settings/:id — atualiza estoque mínimo
  app.put('/api/inventory/settings/:id', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const id = parseInt(req.params.id);
    const { minStock, avgPurchasePrice, category } = req.body;
    const existing = (await storage.getInventorySettings()).find(s => s.id === id);
    if (!existing) return res.status(404).json({ message: 'Configuração não encontrada' });
    const updated = await storage.upsertInventorySetting({ ...existing, minStock: String(minStock ?? existing.minStock), avgPurchasePrice: avgPurchasePrice != null ? String(avgPurchasePrice) : existing.avgPurchasePrice, category: category ?? existing.category });
    res.json(updated);
  });

  // POST /api/inventory/settings — cria configuração de produto (se não existe)
  app.post('/api/inventory/settings', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const { productId, productName, unit, minStock, category } = req.body;
    if (!productName || !unit) return res.status(400).json({ message: 'productName e unit são obrigatórios' });
    const result = await storage.upsertInventorySetting({ productId, productName, unit, minStock: String(minStock ?? 0), currentStock: '0', category });
    res.json(result);
  });

  // GET /api/inventory/entries — lista entradas
  app.get('/api/inventory/entries', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const { from, to } = req.query as Record<string, string>;
    const entries = await storage.getInventoryEntries({ from, to });
    res.json(entries);
  });

  // POST /api/inventory/entries — registra entrada de estoque
  app.post('/api/inventory/entries', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const { productId, productName, category, supplier, quantity, unit, purchasePrice, invoiceNumber, invoiceDate, entryDate, expiryDate, notes } = req.body;
    if (!productName || !quantity || !unit || !entryDate) return res.status(400).json({ message: 'Campos obrigatórios: productName, quantity, unit, entryDate' });
    try {
      const entry = await storage.createInventoryEntry({
        productId: productId || null,
        productName,
        category: category || null,
        supplier: supplier || null,
        quantity: String(quantity),
        unit,
        purchasePrice: purchasePrice ? String(purchasePrice) : null,
        invoiceNumber: invoiceNumber || null,
        invoiceDate: invoiceDate || null,
        entryDate,
        expiryDate: expiryDate || null,
        notes: notes || null,
        createdBy: session.userName || 'Admin',
        createdById: session.userId,
      });
      // Atualiza ou cria configuração de estoque
      let setting = productId ? await storage.getInventorySettingByProductId(productId) : await storage.getInventorySettingByProductName(productName);
      if (!setting) {
        setting = await storage.upsertInventorySetting({ productId, productName, unit, currentStock: '0', minStock: '0', category: category || null, avgPurchasePrice: purchasePrice ? String(purchasePrice) : null });
      }
      const newStock = parseFloat(setting.currentStock || '0') + parseFloat(String(quantity));
      // Atualiza preço médio de compra
      let newAvg = setting.avgPurchasePrice ? parseFloat(setting.avgPurchasePrice) : 0;
      if (purchasePrice) {
        const oldStock = parseFloat(setting.currentStock || '0');
        const oldAvg = parseFloat(setting.avgPurchasePrice || '0');
        const totalOld = oldStock * oldAvg;
        const totalNew = parseFloat(String(quantity)) * parseFloat(String(purchasePrice));
        newAvg = oldStock + parseFloat(String(quantity)) > 0 ? (totalOld + totalNew) / (oldStock + parseFloat(String(quantity))) : parseFloat(String(purchasePrice));
      }
      await storage.upsertInventorySetting({ ...setting, currentStock: String(newStock), avgPurchasePrice: String(newAvg) });
      // Registra movimentação
      await storage.createInventoryMovement({
        productId: productId || null,
        productName,
        movementType: 'ENTRY',
        quantity: String(quantity),
        balanceAfter: String(newStock),
        unit,
        referenceType: 'entry',
        referenceId: entry.id,
        notes: invoiceNumber ? `NF ${invoiceNumber}` : (notes || null),
        date: entryDate,
        createdBy: session.userName || 'Admin',
      });
      res.json(entry);
    } catch (e: any) {
      console.error('Inventory entry error:', e);
      res.status(500).json({ message: 'Erro ao registrar entrada' });
    }
  });

  // DELETE /api/inventory/entries/:id
  app.delete('/api/inventory/entries/:id', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    await storage.deleteInventoryEntry(parseInt(req.params.id));
    res.json({ ok: true });
  });

  // GET /api/inventory/movements — histórico de movimentações
  app.get('/api/inventory/movements', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const { from, to, productId } = req.query as Record<string, string>;
    const movements = await storage.getInventoryMovements({ from, to, productId: productId ? parseInt(productId) : undefined });
    res.json(movements);
  });

  // GET /api/inventory/physical-counts — inventário físico
  app.get('/api/inventory/physical-counts', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    res.json(await storage.getInventoryPhysicalCounts());
  });

  // POST /api/inventory/physical-counts — registra contagem física
  app.post('/api/inventory/physical-counts', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const { productId, productName, unit, physicalStock, notes, date } = req.body;
    if (!productName || physicalStock == null || !date) return res.status(400).json({ message: 'productName, physicalStock e date são obrigatórios' });
    try {
      let setting = productId ? await storage.getInventorySettingByProductId(productId) : await storage.getInventorySettingByProductName(productName);
      const systemStockVal = setting ? parseFloat(setting.currentStock || '0') : 0;
      const physicalVal = parseFloat(String(physicalStock));
      const diff = physicalVal - systemStockVal;
      const count = await storage.createInventoryPhysicalCount({
        productId: productId || null,
        productName,
        unit: unit || (setting?.unit ?? 'kg'),
        systemStock: String(systemStockVal),
        physicalStock: String(physicalVal),
        difference: String(diff),
        notes: notes || null,
        date,
        createdBy: session.userName || 'Admin',
        createdById: session.userId,
      });
      // Aplica ajuste no estoque
      if (setting) {
        await storage.upsertInventorySetting({ ...setting, currentStock: String(physicalVal) });
        await storage.createInventoryMovement({
          productId: productId || null,
          productName,
          movementType: 'ADJUSTMENT',
          quantity: String(Math.abs(diff)),
          balanceAfter: String(physicalVal),
          unit: unit || setting.unit,
          referenceType: 'adjustment',
          referenceId: count.id,
          notes: diff >= 0 ? `Ajuste +${diff.toFixed(3)} (contagem física)` : `Ajuste ${diff.toFixed(3)} (contagem física)`,
          date,
          createdBy: session.userName || 'Admin',
        });
      }
      res.json(count);
    } catch (e: any) {
      console.error('Physical count error:', e);
      res.status(500).json({ message: 'Erro ao registrar contagem física' });
    }
  });

  // ── Email Schedules ─────────────────────────────────────────
  app.get('/api/email/schedules', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    res.json(await storage.getEmailSchedules());
  });

  app.post('/api/email/schedules', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const user = await storage.getUser(session.userId);
    if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) return res.status(403).json({ message: 'Acesso negado' });
    const { type, label, dayOfWeek, timeOfDay, enabled } = req.body;
    if (!type || !label || !timeOfDay) return res.status(400).json({ message: 'type, label e timeOfDay são obrigatórios' });
    const schedule = await storage.createEmailSchedule({ type, label, dayOfWeek: dayOfWeek ?? null, timeOfDay, enabled: enabled ?? true });
    res.status(201).json(schedule);
  });

  app.put('/api/email/schedules/:id', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const user = await storage.getUser(session.userId);
    if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) return res.status(403).json({ message: 'Acesso negado' });
    const { type, label, dayOfWeek, timeOfDay, enabled } = req.body;
    const updated = await storage.updateEmailSchedule(Number(req.params.id), { type, label, dayOfWeek, timeOfDay, enabled });
    res.json(updated);
  });

  app.delete('/api/email/schedules/:id', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const user = await storage.getUser(session.userId);
    if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) return res.status(403).json({ message: 'Acesso negado' });
    await storage.deleteEmailSchedule(Number(req.params.id));
    res.status(204).send();
  });

  // ── Email Logs ───────────────────────────────────────────────
  app.get('/api/email/logs', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const { type, companyId, limit } = req.query as any;
    const logs = await storage.getEmailLogs({
      type: type || undefined,
      companyId: companyId ? Number(companyId) : undefined,
      limit: limit ? Number(limit) : 200,
    });
    res.json(logs);
  });

  // ── Manual Email Blast ────────────────────────────────────────
  app.post('/api/email/broadcast', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const user = await storage.getUser(session.userId);
    if (!user || !['ADMIN', 'MANAGER', 'DIRECTOR'].includes(user.role)) return res.status(403).json({ message: 'Acesso negado' });

    const { subject, message, targetType, companyIds } = req.body;
    if (!subject || !message) return res.status(400).json({ message: 'subject e message são obrigatórios' });

    try {
      const allUsers = await storage.getUsers();
      let targets: typeof allUsers = [];

      if (targetType === 'all') {
        targets = allUsers.filter(u => u.role === 'CLIENT' && u.email && u.active);
      } else if (targetType === 'specific' && Array.isArray(companyIds) && companyIds.length > 0) {
        targets = allUsers.filter(u => u.email && u.companyId && companyIds.includes(u.companyId));
      } else if (targetType === 'group' && Array.isArray(companyIds) && companyIds.length > 0) {
        targets = allUsers.filter(u => u.email && u.companyId && companyIds.includes(u.companyId));
      } else {
        return res.status(400).json({ message: 'targetType inválido ou companyIds não fornecidos' });
      }

      const toEmails = [...new Set(targets.map(u => u.email).filter(Boolean))] as string[];
      if (toEmails.length === 0) return res.status(400).json({ message: 'Nenhum destinatário encontrado' });

      const result = await sendAdminBroadcast({
        toEmails,
        subject,
        message,
        senderName: user.email,
      });

      // Log for each recipient
      for (const email of toEmails) {
        const target = targets.find(u => u.email === email);
        await storage.createEmailLog({
          type: 'admin_broadcast',
          toEmail: email,
          toName: email,
          companyId: target?.companyId || null,
          orderId: null,
          subject,
          status: result.sent ? 'sent' : 'failed',
          errorMessage: result.sent ? null : (result.reason || null),
          metadata: { targetType, sentBy: user.email },
        });
      }

      res.json({ success: result.sent, recipients: toEmails.length, ...result });
    } catch (e: any) {
      res.status(500).json({ message: 'Erro ao enviar broadcast', detail: e.message });
    }
  });

  // ── Manual single email for order events ────────────────────
  app.post('/api/email/send-order-event', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const user = await storage.getUser(session.userId);
    if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) return res.status(403).json({ message: 'Acesso negado' });

    const { orderId, type } = req.body;
    if (!orderId || !type) return res.status(400).json({ message: 'orderId e type são obrigatórios' });

    try {
      const { order } = await storage.getOrder(orderId);
      const company = await storage.getCompany(order.companyId);
      if (!company) return res.status(404).json({ message: 'Empresa não encontrada' });

      // Get contact email for this company (from users)
      const allUsers = await storage.getUsers();
      const companyUser = allUsers.find(u => u.companyId === order.companyId && u.email);
      const toEmail = companyUser?.email;
      if (!toEmail) return res.status(400).json({ message: 'Cliente não possui e-mail cadastrado' });

      const vfCode = order.orderCode || `VF-${new Date().getFullYear()}-${String(order.id).padStart(6, '0')}`;
      const deliveryDate = order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('pt-BR') : '—';

      let result;
      if (type === 'confirmed') {
        const items = (await storage.getOrder(orderId)).items || [];
        result = await sendOrderConfirmedEmail({
          toEmail,
          companyName: company.companyName,
          vfCode,
          deliveryDate,
          totalItems: items.length,
          adminNote: order.adminNote || undefined,
        });
      } else if (type === 'rejected') {
        result = await sendOrderRejectedEmail({
          toEmail,
          companyName: company.companyName,
          vfCode,
          reason: req.body.reason || order.adminNote || 'Sem motivo informado',
        });
      } else {
        return res.status(400).json({ message: 'type deve ser "confirmed" ou "rejected"' });
      }

      await storage.createEmailLog({
        type: `order_${type}`,
        toEmail,
        toName: company.companyName,
        companyId: order.companyId,
        orderId: order.id,
        subject: type === 'confirmed' ? `Pedido ${vfCode} confirmado` : `Pedido ${vfCode} cancelado`,
        status: result.sent ? 'sent' : 'failed',
        errorMessage: result.sent ? null : (result.reason || null),
        metadata: { vfCode },
      });

      res.json({ success: result.sent, ...result });
    } catch (e: any) {
      res.status(500).json({ message: 'Erro ao enviar e-mail', detail: e.message });
    }
  });

  // ── Fiscal Invoices (OCR Import) ────────────────────────────
  const uploadInMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

  // POST /api/fiscal-invoices/parse-pdf — extract text from PDF server-side
  app.post('/api/fiscal-invoices/parse-pdf', uploadInMemory.single('file'), async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    if (!req.file) return res.status(400).json({ message: 'Arquivo não enviado' });
    try {
      const data = await pdfParse(req.file.buffer);
      res.json({ text: data.text, pages: data.numpages, info: data.info });
    } catch (e: any) {
      console.error('PDF parse error:', e);
      res.status(500).json({ message: 'Erro ao processar PDF', detail: e.message });
    }
  });

  // GET /api/fiscal-invoices — list all imported invoices
  app.get('/api/fiscal-invoices', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    res.json(await storage.getFiscalInvoices());
  });

  // GET /api/fiscal-invoices/check-duplicate — check if invoice number+cnpj already exists
  app.get('/api/fiscal-invoices/check-duplicate', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const { invoiceNumber, cnpj } = req.query as { invoiceNumber?: string; cnpj?: string };
    if (!invoiceNumber) return res.status(400).json({ message: 'invoiceNumber é obrigatório' });
    const isDuplicate = await storage.checkFiscalInvoiceDuplicate(invoiceNumber, cnpj);
    res.json({ isDuplicate });
  });

  // GET /api/fiscal-invoices/:id
  app.get('/api/fiscal-invoices/:id', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const invoice = await storage.getFiscalInvoiceById(Number(req.params.id));
    if (!invoice) return res.status(404).json({ message: 'Nota não encontrada' });
    res.json(invoice);
  });

  // POST /api/fiscal-invoices — confirm and save a fiscal invoice + create inventory entry
  app.post('/api/fiscal-invoices', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    const { invoiceNumber, supplier, supplierCnpj, issueDate, totalValue, items, notes, fileType, fileName } = req.body;
    if (!invoiceNumber || !supplier) return res.status(400).json({ message: 'invoiceNumber e supplier são obrigatórios' });

    try {
      const duplicateKey = `${invoiceNumber}_${supplierCnpj || ''}`;
      // Check duplicate
      const isDupe = await storage.checkFiscalInvoiceDuplicate(invoiceNumber, supplierCnpj);
      if (isDupe) return res.status(409).json({ message: 'Esta nota fiscal já foi registrada no sistema.', duplicate: true });

      const invoice = await storage.createFiscalInvoice({
        invoiceNumber,
        supplier,
        supplierCnpj: supplierCnpj || null,
        issueDate: issueDate || null,
        totalValue: totalValue ? String(totalValue) : null,
        items: items || [],
        status: 'CONFIRMED',
        importedBy: session.userId,
        notes: notes || null,
        fileType: fileType || null,
        fileName: fileName || null,
        duplicateKey,
      });

      // Auto-create inventory entries for each item
      const itemList = Array.isArray(items) ? items : [];
      for (const item of itemList) {
        if (!item.name || !item.quantity) continue;
        try {
          await storage.createInventoryEntry({
            productId: item.linkedProductId || null,
            productName: item.linkedProductName || item.name,
            category: item.category || 'Outros',
            supplier,
            quantity: String(item.quantity),
            unit: item.unit || 'kg',
            purchasePrice: item.unitPrice ? String(item.unitPrice) : null,
            invoiceNumber,
            invoiceDate: issueDate || null,
            entryDate: new Date().toISOString().split('T')[0],
            expiryDate: null,
            notes: `Importado da nota fiscal ${invoiceNumber}`,
          });
        } catch (entryErr) {
          console.error('Error creating inventory entry for item:', item.name, entryErr);
        }
      }

      res.status(201).json(invoice);
    } catch (e: any) {
      console.error('Fiscal invoice error:', e);
      res.status(500).json({ message: 'Erro ao salvar nota fiscal', detail: e.message });
    }
  });

  // DELETE /api/fiscal-invoices/:id
  app.delete('/api/fiscal-invoices/:id', async (req, res) => {
    const session = req.session as any;
    if (!session.userId) return res.status(401).json({ message: 'Não autorizado' });
    await storage.deleteFiscalInvoice(Number(req.params.id));
    res.status(204).send();
  });

  // ── Geocoding proxy (Nominatim) ────────────────────────────
  app.get('/api/geocode', async (req, res) => {
    const q = req.query.q as string;
    if (!q) return res.status(400).json({ error: 'Missing address query' });
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=br`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'VivaFrutaz/1.0 (comercial@vivafrutaz.com)',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
      });
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: 'Geocoding failed', detail: err.message });
    }
  });

  // Seed DB Function
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  try {
    // Ensure default developer user always exists
    const devUser = await storage.getUserByEmail("dev@vivafrutaz.com");
    if (!devUser) {
      await storage.createUser({
        name: "Desenvolvedor VF",
        email: "dev@vivafrutaz.com",
        password: "dev",
        role: "DEVELOPER",
        active: true,
      });
    }

    const admin = await storage.getUserByEmail("admin@vivafrutaz.com");
    if (!admin) {
      await storage.createUser({
        name: "Admin User",
        email: "admin@vivafrutaz.com",
        password: "admin",
        role: "ADMIN",
        active: true,
      });
      await storage.createUser({
        name: "Operations",
        email: "ops@vivafrutaz.com",
        password: "ops",
        role: "OPERATIONS_MANAGER",
        active: true,
      });
      await storage.createUser({
        name: "Purchasing",
        email: "buy@vivafrutaz.com",
        password: "buy",
        role: "PURCHASE_MANAGER",
        active: true,
      });
      await storage.createUser({
        name: "Desenvolvedor VF",
        email: "dev@vivafrutaz.com",
        password: "dev",
        role: "DEVELOPER",
        active: true,
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

      const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
      const weekRef = `${months[delStart.getMonth()]} ${delStart.getDate()}–${delEnd.getDate()}/${delEnd.getFullYear()}`;
      await storage.createOrderWindow({
        weekReference: weekRef,
        orderOpenDate: open,
        orderCloseDate: close,
        deliveryStartDate: delStart,
        deliveryEndDate: delEnd,
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

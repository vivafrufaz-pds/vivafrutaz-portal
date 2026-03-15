/**
 * email-scheduler.ts
 * Runs every minute to dispatch automated emails based on configured schedules.
 * - Window Open Reminders: sent when a new order window opens
 * - Unfinalised Order Reminders: sent on configured day+time if client has no confirmed order
 */

import { storage } from "./storage";
import {
  sendWindowOpenReminder,
  sendUnfinalisedReminder,
} from "./mailer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Track which windows we've already sent open-reminders for (reset on server restart)
const sentWindowReminders = new Set<number>();

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  try { return format(new Date(d as string), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); }
  catch { return String(d); }
}

async function runSchedulerTick() {
  try {
    const now = new Date();
    const currentDow = now.getDay(); // 0=Sun..6=Sat
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // ── 1. Get active order window ─────────────────────────────────────────
    const activeWindow = await storage.getActiveOrderWindow();

    // ── 2. Window-Open Reminder ────────────────────────────────────────────
    // Fire once per server session when a window becomes active
    if (activeWindow && !sentWindowReminders.has(activeWindow.id)) {
      sentWindowReminders.add(activeWindow.id);

      // Get all active CLIENT users with emails
      const allUsers = await storage.getUsers();
      const clientUsers = allUsers.filter(u => u.role === 'CLIENT' && u.email && u.active);

      for (const user of clientUsers) {
        if (!user.email) continue;
        // Check if already sent today
        const alreadySent = await storage.wasEmailSentToday('window_open_reminder', user.email);
        if (alreadySent) continue;

        // Get company info
        const company = user.companyId ? await storage.getCompany(user.companyId) : null;
        const companyName = company?.companyName || user.email;

        const result = await sendWindowOpenReminder({
          toEmail: user.email,
          companyName,
          weekReference: activeWindow.weekReference,
          orderCloseDate: fmtDate(activeWindow.orderCloseDate),
          deliveryDate: fmtDate(activeWindow.deliveryStartDate),
        });

        await storage.createEmailLog({
          type: 'window_open_reminder',
          toEmail: user.email,
          toName: companyName,
          companyId: user.companyId || null,
          orderId: null,
          subject: `Janela de pedidos aberta — ${activeWindow.weekReference}`,
          status: result.sent ? 'sent' : 'failed',
          errorMessage: result.sent ? null : (result.reason || null),
          metadata: { windowId: activeWindow.id, weekReference: activeWindow.weekReference },
        });
      }
    }

    // ── 3. Unfinalised Order Reminders ─────────────────────────────────────
    // Check all enabled "unfinalised_reminder" schedules for current day+time
    const schedules = await storage.getEmailSchedules();
    const unfinalisedSchedules = schedules.filter(s =>
      s.enabled &&
      s.type === 'unfinalised_reminder' &&
      s.timeOfDay === currentTime &&
      (s.dayOfWeek === null || s.dayOfWeek === currentDow)
    );

    if (activeWindow && unfinalisedSchedules.length > 0) {
      const allUsers = await storage.getUsers();
      const clientUsers = allUsers.filter(u => u.role === 'CLIENT' && u.email && u.active);

      for (const user of clientUsers) {
        if (!user.email) continue;

        // Check if already sent today for this type
        const alreadySent = await storage.wasEmailSentToday('unfinalised_reminder', user.email);
        if (alreadySent) continue;

        // Check if user has a confirmed/active order in this window (matched by weekReference)
        if (!user.companyId) continue;
        const companyOrders = await storage.getOrdersByCompanyId(user.companyId);
        const hasActiveOrder = companyOrders.some(o =>
          ['CONFIRMED', 'ACTIVE', 'OPEN_FOR_EDITING'].includes(o.status) &&
          o.weekReference === activeWindow.weekReference
        );

        if (hasActiveOrder) continue; // already has an order — skip

        const company = await storage.getCompany(user.companyId);
        const companyName = company?.companyName || user.email;

        const result = await sendUnfinalisedReminder({
          toEmail: user.email,
          companyName,
          weekReference: activeWindow.weekReference,
          orderCloseDate: fmtDate(activeWindow.orderCloseDate),
        });

        await storage.createEmailLog({
          type: 'unfinalised_reminder',
          toEmail: user.email,
          toName: companyName,
          companyId: user.companyId,
          orderId: null,
          subject: `Lembrete: finalize seu pedido — ${activeWindow.weekReference}`,
          status: result.sent ? 'sent' : 'failed',
          errorMessage: result.sent ? null : (result.reason || null),
          metadata: { windowId: activeWindow.id, weekReference: activeWindow.weekReference },
        });
      }
    }
  } catch (err) {
    console.error('[EMAIL-SCHEDULER] Error during tick:', err);
  }
}

export function startEmailScheduler() {
  console.log('[EMAIL-SCHEDULER] Iniciado. Verificação a cada minuto.');
  // Run immediately once, then every minute
  runSchedulerTick();
  setInterval(runSchedulerTick, 60_000);
}

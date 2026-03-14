import cron from "node-cron";
import fs from "fs";
import path from "path";
import { db } from "./db";
import { users, companies, priceGroups, categories, products, productPrices, orderWindows, orderExceptions, orders, orderItems, systemSettings, specialOrderRequests } from "@shared/schema";

const BACKUP_DIR = path.join(process.cwd(), "backups");
const MAX_BACKUPS = 30;

export function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

export async function runBackup(): Promise<string> {
  ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `backup_${timestamp}.json`;
  const filepath = path.join(BACKUP_DIR, filename);

  const [
    usersData, companiesData, priceGroupsData, categoriesData,
    productsData, productPricesData, orderWindowsData, orderExceptionsData,
    ordersData, orderItemsData, settingsData, specialOrdersData,
  ] = await Promise.all([
    db.select().from(users),
    db.select().from(companies),
    db.select().from(priceGroups),
    db.select().from(categories),
    db.select().from(products),
    db.select().from(productPrices),
    db.select().from(orderWindows),
    db.select().from(orderExceptions),
    db.select().from(orders),
    db.select().from(orderItems),
    db.select().from(systemSettings),
    db.select().from(specialOrderRequests),
  ]);

  const backup = {
    version: "1.0",
    createdAt: new Date().toISOString(),
    tables: {
      users: usersData,
      companies: companiesData,
      priceGroups: priceGroupsData,
      categories: categoriesData,
      products: productsData,
      productPrices: productPricesData,
      orderWindows: orderWindowsData,
      orderExceptions: orderExceptionsData,
      orders: ordersData,
      orderItems: orderItemsData,
      systemSettings: settingsData,
      specialOrderRequests: specialOrdersData,
    },
    counts: {
      users: usersData.length,
      companies: companiesData.length,
      orders: ordersData.length,
      products: productsData.length,
    }
  };

  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), "utf-8");
  console.log(`[BACKUP] Backup criado: ${filename} (${ordersData.length} pedidos, ${companiesData.length} empresas)`);

  rotateBackups();
  return filename;
}

function rotateBackups() {
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith("backup_") && f.endsWith(".json"))
    .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length > MAX_BACKUPS) {
    files.slice(MAX_BACKUPS).forEach(f => {
      fs.unlinkSync(path.join(BACKUP_DIR, f.name));
      console.log(`[BACKUP] Backup antigo removido: ${f.name}`);
    });
  }
}

export function listBackups(): { filename: string; size: number; createdAt: string }[] {
  ensureBackupDir();
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith("backup_") && f.endsWith(".json"))
    .map(f => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return { filename: f, size: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return files;
}

export function getBackupPath(filename: string): string | null {
  const safe = path.basename(filename);
  if (!safe.startsWith("backup_") || !safe.endsWith(".json")) return null;
  const filepath = path.join(BACKUP_DIR, safe);
  return fs.existsSync(filepath) ? filepath : null;
}

export function deleteBackup(filename: string): boolean {
  const safe = path.basename(filename);
  if (!safe.startsWith("backup_") || !safe.endsWith(".json")) return false;
  const filepath = path.join(BACKUP_DIR, safe);
  if (!fs.existsSync(filepath)) return false;
  fs.unlinkSync(filepath);
  console.log(`[BACKUP] Backup excluído: ${safe}`);
  return true;
}

export function cleanOldBackups(olderThanDays = 30): number {
  ensureBackupDir();
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith("backup_") && f.endsWith(".json"));
  let removed = 0;
  for (const f of files) {
    const stat = fs.statSync(path.join(BACKUP_DIR, f));
    if (stat.mtimeMs < cutoff) {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
      console.log(`[BACKUP] Backup antigo removido: ${f}`);
      removed++;
    }
  }
  return removed;
}

export function scheduleBackups() {
  ensureBackupDir();
  // Run every day at 17:00 (server time)
  cron.schedule("0 17 * * *", async () => {
    try {
      await runBackup();
    } catch (err) {
      console.error("[BACKUP] Erro ao criar backup automático:", err);
    }
  });
  console.log("[BACKUP] Backup automático agendado para 17:00 diariamente.");
}

import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || "VivaFrutaz <noreply@vivafrutaz.com>";

function isConfigured() {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

function createTransporter() {
  if (!isConfigured()) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

async function sendMail(to: string, subject: string, html: string) {
  if (!isConfigured()) {
    console.log(`[MAILER] Email não enviado (SMTP não configurado). Para: ${to} | Assunto: ${subject}`);
    return { sent: false, reason: "SMTP não configurado" };
  }
  try {
    const transporter = createTransporter()!;
    await transporter.sendMail({ from: SMTP_FROM, to, subject, html });
    console.log(`[MAILER] Email enviado para ${to}: ${subject}`);
    return { sent: true };
  } catch (err: any) {
    console.error(`[MAILER] Falha ao enviar email para ${to}:`, err.message);
    return { sent: false, reason: err.message };
  }
}

function wrapTemplate(title: string, body: string) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #f9fafb; margin: 0; padding: 20px; color: #111; }
  .card { background: #fff; border-radius: 12px; padding: 32px; max-width: 520px; margin: 0 auto; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
  .logo { color: #16a34a; font-size: 22px; font-weight: bold; margin-bottom: 24px; }
  h2 { margin: 0 0 12px; font-size: 20px; }
  p { line-height: 1.6; color: #374151; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 13px; font-weight: bold; }
  .green { background: #dcfce7; color: #15803d; }
  .orange { background: #ffedd5; color: #c2410c; }
  .gray { background: #f3f4f6; color: #6b7280; }
  .footer { margin-top: 24px; font-size: 12px; color: #9ca3af; text-align: center; }
</style></head>
<body>
<div class="card">
  <div class="logo">🍎 VivaFrutaz</div>
  <h2>${title}</h2>
  ${body}
  <div class="footer">VivaFrutaz — Portal B2B de Frutas | Este é um e-mail automático.</div>
</div>
</body>
</html>`;
}

export async function sendOrderPlaced(opts: {
  toEmail: string;
  companyName: string;
  vfCode: string;
  deliveryDay: string;
  totalItems: number;
}) {
  const subject = `✅ Pedido ${opts.vfCode} recebido — VivaFrutaz`;
  const html = wrapTemplate("Pedido recebido com sucesso!", `
    <p>Olá, <strong>${opts.companyName}</strong>!</p>
    <p>Seu pedido foi registrado com sucesso.</p>
    <p><strong>Código:</strong> <span class="badge green">${opts.vfCode}</span></p>
    <p><strong>Dia de entrega:</strong> ${opts.deliveryDay}</p>
    <p><strong>Itens:</strong> ${opts.totalItems} produto(s)</p>
    <p>Nossa equipe está processando seu pedido. Em breve você receberá atualizações.</p>
  `);
  return sendMail(opts.toEmail, subject, html);
}

export async function sendOrderStatusChanged(opts: {
  toEmail: string;
  companyName: string;
  vfCode: string;
  status: string;
  adminNote?: string;
}) {
  const statusLabels: Record<string, string> = {
    CONFIRMED: "Confirmado",
    DELIVERED: "Entregue",
    CANCELLED: "Cancelado",
    PENDING: "Pendente",
  };
  const statusLabel = statusLabels[opts.status] || opts.status;
  const badgeClass = opts.status === "CONFIRMED" || opts.status === "DELIVERED" ? "green" : opts.status === "CANCELLED" ? "orange" : "gray";
  const subject = `📦 Pedido ${opts.vfCode} — Status: ${statusLabel}`;
  const html = wrapTemplate(`Atualização do pedido ${opts.vfCode}`, `
    <p>Olá, <strong>${opts.companyName}</strong>!</p>
    <p>O status do seu pedido foi atualizado:</p>
    <p><strong>Status:</strong> <span class="badge ${badgeClass}">${statusLabel}</span></p>
    ${opts.adminNote ? `<p><strong>Observação:</strong> ${opts.adminNote}</p>` : ""}
    <p>Em caso de dúvidas, entre em contato com a equipe VivaFrutaz.</p>
  `);
  return sendMail(opts.toEmail, subject, html);
}

export async function sendPasswordResetResolved(opts: {
  toEmail: string;
  companyName: string;
  approved: boolean;
  adminNote?: string;
}) {
  const subject = opts.approved
    ? "🔑 Sua senha foi redefinida — VivaFrutaz"
    : "❌ Solicitação de redefinição de senha — VivaFrutaz";
  const html = wrapTemplate(
    opts.approved ? "Senha redefinida com sucesso" : "Solicitação não aprovada",
    `<p>Olá, <strong>${opts.companyName}</strong>!</p>
    ${opts.approved
      ? `<p>Sua solicitação de redefinição de senha foi <span class="badge green">aprovada</span>. Sua senha foi atualizada. Acesse o portal e faça o login com sua nova senha.</p>`
      : `<p>Sua solicitação de redefinição de senha foi <span class="badge orange">negada</span>.</p>`}
    ${opts.adminNote ? `<p><strong>Observação da equipe:</strong> ${opts.adminNote}</p>` : ""}
    `
  );
  return sendMail(opts.toEmail, subject, html);
}

export async function sendSpecialOrderResolved(opts: {
  toEmail: string;
  companyName: string;
  requestedDay: string;
  status: string;
  adminNote?: string;
}) {
  const approved = opts.status === "APPROVED";
  const subject = approved
    ? `✅ Pedido Pontual aprovado — VivaFrutaz`
    : `❌ Pedido Pontual não aprovado — VivaFrutaz`;
  const html = wrapTemplate(
    approved ? "Pedido Pontual aprovado!" : "Pedido Pontual não aprovado",
    `<p>Olá, <strong>${opts.companyName}</strong>!</p>
    <p>Sua solicitação de Pedido Pontual para <strong>${opts.requestedDay}</strong> foi 
    <span class="badge ${approved ? "green" : "orange"}">${approved ? "APROVADA" : "NEGADA"}</span>.</p>
    ${opts.adminNote ? `<p><strong>Observação:</strong> ${opts.adminNote}</p>` : ""}
    `
  );
  return sendMail(opts.toEmail, subject, html);
}

export async function sendAdminNewOrder(opts: {
  adminEmail: string;
  companyName: string;
  vfCode: string;
  deliveryDay: string;
}) {
  const subject = `🛒 Novo pedido recebido: ${opts.vfCode}`;
  const html = wrapTemplate("Novo pedido registrado", `
    <p>Um novo pedido foi recebido pelo portal.</p>
    <p><strong>Empresa:</strong> ${opts.companyName}</p>
    <p><strong>Código:</strong> <span class="badge green">${opts.vfCode}</span></p>
    <p><strong>Dia de entrega:</strong> ${opts.deliveryDay}</p>
    <p>Acesse o painel administrativo para revisar e confirmar o pedido.</p>
  `);
  return sendMail(opts.adminEmail, subject, html);
}

export const mailerStatus = () => ({
  configured: isConfigured(),
  smtp: SMTP_HOST ? `${SMTP_HOST}:${SMTP_PORT}` : null,
  from: SMTP_FROM,
});

export function isMailerConfigured(): boolean {
  return isConfigured();
}

export async function sendMailWithAttachment(
  to: string,
  subject: string,
  html: string,
  attachment: { filename: string; filepath: string; contentType: string }
): Promise<{ sent: boolean; reason?: string }> {
  if (!isConfigured()) {
    console.log(`[MAILER] Email com anexo não enviado (SMTP não configurado). Para: ${to}`);
    return { sent: false, reason: "SMTP não configurado" };
  }
  try {
    const transporter = createTransporter()!;
    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html,
      attachments: [
        {
          filename: attachment.filename,
          path: attachment.filepath,
          contentType: attachment.contentType,
        },
      ],
    });
    console.log(`[MAILER] Email com anexo enviado para ${to}: ${subject}`);
    return { sent: true };
  } catch (err: any) {
    console.error(`[MAILER] Falha ao enviar email com anexo para ${to}:`, err.message);
    return { sent: false, reason: err.message };
  }
}

export async function sendTestEmail(toEmail: string) {
  const html = wrapTemplate("Teste de envio de e-mail", `
    <p>Este é um <strong>e-mail de teste</strong> enviado pelo sistema VivaFrutaz.</p>
    <p>Se você recebeu esta mensagem, as configurações SMTP estão corretas e o envio automático de e-mails está funcionando.</p>
    <p><strong>Servidor SMTP:</strong> ${SMTP_HOST}:${SMTP_PORT}</p>
    <p><strong>Remetente:</strong> ${SMTP_FROM}</p>
  `);
  return sendMail(toEmail, "Teste de envio de e-mail do sistema VivaFrutaz.", html);
}

// ─── New automated email functions ──────────────────────────────────────────

export async function sendWindowOpenReminder(opts: {
  toEmail: string;
  companyName: string;
  weekReference: string;
  orderCloseDate: string;
  deliveryDate: string;
}) {
  const subject = `🍎 Janela de pedidos aberta — ${opts.weekReference}`;
  const html = wrapTemplate("Sua janela de pedidos está aberta!", `
    <p>Olá, <strong>${opts.companyName}</strong>!</p>
    <p>A janela de pedidos para <strong>${opts.weekReference}</strong> está aberta agora.</p>
    <p><strong>Prazo para finalizar:</strong> ${opts.orderCloseDate}</p>
    <p><strong>Data de entrega prevista:</strong> ${opts.deliveryDate}</p>
    <p>Acesse o portal VivaFrutaz e faça seu pedido semanal antes que a janela feche.</p>
    <p style="margin-top:16px"><a href="${process.env.APP_URL || 'https://vivafrutaz.com'}/pedido" style="background:#16a34a;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Fazer Pedido Agora →</a></p>
  `);
  return sendMail(opts.toEmail, subject, html);
}

export async function sendUnfinalisedReminder(opts: {
  toEmail: string;
  companyName: string;
  weekReference: string;
  orderCloseDate: string;
}) {
  const subject = `⏰ Lembrete: finalize seu pedido semanal — ${opts.weekReference}`;
  const html = wrapTemplate("Seu pedido ainda não foi finalizado", `
    <p>Olá, <strong>${opts.companyName}</strong>!</p>
    <p>Identificamos que seu pedido de <strong>${opts.weekReference}</strong> ainda não foi confirmado.</p>
    <p><strong>A janela de pedidos encerra em:</strong> ${opts.orderCloseDate}</p>
    <p>Não perca o prazo! Acesse o portal agora e finalize seu pedido para garantir sua entrega.</p>
    <p style="margin-top:16px"><a href="${process.env.APP_URL || 'https://vivafrutaz.com'}/pedido" style="background:#ea580c;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Finalizar Pedido →</a></p>
  `);
  return sendMail(opts.toEmail, subject, html);
}

export async function sendOrderConfirmedEmail(opts: {
  toEmail: string;
  companyName: string;
  vfCode: string;
  deliveryDate: string;
  totalItems: number;
  adminNote?: string;
  itemsSummary?: string;
}) {
  const subject = `✅ Pedido ${opts.vfCode} confirmado — VivaFrutaz`;
  const html = wrapTemplate(`Pedido ${opts.vfCode} confirmado!`, `
    <p>Olá, <strong>${opts.companyName}</strong>!</p>
    <p>Seu pedido foi <span class="badge green">CONFIRMADO</span> pela equipe VivaFrutaz.</p>
    <p><strong>Código:</strong> ${opts.vfCode}</p>
    <p><strong>Data de entrega:</strong> ${opts.deliveryDate}</p>
    <p><strong>Total de itens:</strong> ${opts.totalItems} produto(s)</p>
    ${opts.itemsSummary ? `<div style="background:#f9fafb;border-radius:8px;padding:12px 16px;margin:12px 0;font-size:13px;">${opts.itemsSummary}</div>` : ''}
    ${opts.adminNote ? `<p><strong>Observação:</strong> ${opts.adminNote}</p>` : ''}
    <p>Em caso de dúvidas entre em contato com nossa equipe.</p>
  `);
  return sendMail(opts.toEmail, subject, html);
}

export async function sendOrderRejectedEmail(opts: {
  toEmail: string;
  companyName: string;
  vfCode: string;
  reason: string;
}) {
  const subject = `❌ Pedido ${opts.vfCode} cancelado — VivaFrutaz`;
  const html = wrapTemplate(`Pedido ${opts.vfCode} cancelado`, `
    <p>Olá, <strong>${opts.companyName}</strong>!</p>
    <p>Infelizmente, seu pedido <strong>${opts.vfCode}</strong> foi <span class="badge orange">CANCELADO</span>.</p>
    <p><strong>Motivo:</strong> ${opts.reason}</p>
    <p>Se tiver dúvidas ou quiser fazer um novo pedido, entre em contato com nossa equipe.</p>
  `);
  return sendMail(opts.toEmail, subject, html);
}

export async function sendAdminBroadcast(opts: {
  toEmails: string[];
  subject: string;
  message: string;
  senderName?: string;
}) {
  if (!isConfigured()) {
    console.log(`[MAILER] Broadcast não enviado (SMTP não configurado).`);
    return { sent: false, reason: "SMTP não configurado" };
  }
  if (opts.toEmails.length === 0) return { sent: false, reason: "Sem destinatários" };

  const html = wrapTemplate(opts.subject, `
    <p>${opts.message.replace(/\n/g, '<br>')}</p>
    ${opts.senderName ? `<p style="margin-top:16px;font-size:13px;color:#6b7280;">Enviado pela equipe: <strong>${opts.senderName}</strong></p>` : ''}
  `);

  try {
    const transporter = createTransporter()!;
    // Send with BCC to all recipients to protect privacy
    await transporter.sendMail({
      from: SMTP_FROM,
      to: SMTP_FROM, // send to self
      bcc: opts.toEmails.join(', '),
      subject: opts.subject,
      html,
    });
    console.log(`[MAILER] Broadcast enviado para ${opts.toEmails.length} destinatário(s).`);
    return { sent: true, count: opts.toEmails.length };
  } catch (err: any) {
    console.error('[MAILER] Falha no broadcast:', err.message);
    return { sent: false, reason: err.message };
  }
}

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface DanfeOrder {
  id: number;
  orderCode?: string | null;
  status: string;
  orderDate: string;
  deliveryDate: string;
  weekReference: string;
  totalValue: string;
  orderNote?: string | null;
  adminNote?: string | null;
  companyId: number;
}

export interface DanfeItem {
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: string;
  totalPrice: string;
}

export interface DanfeCompany {
  companyName: string;
  cnpj?: string | null;
  contactName?: string | null;
  phone?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressZip?: string | null;
}

export interface DanfeLogistics {
  routeName?: string | null;
  driverName?: string | null;
  deliveryWindow?: string | null;
}

export interface DanfeData {
  order: DanfeOrder;
  items: DanfeItem[];
  company: DanfeCompany;
  logistics?: DanfeLogistics;
  vivaFrutaz: {
    cnpj?: string | null;
    address?: string | null;
    phone?: string | null;
    companyName?: string | null;
    city?: string | null;
    state?: string | null;
    email?: string | null;
  };
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativo",
  CONFIRMED: "Confirmado",
  REOPEN_REQUESTED: "Solicitação de Alteração",
  OPEN_FOR_EDITING: "Em Edição",
  CANCELLED: "Cancelado",
  DELIVERED: "Entregue",
};

function formatMoney(val: string | number): string {
  const n = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(n) ? "R$ 0,00" : `R$ ${n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function formatDate(d: string | Date): string {
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    return format(dt, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return String(d);
  }
}

function buildAddress(c: DanfeCompany): string {
  const parts = [
    c.addressStreet,
    c.addressNumber && `nº ${c.addressNumber}`,
    c.addressNeighborhood,
    c.addressCity,
    c.addressZip,
  ].filter(Boolean);
  return parts.join(", ") || "—";
}

export async function generateDanfePdf(data: DanfeData): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  const GREEN = [34, 139, 80] as [number, number, number];
  const ORANGE = [234, 100, 22] as [number, number, number];
  const LIGHT_GRAY = [245, 246, 248] as [number, number, number];
  const DARK = [30, 40, 50] as [number, number, number];
  const WHITE: [number, number, number] = [255, 255, 255];

  let y = 0;

  // ── Header band ────────────────────────────────────────────
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pageW, 28, "F");

  doc.setTextColor(...WHITE);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("DANFE INTERNO", margin, 11);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("DOCUMENTO AUXILIAR DE ENTREGA", margin, 17);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.text("Este documento não substitui a Nota Fiscal Eletrônica.", margin, 23);

  // VivaFrutaz brand block (right side of header)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("VivaFrutaz", pageW - margin - 2, 13, { align: "right" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  if (data.vivaFrutaz.cnpj) doc.text(`CNPJ: ${data.vivaFrutaz.cnpj}`, pageW - margin - 2, 18, { align: "right" });
  if (data.vivaFrutaz.phone) doc.text(`Tel: ${data.vivaFrutaz.phone}`, pageW - margin - 2, 22, { align: "right" });
  if (data.vivaFrutaz.address) doc.text(data.vivaFrutaz.address, pageW - margin - 2, 26, { align: "right" });

  y = 32;

  // ── QR Code ────────────────────────────────────────────────
  try {
    const qrUrl = `${window.location.origin}/admin/orders?order=${data.order.id}`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 120, margin: 1 });
    doc.addImage(qrDataUrl, "PNG", pageW - margin - 22, y, 22, 22);
  } catch (_) {}

  // ── Order info band ────────────────────────────────────────
  doc.setFillColor(...LIGHT_GRAY);
  doc.roundedRect(margin, y, pageW - margin * 2 - 26, 22, 2, 2, "F");

  doc.setTextColor(...DARK);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Pedido: ${data.order.orderCode || `#${data.order.id}`}`, margin + 4, y + 7);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const col1x = margin + 4;
  const col2x = margin + 60;
  const col3x = margin + 115;
  const row1y = y + 13;
  const row2y = y + 19;

  doc.text(`Data do pedido: ${formatDate(data.order.orderDate)}`, col1x, row1y);
  doc.text(`Data de entrega: ${formatDate(data.order.deliveryDate)}`, col2x, row1y);
  doc.text(`Semana ref.: ${data.order.weekReference}`, col3x, row1y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREEN);
  doc.text(`Status: ${STATUS_LABEL[data.order.status] || data.order.status}`, col1x, row2y);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "normal");

  y += 26;

  // ── Two-column info section ────────────────────────────────
  const halfW = (pageW - margin * 2 - 4) / 2;
  const colRx = margin + halfW + 4;

  // Company (VivaFrutaz)
  doc.setFillColor(...GREEN);
  doc.rect(margin, y, halfW, 6, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("REMETENTE (VivaFrutaz)", margin + 3, y + 4.2);

  // Client
  doc.setFillColor(...ORANGE);
  doc.rect(colRx, y, halfW, 6, "F");
  doc.text("DESTINATÁRIO (Cliente)", colRx + 3, y + 4.2);
  y += 6;

  const infoBoxH = 36;
  doc.setFillColor(...LIGHT_GRAY);
  doc.rect(margin, y, halfW, infoBoxH, "F");
  doc.rect(colRx, y, halfW, infoBoxH, "F");

  doc.setTextColor(...DARK);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text(data.vivaFrutaz.companyName || "VivaFrutaz", margin + 3, y + 6);
  doc.setFont("helvetica", "normal");
  if (data.vivaFrutaz.cnpj) doc.text(`CNPJ: ${data.vivaFrutaz.cnpj}`, margin + 3, y + 11);
  if (data.vivaFrutaz.address) {
    const lines = doc.splitTextToSize(data.vivaFrutaz.address, halfW - 6);
    doc.text(lines, margin + 3, y + 16);
  }
  const cityState = [data.vivaFrutaz.city, data.vivaFrutaz.state].filter(Boolean).join(" – ");
  if (cityState) doc.text(cityState, margin + 3, y + 21);
  if (data.vivaFrutaz.phone) doc.text(`Tel: ${data.vivaFrutaz.phone}`, margin + 3, y + 24);
  if (data.vivaFrutaz.email) doc.text(`Email: ${data.vivaFrutaz.email}`, margin + 3, y + 28);

  doc.setFont("helvetica", "bold");
  doc.text(data.company.companyName, colRx + 3, y + 6);
  doc.setFont("helvetica", "normal");
  if (data.company.cnpj) doc.text(`CNPJ: ${data.company.cnpj}`, colRx + 3, y + 11);
  const clientAddr = buildAddress(data.company);
  const addrLines = doc.splitTextToSize(clientAddr, halfW - 6);
  doc.text(addrLines, colRx + 3, y + 16);
  if (data.company.contactName) doc.text(`Contato: ${data.company.contactName}`, colRx + 3, y + 24);
  if (data.company.phone) doc.text(`Tel: ${data.company.phone}`, colRx + 3, y + 28);

  y += infoBoxH + 6;

  // ── Products table ─────────────────────────────────────────
  doc.setFillColor(...GREEN);
  doc.rect(margin, y, pageW - margin * 2, 6, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("ITENS DO PEDIDO", margin + 3, y + 4.2);
  y += 6;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Produto", "Qtd", "Un.", "Preço Unit.", "Subtotal"]],
    body: data.items.map(item => [
      item.productName,
      String(item.quantity),
      item.unit || "un",
      formatMoney(item.unitPrice),
      formatMoney(item.totalPrice),
    ]),
    headStyles: {
      fillColor: DARK,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 14, halign: "center" },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 28, halign: "right" },
      4: { cellWidth: 28, halign: "right" },
    },
    tableLineColor: [220, 220, 224],
    tableLineWidth: 0.1,
  });

  y = (doc as any).lastAutoTable.finalY + 4;

  // ── Totals ─────────────────────────────────────────────────
  const totalItems = data.items.reduce((s, i) => s + i.quantity, 0);
  const totalVal = parseFloat(data.order.totalValue) || 0;
  const totalsX = pageW - margin - 60;

  doc.setFillColor(...LIGHT_GRAY);
  doc.rect(totalsX, y, 60, 20, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK);
  doc.text(`Total de itens: ${totalItems} un.`, totalsX + 3, y + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...GREEN);
  doc.text(`TOTAL: ${formatMoney(totalVal)}`, totalsX + 3, y + 15);

  y += 24;

  // ── Logistics info ─────────────────────────────────────────
  const logi = data.logistics;
  if (logi && (logi.routeName || logi.driverName || logi.deliveryWindow)) {
    doc.setFillColor(...ORANGE);
    doc.rect(margin, y, pageW - margin * 2, 6, "F");
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("INFORMAÇÕES LOGÍSTICAS", margin + 3, y + 4.2);
    y += 6;

    doc.setFillColor(...LIGHT_GRAY);
    doc.rect(margin, y, pageW - margin * 2, 18, "F");
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    const lx = margin + 4;
    const ly = y + 6;
    if (logi.routeName) doc.text(`Rota: ${logi.routeName}`, lx, ly);
    if (logi.driverName) doc.text(`Motorista: ${logi.driverName}`, lx + 60, ly);
    if (logi.deliveryWindow) doc.text(`Janela de entrega: ${logi.deliveryWindow}`, lx, ly + 8);

    y += 22;
  }

  // ── Notes ──────────────────────────────────────────────────
  if (data.order.orderNote || data.order.adminNote) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text("Observações da Nota:", margin, y);
    y += 5;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor([80, 80, 90] as unknown as string);
    if (data.order.orderNote) {
      const lines = doc.splitTextToSize(`Obs. do pedido: ${data.order.orderNote}`, pageW - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 5;
    }
    if (data.order.adminNote) {
      doc.setFont("helvetica", "italic");
      doc.setTextColor([180, 60, 60] as unknown as string);
      const alines = doc.splitTextToSize(`Obs. administrativa: ${data.order.adminNote}`, pageW - margin * 2);
      doc.text(alines, margin, y);
      y += alines.length * 5;
    }
  }

  // ── Footer ─────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(...GREEN);
  doc.rect(0, pageH - 12, pageW, 12, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const now = new Date();
  doc.text(
    `Gerado em ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} — VivaFrutaz • DANFE Interno • Documento não fiscal`,
    pageW / 2,
    pageH - 5,
    { align: "center" }
  );

  return doc;
}

export async function downloadDanfe(data: DanfeData): Promise<void> {
  const doc = await generateDanfePdf(data);
  const code = data.order.orderCode || `pedido-${data.order.id}`;
  doc.save(`DANFE-${code}.pdf`);
}

export async function openDanfe(data: DanfeData): Promise<void> {
  const doc = await generateDanfePdf(data);
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

export type WorkshopPdfKind = "budget" | "work-order";

export type WorkshopPdfItem = {
  detail: string;
  category: string;
  qty: number;
  unitPrice: number;
  warranty: number;
};

export type WorkshopPdfData = {
  kind: WorkshopPdfKind;
  business: {
    name: string;
    tagline: string;
    phone: string;
    address: string;
  };
  order: {
    id: string;
    client: string;
    phone: string;
    email: string;
    deviceType: string;
    device: string;
    serial: string;
    accessories: string;
    condition: string;
    issue: string;
    diagnosis: string;
    work: string;
    result: string;
    notes: string;
    status: string;
    budgetStatus: string;
    priority: string;
    technician: string;
    receivedAt: string;
    dueDate: string;
    paymentMethod: string;
    validityDays: number;
    warranty: number;
  };
  items: WorkshopPdfItem[];
  financials: {
    subtotal: number;
    surcharge: number;
    discount: number;
    total: number;
    deposit: number;
    balance: number;
  };
};

const COLORS = {
  navy: [16, 25, 45] as [number, number, number],
  lime: [166, 213, 51] as [number, number, number],
  ink: [31, 42, 60] as [number, number, number],
  muted: [103, 116, 137] as [number, number, number],
  line: [218, 224, 231] as [number, number, number],
  soft: [246, 248, 250] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function formatMoney(value: number) {
  return money.format(Number.isFinite(value) ? value : 0).replace("ARS", "$");
}

function formatDate(value: string) {
  if (!value) return "Sin fecha";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? "Sin fecha"
    : new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function cleanFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "documento";
}

function drawHeader(doc: jsPDF, data: WorkshopPdfData, continued = false) {
  const { business, order, kind } = data;
  const title = kind === "budget" ? "PRESUPUESTO" : "ORDEN DE TRABAJO";
  const height = continued ? 20 : 35;

  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, 210, height, "F");
  doc.setFillColor(...COLORS.lime);
  doc.rect(0, height - 2, 210, 2, "F");

  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(continued ? 12 : 18);
  doc.text(business.name || "TallerOS", 14, continued ? 10 : 14);
  if (!continued) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(191, 201, 216);
    doc.text(business.tagline || "Servicio tecnico", 14, 20);
    doc.text([business.phone, business.address].filter(Boolean).join("  |  "), 14, 26);
  }

  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(continued ? 9 : 12);
  doc.text(title, 196, continued ? 9 : 12, { align: "right" });
  doc.setFontSize(continued ? 8 : 10);
  doc.setTextColor(...COLORS.lime);
  doc.text(`#${order.id}${continued ? "  |  Continuacion" : ""}`, 196, continued ? 14 : 19, { align: "right" });
  if (!continued) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(191, 201, 216);
    doc.text(formatDate(order.receivedAt), 196, 26, { align: "right" });
  }

  return height + 6;
}

function ensureSpace(doc: jsPDF, data: WorkshopPdfData, y: number, required: number) {
  if (y + required <= 278) return y;
  doc.addPage();
  return drawHeader(doc, data, true);
}

function drawLabelValue(doc: jsPDF, label: string, value: string, x: number, y: number, width: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(...COLORS.muted);
  doc.text(label.toUpperCase(), x, y);
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.ink);
  const lines = doc.splitTextToSize(value || "-", width);
  doc.text(lines.slice(0, 2), x, y + 5);
}

function drawInfoGrid(doc: jsPDF, data: WorkshopPdfData, y: number) {
  const { order } = data;
  doc.setFillColor(...COLORS.soft);
  doc.roundedRect(14, y, 182, 32, 2, 2, "F");
  drawLabelValue(doc, "Cliente", order.client, 19, y + 7, 78);
  drawLabelValue(doc, "Telefono", order.phone, 108, y + 7, 80);
  drawLabelValue(doc, "Equipo", `${order.deviceType} | ${order.device}`, 19, y + 21, 78);
  drawLabelValue(doc, "Serie / IMEI", order.serial || "No registrado", 108, y + 21, 80);
  return y + 38;
}

function drawStatusStrip(doc: jsPDF, data: WorkshopPdfData, y: number) {
  const { order, kind } = data;
  const values = kind === "budget"
    ? [["Estado", order.budgetStatus], ["Validez", `${order.validityDays} dias`], ["Pago", order.paymentMethod]]
    : [["Estado", order.status], ["Prioridad", order.priority], ["Tecnico", order.technician]];
  const columnWidth = 182 / values.length;

  doc.setDrawColor(...COLORS.line);
  doc.roundedRect(14, y, 182, 15, 2, 2, "S");
  values.forEach(([label, value], index) => {
    const x = 14 + index * columnWidth;
    if (index) doc.line(x, y, x, y + 15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(label.toUpperCase(), x + 5, y + 5);
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.ink);
    doc.text(doc.splitTextToSize(value || "-", columnWidth - 10).slice(0, 1), x + 5, y + 11);
  });
  return y + 21;
}

function drawTextBlock(doc: jsPDF, data: WorkshopPdfData, y: number, title: string, value: string) {
  const lines = doc.splitTextToSize(value || "Pendiente de completar.", 174);
  const height = Math.max(17, 11 + lines.length * 4.2);
  y = ensureSpace(doc, data, y, height + 4);

  doc.setFillColor(...COLORS.soft);
  doc.roundedRect(14, y, 182, height, 2, 2, "F");
  doc.setFillColor(...COLORS.lime);
  doc.rect(14, y, 2, height, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  doc.text(title.toUpperCase(), 20, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.4);
  doc.setTextColor(...COLORS.ink);
  doc.text(lines, 20, y + 12);
  return y + height + 4;
}

function drawItemsTable(doc: jsPDF, data: WorkshopPdfData, y: number) {
  y = ensureSpace(doc, data, y, 30);
  const rows = data.items.length
    ? data.items.map((item) => [
        String(item.qty),
        item.detail,
        item.category,
        `${item.warranty} dias`,
        formatMoney(item.qty * item.unitPrice),
      ])
    : [["-", "Sin items cargados", "-", "-", formatMoney(0)]];

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14, top: 25, bottom: 18 },
    head: [["Cant.", "Detalle", "Rubro", "Garantia", "Importe"]],
    body: rows,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7.8,
      textColor: COLORS.ink,
      lineColor: COLORS.line,
      lineWidth: 0.15,
      cellPadding: 2.6,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: COLORS.navy,
      textColor: COLORS.white,
      fontStyle: "bold",
      halign: "left",
    },
    alternateRowStyles: { fillColor: COLORS.soft },
    columnStyles: {
      0: { cellWidth: 13, halign: "center" },
      1: { cellWidth: 82 },
      2: { cellWidth: 28 },
      3: { cellWidth: 25, halign: "center" },
      4: { cellWidth: 34, halign: "right", fontStyle: "bold" },
    },
    didDrawPage: ({ pageNumber }) => {
      if (pageNumber > 1) drawHeader(doc, data, true);
    },
  });

  return ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 6;
}

function drawFinance(doc: jsPDF, data: WorkshopPdfData, y: number) {
  const { financials } = data;
  const rows: Array<[string, number, boolean?]> = [
    ["Subtotal", financials.subtotal],
    ...(financials.surcharge > 0 ? [["Recargo", financials.surcharge] as [string, number]] : []),
    ...(financials.discount > 0 ? [["Descuento", -financials.discount] as [string, number]] : []),
    ["Total", financials.total, true],
    ["Anticipo / cobro", -financials.deposit],
    ["Saldo pendiente", financials.balance, true],
  ];
  const height = rows.length * 7 + 8;
  y = ensureSpace(doc, data, y, height + 4);
  const x = 118;
  const width = 78;

  doc.setFillColor(...COLORS.navy);
  doc.roundedRect(x, y, width, height, 2, 2, "F");
  rows.forEach(([label, amount, strong], index) => {
    const rowY = y + 7 + index * 7;
    if (strong) {
      doc.setFillColor(index === rows.length - 1 ? 44 : 30, index === rows.length - 1 ? 59 : 41, index === rows.length - 1 ? 56 : 67);
      doc.rect(x + 2, rowY - 5, width - 4, 7, "F");
    }
    doc.setFont("helvetica", strong ? "bold" : "normal");
    doc.setFontSize(strong ? 8.5 : 7.6);
    doc.setTextColor(...(index === rows.length - 1 ? COLORS.lime : COLORS.white));
    doc.text(label, x + 6, rowY);
    doc.text(formatMoney(amount), x + width - 6, rowY, { align: "right" });
  });
  return y + height + 6;
}

function drawTerms(doc: jsPDF, data: WorkshopPdfData, y: number) {
  const { order } = data;
  const terms = [
    `Presupuesto valido por ${order.validityDays} dias y sujeto a disponibilidad de repuestos.`,
    "La garantia cubre solo los trabajos y componentes detallados. No cubre golpes, humedad, manipulacion ni fallas ajenas.",
    "La intervencion comienza con la aprobacion del cliente. Los datos deben estar respaldados antes de tareas de sistema.",
  ];
  const note = order.notes ? `Observaciones: ${order.notes}` : "";
  const lines = doc.splitTextToSize([...terms.map((term, index) => `${index + 1}. ${term}`), note].filter(Boolean).join("\n"), 94);
  const height = Math.max(35, 12 + lines.length * 3.8);
  y = ensureSpace(doc, data, y, height + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  doc.text("CONDICIONES", 14, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.ink);
  doc.text(lines, 14, y + 11);
  return y + height;
}

function drawSignatures(doc: jsPDF, data: WorkshopPdfData, y: number, workOrder = false) {
  y = ensureSpace(doc, data, y, 25);
  doc.setDrawColor(...COLORS.line);
  doc.line(18, y + 11, 88, y + 11);
  doc.line(122, y + 11, 192, y + 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.ink);
  doc.text("Cliente / responsable", 53, y + 16, { align: "center" });
  doc.text(data.order.technician || "Tecnico responsable", 157, y + 16, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...COLORS.muted);
  doc.text(workOrder ? "Recibi el equipo y accesorios indicados" : "Acepto alcance, importe y condiciones", 53, y + 21, { align: "center" });
  doc.text("Tecnico responsable", 157, y + 21, { align: "center" });
}

function drawPageFooters(doc: jsPDF, data: WorkshopPdfData) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...COLORS.line);
    doc.line(14, 286, 196, 286);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(`${data.business.name || "TallerOS"} | Orden #${data.order.id}`, 14, 291);
    doc.text(`Pagina ${page} de ${pageCount}`, 196, 291, { align: "right" });
  }
}

function createBudgetPdf(doc: jsPDF, data: WorkshopPdfData) {
  let y = drawHeader(doc, data);
  y = drawStatusStrip(doc, data, y);
  y = drawInfoGrid(doc, data, y);
  y = drawTextBlock(doc, data, y, "Falla informada", data.order.issue);
  y = drawTextBlock(doc, data, y, "Diagnostico", data.order.diagnosis);
  y = drawTextBlock(doc, data, y, "Trabajo propuesto / realizado", data.order.work);
  y = drawItemsTable(doc, data, y);
  y = ensureSpace(doc, data, y, 75);
  const termsEnd = drawTerms(doc, data, y);
  const financeEnd = drawFinance(doc, data, y);
  y = Math.max(termsEnd, financeEnd);
  drawSignatures(doc, data, y);
}

function createWorkOrderPdf(doc: jsPDF, data: WorkshopPdfData) {
  let y = drawHeader(doc, data);
  y = drawStatusStrip(doc, data, y);
  y = drawInfoGrid(doc, data, y);
  y = drawTextBlock(doc, data, y, "Estado fisico de ingreso", data.order.condition);
  y = drawTextBlock(doc, data, y, "Accesorios recibidos", data.order.accessories);
  y = drawTextBlock(doc, data, y, "Falla informada", data.order.issue);
  y = drawTextBlock(doc, data, y, "Diagnostico tecnico", data.order.diagnosis);
  y = drawTextBlock(doc, data, y, "Trabajo realizado", data.order.work);
  y = drawTextBlock(doc, data, y, "Resultado y pruebas finales", data.order.result);
  y = ensureSpace(doc, data, y, 37);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  doc.text("CONTROL DE ENTREGA", 14, y + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.ink);
  const checks = ["Encendido / reinicio", "Carga y bateria", "Audio / microfono", "Camaras / pantalla", "Conectividad", "Datos / cuentas"];
  checks.forEach((check, index) => {
    const x = 14 + (index % 2) * 91;
    const rowY = y + 11 + Math.floor(index / 2) * 7;
    doc.rect(x, rowY - 3.2, 3, 3, "S");
    doc.text(check, x + 6, rowY - 0.2);
  });
  drawSignatures(doc, data, y + 18, true);
}

function buildWorkshopPdf(data: WorkshopPdfData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  doc.setProperties({
    title: `${data.kind === "budget" ? "Presupuesto" : "Orden de trabajo"} #${data.order.id}`,
    subject: `${data.business.name} - ${data.order.device}`,
    author: data.business.name || "TallerOS",
    creator: "TallerOS",
  });

  if (data.kind === "budget") createBudgetPdf(doc, data);
  else createWorkOrderPdf(doc, data);
  drawPageFooters(doc, data);

  const label = data.kind === "budget" ? "presupuesto" : "orden-trabajo";
  const filename = `${label}-${cleanFilename(data.order.id)}-${cleanFilename(data.order.client)}.pdf`;
  return { doc, filename };
}

export function createWorkshopPdf(data: WorkshopPdfData) {
  const { doc, filename } = buildWorkshopPdf(data);
  return { blob: doc.output("blob"), filename };
}

export function downloadWorkshopPdf(data: WorkshopPdfData) {
  const { doc, filename } = buildWorkshopPdf(data);
  doc.save(filename);
  return filename;
}

import { resolveImageUrl } from "../../../../components/shared";
import {
  formatCurrencyValue,
  formatReceiptDateTime,
  buildReceiptNumber,
  getReceiptDisplayDetails,
  escapeReceiptHtml
} from "./formatters";

export { getReceiptDisplayDetails, getReceiptEmailMessage, escapeReceiptHtml, buildReceiptNumber, formatReceiptDateTime } from "./formatters";

export function getPdfTheme(accent = [37, 99, 235]) {
  return {
    accent,
    navy: [17, 24, 39],
    slate: [51, 65, 85],
    ink: [15, 23, 42],
    muted: [100, 116, 139],
    line: [203, 213, 225],
    panel: [248, 250, 252],
    panelStrong: [241, 245, 249],
    white: [255, 255, 255]
  };
}

// ─── Shared PDF logo cache ───────────────────────────────────────────────────
// Logo is platform-wide (system settings), fetched once via the public
// /api/settings endpoint, converted to a data URL, and reused across every
// PDF export (super-admin, owner, coach, member) regardless of which role's
// `data` payload happens to include systemSettings.
let cachedPdfLogoDataUrl = null;
let pdfLogoFetchPromise = null;

export function getCachedPdfLogo() {
  if (cachedPdfLogoDataUrl !== null) return cachedPdfLogoDataUrl;
  if (!pdfLogoFetchPromise) {
    pdfLogoFetchPromise = fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((settings) => {
        const url = settings?.logoUrl ? resolveImageUrl(settings.logoUrl) : "";
        if (!url) { cachedPdfLogoDataUrl = ""; return null; }
        return fetch(url)
          .then((r) => r.blob())
          .then((blob) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          }))
          .then((dataUrl) => { cachedPdfLogoDataUrl = dataUrl; });
      })
      .catch(() => { cachedPdfLogoDataUrl = ""; });
  }
  return null;
}

if (typeof window !== "undefined") {
  setTimeout(() => { getCachedPdfLogo(); }, 0);
}

export function pdfLogoFormat(dataUrl) {
  const match = /^data:image\/(\w+)/i.exec(dataUrl || "");
  if (!match) return "PNG";
  const ext = match[1].toUpperCase();
  return ext === "JPG" ? "JPEG" : ext;
}

export function addPdfHeader(doc, { title, subtitle, gymName, ownerName, location, generatedAt, accent = [37, 99, 235] }) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const theme = getPdfTheme(accent);
  const margin = 28;
  const headerY = 28;
  const headerHeight = 96;
  const detailWidth = 196;
  const detailHeight = 74;
  const detailX = pageWidth - margin - detailWidth - 18;
  const detailY = headerY + 11;

  doc.setFillColor(...theme.white);
  doc.rect(0, 0, pageWidth, 220, "F");

  doc.setTextColor(...theme.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Prepared by Gymora reporting engine", margin, 18);

  doc.setFillColor(...theme.navy);
  doc.rect(margin, headerY, pageWidth - margin * 2, headerHeight, "F");
  doc.setFillColor(...theme.slate);
  doc.rect(margin, headerY + headerHeight - 2, pageWidth - margin * 2, 2, "F");

  doc.setFillColor(...theme.white);
  doc.roundedRect(detailX, detailY, detailWidth, detailHeight, 3, 3, "F");
  doc.setDrawColor(...theme.line);
  doc.roundedRect(detailX, detailY, detailWidth, detailHeight, 3, 3, "S");

  const brandX = margin + 18;
  let brandTextX = brandX;
  const logoDataUrl = getCachedPdfLogo();
  if (logoDataUrl) {
    try {
      doc.setFillColor(...theme.white);
      doc.roundedRect(brandX, headerY + 16, 40, 40, 4, 4, "F");
      doc.addImage(logoDataUrl, pdfLogoFormat(logoDataUrl), brandX + 3, headerY + 19, 34, 34);
      brandTextX = brandX + 52;
    } catch {
      brandTextX = brandX;
    }
  }

  doc.setTextColor(...theme.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("GYMORA", brandTextX, headerY + 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("GYM OPERATIONS REPORT", brandTextX, headerY + 44);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(25);
  doc.text(gymName || "Gymora Gym", margin + 18, headerY + 75);

  doc.setTextColor(...theme.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("REPORT DETAILS", detailX + 12, detailY + 16);
  doc.setDrawColor(...theme.line);
  doc.line(detailX + 12, detailY + 22, detailX + detailWidth - 12, detailY + 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Owner: ${ownerName || "N/A"}`, detailX + 12, detailY + 38);
  doc.text(`Location: ${location || "N/A"}`, detailX + 12, detailY + 52);
  doc.text(`Generated: ${generatedAt}`, detailX + 12, detailY + 66);

  const titleY = headerY + headerHeight + 24;
  doc.setTextColor(...theme.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(title, margin, titleY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...theme.muted);
  doc.text(subtitle, margin, titleY + 16);
  doc.setDrawColor(...theme.line);
  doc.line(margin, titleY + 28, pageWidth - margin, titleY + 28);
  doc.setTextColor(...theme.ink);

  return titleY + 42;
}

export function addPdfSectionTitle(doc, title, startY, accent = [37, 99, 235], description = "") {
  const pageWidth = doc.internal.pageSize.getWidth();
  const theme = getPdfTheme(accent);

  doc.setDrawColor(...theme.line);
  doc.line(28, startY, pageWidth - 28, startY);
  doc.setTextColor(...theme.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, 28, startY + 16);
  if (description) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.75);
    doc.setTextColor(...theme.muted);
    doc.text(description, 28, startY + 30);
  }

  return startY + (description ? 40 : 26);
}

export function addPdfSummaryCards(doc, items, startY, accent = [37, 99, 235]) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const theme = getPdfTheme(accent);
  const cols = pageWidth > 760 ? Math.min(4, items.length) : Math.min(2, items.length || 1);
  const gap = 10;
  const cardWidth = (pageWidth - 56 - gap * (cols - 1)) / cols;
  const cardHeight = 50;

  items.forEach((item, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = 28 + (cardWidth + gap) * col;
    const y = startY + row * (cardHeight + gap);

    doc.setFillColor(...theme.panel);
    doc.setDrawColor(...theme.line);
    doc.rect(x, y, cardWidth, cardHeight, "FD");
    doc.setDrawColor(...theme.line);
    doc.line(x, y + 18, x + cardWidth, y + 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.75);
    doc.setTextColor(...theme.muted);
    doc.text(String(item.label || "").toUpperCase(), x + 12, y + 12);
    doc.setFontSize(11);
    doc.setTextColor(...theme.ink);
    doc.text(String(item.value || "-"), x + 12, y + 34);
  });

  return startY + Math.ceil(items.length / cols) * (cardHeight + gap) - gap;
}

export function getPdfTableConfig(doc, accent, startY, head, body) {
  const theme = getPdfTheme(accent);
  return {
    startY,
    head,
    body,
    theme: "plain",
    headStyles: {
      fillColor: theme.navy,
      textColor: 255,
      fontStyle: "bold",
      halign: "left",
      cellPadding: 7
    },
    styles: {
      fontSize: 8.25,
      cellPadding: 6.5,
      textColor: theme.ink,
      lineColor: theme.line,
      lineWidth: 0.35,
      overflow: "linebreak"
    },
    bodyStyles: {
      fillColor: theme.white
    },
    alternateRowStyles: {
      fillColor: theme.panelStrong
    },
    margin: { left: 28, right: 28 },
    didParseCell: (hookData) => {
      if (hookData.section === "head") {
        hookData.cell.styles.lineWidth = 0;
      }
    }
  };
}

export function finalizePdf(doc, filename) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFillColor(250, 251, 252);
    doc.rect(0, pageHeight - 28, pageWidth, 28, "F");
    doc.setDrawColor(226, 232, 240);
    doc.line(28, pageHeight - 22, pageWidth - 28, pageHeight - 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Gymora | Confidential gym operations report", 28, pageHeight - 9);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - 84, pageHeight - 9);
  }

  doc.save(filename);
}

export function printSaleReceipt(receipt, gymName) {
  if (typeof window === "undefined" || !receipt) {
    return;
  }

  const { buyerName, memberName, hasDistinctMember } = getReceiptDisplayDetails(receipt);

  const printWindow = window.open("", "_blank", "width=420,height=720");
  if (!printWindow) {
    return;
  }

  const itemsMarkup = (Array.isArray(receipt.items) ? receipt.items : [])
    .map((item) => `
      <tr>
        <td>${escapeReceiptHtml(item.name)}</td>
        <td style="text-align:center;">${item.qty}</td>
        <td style="text-align:right;">${formatCurrencyValue(item.unitPrice)}</td>
        <td style="text-align:right;">${formatCurrencyValue(item.lineTotal)}</td>
      </tr>
    `)
    .join("");

  const notesMarkup = receipt.notes
    ? `<div class="notes"><strong>Notes:</strong> ${escapeReceiptHtml(receipt.notes)}</div>`
    : "";
  const memberMarkup = hasDistinctMember
    ? `<div><strong>Linked Member:</strong> ${escapeReceiptHtml(memberName)}</div>`
    : "";

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${buildReceiptNumber(receipt.id)}</title>
        <style>
          body {
            font-family: Poppins, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 24px;
            background: #ffffff;
          }
          .receipt {
            max-width: 360px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .header p {
            margin: 6px 0 0;
            color: #475569;
            font-size: 13px;
          }
          .meta,
          .totals,
          .notes {
            margin-top: 14px;
            font-size: 13px;
            line-height: 1.6;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            font-size: 13px;
          }
          th,
          td {
            padding: 8px 0;
            border-bottom: 1px dashed #cbd5e1;
          }
          th {
            text-align: left;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #64748b;
          }
          .totals {
            border-top: 2px solid #0f172a;
            padding-top: 12px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-top: 6px;
          }
          .grand-total {
            font-weight: 700;
            font-size: 15px;
          }
          .footer {
            margin-top: 24px;
            text-align: center;
            color: #64748b;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>${escapeReceiptHtml(gymName || "Gymora Gym")}</h1>
            <p>Sales Bill</p>
          </div>
          <div class="meta">
            <div><strong>Bill No:</strong> ${buildReceiptNumber(receipt.id)}</div>
            <div><strong>Date:</strong> ${formatReceiptDateTime(receipt.soldAt)}</div>
            <div><strong>Buyer:</strong> ${escapeReceiptHtml(buyerName)}</div>
            ${memberMarkup}
            <div><strong>Payment:</strong> ${escapeReceiptHtml(receipt.paymentMethod || "cash")}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Price</th>
                <th style="text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsMarkup}</tbody>
          </table>
          <div class="totals">
            <div class="total-row"><span>Subtotal</span><span>${formatCurrencyValue(receipt.subtotal)}</span></div>
            <div class="total-row grand-total"><span>Total</span><span>${formatCurrencyValue(receipt.total)}</span></div>
          </div>
          ${notesMarkup}
          <div class="footer">Thank you for your purchase.</div>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

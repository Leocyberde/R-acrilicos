import PDFDocument from 'pdfkit';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(value) {
  return `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return String(d); }
}

async function fetchLogoBuffer(logoUrl) {
  if (!logoUrl) return null;
  try {
    if (logoUrl.startsWith('data:')) {
      const base64Data = logoUrl.split(',')[1];
      return base64Data ? Buffer.from(base64Data, 'base64') : null;
    }
    const url = logoUrl.startsWith('http') ? logoUrl : `http://localhost:3001${logoUrl}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch { return null; }
}

// ── Color palette matching the panel ─────────────────────────────────────────
const C = {
  slate900: '#0f172a',
  slate800: '#1e293b',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748b',
  slate400: '#94a3b8',
  slate300: '#cbd5e1',
  slate200: '#e2e8f0',
  slate50:  '#f8fafc',
  red600:   '#dc2626',
  white:    '#ffffff',
};

// ── Line drawing helper ───────────────────────────────────────────────────────
function hLine(doc, x, y, width, color, thickness = 0.5) {
  doc.save()
    .strokeColor(color)
    .lineWidth(thickness)
    .moveTo(x, y)
    .lineTo(x + width, y)
    .stroke()
    .restore();
}

// ── Budget PDF — same layout as the panel ───────────────────────────────────
export async function generateBudgetPDF(budget, company = {}) {
  const logoBuffer = await fetchLogoBuffer(company.company_logo);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const ML = 40;               // margin left
    const MR = 40;               // margin right
    const PW = doc.page.width - ML - MR;   // printable width
    const companyName = company.company_name || '';

    let y = 40;

    // ── COMPANY HEADER ───────────────────────────────────────────────────────
    // Left: logo / company name + contact info
    // Right: "Orçamento" + dates

    const headerStartY = y;
    const leftW = PW * 0.55;
    const rightW = PW * 0.42;
    const rightX = ML + PW - rightW;

    // Logo
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, ML, y, { fit: [leftW, 90], align: 'left' });
        y += 96;
      } catch {
        doc.fillColor(C.slate900).font('Helvetica-Bold').fontSize(16)
          .text(companyName, ML, y, { width: leftW });
        y += 22;
      }
    } else {
      doc.fillColor(C.slate900).font('Helvetica-Bold').fontSize(16)
        .text(companyName, ML, y, { width: leftW });
      y += 22;
    }

    // Contact info below logo/name
    const contactY = logoBuffer ? headerStartY + 96 : y;
    let cy = contactY;
    if (companyName && logoBuffer) {
      doc.fillColor(C.slate600).font('Helvetica-Bold').fontSize(8).text(companyName, ML, cy, { width: leftW });
      cy += 11;
    }
    if (company.company_phone) {
      doc.fillColor(C.slate700).font('Helvetica').fontSize(8).text(company.company_phone, ML, cy, { width: leftW });
      cy += 11;
    }
    if (company.company_email) {
      doc.fillColor(C.slate700).font('Helvetica').fontSize(8).text(company.company_email, ML, cy, { width: leftW });
      cy += 11;
    }
    if (company.company_email2) {
      doc.fillColor(C.slate700).font('Helvetica').fontSize(8).text(company.company_email2, ML, cy, { width: leftW });
      cy += 11;
    }
    if (company.company_address) {
      doc.fillColor(C.slate700).font('Helvetica').fontSize(8).text(company.company_address, ML, cy, { width: leftW });
      cy += 11;
    }

    // Right side: "Orçamento" + dates
    const emissionDate = budget.emission_date
      ? fmtDate(budget.emission_date)
      : fmtDate(budget.created_date);

    doc.fillColor(C.slate900).font('Helvetica-Bold').fontSize(26)
      .text('Orçamento', rightX, headerStartY, { width: rightW, align: 'right' });
    doc.fillColor(C.slate600).font('Helvetica').fontSize(9)
      .text(`Data: ${emissionDate}`, rightX, headerStartY + 32, { width: rightW, align: 'right' });
    if (budget.validity_date) {
      doc.fillColor(C.slate500).font('Helvetica').fontSize(8)
        .text(`Válido até: ${fmtDate(budget.validity_date)}`, rightX, headerStartY + 44, { width: rightW, align: 'right' });
    }

    // Number below "Orçamento"
    doc.fillColor(C.slate700).font('Helvetica').fontSize(8)
      .text(`Nº ${budget.id}`, rightX, headerStartY + 57, { width: rightW, align: 'right' });

    y = Math.max(cy, headerStartY + 70) + 10;

    // Header border (border-b-2 border-slate-800)
    hLine(doc, ML, y, PW, C.slate800, 2);
    y += 12;

    // ── JOB / PRODUTOR / EMPRESA ─────────────────────────────────────────────
    const labelW = 72;
    const valW = PW - labelW;

    if (budget.job) {
      doc.fillColor(C.slate800).font('Helvetica-Bold').fontSize(9).text('JOB:', ML, y, { width: labelW, continued: false });
      doc.fillColor(C.slate900).font('Helvetica-Bold').fontSize(9).text(budget.job, ML + labelW, y, { width: valW });
      y += 14;
    }
    if (budget.producer) {
      doc.fillColor(C.slate700).font('Helvetica-Bold').fontSize(9).text('Produtor:', ML, y, { width: labelW, continued: false });
      doc.fillColor(C.slate900).font('Helvetica-Bold').fontSize(9).text(budget.producer, ML + labelW, y, { width: valW });
      y += 14;
    }
    if (budget.client_name) {
      doc.fillColor(C.slate700).font('Helvetica-Bold').fontSize(9).text('Empresa:', ML, y, { width: labelW, continued: false });
      doc.fillColor(C.slate900).font('Helvetica-Bold').fontSize(9).text(budget.client_name, ML + labelW, y, { width: valW });
      y += 14;
    }
    if (budget.client_phone) {
      doc.fillColor(C.slate700).font('Helvetica').fontSize(8).text('Telefone:', ML, y, { width: labelW, continued: false });
      doc.fillColor(C.slate800).font('Helvetica').fontSize(8).text(budget.client_phone, ML + labelW, y, { width: valW });
      y += 12;
    }
    if (budget.client_email) {
      doc.fillColor(C.slate700).font('Helvetica').fontSize(8).text('E-mail:', ML, y, { width: labelW, continued: false });
      doc.fillColor(C.slate800).font('Helvetica').fontSize(8).text(budget.client_email, ML + labelW, y, { width: valW });
      y += 12;
    }

    // Section border (border-b border-slate-300)
    y += 4;
    hLine(doc, ML, y, PW, C.slate300, 0.5);
    y += 10;

    // ── DESCRIPTION ──────────────────────────────────────────────────────────
    if (budget.description) {
      doc.fillColor(C.slate600).font('Helvetica-Oblique').fontSize(9)
        .text(budget.description, ML, y, { width: PW });
      y += doc.heightOfString(budget.description, { width: PW, font: 'Helvetica-Oblique', size: 9 }) + 10;
    }

    // ── ITEMS TABLE ───────────────────────────────────────────────────────────
    const items = Array.isArray(budget.items) ? budget.items : [];
    if (items.length > 0) {
      const COL = {
        item:  { x: ML,         w: PW * 0.50 },
        qty:   { x: ML + PW * 0.50, w: PW * 0.12 },
        unit:  { x: ML + PW * 0.62, w: PW * 0.19 },
        total: { x: ML + PW * 0.81, w: PW * 0.19 },
      };

      // Table header
      doc.fillColor(C.slate800).font('Helvetica-Bold').fontSize(9)
        .text('Item', COL.item.x, y, { width: COL.item.w })
        .text('Qtd', COL.qty.x, y, { width: COL.qty.w, align: 'center' })
        .text('Preço Unit.', COL.unit.x, y, { width: COL.unit.w, align: 'right' })
        .text('Subtotal', COL.total.x, y, { width: COL.total.w, align: 'right' });
      y += 13;
      hLine(doc, ML, y, PW, C.slate800, 1.5);
      y += 6;

      // Table rows
      items.forEach((item, i) => {
        const qty = Number(item.quantity || 1);
        const unitPrice = Number(item.unit_price || item.price || 0);
        const lineTotal = Number(item.total || item.line_total || qty * unitPrice || 0);

        const rowText = item.name || item.description || '-';
        const rowH = Math.max(doc.heightOfString(rowText, { width: COL.item.w - 4, size: 9 }), 14);

        doc.fillColor(C.slate800).font('Helvetica').fontSize(9)
          .text(rowText, COL.item.x, y, { width: COL.item.w - 4 });
        doc.fillColor(C.slate700).font('Helvetica').fontSize(9)
          .text(String(qty), COL.qty.x, y, { width: COL.qty.w, align: 'center' })
          .text(fmtCurrency(unitPrice), COL.unit.x, y, { width: COL.unit.w, align: 'right' })
          .text(fmtCurrency(lineTotal), COL.total.x, y, { width: COL.total.w, align: 'right' });

        y += rowH + 4;
        hLine(doc, ML, y, PW, C.slate200, 0.5);
        y += 5;
      });

      y += 6;
    }

    // ── TOTALS ────────────────────────────────────────────────────────────────
    const totalsX = ML + PW - 200;
    const totalsW = 200;

    const subtotal = Number(budget.subtotal || 0);
    const discount = Number(budget.discount || 0);
    const total = Number(budget.total || 0);
    const totalWithMargin = Number(budget.total_with_margin || 0);

    if (discount > 0 && subtotal > 0) {
      doc.fillColor(C.red600).font('Helvetica').fontSize(9)
        .text(`Desconto (${discount}%):`, totalsX, y, { width: totalsW / 2 });
      doc.fillColor(C.red600).font('Helvetica').fontSize(9)
        .text(`- ${fmtCurrency(subtotal * discount / 100)}`, totalsX + totalsW / 2, y, { width: totalsW / 2, align: 'right' });
      y += 13;
    }

    // border-t-2 border-slate-800
    hLine(doc, totalsX, y, totalsW, C.slate800, 1.5);
    y += 6;

    const totalLabel = budget.total_label || 'Sem Nota Total';
    doc.fillColor(C.slate800).font('Helvetica-Bold').fontSize(9)
      .text(totalLabel, totalsX, y, { width: totalsW / 2 });
    doc.fillColor(C.slate900).font('Helvetica-Bold').fontSize(9)
      .text(fmtCurrency(total), totalsX + totalsW / 2, y, { width: totalsW / 2, align: 'right' });
    y += 14;

    if (totalWithMargin > 0) {
      hLine(doc, totalsX, y, totalsW, C.slate400, 0.5);
      y += 6;
      const marginLabel = budget.total_with_margin_label || 'Com Nota Total';
      doc.fillColor(C.slate800).font('Helvetica-Bold').fontSize(9)
        .text(marginLabel, totalsX, y, { width: totalsW / 2 });
      doc.fillColor(C.slate900).font('Helvetica-Bold').fontSize(9)
        .text(fmtCurrency(totalWithMargin), totalsX + totalsW / 2, y, { width: totalsW / 2, align: 'right' });
      y += 14;
    }

    if (budget.producer) {
      doc.fillColor(C.slate500).font('Helvetica-Oblique').fontSize(8)
        .text(`Elaborado por: ${budget.producer}`, totalsX, y, { width: totalsW, align: 'right' });
      y += 12;
    }

    y += 10;

    // ── NOTES ────────────────────────────────────────────────────────────────
    if (budget.notes) {
      doc.rect(ML, y, PW, 6 + doc.heightOfString(budget.notes, { width: PW - 16, size: 9 }) + 18)
        .fillAndStroke(C.slate50, C.slate200);

      y += 8;
      doc.fillColor(C.slate700).font('Helvetica-Bold').fontSize(7)
        .text('OBSERVAÇÕES', ML + 8, y);
      y += 11;
      doc.fillColor(C.slate700).font('Helvetica').fontSize(9)
        .text(budget.notes, ML + 8, y, { width: PW - 16 });
      y += doc.heightOfString(budget.notes, { width: PW - 16, size: 9 }) + 14;
    }

    // ── FOOTER NOTES (ATENÇÃO) ────────────────────────────────────────────────
    if (company.footer_notes) {
      y += 6;
      hLine(doc, ML, y, PW, C.slate300, 0.5);
      y += 8;
      doc.fillColor(C.red600).font('Helvetica-Bold').fontSize(9)
        .text('ATENÇÃO ! LEIA AS INSTRUÇÕES ABAIXO', ML, y, { width: PW });
      y += 13;
      doc.fillColor(C.slate800).font('Helvetica').fontSize(8)
        .text(company.footer_notes, ML, y, { width: PW });
      y += doc.heightOfString(company.footer_notes, { width: PW, size: 8 }) + 10;
    }

    // ── THANK YOU FOOTER ──────────────────────────────────────────────────────
    y += 14;
    hLine(doc, ML, y, PW, C.slate200, 0.5);
    y += 10;
    doc.fillColor(C.slate500).font('Helvetica').fontSize(8)
      .text('Caso você tenha alguma dúvida entre em contato conosco', ML, y, { width: PW, align: 'center' });
    y += 12;
    doc.fillColor(C.slate800).font('Helvetica-Bold').fontSize(9)
      .text('AGRADECEMOS SUA PREFERÊNCIA!', ML, y, { width: PW, align: 'center' });

    doc.end();
  });
}

// ── Receipt PDF — same visual style ─────────────────────────────────────────
export async function generateReceiptPDF(receipt, company = {}) {
  const logoBuffer = await fetchLogoBuffer(company.company_logo);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const ML = 40;
    const MR = 40;
    const PW = doc.page.width - ML - MR;
    const companyName = company.company_name || '';

    let y = 40;

    // ── COMPANY HEADER ───────────────────────────────────────────────────────
    const headerStartY = y;
    const leftW = PW * 0.55;
    const rightW = PW * 0.42;
    const rightX = ML + PW - rightW;

    if (logoBuffer) {
      try {
        doc.image(logoBuffer, ML, y, { fit: [leftW, 90], align: 'left' });
        y += 96;
      } catch {
        doc.fillColor(C.slate900).font('Helvetica-Bold').fontSize(16)
          .text(companyName, ML, y, { width: leftW });
        y += 22;
      }
    } else {
      doc.fillColor(C.slate900).font('Helvetica-Bold').fontSize(16)
        .text(companyName, ML, y, { width: leftW });
      y += 22;
    }

    const contactY = logoBuffer ? headerStartY + 96 : y;
    let cy = contactY;
    if (companyName && logoBuffer) {
      doc.fillColor(C.slate600).font('Helvetica-Bold').fontSize(8).text(companyName, ML, cy, { width: leftW });
      cy += 11;
    }
    if (company.company_phone) {
      doc.fillColor(C.slate700).font('Helvetica').fontSize(8).text(company.company_phone, ML, cy, { width: leftW });
      cy += 11;
    }
    if (company.company_email) {
      doc.fillColor(C.slate700).font('Helvetica').fontSize(8).text(company.company_email, ML, cy, { width: leftW });
      cy += 11;
    }
    if (company.company_address) {
      doc.fillColor(C.slate700).font('Helvetica').fontSize(8).text(company.company_address, ML, cy, { width: leftW });
      cy += 11;
    }

    const emissionDate = fmtDate(receipt.emission_date || receipt.created_date);

    doc.fillColor(C.slate900).font('Helvetica-Bold').fontSize(26)
      .text('Recibo', rightX, headerStartY, { width: rightW, align: 'right' });
    doc.fillColor(C.slate600).font('Helvetica').fontSize(9)
      .text(`Data: ${emissionDate}`, rightX, headerStartY + 32, { width: rightW, align: 'right' });
    if (receipt.due_date) {
      doc.fillColor(C.slate500).font('Helvetica').fontSize(8)
        .text(`Vencimento: ${fmtDate(receipt.due_date)}`, rightX, headerStartY + 44, { width: rightW, align: 'right' });
    }
    doc.fillColor(C.slate700).font('Helvetica').fontSize(8)
      .text(`Nº ${receipt.id}`, rightX, headerStartY + 57, { width: rightW, align: 'right' });

    y = Math.max(cy, headerStartY + 70) + 10;

    hLine(doc, ML, y, PW, C.slate800, 2);
    y += 12;

    // ── JOB / PRODUTOR / EMPRESA ─────────────────────────────────────────────
    const labelW = 72;
    const valW = PW - labelW;

    if (receipt.job) {
      doc.fillColor(C.slate800).font('Helvetica-Bold').fontSize(9).text('JOB:', ML, y, { width: labelW });
      doc.fillColor(C.slate900).font('Helvetica-Bold').fontSize(9).text(receipt.job, ML + labelW, y, { width: valW });
      y += 14;
    }
    if (receipt.producer) {
      doc.fillColor(C.slate700).font('Helvetica-Bold').fontSize(9).text('Produtor:', ML, y, { width: labelW });
      doc.fillColor(C.slate900).font('Helvetica-Bold').fontSize(9).text(receipt.producer, ML + labelW, y, { width: valW });
      y += 14;
    }
    if (receipt.client_name) {
      doc.fillColor(C.slate700).font('Helvetica-Bold').fontSize(9).text('Empresa:', ML, y, { width: labelW });
      doc.fillColor(C.slate900).font('Helvetica-Bold').fontSize(9).text(receipt.client_name, ML + labelW, y, { width: valW });
      y += 14;
    }
    if (receipt.client_phone) {
      doc.fillColor(C.slate700).font('Helvetica').fontSize(8).text('Telefone:', ML, y, { width: labelW });
      doc.fillColor(C.slate800).font('Helvetica').fontSize(8).text(receipt.client_phone, ML + labelW, y, { width: valW });
      y += 12;
    }
    if (receipt.client_email) {
      doc.fillColor(C.slate700).font('Helvetica').fontSize(8).text('E-mail:', ML, y, { width: labelW });
      doc.fillColor(C.slate800).font('Helvetica').fontSize(8).text(receipt.client_email, ML + labelW, y, { width: valW });
      y += 12;
    }
    if (receipt.client_address) {
      doc.fillColor(C.slate700).font('Helvetica').fontSize(8).text('Endereço:', ML, y, { width: labelW });
      doc.fillColor(C.slate800).font('Helvetica').fontSize(8).text(receipt.client_address, ML + labelW, y, { width: valW });
      y += 12;
    }

    y += 4;
    hLine(doc, ML, y, PW, C.slate300, 0.5);
    y += 10;

    // ── DESCRIPTION ──────────────────────────────────────────────────────────
    if (receipt.description) {
      doc.fillColor(C.slate600).font('Helvetica-Oblique').fontSize(9)
        .text(receipt.description, ML, y, { width: PW });
      y += doc.heightOfString(receipt.description, { width: PW, size: 9 }) + 10;
    }

    // ── ITEMS TABLE ───────────────────────────────────────────────────────────
    const items = Array.isArray(receipt.items) ? receipt.items : [];
    if (items.length > 0) {
      const COL = {
        item:  { x: ML,             w: PW * 0.50 },
        qty:   { x: ML + PW * 0.50, w: PW * 0.12 },
        unit:  { x: ML + PW * 0.62, w: PW * 0.19 },
        total: { x: ML + PW * 0.81, w: PW * 0.19 },
      };

      doc.fillColor(C.slate800).font('Helvetica-Bold').fontSize(9)
        .text('Item', COL.item.x, y, { width: COL.item.w })
        .text('Qtd', COL.qty.x, y, { width: COL.qty.w, align: 'center' })
        .text('Preço Unit.', COL.unit.x, y, { width: COL.unit.w, align: 'right' })
        .text('Subtotal', COL.total.x, y, { width: COL.total.w, align: 'right' });
      y += 13;
      hLine(doc, ML, y, PW, C.slate800, 1.5);
      y += 6;

      items.forEach((item) => {
        const qty = Number(item.quantity || 1);
        const unitPrice = Number(item.unit_price || 0);
        const lineTotal = qty * unitPrice;

        const rowText = item.name || item.description || '-';
        const rowH = Math.max(doc.heightOfString(rowText, { width: COL.item.w - 4, size: 9 }), 14);

        doc.fillColor(C.slate800).font('Helvetica').fontSize(9)
          .text(rowText, COL.item.x, y, { width: COL.item.w - 4 });
        doc.fillColor(C.slate700).font('Helvetica').fontSize(9)
          .text(String(qty), COL.qty.x, y, { width: COL.qty.w, align: 'center' })
          .text(fmtCurrency(unitPrice), COL.unit.x, y, { width: COL.unit.w, align: 'right' })
          .text(fmtCurrency(lineTotal), COL.total.x, y, { width: COL.total.w, align: 'right' });

        y += rowH + 4;
        hLine(doc, ML, y, PW, C.slate200, 0.5);
        y += 5;
      });

      y += 6;
    }

    // ── TOTALS ────────────────────────────────────────────────────────────────
    const totalsX = ML + PW - 200;
    const totalsW = 200;

    const subtotal = Number(receipt.subtotal || receipt.total_amount || 0);
    const discount = Number(receipt.discount || 0);
    const totalAmount = Number(receipt.total_amount || 0);
    const totalWithMargin = Number(receipt.total_with_margin || 0);

    if (discount > 0 && subtotal > 0) {
      doc.fillColor(C.red600).font('Helvetica').fontSize(9)
        .text(`Desconto (${discount}%):`, totalsX, y, { width: totalsW / 2 });
      doc.fillColor(C.red600).font('Helvetica').fontSize(9)
        .text(`- ${fmtCurrency(subtotal * discount / 100)}`, totalsX + totalsW / 2, y, { width: totalsW / 2, align: 'right' });
      y += 13;
    }

    hLine(doc, totalsX, y, totalsW, C.slate800, 1.5);
    y += 6;

    const totalLabel = receipt.total_label || 'Total sem Nota';
    doc.fillColor(C.slate800).font('Helvetica-Bold').fontSize(9)
      .text(totalLabel, totalsX, y, { width: totalsW / 2 });
    doc.fillColor(C.slate900).font('Helvetica-Bold').fontSize(9)
      .text(fmtCurrency(totalAmount), totalsX + totalsW / 2, y, { width: totalsW / 2, align: 'right' });
    y += 14;

    if (totalWithMargin > 0) {
      hLine(doc, totalsX, y, totalsW, C.slate400, 0.5);
      y += 6;
      const marginLabel = receipt.total_with_margin_label || 'Total com Nota';
      doc.fillColor(C.slate800).font('Helvetica-Bold').fontSize(9)
        .text(marginLabel, totalsX, y, { width: totalsW / 2 });
      doc.fillColor(C.slate900).font('Helvetica-Bold').fontSize(9)
        .text(fmtCurrency(totalWithMargin), totalsX + totalsW / 2, y, { width: totalsW / 2, align: 'right' });
      y += 14;
    }

    if (receipt.payment_method) {
      y += 4;
      doc.fillColor(C.slate600).font('Helvetica').fontSize(8)
        .text(`Forma de pagamento: ${receipt.payment_method}`, ML, y, { width: PW });
      y += 12;
    }

    y += 10;

    // ── NOTES ────────────────────────────────────────────────────────────────
    if (receipt.notes) {
      const noteH = 6 + doc.heightOfString(receipt.notes, { width: PW - 16, size: 9 }) + 18;
      doc.rect(ML, y, PW, noteH).fillAndStroke(C.slate50, C.slate200);
      y += 8;
      doc.fillColor(C.slate700).font('Helvetica-Bold').fontSize(7).text('OBSERVAÇÕES', ML + 8, y);
      y += 11;
      doc.fillColor(C.slate700).font('Helvetica').fontSize(9).text(receipt.notes, ML + 8, y, { width: PW - 16 });
      y += doc.heightOfString(receipt.notes, { width: PW - 16, size: 9 }) + 14;
    }

    // ── FOOTER NOTES ─────────────────────────────────────────────────────────
    if (company.footer_notes) {
      y += 6;
      hLine(doc, ML, y, PW, C.slate300, 0.5);
      y += 8;
      doc.fillColor(C.red600).font('Helvetica-Bold').fontSize(9)
        .text('ATENÇÃO ! LEIA AS INSTRUÇÕES ABAIXO', ML, y, { width: PW });
      y += 13;
      doc.fillColor(C.slate800).font('Helvetica').fontSize(8)
        .text(company.footer_notes, ML, y, { width: PW });
      y += doc.heightOfString(company.footer_notes, { width: PW, size: 8 }) + 10;
    }

    // ── THANK YOU FOOTER ──────────────────────────────────────────────────────
    y += 14;
    hLine(doc, ML, y, PW, C.slate200, 0.5);
    y += 10;
    doc.fillColor(C.slate500).font('Helvetica').fontSize(8)
      .text('Caso você tenha alguma dúvida entre em contato conosco', ML, y, { width: PW, align: 'center' });
    y += 12;
    doc.fillColor(C.slate800).font('Helvetica-Bold').fontSize(9)
      .text('AGRADECEMOS SUA PREFERÊNCIA!', ML, y, { width: PW, align: 'center' });

    doc.end();
  });
}

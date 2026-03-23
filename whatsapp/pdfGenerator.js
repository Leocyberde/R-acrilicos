import PDFDocument from 'pdfkit';

function fmtCurrency(value) {
  return `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('pt-BR');
  } catch {
    return String(d);
  }
}

function fmtStatus(s) {
  const map = {
    pendente: 'Pendente',
    em_aberto: 'Em Aberto',
    aprovado: 'Aprovado',
    recusado: 'Recusado',
    em_producao: 'Em Produção',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
    entregue: 'Entregue',
    nova: 'Nova',
    em_andamento: 'Em Andamento',
    aceito_cliente: 'Aceito pelo Cliente',
  };
  return map[s] || s;
}

const COLORS = {
  primary: '#4F46E5',
  dark: '#1E293B',
  gray: '#64748B',
  lightGray: '#F1F5F9',
  border: '#E2E8F0',
  white: '#FFFFFF',
  green: '#059669',
};

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

async function fetchLogoBuffer(logoUrl) {
  if (!logoUrl) return null;
  try {
    if (logoUrl.startsWith('data:')) {
      const base64Data = logoUrl.split(',')[1];
      if (!base64Data) return null;
      return Buffer.from(base64Data, 'base64');
    }
    const url = logoUrl.startsWith('http') ? logoUrl : `http://localhost:3001${logoUrl}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

export async function generateBudgetPDF(budget, company = {}) {
  const logoBuffer = await fetchLogoBuffer(company.company_logo);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 40,
      size: 'A4',
      info: {
        Title: `Orçamento #${budget.id}`,
        Author: company.company_name || 'GestãoPro',
      },
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const PAGE_WIDTH = doc.page.width - 80;
    const companyName = company.company_name || 'GestãoPro';

    const HEADER_H = 110;

    // ── Header background ──────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, HEADER_H)
      .fill(hexToRgb(COLORS.primary));

    // Logo or Company name
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 40, 12, { fit: [160, 86], align: 'left', valign: 'center' });
      } catch {
        doc.fillColor(COLORS.white)
          .font('Helvetica-Bold')
          .fontSize(20)
          .text(companyName, 40, 30, { width: PAGE_WIDTH / 2 });
      }
    } else {
      doc.fillColor(COLORS.white)
        .font('Helvetica-Bold')
        .fontSize(20)
        .text(companyName, 40, 30, { width: PAGE_WIDTH / 2 });
    }

    // Company info on right
    const infoLines = [];
    if (company.company_name) infoLines.push(company.company_name);
    if (company.cnpj) infoLines.push(`CNPJ: ${company.cnpj}`);
    if (company.company_phone) infoLines.push(`Tel: ${company.company_phone}`);
    if (company.company_email) infoLines.push(company.company_email);

    doc.font('Helvetica')
      .fontSize(8)
      .fillColor('#CBD5E1');
    infoLines.forEach((line, i) => {
      doc.text(line, doc.page.width / 2, 20 + (i * 13), {
        width: PAGE_WIDTH / 2,
        align: 'right',
      });
    });

    // ── Budget title bar ──────────────────────────────────────────
    doc.rect(0, HEADER_H, doc.page.width, 36)
      .fill(hexToRgb(COLORS.dark));

    doc.fillColor(COLORS.white)
      .font('Helvetica-Bold')
      .fontSize(14)
      .text(`ORÇAMENTO Nº ${budget.id}`, 40, HEADER_H + 11, { width: PAGE_WIDTH });

    // Status badge on right
    const statusText = fmtStatus(budget.status);
    doc.font('Helvetica')
      .fontSize(9)
      .text(statusText, 40, HEADER_H + 15, { width: PAGE_WIDTH, align: 'right' });

    let y = HEADER_H + 54;

    // ── Info cards (two columns) ─────────────────────────────────
    const col1X = 40;
    const col2X = doc.page.width / 2 + 10;
    const colW = doc.page.width / 2 - 50;
    const cardH = 80;

    doc.rect(col1X, y, colW, cardH).fill(hexToRgb(COLORS.lightGray));
    doc.rect(col2X, y, colW, cardH).fill(hexToRgb(COLORS.lightGray));

    // Left card: Client info
    doc.fillColor(COLORS.gray).font('Helvetica-Bold').fontSize(7).text('CLIENTE', col1X + 10, y + 10);
    doc.fillColor(COLORS.dark).font('Helvetica-Bold').fontSize(11).text(budget.client_name || '-', col1X + 10, y + 22, { width: colW - 20 });
    if (budget.client_email) {
      doc.fillColor(COLORS.gray).font('Helvetica').fontSize(8).text(budget.client_email, col1X + 10, y + 37, { width: colW - 20 });
    }
    if (budget.client_phone) {
      doc.fillColor(COLORS.gray).font('Helvetica').fontSize(8).text(budget.client_phone, col1X + 10, y + 49, { width: colW - 20 });
    }

    // Right card: Dates
    doc.fillColor(COLORS.gray).font('Helvetica-Bold').fontSize(7).text('INFORMAÇÕES', col2X + 10, y + 10);
    const rightInfo = [
      ['Emissão:', fmtDate(budget.emission_date)],
      ['Validade:', fmtDate(budget.validity_date)],
      ['Job:', budget.job || '-'],
      ['Produtor:', budget.producer || '-'],
    ];
    rightInfo.forEach(([label, value], i) => {
      doc.fillColor(COLORS.gray).font('Helvetica-Bold').fontSize(8)
        .text(label, col2X + 10, y + 22 + i * 13, { width: 55, continued: false });
      doc.fillColor(COLORS.dark).font('Helvetica').fontSize(8)
        .text(value, col2X + 65, y + 22 + i * 13, { width: colW - 75 });
    });

    y += cardH + 20;

    // ── Description ──────────────────────────────────────────────
    if (budget.description) {
      doc.fillColor(COLORS.gray).font('Helvetica-Bold').fontSize(8).text('DESCRIÇÃO', 40, y);
      y += 12;
      doc.fillColor(COLORS.dark).font('Helvetica').fontSize(9)
        .text(budget.description, 40, y, { width: PAGE_WIDTH });
      y += doc.heightOfString(budget.description, { width: PAGE_WIDTH }) + 15;
    }

    // ── Items table ──────────────────────────────────────────────
    doc.fillColor(COLORS.gray).font('Helvetica-Bold').fontSize(8).text('ITENS DO ORÇAMENTO', 40, y);
    y += 10;

    const tableTop = y;
    const COL = {
      num: { x: 40, w: 30 },
      desc: { x: 75, w: 260 },
      qty: { x: 340, w: 55 },
      unit: { x: 400, w: 70 },
      total: { x: 475, w: 75 },
    };

    doc.rect(40, tableTop, PAGE_WIDTH, 20).fill(hexToRgb(COLORS.primary));
    doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(8);
    doc.text('#', COL.num.x + 4, tableTop + 6, { width: COL.num.w });
    doc.text('Descrição', COL.desc.x + 4, tableTop + 6, { width: COL.desc.w });
    doc.text('Qtd', COL.qty.x + 4, tableTop + 6, { width: COL.qty.w, align: 'center' });
    doc.text('Unit.', COL.unit.x + 4, tableTop + 6, { width: COL.unit.w, align: 'right' });
    doc.text('Total', COL.total.x + 4, tableTop + 6, { width: COL.total.w, align: 'right' });

    y = tableTop + 20;

    const items = Array.isArray(budget.items) ? budget.items : [];
    if (items.length === 0) {
      doc.rect(40, y, PAGE_WIDTH, 22).fill(hexToRgb(COLORS.lightGray));
      doc.fillColor(COLORS.gray).font('Helvetica').fontSize(8)
        .text('Nenhum item cadastrado.', 44, y + 7, { width: PAGE_WIDTH });
      y += 22;
    } else {
      items.forEach((item, i) => {
        const rowH = 22;
        const bgColor = i % 2 === 0 ? COLORS.white : COLORS.lightGray;
        doc.rect(40, y, PAGE_WIDTH, rowH).fill(hexToRgb(bgColor));

        const qty = Number(item.quantity || 1);
        const unitPrice = Number(item.unit_price || item.price || 0);
        const lineTotal = Number(item.total || item.line_total || (qty * unitPrice) || 0);

        doc.fillColor(COLORS.gray).font('Helvetica').fontSize(8)
          .text(String(i + 1), COL.num.x + 4, y + 7, { width: COL.num.w });
        doc.fillColor(COLORS.dark).font('Helvetica').fontSize(8)
          .text(item.name || item.description || '-', COL.desc.x + 4, y + 7, { width: COL.desc.w });
        doc.fillColor(COLORS.dark).font('Helvetica').fontSize(8)
          .text(String(qty), COL.qty.x + 4, y + 7, { width: COL.qty.w, align: 'center' });
        doc.fillColor(COLORS.dark).font('Helvetica').fontSize(8)
          .text(unitPrice > 0 ? fmtCurrency(unitPrice) : '-', COL.unit.x + 4, y + 7, { width: COL.unit.w, align: 'right' });
        doc.fillColor(COLORS.dark).font('Helvetica').fontSize(8)
          .text(lineTotal > 0 ? fmtCurrency(lineTotal) : '-', COL.total.x + 4, y + 7, { width: COL.total.w, align: 'right' });

        y += rowH;
      });
    }

    doc.rect(40, y, PAGE_WIDTH, 1).fill(hexToRgb(COLORS.border));
    y += 10;

    // ── Totals ────────────────────────────────────────────────────
    const totalBoxX = doc.page.width / 2;
    const totalBoxW = doc.page.width / 2 - 40;

    const totals = [];
    if (Number(budget.subtotal) > 0) {
      totals.push(['Subtotal:', fmtCurrency(budget.subtotal)]);
    }
    if (Number(budget.discount) > 0) {
      totals.push([`Desconto (${budget.discount}%):`, '-' + fmtCurrency(Number(budget.subtotal || 0) * Number(budget.discount) / 100)]);
    }
    if (Number(budget.total) > 0 && Number(budget.total_with_margin) > 0 && budget.apply_margin) {
      totals.push([budget.total_label || 'Total s/ margem:', fmtCurrency(budget.total)]);
    }

    const mainTotalValue = budget.total_with_margin || budget.total || budget.total_value || 0;
    const mainTotalLabel = budget.apply_margin && Number(budget.total_with_margin) > 0
      ? (budget.total_with_margin_label || 'Total Final:')
      : 'Total:';

    totals.forEach(([label, value]) => {
      doc.rect(totalBoxX, y, totalBoxW, 18).fill(hexToRgb(COLORS.lightGray));
      doc.fillColor(COLORS.gray).font('Helvetica').fontSize(8).text(label, totalBoxX + 8, y + 5, { width: totalBoxW / 2 });
      doc.fillColor(COLORS.dark).font('Helvetica-Bold').fontSize(8).text(value, totalBoxX + 8, y + 5, { width: totalBoxW - 16, align: 'right' });
      y += 18;
    });

    doc.rect(totalBoxX, y, totalBoxW, 28).fill(hexToRgb(COLORS.primary));
    doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(10).text(mainTotalLabel, totalBoxX + 8, y + 9, { width: totalBoxW / 2 });
    doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(12).text(fmtCurrency(mainTotalValue), totalBoxX + 8, y + 8, { width: totalBoxW - 16, align: 'right' });
    y += 28;

    // ── Payment terms ─────────────────────────────────────────────
    if (budget.payment_terms) {
      y += 15;
      doc.fillColor(COLORS.gray).font('Helvetica-Bold').fontSize(8).text('CONDIÇÕES DE PAGAMENTO', 40, y);
      y += 12;
      doc.fillColor(COLORS.dark).font('Helvetica').fontSize(9).text(budget.payment_terms, 40, y, { width: PAGE_WIDTH });
      y += doc.heightOfString(budget.payment_terms, { width: PAGE_WIDTH }) + 10;
    }

    // ── Notes ─────────────────────────────────────────────────────
    if (budget.notes) {
      y += 10;
      doc.fillColor(COLORS.gray).font('Helvetica-Bold').fontSize(8).text('OBSERVAÇÕES', 40, y);
      y += 12;
      doc.fillColor(COLORS.dark).font('Helvetica').fontSize(9).text(budget.notes, 40, y, { width: PAGE_WIDTH });
    }

    // ── Footer ────────────────────────────────────────────────────
    const footerY = doc.page.height - 50;
    doc.rect(0, footerY, doc.page.width, 50).fill(hexToRgb(COLORS.lightGray));
    doc.fillColor(COLORS.gray).font('Helvetica').fontSize(7)
      .text(
        `Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · ${companyName}`,
        40, footerY + 18,
        { width: PAGE_WIDTH, align: 'center' }
      );

    doc.end();
  });
}

export async function generateReceiptPDF(receipt, company = {}) {
  const logoBuffer = await fetchLogoBuffer(company.company_logo);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 40,
      size: 'A4',
      info: {
        Title: `Recibo #${receipt.id}`,
        Author: company.company_name || 'GestãoPro',
      },
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const PAGE_WIDTH = doc.page.width - 80;
    const companyName = company.company_name || 'GestãoPro';

    const HEADER_H = 110;

    // ── Header background ──────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, HEADER_H)
      .fill(hexToRgb(COLORS.primary));

    // Logo or Company name
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 40, 12, { fit: [160, 86], align: 'left', valign: 'center' });
      } catch {
        doc.fillColor(COLORS.white)
          .font('Helvetica-Bold')
          .fontSize(20)
          .text(companyName, 40, 30, { width: PAGE_WIDTH / 2 });
      }
    } else {
      doc.fillColor(COLORS.white)
        .font('Helvetica-Bold')
        .fontSize(20)
        .text(companyName, 40, 30, { width: PAGE_WIDTH / 2 });
    }

    // Company info on right
    const infoLines = [];
    if (company.company_name) infoLines.push(company.company_name);
    if (company.cnpj) infoLines.push(`CNPJ: ${company.cnpj}`);
    if (company.company_phone) infoLines.push(`Tel: ${company.company_phone}`);
    if (company.company_email) infoLines.push(company.company_email);

    doc.font('Helvetica')
      .fontSize(8)
      .fillColor('#CBD5E1');
    infoLines.forEach((line, i) => {
      doc.text(line, doc.page.width / 2, 20 + (i * 13), {
        width: PAGE_WIDTH / 2,
        align: 'right',
      });
    });

    // ── Receipt title bar ──────────────────────────────────────────
    doc.rect(0, HEADER_H, doc.page.width, 36)
      .fill(hexToRgb(COLORS.dark));

    doc.fillColor(COLORS.white)
      .font('Helvetica-Bold')
      .fontSize(14)
      .text(`RECIBO Nº ${receipt.id}`, 40, HEADER_H + 11, { width: PAGE_WIDTH });

    const statusText = fmtStatus(receipt.status);
    doc.font('Helvetica')
      .fontSize(9)
      .text(statusText, 40, HEADER_H + 15, { width: PAGE_WIDTH, align: 'right' });

    let y = HEADER_H + 54;

    // ── Info cards (two columns) ─────────────────────────────────
    const col1X = 40;
    const col2X = doc.page.width / 2 + 10;
    const colW = doc.page.width / 2 - 50;
    const cardH = 80;

    doc.rect(col1X, y, colW, cardH).fill(hexToRgb(COLORS.lightGray));
    doc.rect(col2X, y, colW, cardH).fill(hexToRgb(COLORS.lightGray));

    // Left card: Client info
    doc.fillColor(COLORS.gray).font('Helvetica-Bold').fontSize(7).text('CLIENTE', col1X + 10, y + 10);
    doc.fillColor(COLORS.dark).font('Helvetica-Bold').fontSize(11).text(receipt.client_name || '-', col1X + 10, y + 22, { width: colW - 20 });
    if (receipt.client_email) {
      doc.fillColor(COLORS.gray).font('Helvetica').fontSize(8).text(receipt.client_email, col1X + 10, y + 37, { width: colW - 20 });
    }
    if (receipt.client_phone) {
      doc.fillColor(COLORS.gray).font('Helvetica').fontSize(8).text(receipt.client_phone, col1X + 10, y + 49, { width: colW - 20 });
    }

    // Right card: Info
    doc.fillColor(COLORS.gray).font('Helvetica-Bold').fontSize(7).text('INFORMAÇÕES', col2X + 10, y + 10);
    const rightInfo = [
      ['Emissão:', fmtDate(receipt.emission_date || receipt.created_date)],
      ['Vencimento:', fmtDate(receipt.due_date)],
      ['Job:', receipt.job || '-'],
      ['Produtor:', receipt.producer || '-'],
    ];
    rightInfo.forEach(([label, value], i) => {
      doc.fillColor(COLORS.gray).font('Helvetica-Bold').fontSize(8)
        .text(label, col2X + 10, y + 22 + i * 13, { width: 55, continued: false });
      doc.fillColor(COLORS.dark).font('Helvetica').fontSize(8)
        .text(value, col2X + 65, y + 22 + i * 13, { width: colW - 75 });
    });

    y += cardH + 20;

    // ── Description ──────────────────────────────────────────────
    if (receipt.description) {
      doc.fillColor(COLORS.gray).font('Helvetica-Bold').fontSize(8).text('DESCRIÇÃO', 40, y);
      y += 12;
      doc.fillColor(COLORS.dark).font('Helvetica').fontSize(9)
        .text(receipt.description, 40, y, { width: PAGE_WIDTH });
      y += doc.heightOfString(receipt.description, { width: PAGE_WIDTH }) + 15;
    }

    // ── Items table ──────────────────────────────────────────────
    const items = Array.isArray(receipt.items) ? receipt.items : [];
    if (items.length > 0) {
      doc.fillColor(COLORS.gray).font('Helvetica-Bold').fontSize(8).text('ITENS', 40, y);
      y += 10;

      const tableTop = y;
      const COL = {
        num: { x: 40, w: 30 },
        desc: { x: 75, w: 260 },
        qty: { x: 340, w: 55 },
        unit: { x: 400, w: 70 },
        total: { x: 475, w: 75 },
      };

      doc.rect(40, tableTop, PAGE_WIDTH, 20).fill(hexToRgb(COLORS.primary));
      doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(8);
      doc.text('#', COL.num.x + 4, tableTop + 6, { width: COL.num.w });
      doc.text('Descrição', COL.desc.x + 4, tableTop + 6, { width: COL.desc.w });
      doc.text('Qtd', COL.qty.x + 4, tableTop + 6, { width: COL.qty.w, align: 'center' });
      doc.text('Unit.', COL.unit.x + 4, tableTop + 6, { width: COL.unit.w, align: 'right' });
      doc.text('Total', COL.total.x + 4, tableTop + 6, { width: COL.total.w, align: 'right' });

      y = tableTop + 20;

      items.forEach((item, i) => {
        const rowH = 22;
        const bgColor = i % 2 === 0 ? COLORS.white : COLORS.lightGray;
        doc.rect(40, y, PAGE_WIDTH, rowH).fill(hexToRgb(bgColor));

        const qty = Number(item.quantity || 1);
        const unitPrice = Number(item.unit_price || 0);
        const lineTotal = qty * unitPrice;

        doc.fillColor(COLORS.gray).font('Helvetica').fontSize(8)
          .text(String(i + 1), COL.num.x + 4, y + 7, { width: COL.num.w });
        doc.fillColor(COLORS.dark).font('Helvetica').fontSize(8)
          .text(item.name || item.description || '-', COL.desc.x + 4, y + 7, { width: COL.desc.w });
        doc.fillColor(COLORS.dark).font('Helvetica').fontSize(8)
          .text(String(qty), COL.qty.x + 4, y + 7, { width: COL.qty.w, align: 'center' });
        doc.fillColor(COLORS.dark).font('Helvetica').fontSize(8)
          .text(unitPrice > 0 ? fmtCurrency(unitPrice) : '-', COL.unit.x + 4, y + 7, { width: COL.unit.w, align: 'right' });
        doc.fillColor(COLORS.dark).font('Helvetica').fontSize(8)
          .text(lineTotal > 0 ? fmtCurrency(lineTotal) : '-', COL.total.x + 4, y + 7, { width: COL.total.w, align: 'right' });

        y += rowH;
      });

      doc.rect(40, y, PAGE_WIDTH, 1).fill(hexToRgb(COLORS.border));
      y += 10;
    }

    // ── Totals ────────────────────────────────────────────────────
    const totalBoxX = doc.page.width / 2;
    const totalBoxW = doc.page.width / 2 - 40;

    const subtotal = Number(receipt.subtotal || receipt.total_amount || 0);
    const discount = Number(receipt.discount || 0);
    const totalAmount = Number(receipt.total_amount || 0);
    const totalWithMargin = Number(receipt.total_with_margin || 0);

    if (subtotal > 0 && discount > 0) {
      doc.rect(totalBoxX, y, totalBoxW, 18).fill(hexToRgb(COLORS.lightGray));
      doc.fillColor(COLORS.gray).font('Helvetica').fontSize(8).text('Subtotal:', totalBoxX + 8, y + 5, { width: totalBoxW / 2 });
      doc.fillColor(COLORS.dark).font('Helvetica-Bold').fontSize(8).text(fmtCurrency(subtotal), totalBoxX + 8, y + 5, { width: totalBoxW - 16, align: 'right' });
      y += 18;

      doc.rect(totalBoxX, y, totalBoxW, 18).fill(hexToRgb(COLORS.lightGray));
      doc.fillColor(COLORS.gray).font('Helvetica').fontSize(8).text(`Desconto (${discount}%):`, totalBoxX + 8, y + 5, { width: totalBoxW / 2 });
      doc.fillColor(COLORS.dark).font('Helvetica-Bold').fontSize(8).text('-' + fmtCurrency(subtotal * discount / 100), totalBoxX + 8, y + 5, { width: totalBoxW - 16, align: 'right' });
      y += 18;
    }

    const mainTotalLabel = receipt.total_label || 'Total sem Nota:';
    doc.rect(totalBoxX, y, totalBoxW, 28).fill(hexToRgb(COLORS.primary));
    doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(10).text(mainTotalLabel, totalBoxX + 8, y + 9, { width: totalBoxW / 2 });
    doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(12).text(fmtCurrency(totalAmount), totalBoxX + 8, y + 8, { width: totalBoxW - 16, align: 'right' });
    y += 28;

    if (totalWithMargin > 0) {
      const marginLabel = receipt.total_with_margin_label || 'Total com Nota:';
      doc.rect(totalBoxX, y, totalBoxW, 24).fill(hexToRgb(COLORS.dark));
      doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(9).text(marginLabel, totalBoxX + 8, y + 7, { width: totalBoxW / 2 });
      doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(11).text(fmtCurrency(totalWithMargin), totalBoxX + 8, y + 7, { width: totalBoxW - 16, align: 'right' });
      y += 24;
    }

    // ── Payment method ─────────────────────────────────────────────
    if (receipt.payment_method) {
      y += 15;
      doc.fillColor(COLORS.gray).font('Helvetica-Bold').fontSize(8).text('FORMA DE PAGAMENTO', 40, y);
      y += 12;
      doc.fillColor(COLORS.dark).font('Helvetica').fontSize(9).text(receipt.payment_method, 40, y, { width: PAGE_WIDTH });
      y += 20;
    }

    // ── Notes ─────────────────────────────────────────────────────
    if (receipt.notes) {
      y += 10;
      doc.fillColor(COLORS.gray).font('Helvetica-Bold').fontSize(8).text('OBSERVAÇÕES', 40, y);
      y += 12;
      doc.fillColor(COLORS.dark).font('Helvetica').fontSize(9).text(receipt.notes, 40, y, { width: PAGE_WIDTH });
    }

    // ── Footer ────────────────────────────────────────────────────
    const footerY = doc.page.height - 50;
    doc.rect(0, footerY, doc.page.width, 50).fill(hexToRgb(COLORS.lightGray));
    doc.fillColor(COLORS.gray).font('Helvetica').fontSize(7)
      .text(
        `Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · ${companyName}`,
        40, footerY + 18,
        { width: PAGE_WIDTH, align: 'center' }
      );

    doc.end();
  });
}

/**
 * DownloadPDF.jsx
 *
 * Gera PDFs e impressões capturando o layout HTML já renderizado
 * (BudgetPrintLayoutMultiPage, WorkOrderPrintLayoutMultiPage, ReceiptPrintLayoutMultiPage),
 * preservando 100% do visual original configurado pelo usuário.
 *
 * Estratégia:
 *  - Download PDF  → html2canvas (alta resolução) → jsPDF
 *  - Impressão     → iframe oculto com o HTML clonado (FIX #7: evita window.open bloqueado)
 *
 * NÃO usa @react-pdf/renderer — o layout visual vem do componente HTML existente.
 *
 * DEPENDÊNCIAS (já existentes no projeto):
 *   npm install html2canvas jspdf
 */

// ─── Helpers internos ────────────────────────────────────────────────────────

/**
 * FIX #5 — Converte todas as <img> do elemento para base64
 * para garantir que logos externas apareçam no canvas e no iframe de impressão.
 */
async function resolveImages(element) {
  const imgs = Array.from(element.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise((resolve) => {
          if (!img.src || img.src.startsWith("data:")) {
            resolve();
            return;
          }
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const proxy = new Image();
          proxy.crossOrigin = "anonymous";
          proxy.onload = () => {
            canvas.width  = proxy.naturalWidth;
            canvas.height = proxy.naturalHeight;
            ctx.drawImage(proxy, 0, 0);
            try {
              img.src = canvas.toDataURL("image/png");
            } catch {
              // CORS bloqueou — mantém src original
            }
            resolve();
          };
          proxy.onerror = () => resolve();
          proxy.src = img.src + (img.src.includes("?") ? "&" : "?") + "_nocache=" + Date.now();
        })
    )
  );
}

// ─── Download PDF ─────────────────────────────────────────────────────────────

/**
 * Captura o elemento HTML do layout e gera um PDF com alta resolução.
 */
export async function downloadPDF(elementId, filename = "documento.pdf") {
  const rootEl = document.getElementById(elementId);
  if (!rootEl) {
    console.error(`[DownloadPDF] Elemento #${elementId} não encontrado.`);
    return;
  }

  await resolveImages(rootEl);

  const pages = rootEl.querySelectorAll(".budget-page, .workorder-page, .receipt-page");
  const pageList = pages.length > 0 ? Array.from(pages) : [rootEl.querySelector(".pages-container") || rootEl];

  const { default: jsPDF }      = await import("jspdf");
  const { default: html2canvas } = await import("html2canvas");

  const doc  = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = 210;
  const pageH = 297;

  for (let i = 0; i < pageList.length; i++) {
    const pageEl = pageList[i];

    const canvas = await html2canvas(pageEl, {
      scale: 3,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      width:  pageEl.scrollWidth,
      height: pageEl.scrollHeight,
      windowWidth: pageEl.scrollWidth,
    });

    const imgData     = canvas.toDataURL("image/jpeg", 0.95);
    const canvasAspect = canvas.height / canvas.width;
    const imgH         = pageW * canvasAspect;

    if (imgH <= pageH) {
      if (i > 0) doc.addPage();
      doc.addImage(imgData, "JPEG", 0, 0, pageW, imgH);
    } else {
      // FIX #9 — Math.ceil garante que a última sub-página não seja cortada
      const totalSubPages = Math.ceil(imgH / pageH);
      for (let sp = 0; sp < totalSubPages; sp++) {
        if (i > 0 || sp > 0) doc.addPage();
        doc.addImage(imgData, "JPEG", 0, -(sp * pageH), pageW, imgH);
      }
    }
  }

  doc.save(filename);
}

export async function downloadBudgetPDF(budget, _company, filename) {
  return downloadPDF("budget-print-layout", filename || `orcamento-${budget?.id || "novo"}.pdf`);
}

export async function downloadWorkOrderPDF(order, _company, filename) {
  return downloadPDF("workorder-print-layout", filename || `ordem-servico-${order?.id || "nova"}.pdf`);
}

export async function downloadReceiptPDF(receipt, _company, filename) {
  return downloadPDF("receipt-print-layout", filename || `recibo-${receipt?.id || "novo"}.pdf`);
}

// ─── Impressão ────────────────────────────────────────────────────────────────

/**
 * FIX #7 — Impressão via iframe oculto (evita window.open bloqueado como popup).
 * FIX #5 — Imagens convertidas para base64 antes de clonar.
 */
export async function printElement(elementId) {
  const rootEl = document.getElementById(elementId);
  if (!rootEl) {
    console.error(`[DownloadPDF] Elemento #${elementId} não encontrado.`);
    return;
  }

  await resolveImages(rootEl);

  const clone = rootEl.cloneNode(true);
  // FIX #7 — remove botões de ação que não devem aparecer na impressão
  clone.querySelectorAll("button, [data-no-print]").forEach((el) => el.remove());

  const printStyles = `
    <style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 0; background: #fff; }
      img { max-width: 100%; }
      @media print {
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .pages-container { display: block !important; }
        .budget-page, .workorder-page, .receipt-page {
          page-break-after: always;
          break-after: page;
        }
        .budget-page:last-child,
        .workorder-page:last-child,
        .receipt-page:last-child {
          page-break-after: avoid;
          break-after: auto;
        }
      }
    </style>
  `;

  const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">${printStyles}</head><body>${clone.innerHTML}</body></html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;width:0;height:0;border:none;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();

  await new Promise((resolve) => {
    const imgs = Array.from(iframeDoc.querySelectorAll("img"));
    if (imgs.length === 0) { setTimeout(resolve, 300); return; }
    let loaded = 0;
    const done = () => { if (++loaded >= imgs.length) resolve(); };
    imgs.forEach((img) => { if (img.complete) done(); else { img.onload = done; img.onerror = done; } });
    setTimeout(resolve, 3000);
  });

  try {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  } catch {
    const url = URL.createObjectURL(new Blob([htmlContent], { type: "text/html" }));
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  setTimeout(() => {
    if (document.body.contains(iframe)) document.body.removeChild(iframe);
  }, 120_000);
}

export async function printDocument(type, _data, _company) {
  const idMap = {
    budget:    "budget-print-layout",
    workOrder: "workorder-print-layout",
    receipt:   "receipt-print-layout",
  };
  const id = idMap[type];
  if (!id) throw new Error(`[DownloadPDF] Tipo inválido: ${type}`);
  return printElement(id);
}

// Alias legado mantido para compatibilidade
export async function printFromCanvas(elementId) {
  return printElement(elementId);
}

/**
 * DownloadPDF.jsx
 *
 * - Download PDF  → html2canvas (scale 3x) → jsPDF → salva arquivo
 * - Imprimir      → mesmo PDF gerado → abre blob URL no browser para impressão
 *                   (mesmo visual do download, sem clonar HTML, sem flutuação)
 *
 * FIX página em branco: mede altura real do conteúdo com getBoundingClientRect
 * em vez de scrollHeight, evitando capturar espaço vazio no final.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Converte <img> para base64 para garantir que logos apareçam no canvas.
 */
async function resolveImages(element) {
  const imgs = Array.from(element.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise((resolve) => {
          if (!img.src || img.src.startsWith("data:")) { resolve(); return; }
          const canvas = document.createElement("canvas");
          const ctx    = canvas.getContext("2d");
          const proxy  = new Image();
          proxy.crossOrigin = "anonymous";
          proxy.onload = () => {
            canvas.width  = proxy.naturalWidth;
            canvas.height = proxy.naturalHeight;
            ctx.drawImage(proxy, 0, 0);
            try { img.src = canvas.toDataURL("image/png"); } catch { /* CORS — mantém src */ }
            resolve();
          };
          proxy.onerror = () => resolve();
          proxy.src = img.src + (img.src.includes("?") ? "&" : "?") + "_t=" + Date.now();
        })
    )
  );
}

/**
 * Retorna a altura real do conteúdo renderizado de um elemento,
 * sem espaço vazio abaixo (evita página em branco no PDF).
 */
function getContentHeight(el) {
  // Tenta medir o último filho visível para pegar a altura real do conteúdo
  const children = Array.from(el.children).filter(
    (c) => c.offsetHeight > 0 && getComputedStyle(c).display !== "none"
  );
  if (children.length === 0) return el.scrollHeight;

  const last     = children[children.length - 1];
  const elRect   = el.getBoundingClientRect();
  const lastRect = last.getBoundingClientRect();
  const computed = getComputedStyle(el);
  const padBottom = parseFloat(computed.paddingBottom) || 0;

  const contentH = lastRect.bottom - elRect.top + padBottom;
  // Fallback para scrollHeight se a medição for menor (ex: position:absolute)
  return Math.min(Math.max(contentH, 100), el.scrollHeight);
}

// ─── Geração de PDF (núcleo compartilhado) ───────────────────────────────────

/**
 * Captura o layout HTML e retorna um blob PDF.
 * Usado tanto pelo download quanto pela impressão.
 */
async function generatePDFBlob(elementId) {
  const rootEl = document.getElementById(elementId);
  if (!rootEl) throw new Error(`[DownloadPDF] Elemento #${elementId} não encontrado.`);

  await resolveImages(rootEl);

  // Seleciona páginas individuais se existirem, senão usa o container todo
  const pages = rootEl.querySelectorAll(".budget-page, .workorder-page, .receipt-page");
  const pageList = pages.length > 0
    ? Array.from(pages)
    : [rootEl.querySelector(".pages-container") || rootEl];

  const { default: jsPDF }       = await import("jspdf");
  const { default: html2canvas } = await import("html2canvas");

  const doc   = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = 210;
  const pageH = 297;

  for (let i = 0; i < pageList.length; i++) {
    const pageEl    = pageList[i];

    // Força largura em pixels (210mm ≈ 794px @96dpi) para evitar scrollWidth=0 em mobile
    const rect     = pageEl.getBoundingClientRect();
    const elWidth  = rect.width > 10 ? rect.width : 794;
    const contentH = getContentHeight(pageEl);

    const canvas = await html2canvas(pageEl, {
      scale:       3,
      useCORS:     true,
      allowTaint:  false,
      backgroundColor: "#ffffff",
      logging:     false,
      width:       elWidth,
      height:      Math.max(contentH, 100),
      windowWidth: Math.max(elWidth, 794),
    });

    const imgData      = canvas.toDataURL("image/jpeg", 0.95);
    const canvasAspect = canvas.height / canvas.width;
    const imgH         = pageW * canvasAspect;

    if (imgH <= pageH) {
      if (i > 0) doc.addPage();
      doc.addImage(imgData, "JPEG", 0, 0, pageW, imgH);
    } else {
      // Conteúdo maior que uma página — divide em sub-páginas
      const totalSubPages = Math.ceil(imgH / pageH);
      for (let sp = 0; sp < totalSubPages; sp++) {
        if (i > 0 || sp > 0) doc.addPage();
        doc.addImage(imgData, "JPEG", 0, -(sp * pageH), pageW, imgH);
      }
    }
  }

  return doc.output("blob");
}

// ─── Download ─────────────────────────────────────────────────────────────────

export async function downloadPDF(elementId, filename = "documento.pdf") {
  const blob = await generatePDFBlob(elementId);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
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

// ─── Impressão (mesmo PDF do download, abre para imprimir) ───────────────────

/**
 * Gera o mesmo PDF do download e abre o diálogo de impressão do browser.
 * Garante visual idêntico entre "Imprimir" e "Baixar PDF".
 */
export async function printElement(elementId) {
  const blob = await generatePDFBlob(elementId);
  const url  = URL.createObjectURL(blob);

  // Abre o PDF em iframe oculto e dispara impressão
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;width:0;height:0;border:none;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);
  iframe.src = url;

  iframe.onload = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch {
      // Fallback: abre o PDF em nova aba (o browser oferece impressão nativo)
      window.open(url, "_blank");
    }
  };

  // Limpa após 3 minutos
  setTimeout(() => {
    if (document.body.contains(iframe)) document.body.removeChild(iframe);
    URL.revokeObjectURL(url);
  }, 180_000);
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

// Alias legado
export async function printFromCanvas(elementId) {
  return printElement(elementId);
}

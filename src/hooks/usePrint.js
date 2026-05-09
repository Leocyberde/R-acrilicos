/**
 * usePrint.js
 *
 * FIX #5 — Imagens com CORS agora são pré-convertidas para base64 antes do clone,
 *           garantindo que logos externas apareçam corretamente na impressão.
 *
 * NOTE: Com o novo DownloadPDF.jsx (FIX #1), printElement ainda é usado para o
 * caminho de impressão via CSS (@media print) quando o usuário prefere o layout
 * visual do painel em vez do PDF gerado pelo @react-pdf/renderer.
 */
export function usePrint() {
  /**
   * Converte todas as <img> do elemento para base64 para evitar quebra de CORS
   * na impressão (o clone não herda credenciais de sessão).
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
            const clone = new Image();
            clone.crossOrigin = "anonymous";
            clone.onload = () => {
              canvas.width = clone.naturalWidth;
              canvas.height = clone.naturalHeight;
              ctx.drawImage(clone, 0, 0);
              try {
                img.src = canvas.toDataURL("image/png");
              } catch {
                // CORS bloqueou mesmo com crossOrigin — mantém src original
              }
              resolve();
            };
            clone.onerror = () => resolve(); // falha silenciosa, mantém src
            clone.src = img.src;
          })
      )
    );
  }

  const printElement = async (elementId) => {
    const el = document.getElementById(elementId);
    if (!el) return;

    const container = document.createElement("div");
    container.className = "print-only-container";
    container.style.cssText = "width:100%;margin:0;padding:0;font-size:initial;";

    const clone = el.cloneNode(true);
    clone.style.cssText = "margin:0;padding:0;font-size:initial;";
    container.appendChild(clone);

    // FIX #5 — resolve imagens antes de montar o clone no DOM
    await resolveImages(container);

    document.body.appendChild(container);
    document.body.classList.add("printing");

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      document.body.classList.remove("printing");
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    };

    window.addEventListener("afterprint", cleanup, { once: true });

    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.warn("Print failed:", e);
      } finally {
        setTimeout(cleanup, 500);
      }
    }, 500);
  };

  return { printElement };
}

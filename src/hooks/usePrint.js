export function usePrint() {
  const printElement = (elementId) => {
    const el = document.getElementById(elementId);
    if (!el) return;

    const container = document.createElement("div");
    container.className = "print-only-container";
    container.style.cssText = "width:100%;margin:0;padding:0;font-size:initial;";

    const clone = el.cloneNode(true);
    clone.style.cssText = "margin:0;padding:0;font-size:initial;";
    container.appendChild(clone);
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

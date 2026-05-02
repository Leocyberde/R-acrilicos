export function usePrint() {
  const printElement = (elementId) => {
    const el = document.getElementById(elementId);
    if (!el) return;

    const container = document.createElement("div");
    container.className = "print-only-container";
    container.style.cssText = "width:100%;margin:0;padding:0;line-height:normal;font-size:initial;";

    const clone = el.cloneNode(true);
    clone.style.cssText = "margin:0;padding:0;line-height:normal;font-size:initial;";
    container.appendChild(clone);
    document.body.appendChild(container);
    document.body.classList.add("printing");

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove("printing");
        document.body.removeChild(container);
      }, 100);
    }, 1000);
  };

  return { printElement };
}

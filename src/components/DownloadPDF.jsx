import html2canvas from "html2canvas";
import jsPDF from "jspdf";

async function captureCanvas(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return null;

  const prevDisplay = element.style.display;
  const prevVisibility = element.style.visibility;
  const prevPosition = element.style.position;
  const prevZIndex = element.style.zIndex;

  element.style.display = "block";
  element.style.visibility = "visible";
  element.style.position = "static";
  element.style.zIndex = "auto";

  await new Promise((r) => setTimeout(r, 600));

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: "#ffffff",
    scrollX: 0,
    scrollY: -window.scrollY,
    windowWidth: document.documentElement.scrollWidth,
    windowHeight: document.documentElement.scrollHeight,
  });

  element.style.display = prevDisplay;
  element.style.visibility = prevVisibility;
  element.style.position = prevPosition;
  element.style.zIndex = prevZIndex;

  return canvas;
}

export async function downloadPDF(elementId, filename) {
  const canvas = await captureCanvas(elementId);
  if (!canvas) return;

  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidthMm = 210;
  const pageHeightMm = 297;
  const imgWidthMm = pageWidthMm;
  const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

  const totalPages = Math.max(1, Math.round(imgHeightMm / pageHeightMm));

  for (let i = 0; i < totalPages; i++) {
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, -(i * pageHeightMm), imgWidthMm, imgHeightMm);
  }

  pdf.save(filename);
}

export async function printFromCanvas(elementId) {
  const canvas = await captureCanvas(elementId);
  if (!canvas) return;

  const imgData = canvas.toDataURL("image/jpeg", 0.95);

  const pageWidthMm = 210;
  const imgHeightMm = (canvas.height * pageWidthMm) / canvas.width;
  const pageHeightMm = 297;
  const totalPages = Math.max(1, Math.round(imgHeightMm / pageHeightMm));

  const pages = Array.from({ length: totalPages }, (_, i) => {
    const offsetMm = i * pageHeightMm;
    return `<div style="width:210mm;height:297mm;overflow:hidden;page-break-after:${i < totalPages - 1 ? 'always' : 'auto'};position:relative;">
      <img src="${imgData}" style="width:210mm;height:${imgHeightMm}mm;position:absolute;top:-${offsetMm}mm;left:0;" />
    </div>`;
  }).join('');

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: A4 portrait; margin: 0; }
  body { background: #fff; }
  @media print { body { margin: 0; } }
</style></head><body>${pages}</body></html>`);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 600);
}

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function downloadPDF(elementId, filename) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const originalStyle = element.getAttribute("style") || "";
  element.style.cssText =
    "position:fixed;top:0;left:0;width:210mm;z-index:-9999;background:white;visibility:visible;";

  await new Promise((r) => setTimeout(r, 600));

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: "#ffffff",
    scrollX: 0,
    scrollY: 0,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  element.setAttribute("style", originalStyle);

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

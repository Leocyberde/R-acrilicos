import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function downloadPDF(elementId, filename) {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Temporarily show print content
  const printElements = element.querySelectorAll('.print\\:block');
  const noPrintElements = element.querySelectorAll('.no-print');
  
  printElements.forEach(el => el.style.display = 'block');
  noPrintElements.forEach(el => el.style.display = 'none');

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });

  // Restore display
  printElements.forEach(el => el.style.display = '');
  noPrintElements.forEach(el => el.style.display = '');

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const imgWidth = 210;
  const pageHeight = 297;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}
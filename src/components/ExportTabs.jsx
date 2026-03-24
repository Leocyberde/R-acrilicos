import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { toast } from "sonner";

export default function ExportTabs({ data, filename, columns, onPDF }) {
  const [exporting, setExporting] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handlePDF = async () => {
    if (onPDF) {
      setExporting(true);
      try {
        await onPDF();
        toast.success("PDF gerado com sucesso");
      } catch (error) {
        console.error(error);
        toast.error("Erro ao gerar PDF");
      } finally {
        setExporting(false);
      }
      return;
    }

    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text(filename, 14, 22);
      
      let yPosition = 32;
      const pageHeight = doc.internal.pageSize.getHeight();
      const rowHeight = 8;

      data.forEach((item, idx) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(10);
        columns.forEach((col) => {
          const value = item[col.key];
          const displayValue = col.format ? col.format(value) : value;
          doc.text(`${col.label}: ${displayValue}`, 14, yPosition);
          yPosition += rowHeight;
        });
        
        yPosition += 4;
      });

      doc.save(`${filename}.pdf`);
      toast.success("PDF gerado com sucesso");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setExporting(false);
    }
  };

  const handleExcel = () => {
    setExporting(true);
    try {
      const csvData = data.map(item => {
        return columns.map(col => {
          const value = item[col.key];
          const displayValue = col.format ? col.format(value) : value;
          return `"${displayValue}"`;
        }).join(",");
      });

      const header = columns.map(col => `"${col.label}"`).join(",");
      const csvContent = [header, ...csvData].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Arquivo exportado com sucesso");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao exportar");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handlePrint}
        disabled={exporting}
        className="text-xs"
      >
        <Printer className="h-3.5 w-3.5 mr-1.5" />
        Imprimir
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handlePDF}
        disabled={exporting}
        className="text-xs"
      >
        <Download className="h-3.5 w-3.5 mr-1.5" />
        PDF
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleExcel}
        disabled={exporting}
        className="text-xs"
      >
        <Download className="h-3.5 w-3.5 mr-1.5" />
        Excel
      </Button>
    </div>
  );
}
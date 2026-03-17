import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, DollarSign, Clock, CheckCircle2, AlertCircle, Edit2, Check, X, Download, Printer, FileJson, Sheet } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";

export default function Financial() {
  const [payments, setPayments] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchClient, setSearchClient] = useState("");
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [editData, setEditData] = useState({});
  const navigate = useNavigate();
  const printRef = useRef();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [financialData, receiptsData] = await Promise.all([
      base44.entities.Financial.list("-created_date", 500),
      base44.entities.Receipt.list("-created_date", 500)
    ]);
    setPayments(financialData);
    setReceipts(receiptsData);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filteredPayments = payments.filter(p => 
    p.client_name?.toLowerCase().includes(searchClient.toLowerCase())
  );

  const filteredReceipts = receipts.filter(r => 
    r.client_name?.toLowerCase().includes(searchClient.toLowerCase())
  );

  const paymentMethods = {
    dinheiro: "Dinheiro",
    pix: "PIX",
    cartao_credito: "Cartão de Crédito",
    cartao_debito: "Cartão de Débito",
    boleto: "Boleto",
    transferencia: "Transferência"
  };

  const handleEditReceipt = (receipt) => {
    setEditingReceipt(receipt.id);
    setEditData({
      payment_method: receipt.payment_method || "",
      due_date: receipt.due_date || ""
    });
  };

  const handleSaveReceipt = async (id) => {
    try {
      await base44.entities.Receipt.update(id, editData);
      setReceipts(receipts.map(r => r.id === id ? { ...r, ...editData } : r));
      setEditingReceipt(null);
      toast.success("Recibo atualizado com sucesso");
    } catch (error) {
      toast.error("Erro ao atualizar recibo");
    }
  };

  const handleCancelEdit = () => {
    setEditingReceipt(null);
    setEditData({});
  };

  const totalReceivable = payments.reduce((sum, p) => {
    const unpaid = (p.installments || []).filter(i => i.status !== "pago").reduce((s, i) => s + (i.amount || 0), 0);
    return sum + unpaid;
  }, 0);

  const totalReceived = payments.reduce((sum, p) => {
    const paid = (p.installments || []).filter(i => i.status === "pago").reduce((s, i) => s + (i.amount || 0), 0);
    return sum + paid;
  }, 0);

  const totalOverdue = payments.reduce((sum, p) => {
    const now = new Date();
    const overdue = (p.installments || []).filter(i => {
      if (i.status === "pago" || !i.due_date) return false;
      return new Date(i.due_date + "T12:00:00") < now;
    }).reduce((s, i) => s + (i.amount || 0), 0);
    return sum + overdue;
  }, 0);

  const downloadReport = () => {
    const reportData = filteredReceipts.map(r => ({
      Cliente: r.client_name || "",
      Job: r.job || "",
      Valor: `R$ ${(r.total_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      Pagamento: paymentMethods[r.payment_method] || "",
      Vencimento: r.due_date ? new Date(r.due_date).toLocaleDateString("pt-BR") : "",
      Criado: new Date(r.created_date).toLocaleDateString("pt-BR")
    }));

    const headers = ["Cliente", "Job", "Valor", "Pagamento", "Vencimento", "Criado"];
    const csvContent = [
      headers.join(","),
      ...reportData.map(row => headers.map(h => `"${row[h]}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio-recibos-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Relatório baixado com sucesso");
  };

  const handlePrintReport = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório Financeiro</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; color: #1e293b; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .summary-card { border: 1px solid #cbd5e1; padding: 15px; border-radius: 5px; }
            .summary-card p { margin: 0; color: #64748b; font-size: 12px; }
            .summary-card .value { font-size: 18px; font-weight: bold; color: #1e293b; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #e2e8f0; padding: 10px; text-align: left; font-weight: bold; border: 1px solid #cbd5e1; }
            td { padding: 8px; border: 1px solid #cbd5e1; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer { margin-top: 30px; text-align: center; color: #64748b; font-size: 12px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>Relatório Financeiro</h1>
          <p style="text-align: center; color: #64748b; margin-bottom: 20px;">Gerado em ${new Date().toLocaleDateString("pt-BR")}</p>
          
          <div class="summary">
            <div class="summary-card">
              <p>A Receber</p>
              <div class="value">R$ ${totalReceivable.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="summary-card">
              <p>Recebido</p>
              <div class="value">R$ ${totalReceived.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="summary-card">
              <p>Vencido</p>
              <div class="value">R$ ${totalOverdue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="summary-card">
              <p>Total</p>
              <div class="value">R$ ${(totalReceivable + totalReceived).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Job</th>
                <th>Valor</th>
                <th>Pagamento</th>
                <th>Vencimento</th>
                <th>Criado</th>
              </tr>
            </thead>
            <tbody>
              ${filteredReceipts.map(r => `
                <tr>
                  <td>${r.client_name || ""}</td>
                  <td>${r.job || ""}</td>
                  <td>R$ ${(r.total_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  <td>${paymentMethods[r.payment_method] || ""}</td>
                  <td>${r.due_date ? new Date(r.due_date).toLocaleDateString("pt-BR") : ""}</td>
                  <td>${new Date(r.created_date).toLocaleDateString("pt-BR")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="footer">
            <p>Relatório gerado pelo sistema GestãoPro</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  const downloadPDFReport = async () => {
    const element = document.createElement("div");
    element.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h1 style="text-align: center; color: #1e293b; margin-bottom: 10px;">Relatório Financeiro</h1>
        <p style="text-align: center; color: #64748b; margin-bottom: 20px;">Gerado em ${new Date().toLocaleDateString("pt-BR")}</p>
        
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px;">
          <div style="border: 1px solid #cbd5e1; padding: 15px; border-radius: 5px;">
            <p style="margin: 0; color: #64748b; font-size: 12px;">A Receber</p>
            <div style="font-size: 18px; font-weight: bold; color: #1e293b; margin-top: 5px;">R$ ${totalReceivable.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
          </div>
          <div style="border: 1px solid #cbd5e1; padding: 15px; border-radius: 5px;">
            <p style="margin: 0; color: #64748b; font-size: 12px;">Recebido</p>
            <div style="font-size: 18px; font-weight: bold; color: #1e293b; margin-top: 5px;">R$ ${totalReceived.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
          </div>
          <div style="border: 1px solid #cbd5e1; padding: 15px; border-radius: 5px;">
            <p style="margin: 0; color: #64748b; font-size: 12px;">Vencido</p>
            <div style="font-size: 18px; font-weight: bold; color: #1e293b; margin-top: 5px;">R$ ${totalOverdue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
          </div>
          <div style="border: 1px solid #cbd5e1; padding: 15px; border-radius: 5px;">
            <p style="margin: 0; color: #64748b; font-size: 12px;">Total</p>
            <div style="font-size: 18px; font-weight: bold; color: #1e293b; margin-top: 5px;">R$ ${(totalReceivable + totalReceived).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr>
              <th style="background-color: #e2e8f0; padding: 10px; text-align: left; font-weight: bold; border: 1px solid #cbd5e1;">Cliente</th>
              <th style="background-color: #e2e8f0; padding: 10px; text-align: left; font-weight: bold; border: 1px solid #cbd5e1;">Job</th>
              <th style="background-color: #e2e8f0; padding: 10px; text-align: left; font-weight: bold; border: 1px solid #cbd5e1;">Valor</th>
              <th style="background-color: #e2e8f0; padding: 10px; text-align: left; font-weight: bold; border: 1px solid #cbd5e1;">Pagamento</th>
              <th style="background-color: #e2e8f0; padding: 10px; text-align: left; font-weight: bold; border: 1px solid #cbd5e1;">Vencimento</th>
              <th style="background-color: #e2e8f0; padding: 10px; text-align: left; font-weight: bold; border: 1px solid #cbd5e1;">Criado</th>
            </tr>
          </thead>
          <tbody>
            ${filteredReceipts.map((r, idx) => `
              <tr style="background-color: ${idx % 2 === 0 ? "#f8fafc" : "white"};">
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${r.client_name || ""}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${r.job || ""}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">R$ ${(r.total_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${paymentMethods[r.payment_method] || ""}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${r.due_date ? new Date(r.due_date).toLocaleDateString("pt-BR") : ""}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${new Date(r.created_date).toLocaleDateString("pt-BR")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div style="margin-top: 30px; text-align: center; color: #64748b; font-size: 12px;">
          <p>Relatório gerado pelo sistema GestãoPro</p>
        </div>
      </div>
    `;

    document.body.appendChild(element);
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    document.body.removeChild(element);

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= 297;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
    }

    pdf.save(`relatorio-financeiro-${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("Relatório PDF baixado com sucesso");
  };

  const downloadExcelReport = () => {
    const reportData = filteredReceipts.map(r => ({
      Cliente: r.client_name || "",
      Job: r.job || "",
      Valor: r.total_amount || 0,
      "Forma de Pagamento": paymentMethods[r.payment_method] || "",
      Vencimento: r.due_date ? new Date(r.due_date).toLocaleDateString("pt-BR") : "",
      Criado: new Date(r.created_date).toLocaleDateString("pt-BR")
    }));

    const csvContent = [
      ["Cliente", "Job", "Valor", "Forma de Pagamento", "Vencimento", "Criado"].join(","),
      ...reportData.map(row => [row.Cliente, row.Job, row.Valor, row["Forma de Pagamento"], row.Vencimento, row.Criado].map(v => `"${v}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio-recibos-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Relatório em Excel baixado com sucesso");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financeiro</h1>
          <p className="text-slate-500 mt-0.5">Gestão de pagamentos e recebimentos</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handlePrintReport}>
            <Printer className="h-4 w-4 mr-2" /> Imprimir
          </Button>
          <Button variant="outline" onClick={downloadPDFReport}>
            <FileJson className="h-4 w-4 mr-2" /> PDF
          </Button>
          <Button variant="outline" onClick={downloadExcelReport}>
            <Sheet className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => navigate(createPageUrl("FinancialCreate"))}>
            <Plus className="h-4 w-4 mr-2" /> Novo Pagamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">A Receber</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  R$ {totalReceivable.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Recebido</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  R$ {totalReceived.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Vencido</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  R$ {totalOverdue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  R$ {(totalReceivable + totalReceived).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="Buscar por cliente..." value={searchClient} onChange={e => setSearchClient(e.target.value)} className="pl-9" />
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recibos Emitidos ({filteredReceipts.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={downloadReport}>
                <Download className="h-4 w-4 mr-2" />
                Baixar Relatório
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredReceipts.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">Nenhum recibo encontrado</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Cliente</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Job</th>
                      <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Valor</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Pagamento</th>
                      <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Vencimento</th>
                      <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredReceipts.map(r => {
                      const isEditing = editingReceipt === r.id;
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3 cursor-pointer" onClick={() => navigate(createPageUrl("ReceiptDetail") + `?id=${r.id}`)}>
                            <p className="text-sm font-medium text-slate-800">{r.client_name}</p>
                          </td>
                          <td className="px-5 py-3 hidden sm:table-cell cursor-pointer" onClick={() => navigate(createPageUrl("ReceiptDetail") + `?id=${r.id}`)}>
                            <span className="text-sm text-slate-600">{r.job || "—"}</span>
                          </td>
                          <td className="px-5 py-3 text-right cursor-pointer" onClick={() => navigate(createPageUrl("ReceiptDetail") + `?id=${r.id}`)}>
                            <span className="text-sm font-semibold text-slate-800">
                              R$ {(r.total_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-5 py-3 hidden lg:table-cell" onClick={(e) => isEditing && e.stopPropagation()}>
                            {isEditing ? (
                              <Select value={editData.payment_method} onValueChange={(val) => setEditData({ ...editData, payment_method: val })}>
                                <SelectTrigger className="h-8 w-full">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(paymentMethods).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-sm text-slate-600">
                                {r.payment_method ? paymentMethods[r.payment_method] : "—"}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-center hidden md:table-cell" onClick={(e) => isEditing && e.stopPropagation()}>
                            {isEditing ? (
                              <Input 
                                type="date" 
                                value={editData.due_date} 
                                onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                                className="h-8 text-xs"
                              />
                            ) : (
                              <span className="text-xs text-slate-600">
                                {r.due_date ? new Date(r.due_date + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600 hover:text-green-700" onClick={() => handleSaveReceipt(r.id)}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700" onClick={handleCancelEdit}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleEditReceipt(r)}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pagamentos ({filteredPayments.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredPayments.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">Nenhum pagamento encontrado</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Cliente</th>
                      <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Valor Total</th>
                      <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Parcelas</th>
                      <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                      <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredPayments.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => navigate(createPageUrl("FinancialDetail") + `?id=${p.id}`)}>
                        <td className="px-5 py-3">
                          <p className="text-sm font-medium text-slate-800">{p.client_name}</p>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="text-sm font-semibold text-slate-800">
                            R$ {(p.total_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="text-sm text-slate-600">{p.installments?.length || 0}</span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="text-xs text-slate-600">{new Date(p.created_date).toLocaleDateString("pt-BR")}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
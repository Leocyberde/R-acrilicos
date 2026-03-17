import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, CheckCircle, XCircle, Edit, Wrench, Trash2, RefreshCw, Receipt as ReceiptIcon, Download, Send } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import StatusBadge from "@/components/StatusBadge";
import PrintHeader from "@/components/PrintHeader";
import BudgetForm from "@/components/BudgetForm";
import { downloadPDF } from "@/components/DownloadPDF";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function BudgetDetail() {
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [layoutSettings, setLayoutSettings] = useState(null);
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  useEffect(() => {
    async function load() {
      const [found, layouts] = await Promise.all([
        base44.entities.Budget.get(id),
        base44.entities.LayoutSettings.list(),
      ]);
      setBudget(found);
      const budgetLayout = layouts.find(l => l.document_type === "budget") || {};
      setLayoutSettings(budgetLayout);
      setLoading(false);
    }
    load();
  }, [id]);

  const updateStatus = async (status) => {
    setSaving(true);
    await base44.entities.Budget.update(id, { status });
    setBudget(prev => ({ ...prev, status }));
    setSaving(false);
  };

  const handleApproveAndCreateOS = async () => {
    setSaving(true);
    await base44.entities.Budget.update(id, { status: "aprovado" });
    const osItems = (budget.items || []).map(item => ({ name: item.name, quantity: item.quantity }));
    const os = await base44.entities.WorkOrder.create({
      budget_id: id,
      client_name: budget.client_name,
      client_phone: budget.client_phone,
      client_address: budget.client_address,
      job: budget.job,
      producer: budget.producer,
      description: budget.description,
      items: osItems,
      status: "pendente",
      notes: budget.notes,
    });
    const receipt = await base44.entities.Receipt.create({
      budget_id: id,
      work_order_id: os.id,
      client_name: budget.client_name,
      client_phone: budget.client_phone,
      client_email: budget.client_email,
      client_address: budget.client_address,
      job: budget.job,
      producer: budget.producer,
      description: budget.description,
      items: budget.items,
      subtotal: budget.subtotal,
      discount: budget.discount,
      total_amount: budget.total,
      total_label: budget.total_label,
      apply_margin: budget.apply_margin,
      margin_percentage: budget.margin_percentage,
      total_with_margin: budget.total_with_margin,
      total_with_margin_label: budget.total_with_margin_label,
      notes: budget.notes,
    });
    setBudget(prev => ({ ...prev, status: "aprovado" }));
    setSaving(false);
    navigate(createPageUrl("ReceiptDetail") + `?id=${receipt.id}`);
  };

  const handleUpdate = async (data) => {
    setSaving(true);
    await base44.entities.Budget.update(id, data);
    setBudget(prev => ({ ...prev, ...data }));
    setSaving(false);
    setEditing(false);
  };

  const handleDelete = async () => {
    await base44.entities.Budget.delete(id);
    navigate(createPageUrl("Budgets"));
  };

  const handleSendToClient = async () => {
    setSaving(true);
    // Gera o PDF do orçamento
    const element = document.getElementById('budget-content');
    const printElements = element.querySelectorAll('.print\\:block');
    const noPrintElements = element.querySelectorAll('.no-print');
    printElements.forEach(el => el.style.display = 'block');
    noPrintElements.forEach(el => el.style.display = 'none');

    const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });

    printElements.forEach(el => el.style.display = '');
    noPrintElements.forEach(el => el.style.display = '');

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
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

    const pdfBlob = pdf.output('blob');
    const pdfFile = new File([pdfBlob], `orcamento-${String(budget.id ?? '')}.pdf`, { type: 'application/pdf' });

    // Upload do PDF
    const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });

    // Salva referência do PDF no orçamento para que o cliente veja
    await base44.entities.Budget.update(id, { pdf_url: file_url, pdf_sent: true });
    setBudget(prev => ({ ...prev, pdf_url: file_url, pdf_sent: true }));

    setSaving(false);
    alert("Orçamento enviado com sucesso! O cliente pode visualizá-lo no portal.");
  };

  const handleCreateReceipt = async () => {
    setSaving(true);
    const receipt = await base44.entities.Receipt.create({
      budget_id: id,
      client_name: budget.client_name,
      client_phone: budget.client_phone,
      client_email: budget.client_email,
      client_address: budget.client_address,
      job: budget.job,
      producer: budget.producer,
      description: budget.description,
      emission_date: budget.emission_date || new Date().toISOString().split('T')[0],
      items: budget.items,
      subtotal: budget.subtotal,
      discount: budget.discount,
      total_amount: budget.total,
      total_label: budget.total_label,
      apply_margin: budget.apply_margin,
      margin_percentage: budget.margin_percentage,
      total_with_margin: budget.total_with_margin,
      total_with_margin_label: budget.total_with_margin_label,
      notes: budget.notes,
    });
    setSaving(false);
    navigate(createPageUrl("ReceiptDetail") + `?id=${receipt.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Orçamento não encontrado</p>
        <Button className="mt-4" onClick={() => navigate(createPageUrl("Budgets"))}>Voltar</Button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setEditing(false)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Editar Orçamento</h1>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <BudgetForm initialData={budget} onSubmit={handleUpdate} onCancel={() => setEditing(false)} loading={saving} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions bar - hidden in print */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("Budgets"))}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Orçamento #{String(budget.id ?? '')}</h1>
            <p className="text-slate-500 mt-0.5">{budget.client_name}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={saving}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Alterar Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => updateStatus("pendente")} disabled={budget.status === "pendente"}>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>Pendente</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus("aprovado")} disabled={budget.status === "aprovado"}>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Aprovado</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus("reprovado")} disabled={budget.status === "reprovado"}>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <span>Reprovado</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Imprimir
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadPDF('budget-content', `orcamento-${String(budget.id ?? '')}.pdf`)}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendToClient}
            disabled={saving}
            className={budget.pdf_sent ? "border-green-500 text-green-700" : "border-indigo-400 text-indigo-700"}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {budget.pdf_sent ? "Reenviar ao Cliente" : "Enviar ao Cliente"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Edit className="h-3.5 w-3.5 mr-1.5" /> Editar
          </Button>
          {budget.status === "pendente" && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleApproveAndCreateOS} disabled={saving}>
              <Wrench className="h-3.5 w-3.5 mr-1.5" /> Criar O.S. e Recibo
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Print version */}
      <div id="budget-content" className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 print:border-0 print:shadow-none print:p-0" style={{
        fontFamily: layoutSettings?.font_family === 'serif' ? 'Georgia, serif' : layoutSettings?.font_family === 'monospace' ? 'monospace' : '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: `${layoutSettings?.font_size || 14}px`,
        color: layoutSettings?.text_color || '#1f2937'
      }}>
        <style>{`
          #budget-content * {
            color: ${layoutSettings?.text_color || '#1f2937'} !important;
          }
          #budget-content .theme-color {
            background-color: ${layoutSettings?.theme_color || '#1e293b'} !important;
            border-color: ${layoutSettings?.theme_color || '#1e293b'} !important;
          }
        `}</style>
        <div className="hidden print:block">
          <PrintHeader title="ORÇAMENTO" number={String(budget.id ?? '')} />
        </div>

        <div className="flex items-center justify-between mb-6 no-print">
          <StatusBadge status={budget.status} />
          <span className="text-xs text-slate-400">Criado em {new Date(budget.created_date).toLocaleDateString("pt-BR")}</span>
        </div>

        {budget.emission_date && (
          <div className="mb-4 pb-4 border-b border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Data de Emissão</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">{new Date(budget.emission_date).toLocaleDateString("pt-BR")}</p>
          </div>
        )}

        {/* Client info */}
        <div className="pb-6 border-b border-slate-100 space-y-4">
          {/* First row: Cliente, Job, Produtor (lado a lado na impressão) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Cliente</p>
              <p className="text-base font-semibold text-slate-900 mt-1">{budget.client_name}</p>
            </div>
            {budget.job && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Job</p>
                <p className="text-sm text-slate-700 mt-1">{budget.job}</p>
              </div>
            )}
            {budget.producer && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Produtor</p>
                <p className="text-sm text-slate-700 mt-1">{budget.producer}</p>
              </div>
            )}
          </div>

          {/* Other fields below */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {budget.client_phone && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Telefone</p>
                <p className="text-sm text-slate-700 mt-1">{budget.client_phone}</p>
              </div>
            )}
            {budget.client_email && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Email</p>
                <p className="text-sm text-slate-700 mt-1">{budget.client_email}</p>
              </div>
            )}
            {budget.client_address && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Endereço</p>
                <p className="text-sm text-slate-700 mt-1">{budget.client_address}</p>
              </div>
            )}
            {budget.validity_date && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Validade</p>
                <p className="text-sm text-slate-700 mt-1">{new Date(budget.validity_date).toLocaleDateString("pt-BR")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {budget.description && (
          <div className="py-4 border-b border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Descrição</p>
            <p className="text-sm text-slate-700">{budget.description}</p>
          </div>
        )}

        {/* Items table */}
        {budget.items?.length > 0 && (
          <div className="py-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase py-2 pr-4">Item</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase py-2 px-4">Qtd</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase py-2 px-4">Preço Unit.</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase py-2 pl-4">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {budget.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2.5 pr-4 text-sm text-slate-800">{item.name}</td>
                    <td className="py-2.5 px-4 text-sm text-slate-600 text-center">{item.quantity}</td>
                    <td className="py-2.5 px-4 text-sm text-slate-600 text-right">R$ {(item.unit_price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    <td className="py-2.5 pl-4 text-sm font-medium text-slate-800 text-right">R$ {((item.quantity || 0) * (item.unit_price || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-medium">R$ {(budget.subtotal || budget.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
              
              {budget.discount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span className="no-print">Desconto ({budget.discount}%):</span>
                  <span className="print-only">Desconto:</span>
                  <span>- R$ {((budget.subtotal || budget.total || 0) * (budget.discount / 100)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              
              <div className="flex justify-between text-base font-bold border-t-2 border-slate-900 pt-3">
                <span className="text-slate-900">{budget.total_label || "Total sem Nota"}:</span>
                <span className="text-slate-900">R$ {(budget.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
              
              {budget.total_with_margin && (
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span className="text-slate-900 no-print">{budget.total_with_margin_label || "Total com Nota"} (+{budget.margin_percentage || 15}%):</span>
                  <span className="text-slate-900 print-only">{budget.total_with_margin_label || "Total com Nota"}:</span>
                  <span className="text-slate-900">R$ {budget.total_with_margin.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {budget.notes && (
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Observações</p>
            <p className="text-sm text-slate-600">{budget.notes}</p>
          </div>
        )}

        {/* Print footer */}

      </div>
    </div>
  );
}
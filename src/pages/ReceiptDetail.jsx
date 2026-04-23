import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Trash2, Edit, Download, Lock } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import PrintHeader from "@/components/PrintHeader";
import BudgetForm from "@/components/BudgetForm";
import { downloadPDF } from "@/components/DownloadPDF";
import { formatDateBR } from "@/utils/dateFormat";
import { toast } from "sonner";
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

export default function ReceiptDetail() {
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [layoutSettings, setLayoutSettings] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  useEffect(() => {
    async function load() {
      const [found, layouts, settingsList] = await Promise.all([
        base44.entities.Receipt.get(id),
        base44.entities.LayoutSettings.list(),
        base44.entities.Settings.list(),
      ]);
      setReceipt(found);
      const receiptLayout = layouts.find(l => l.document_type === "receipt") || {};
      setLayoutSettings(receiptLayout);
      if (settingsList.length > 0) setCompanySettings(settingsList[0]);
      setLoading(false);
    }
    load();
  }, [id]);

  const handleDelete = async () => {
    await base44.entities.Receipt.delete(id);
    navigate(createPageUrl("Receipts"));
  };

  const handleClose = async () => {
    setSaving(true);
    try {
      await base44.entities.Receipt.update(id, { status: "recibo_fechado" });
      setReceipt(prev => ({ ...prev, status: "recibo_fechado" }));
      toast.success("Recibo fechado com sucesso!");
    } catch {
      toast.error("Erro ao fechar recibo.");
    }
    setSaving(false);
  };

  const handleUpdate = async (data) => {
    setSaving(true);
    await base44.entities.Receipt.update(id, {
      client_name: data.client_name,
      client_phone: data.client_phone,
      client_email: data.client_email,
      client_address: data.client_address,
      job: data.job,
      producer: data.producer,
      description: data.description,
      items: data.items,
      subtotal: data.subtotal,
      discount: data.discount,
      total_amount: data.total,
      total_label: data.total_label,
      apply_margin: data.apply_margin,
      margin_percentage: data.margin_percentage,
      total_with_margin: data.total_with_margin,
      total_with_margin_label: data.total_with_margin_label,
      notes: data.notes,
    });
    const updated = await base44.entities.Receipt.list();
    setReceipt(updated.find(r => r.id === id));
    setSaving(false);
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Recibo não encontrado</p>
        <Button className="mt-4" onClick={() => navigate(createPageUrl("Receipts"))}>Voltar</Button>
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
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Editar Recibo</h1>
            <p className="text-slate-500 mt-0.5">#{String(receipt.id ?? '')}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <BudgetForm
            initialData={{
              client_name: receipt.client_name,
              client_phone: receipt.client_phone,
              client_email: receipt.client_email,
              client_address: receipt.client_address,
              job: receipt.job,
              producer: receipt.producer,
              description: receipt.description,
              items: receipt.items || [],
              notes: receipt.notes,
              status: "aprovado",
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(false)}
            loading={saving}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("Receipts"))}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recibo #{String(receipt.id ?? '')}</h1>
            <p className="text-slate-500 mt-0.5">{receipt.client_name}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <StatusBadge status={receipt.status || "em_aberto"} />
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Imprimir
          </Button>
          <Button variant="outline" size="sm" onClick={async () => {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`/api/receipts/${receipt.id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) { alert('Erro ao gerar PDF'); return; }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `recibo-${receipt.id}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
          }}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Edit className="h-3.5 w-3.5 mr-1.5" /> Editar
          </Button>
          {receipt.status !== "recibo_fechado" && (
            <Button
              size="sm"
              variant="outline"
              className="border-slate-400 text-slate-700 hover:bg-slate-100"
              onClick={handleClose}
              disabled={saving}
            >
              <Lock className="h-3.5 w-3.5 mr-1.5" /> Fechar Recibo
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
                <AlertDialogTitle>Excluir recibo?</AlertDialogTitle>
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

      {/* Receipt Document */}
      <div
        id="receipt-content"
        className="bg-white rounded-xl border border-slate-200 print:border-0 print:shadow-none print:rounded-none"
        style={{ fontFamily: '"Segoe UI", Arial, sans-serif', color: '#1a1a1a' }}
      >
        <div className="p-8 sm:p-10 print-doc">

          {/* ── COMPANY HEADER ── */}
          <div className="flex items-start justify-between pb-4 mb-4 border-b-2 border-slate-800">
            <div className="flex-1">
              {companySettings?.company_logo ? (
                <img src={companySettings.company_logo} alt="Logo" className="h-24 mb-2 object-contain" />
              ) : (
                <p className="text-xl font-bold text-slate-900">{companySettings?.company_name || "Minha Empresa"}</p>
              )}
              {companySettings?.company_logo && companySettings?.company_name && (
                <p className="text-xs font-semibold text-slate-600">{companySettings.company_name}</p>
              )}
              <div className="mt-1 space-y-0.5">
                {companySettings?.company_phone && (
                  <p className="text-xs text-slate-700">{companySettings.company_phone}</p>
                )}
                {companySettings?.company_email && (
                  <p className="text-xs text-slate-700">{companySettings.company_email}</p>
                )}
                {companySettings?.company_email2 && (
                  <p className="text-xs text-slate-700">{companySettings.company_email2}</p>
                )}
                {companySettings?.company_address && (
                  <p className="text-xs text-slate-700">{companySettings.company_address}</p>
                )}
              </div>
            </div>
            <div className="text-right ml-6">
              <p className="text-3xl font-bold text-slate-900 tracking-tight">Recibo</p>
              <p className="text-sm text-slate-600 mt-1">
                Data: {receipt.emission_date
                  ? formatDateBR(receipt.emission_date)
                  : new Date(receipt.created_date).toLocaleDateString("pt-BR")}
              </p>
              <div className="no-print mt-2">
                <StatusBadge status={receipt.status || "em_aberto"} />
              </div>
            </div>
          </div>

          {/* ── JOB / PRODUTOR / EMPRESA ── */}
          <div className="mb-5 pb-4 border-b border-slate-300">
            {receipt.job && (
              <div className="flex gap-2 mb-1">
                <span className="text-sm font-semibold text-slate-700 w-24 shrink-0">JOB:</span>
                <span className="text-sm text-slate-900">{receipt.job}</span>
              </div>
            )}
            <div className="flex gap-2 mb-1">
              <span className="text-sm font-semibold text-slate-700 w-24 shrink-0">Produtor:</span>
              <span className="text-sm font-bold text-slate-900">{receipt.producer || "—"}</span>
            </div>
            {receipt.client_name && (
              <div className="flex gap-2">
                <span className="text-sm font-semibold text-slate-700 w-24 shrink-0">Empresa:</span>
                <span className="text-sm font-bold text-slate-900">{receipt.client_name}</span>
              </div>
            )}
          </div>

          {/* ── DESCRIPTION (if any) ── */}
          {receipt.description && (
            <div className="mb-4 text-sm text-slate-600 italic">{receipt.description}</div>
          )}

          {/* ── ITEMS TABLE ── */}
          {receipt.items?.length > 0 && (
            <div className="mb-2">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-800">
                    <th className="text-left font-bold text-slate-800 py-2 pr-3">Item</th>
                    <th className="text-center font-bold text-slate-800 py-2 px-3 w-16">Qtd</th>
                    <th className="text-right font-bold text-slate-800 py-2 px-3 w-28">Preco.Uni</th>
                    <th className="text-right font-bold text-slate-800 py-2 pl-3 w-28">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.items.map((item, i) => (
                    <tr key={i} className="border-b border-slate-200">
                      <td className="py-2 pr-3 text-slate-800">{item.name}</td>
                      <td className="py-2 px-3 text-slate-700 text-center">{item.quantity}</td>
                      <td className="py-2 px-3 text-slate-700 text-right">
                        R$ {(item.unit_price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 pl-3 text-slate-800 text-right">
                        R$ {((item.quantity || 0) * (item.unit_price || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── TOTALS ── */}
          <div className="flex justify-end mt-3 mb-6">
            <div className="w-64 space-y-1">
              {receipt.discount > 0 && (
                <div className="flex justify-between text-sm text-red-600 pb-1">
                  <span>Desconto:</span>
                  <span>- R$ {Number(receipt.discount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-slate-800 pt-2">
                <span className="font-semibold text-sm text-slate-800">{receipt.total_label || "Sem Nota Total"}</span>
                <span className="font-bold text-sm text-slate-900">R${(receipt.total_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
              {receipt.total_with_margin > 0 && (
                <div className="flex justify-between border-t border-slate-400 pt-1">
                  <span className="font-semibold text-sm text-slate-800">{receipt.total_with_margin_label || "Com Nota Total"}</span>
                  <span className="font-bold text-sm text-slate-900">R${receipt.total_with_margin.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="text-right pt-1">
                <span className="text-xs text-slate-500 italic">Elaborado por: Gleissa</span>
              </div>
            </div>
          </div>

          {/* ── NOTES (receipt-specific) ── */}
          {receipt.notes && (
            <div className="mb-4 p-3 border border-slate-200 rounded text-sm text-slate-700 bg-slate-50">
              <p className="font-semibold text-slate-700 mb-1 uppercase text-xs tracking-wide">Observações</p>
              <p className="whitespace-pre-line">{receipt.notes}</p>
            </div>
          )}

          {/* ── THANK YOU FOOTER ── */}
          <div className="mt-8 pt-4 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-500">Caso você tenha alguma dúvida entre em contato conosco</p>
            <p className="text-sm font-bold text-slate-800 mt-1">AGRADECEMOS SUA PREFERÊNCIA!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
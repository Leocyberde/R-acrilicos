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
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  useEffect(() => {
    async function load() {
      const [found, layouts] = await Promise.all([
        base44.entities.Receipt.get(id),
        base44.entities.LayoutSettings.list(),
      ]);
      setReceipt(found);
      const receiptLayout = layouts.find(l => l.document_type === "receipt") || {};
      setLayoutSettings(receiptLayout);
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

      <div id="receipt-content" className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 print:border-0 print:shadow-none print:p-0" style={{
        fontFamily: layoutSettings?.font_family === 'serif' ? 'Georgia, serif' : layoutSettings?.font_family === 'monospace' ? 'monospace' : '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: `${layoutSettings?.font_size || 14}px`,
        color: layoutSettings?.text_color || '#1f2937'
      }}>
        <style>{`
          #receipt-content * {
            color: ${layoutSettings?.text_color || '#1f2937'} !important;
          }
          #receipt-content .theme-color {
            background-color: ${layoutSettings?.theme_color || '#1e293b'} !important;
            border-color: ${layoutSettings?.theme_color || '#1e293b'} !important;
          }
        `}</style>
        <div className="hidden print:block">
          <PrintHeader title="RECIBO" number={String(receipt.id ?? '')} />
        </div>

        <div className="flex items-center justify-between mb-6 no-print">
          <span className="text-xs text-slate-400">Criado em {new Date(receipt.created_date).toLocaleDateString("pt-BR")}</span>
        </div>

        {receipt.emission_date && (
          <div className="mb-4 pb-4 border-b border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Data de Emissão</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">{new Date(receipt.emission_date).toLocaleDateString("pt-BR")}</p>
          </div>
        )}

        <div className="pb-6 border-b border-slate-100 space-y-4">
          {/* First row: Cliente, Job, Produtor (lado a lado na impressão) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Cliente</p>
              <p className="text-base font-semibold text-slate-900 mt-1">{receipt.client_name}</p>
            </div>
            {receipt.job && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Job</p>
                <p className="text-sm text-slate-700 mt-1">{receipt.job}</p>
              </div>
            )}
            {receipt.producer && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Produtor</p>
                <p className="text-sm text-slate-700 mt-1">{receipt.producer}</p>
              </div>
            )}
          </div>

          {/* Other fields below */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {receipt.client_phone && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Telefone</p>
                <p className="text-sm text-slate-700 mt-1">{receipt.client_phone}</p>
              </div>
            )}
            {receipt.client_email && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Email</p>
                <p className="text-sm text-slate-700 mt-1">{receipt.client_email}</p>
              </div>
            )}
            {receipt.client_address && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Endereço</p>
                <p className="text-sm text-slate-700 mt-1">{receipt.client_address}</p>
              </div>
            )}
          </div>
        </div>

        {receipt.description && (
          <div className="py-4 border-b border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Descrição</p>
            <p className="text-sm text-slate-700">{receipt.description}</p>
          </div>
        )}

        {receipt.items && receipt.items.length > 0 && (
          <div className="py-4 border-b border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-3">Itens</p>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-2">#</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-2">Item</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-2">Qtd</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider py-2">Preço Unit.</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((item, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-2 text-sm text-slate-400">{i + 1}</td>
                    <td className="py-2 text-sm text-slate-800">{item.name}</td>
                    <td className="py-2 text-sm text-slate-600 text-center">{item.quantity}</td>
                    <td className="py-2 text-sm text-slate-600 text-right">R$ {(item.unit_price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 text-sm font-semibold text-slate-800 text-right">R$ {((item.quantity || 0) * (item.unit_price || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Subtotal:</span>
            <span className="font-medium">R$ {(receipt.subtotal || receipt.total_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          </div>
          
          {receipt.discount > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span className="no-print">Desconto ({receipt.discount}%):</span>
              <span className="print-only">Desconto:</span>
              <span>- R$ {((receipt.subtotal || receipt.total_amount || 0) * (receipt.discount / 100)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          
          <div className="flex justify-between text-base font-bold border-t-2 border-slate-900 pt-3">
            <span className="text-slate-900">{receipt.total_label || "Total sem Nota"}:</span>
            <span className="text-slate-900">R$ {(receipt.total_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          </div>
          
          {receipt.total_with_margin && (
            <div className="flex justify-between text-base font-bold border-t pt-2">
              <span className="text-slate-900 no-print">{receipt.total_with_margin_label || "Total com Nota"} (+{receipt.margin_percentage || 15}%):</span>
              <span className="text-slate-900 print-only">{receipt.total_with_margin_label || "Total com Nota"}:</span>
              <span className="text-slate-900">R$ {receipt.total_with_margin.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>

        {receipt.notes && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Observações</p>
            <p className="text-sm text-slate-700">{receipt.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
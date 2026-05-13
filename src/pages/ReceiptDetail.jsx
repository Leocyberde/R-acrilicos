import { useState, useEffect } from "react";
import { localClient } from "@/api/localClient";
import ReceiptPrintLayoutMultiPage from "@/components/ReceiptPrintLayoutMultiPage";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Trash2, Edit, Download, Lock, Send } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import PrintHeader from "@/components/PrintHeader";
import BudgetForm from "@/components/BudgetForm";
import { downloadReceiptPDF, printDocument } from "@/components/DownloadPDF";
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
  const [companySettings, setCompanySettings] = useState(null);
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  useEffect(() => {
    async function load() {
      const [found, settingsList] = await Promise.all([
        localClient.entities.Receipt.get(id),
        localClient.entities.Settings.list(),
      ]);
      setReceipt(found);
      if (settingsList.length > 0) setCompanySettings(settingsList[0]);
      setLoading(false);
    }
    load();
  }, [id]);

  const handleDelete = async () => {
    await localClient.entities.Receipt.delete(id);
    navigate(createPageUrl("Receipts"));
  };

  const handleSendToClient = async () => {
    setSaving(true);
    try {
      await localClient.entities.Receipt.update(id, { sent_to_client: true });
      setReceipt(prev => ({ ...prev, sent_to_client: true }));
      toast.success("Recibo enviado ao cliente com sucesso! Ele já pode visualizá-lo no portal.");
    } catch {
      toast.error("Erro ao enviar recibo ao cliente.");
    }
    setSaving(false);
  };

  const handleClose = async () => {
    setSaving(true);
    try {
      await localClient.entities.Receipt.update(id, { status: "recibo_fechado" });
      setReceipt(prev => ({ ...prev, status: "recibo_fechado" }));
      toast.success("Recibo fechado com sucesso!");
    } catch {
      toast.error("Erro ao fechar recibo.");
    }
    setSaving(false);
  };

  const handleUpdate = async (data) => {
    setSaving(true);
    await localClient.entities.Receipt.update(id, {
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
    const updated = await localClient.entities.Receipt.get(id);
    setReceipt(updated);
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
          <Button variant="outline" size="sm" onClick={async () => {
                  const tid = toast.loading('Gerando impressão...');
                  try {
                    await printDocument('receipt', receipt, companySettings);
                    toast.dismiss(tid);
                  } catch (e) {
                    toast.dismiss(tid);
                    toast.error('Erro ao imprimir');
                  }
                }}>
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendToClient}
            disabled={saving}
            className={receipt.sent_to_client ? "border-green-500 text-green-700" : "border-indigo-400 text-indigo-700"}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {receipt.sent_to_client ? "Reenviar ao Cliente" : "Enviar ao Cliente"}
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

      {/* Visualização — mesmo layout do PDF */}
      <div style={{ background: "#e5e7eb", padding: "24px 0", borderRadius: "8px", overflowX: "auto", marginTop: "24px" }}>
        <div style={{ width: "210mm", margin: "0 auto", boxShadow: "0 2px 16px rgba(0,0,0,0.18)" }}>
          <div id="receipt-print-layout">
            {receipt && <ReceiptPrintLayoutMultiPage receipt={receipt} />}
          </div>
        </div>
      </div>
    </div>
  );
}
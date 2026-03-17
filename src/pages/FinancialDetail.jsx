import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, CheckCircle, Trash2 } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
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

export default function FinancialDetail() {
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  useEffect(() => {
    async function load() {
      const data = await base44.entities.Financial.list();
      const found = data.find(p => p.id === id);
      setPayment(found);
      setLoading(false);
    }
    load();
  }, [id]);

  const updateInstallment = (index, field, value) => {
    const installments = [...(payment.installments || [])];
    installments[index] = { ...installments[index], [field]: value };
    setPayment(prev => ({ ...prev, installments }));
  };

  const markInstallmentPaid = async (index) => {
    const installments = [...(payment.installments || [])];
    installments[index] = { ...installments[index], status: "pago" };
    const allPaid = installments.every(i => i.status === "pago");
    const somePaid = installments.some(i => i.status === "pago");
    const newStatus = allPaid ? "pago" : somePaid ? "parcial" : "pendente";
    setSaving(true);
    await base44.entities.Financial.update(id, { installments, status: newStatus });
    setPayment(prev => ({ ...prev, installments, status: newStatus }));
    setSaving(false);
  };

  const saveChanges = async () => {
    setSaving(true);
    const installments = payment.installments || [];
    const allPaid = installments.every(i => i.status === "pago");
    const somePaid = installments.some(i => i.status === "pago");
    const now = new Date();
    const hasOverdue = installments.some(i => i.status !== "pago" && i.due_date && new Date(i.due_date + "T12:00:00") < now);
    let newStatus = "pendente";
    if (allPaid) newStatus = "pago";
    else if (hasOverdue) newStatus = "vencido";
    else if (somePaid) newStatus = "parcial";
    await base44.entities.Financial.update(id, { 
      installments, 
      status: newStatus,
      payment_method: payment.payment_method,
      notes: payment.notes
    });
    setPayment(prev => ({ ...prev, status: newStatus }));
    setSaving(false);
  };

  const handleDelete = async () => {
    await base44.entities.Financial.delete(id);
    navigate(createPageUrl("Financial"));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Pagamento não encontrado</p>
        <Button className="mt-4" onClick={() => navigate(createPageUrl("Financial"))}>Voltar</Button>
      </div>
    );
  }

  const paymentLabels = {
    dinheiro: "Dinheiro", pix: "PIX", cartao_credito: "Cartão de Crédito",
    cartao_debito: "Cartão de Débito", boleto: "Boleto", transferencia: "Transferência"
  };

  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("Financial"))}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pagamento #{payment.id?.slice(-6)}</h1>
            <p className="text-slate-500 mt-0.5">{payment.client_name}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={saveChanges} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1.5" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir pagamento?</AlertDialogTitle>
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

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <StatusBadge status={payment.status} />
          <span className="text-xs text-slate-400">Criado em {new Date(payment.created_date).toLocaleDateString("pt-BR")}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <Label>Cliente</Label>
            <Input value={payment.client_name} disabled className="mt-1 bg-slate-50" />
          </div>
          <div>
            <Label>Valor Total</Label>
            <Input value={`R$ ${(payment.total_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} disabled className="mt-1 bg-slate-50" />
          </div>
          <div>
            <Label>Forma de Pagamento</Label>
            <Select value={payment.payment_method || ""} onValueChange={v => setPayment(prev => ({ ...prev, payment_method: v }))}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {Object.entries(paymentLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mb-6">
          <Label>Observações</Label>
          <Input value={payment.notes || ""} onChange={e => setPayment(prev => ({ ...prev, notes: e.target.value }))} className="mt-1" placeholder="Adicione observações..." />
        </div>

        <div>
          <h3 className="font-semibold text-slate-900 mb-4">Parcelas</h3>
          <div className="space-y-3">
            {(payment.installments || []).map((inst, idx) => {
              const isOverdue = inst.status !== "pago" && inst.due_date && new Date(inst.due_date + "T12:00:00") < now;
              return (
                <div key={idx} className={`p-4 border rounded-lg ${isOverdue ? "border-red-200 bg-red-50" : "border-slate-200"}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-center">
                    <div>
                      <Label className="text-xs">Parcela</Label>
                      <p className="text-sm font-semibold text-slate-800 mt-1">{inst.number}</p>
                    </div>
                    <div>
                      <Label className="text-xs">Valor</Label>
                      <Input
                        type="number"
                        value={inst.amount}
                        onChange={e => updateInstallment(idx, "amount", parseFloat(e.target.value))}
                        className="mt-1"
                        disabled={inst.status === "pago"}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Vencimento</Label>
                      <Input
                        type="date"
                        value={inst.due_date}
                        onChange={e => updateInstallment(idx, "due_date", e.target.value)}
                        className="mt-1"
                        disabled={inst.status === "pago"}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Status</Label>
                      <Select value={inst.status} onValueChange={v => updateInstallment(idx, "status", v)} disabled={inst.status === "pago"}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="pago">Pago</SelectItem>
                          <SelectItem value="vencido">Vencido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      {inst.status !== "pago" && (
                        <Button size="sm" variant="outline" className="w-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 mt-5" onClick={() => markInstallmentPaid(idx)} disabled={saving}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Marcar Pago
                        </Button>
                      )}
                      {inst.status === "pago" && (
                        <div className="mt-5 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-medium">
                            <CheckCircle className="h-3 w-3" /> Pago
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
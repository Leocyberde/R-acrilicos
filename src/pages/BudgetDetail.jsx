import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, CheckCircle, XCircle, Edit, Wrench, Trash2, RefreshCw, Receipt as ReceiptIcon, Download, Send, AlertTriangle, Lock } from "lucide-react";
import { toast } from "sonner";
import StatusBadge from "@/components/StatusBadge";
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
  const [companySettings, setCompanySettings] = useState(null);
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  useEffect(() => {
    async function load() {
      const [found, layouts, settingsList] = await Promise.all([
        base44.entities.Budget.get(id),
        base44.entities.LayoutSettings.list(),
        base44.entities.Settings.list(),
      ]);
      setBudget(found);
      const budgetLayout = layouts.find(l => l.document_type === "budget") || {};
      setLayoutSettings(budgetLayout);
      if (settingsList.length > 0) setCompanySettings(settingsList[0]);
      setLoading(false);
    }
    load();
  }, [id]);

  const updateStatus = async (status) => {
    setSaving(true);
    try {
      await base44.entities.Budget.update(id, { status });
      setBudget(prev => ({ ...prev, status }));
      toast.success("Status atualizado com sucesso!");
    } catch {
      toast.error("Erro ao atualizar status.");
    }
    setSaving(false);
  };

  const handleAcceptCounterProposal = async () => {
    setSaving(true);
    try {
      await base44.entities.Budget.update(id, { status: "aceito_cliente" });
      setBudget(prev => ({ ...prev, status: "aceito_cliente" }));
      toast.success("Contraproposta aceita! Status atualizado para Aceito pelo Cliente.");
    } catch {
      toast.error("Erro ao aceitar contraproposta.");
    }
    setSaving(false);
  };

  const handleApproveAndCreateOS = async () => {
    setSaving(true);
    try {
      await base44.entities.Budget.update(id, { status: "aprovado" });

      const osItems = (budget.items || []).map(item => ({
        name: item.name,
        quantity: item.quantity,
      }));

      const os = await base44.entities.WorkOrder.create({
        budget_id: String(id),
        client_name: budget.client_name,
        client_email: budget.client_email,
        client_phone: budget.client_phone,
        client_address: budget.client_address,
        job: budget.job,
        producer: budget.producer,
        description: budget.description,
        items: osItems,
        status: "pendente",
        notes: budget.notes,
        start_date: new Date().toISOString().split("T")[0],
        delivery_date: budget.delivery_date || null,
      });

      const receipt = await base44.entities.Receipt.create({
        budget_id: String(id),
        work_order_id: String(os.id),
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
        status: "em_aberto",
        total_value: budget.total_with_margin || budget.total || 0,
        delivery_date: budget.delivery_date || null,
      });

      setBudget(prev => ({ ...prev, status: "aprovado" }));
      toast.success("O.S. e Recibo criados com sucesso!");
      navigate(createPageUrl("ReceiptDetail") + `?id=${receipt.id}`);
    } catch (e) {
      toast.error("Erro ao criar O.S. e Recibo: " + e.message);
    }
    setSaving(false);
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

  const handleClose = async () => {
    setSaving(true);
    try {
      await base44.entities.Budget.update(id, { status: "orcamento_fechado" });
      setBudget(prev => ({ ...prev, status: "orcamento_fechado" }));
      toast.success("Orçamento fechado com sucesso!");
    } catch {
      toast.error("Erro ao fechar orçamento.");
    }
    setSaving(false);
  };

  const handleSendToClient = async () => {
    setSaving(true);
    try {
      await base44.entities.Budget.update(id, { pdf_sent: true });
      setBudget(prev => ({ ...prev, pdf_sent: true }));
      toast.success("Orçamento enviado ao cliente com sucesso! Ele já pode visualizá-lo no portal.");
    } catch {
      toast.error("Erro ao enviar orçamento ao cliente.");
    }
    setSaving(false);
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
      delivery_date: budget.delivery_date || null,
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
              <DropdownMenuItem onClick={() => updateStatus("em_aberto")} disabled={budget.status === "em_aberto"}>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-sky-500" />
                  <span>Em Aberto</span>
                </div>
              </DropdownMenuItem>
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
              <DropdownMenuItem onClick={() => updateStatus("aceito_cliente")} disabled={budget.status === "aceito_cliente"}>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Aceito pelo Cliente</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus("recusado_cliente")} disabled={budget.status === "recusado_cliente"}>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  <span>Recusado pelo Cliente</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Imprimir
          </Button>
          <Button variant="outline" size="sm" onClick={async () => {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`/api/budgets/${budget.id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) { toast.error('Erro ao gerar PDF'); return; }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `orcamento-${budget.id}.pdf`;
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
            className={budget.pdf_sent ? "border-green-500 text-green-700" : "border-indigo-400 text-indigo-700"}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {budget.pdf_sent ? "Reenviar ao Cliente" : "Enviar ao Cliente"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Edit className="h-3.5 w-3.5 mr-1.5" /> Editar
          </Button>
          {["pendente", "aprovado", "aceito_cliente", "em_aberto"].includes(budget.status) && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleApproveAndCreateOS} disabled={saving}>
              <Wrench className="h-3.5 w-3.5 mr-1.5" /> Criar O.S. e Recibo
            </Button>
          )}
          {budget.status !== "orcamento_fechado" && (
            <Button
              size="sm"
              variant="outline"
              className="border-slate-400 text-slate-700 hover:bg-slate-100"
              onClick={handleClose}
              disabled={saving}
            >
              <Lock className="h-3.5 w-3.5 mr-1.5" /> Fechar Orçamento
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

      {/* Counter-proposal alert for admin */}
      {budget.status === "recusado_cliente" && budget.client_counter_value && (
        <div className="no-print rounded-xl border-2 border-orange-300 bg-orange-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-800 text-sm">Contraproposta do Cliente</h3>
              <p className="text-orange-700 text-sm mt-1">
                O cliente recusou o orçamento e enviou uma contraproposta de{" "}
                <span className="font-bold">
                  R$ {(budget.client_counter_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
                {budget.client_response_date && (
                  <span className="text-orange-600">
                    {" "}em {new Date(budget.client_response_date).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </p>
              {budget.client_counter_notes && (
                <p className="text-orange-700 text-sm mt-2 italic">"{budget.client_counter_notes}"</p>
              )}
              <div className="mt-3">
                <Button
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={handleAcceptCounterProposal}
                  disabled={saving}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Aceitar Contraproposta
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Document */}
      <div
        id="budget-content"
        className="bg-white rounded-xl border border-slate-200 print:border-0 print:shadow-none print:rounded-none"
        style={{ fontFamily: '"Segoe UI", Arial, sans-serif', color: '#1a1a1a' }}
      >
        <div className="p-8 sm:p-10">

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
              <p className="text-3xl font-bold text-slate-900 tracking-tight">Orçamento</p>
              <p className="text-sm text-slate-600 mt-1">
                Data: {budget.emission_date
                  ? new Date(budget.emission_date).toLocaleDateString("pt-BR")
                  : new Date(budget.created_date).toLocaleDateString("pt-BR")}
              </p>
              {budget.validity_date && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Válido até: {new Date(budget.validity_date).toLocaleDateString("pt-BR")}
                </p>
              )}
              <div className="no-print mt-2">
                <StatusBadge status={budget.status} />
              </div>
            </div>
          </div>

          {/* ── JOB / PRODUTOR / EMPRESA ── */}
          <div className="mb-5 pb-4 border-b border-slate-300">
            {budget.job && (
              <div className="flex gap-2 mb-1">
                <span className="text-sm font-bold text-slate-800 w-24 shrink-0">JOB:</span>
                <span className="text-sm font-bold text-slate-900">{budget.job}</span>
              </div>
            )}
            {budget.producer && (
              <div className="flex gap-2 mb-1">
                <span className="text-sm font-semibold text-slate-700 w-24 shrink-0">Produtor:</span>
                <span className="text-sm font-bold text-slate-900">{budget.producer}</span>
              </div>
            )}
            {budget.client_name && (
              <div className="flex gap-2">
                <span className="text-sm font-semibold text-slate-700 w-24 shrink-0">Empresa:</span>
                <span className="text-sm font-bold text-slate-900">{budget.client_name}</span>
              </div>
            )}
          </div>

          {/* ── DESCRIPTION (if any) ── */}
          {budget.description && (
            <div className="mb-4 text-sm text-slate-600 italic">{budget.description}</div>
          )}

          {/* ── ITEMS TABLE ── */}
          {budget.items?.length > 0 && (
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
                  {budget.items.map((item, i) => (
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
              {budget.discount > 0 && (
                <div className="flex justify-between text-sm text-red-600 pb-1">
                  <span>Desconto ({budget.discount}%):</span>
                  <span>- R$ {((budget.subtotal || budget.total || 0) * (budget.discount / 100)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-slate-800 pt-2">
                <span className="font-semibold text-sm text-slate-800">{budget.total_label || "Sem Nota Total"}</span>
                <span className="font-bold text-sm text-slate-900">R${(budget.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
              {budget.total_with_margin > 0 && (
                <div className="flex justify-between border-t border-slate-400 pt-1">
                  <span className="font-semibold text-sm text-slate-800">{budget.total_with_margin_label || "Com Nota Total"}</span>
                  <span className="font-bold text-sm text-slate-900">R${budget.total_with_margin.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {budget.producer && (
                <div className="text-right pt-1">
                  <span className="text-xs text-slate-500 italic">Elaborado por: {budget.producer}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── NOTES (budget-specific) ── */}
          {budget.notes && (
            <div className="mb-4 p-3 border border-slate-200 rounded text-sm text-slate-700 bg-slate-50">
              <p className="font-semibold text-slate-700 mb-1 uppercase text-xs tracking-wide">Observações</p>
              <p className="whitespace-pre-line">{budget.notes}</p>
            </div>
          )}

          {/* ── ATENÇÃO / FOOTER NOTES (from settings) ── */}
          {companySettings?.footer_notes && (
            <div className="mb-6 pt-4 border-t border-slate-300">
              <p className="text-sm font-bold text-red-600 mb-2">ATENÇÃO ! LEIA AS INSTRUÇÕES ABAIXO</p>
              <p className="text-sm text-slate-800 whitespace-pre-line">{companySettings.footer_notes}</p>
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
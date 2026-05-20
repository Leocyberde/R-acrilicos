import { useState, useEffect } from "react";
import { localClient } from "@/api/localClient";
import WorkOrderPrintLayoutMultiPage from "@/components/WorkOrderPrintLayoutMultiPage";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Trash2, Upload, Download, FileText, X, Edit, Save, Zap, ZapOff, AlertTriangle, Plus } from "lucide-react";
import { downloadWorkOrderPDF, printDocument } from "@/components/DownloadPDF";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusBadge from "@/components/StatusBadge";
import PrintHeader from "@/components/PrintHeader";
import ExportTabs from "@/components/ExportTabs";
import { formatDateBR } from "@/utils/dateFormat";
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

export default function WorkOrderDetail() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isEmployee, setIsEmployee] = useState(false);
  const [pendingItems, setPendingItems] = useState([]);
  const [savingPending, setSavingPending] = useState(false);
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const fromPage = params.get("from") || "WorkOrders";

  const [companySettings, setCompanySettings] = useState(null);

  useEffect(() => {
    async function load() {
      const [found, user, settingsList] = await Promise.all([
        localClient.entities.WorkOrder.get(id),
        localClient.auth.me(),
        localClient.entities.Settings.list(),
      ]);
      setOrder(found);
      const emp = user?.role === "user";
      setIsClient(user?.role === "cliente");
      setIsEmployee(emp);
      // Funcionário começa com lista vazia (não pré-popula com itens já enviados)
      // Admin vê order.pending_items direto pela UI, não usa este state
      setPendingItems(emp ? [] : (Array.isArray(found?.pending_items) ? found.pending_items : []));
      if (settingsList.length > 0) setCompanySettings(settingsList[0]);
      setLoading(false);
    }
    load();
  }, [id]);

  const updateStatus = async (status) => {
    setSaving(true);
    await localClient.entities.WorkOrder.update(id, { status });
    setOrder(prev => ({ ...prev, status }));
    setSaving(false);
  };

  const saveChanges = async () => {
    setSaving(true);
    await localClient.entities.WorkOrder.update(id, {
      client_name: order.client_name,
      client_phone: order.client_phone,
      client_address: order.client_address,
      description: order.description,
      notes: order.notes,
      delivery_date: order.delivery_date || null,
      items: order.items,
    });
    setSaving(false);
    setEditing(false);
  };

  const toggleUrgent = async () => {
    setSaving(true);
    const newVal = !order.is_urgent;
    await localClient.entities.WorkOrder.update(id, { is_urgent: newVal });
    setOrder(prev => ({ ...prev, is_urgent: newVal }));
    setSaving(false);
  };

  const savePendingItems = async () => {
    const newValid = pendingItems.filter(it => it.name?.trim());
    if (newValid.length === 0) {
      toast.error("Adicione pelo menos um item antes de salvar");
      return;
    }
    setSavingPending(true);
    try {
      // Mescla com itens pendentes já existentes no banco (não substitui)
      const existing = Array.isArray(order.pending_items) ? order.pending_items : [];
      const allPending = [...existing, ...newValid];
      await localClient.entities.WorkOrder.update(id, {
        pending_items: allPending,
      });
      setOrder(prev => ({ ...prev, pending_items: allPending }));
      setPendingItems([]); // limpa o formulário após envio
      toast.success(`${newValid.length} item(ns) enviado(s) para o admin!`, { duration: 4000 });
    } catch (e) {
      toast.error("Erro ao salvar itens: " + e.message);
    }
    setSavingPending(false);
  };

  const acceptPendingItems = async () => {
    setSaving(true);
    try {
      const existingItems = Array.isArray(order.items) ? order.items : [];
      // Usa order.pending_items diretamente — mesma fonte do banner exibido ao admin
      const toAccept = (Array.isArray(order.pending_items) ? order.pending_items : []).filter(it => it.name?.trim());
      const mergedItems = [...existingItems, ...toAccept];
      await localClient.entities.WorkOrder.update(id, {
        items: mergedItems,
        pending_items: [],
      });
      setOrder(prev => ({ ...prev, items: mergedItems, pending_items: [] }));
      setPendingItems([]);
      toast.success("Itens do gerente aceitos e adicionados à O.S.!");
    } catch (e) {
      toast.error("Erro ao aceitar itens: " + e.message);
    }
    setSaving(false);
  };

  const daysUntilDelivery = order?.delivery_date
    ? Math.ceil((new Date(order.delivery_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const computedUrgent = order?.is_urgent || (
    daysUntilDelivery !== null && daysUntilDelivery <= 3 && order?.status !== 'entregue'
  );



  const handleDelete = async () => {
    await localClient.entities.WorkOrder.delete(id);
    navigate(createPageUrl(fromPage));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const token = localStorage.getItem("auth_token");
    const uploadRes = await fetch("/api/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
    const { file_url } = await uploadRes.json();
    const attachments = order.attachments || [];
    attachments.push({
      name: file.name,
      url: file_url,
      size: file.size,
      uploaded_date: new Date().toISOString(),
    });
    await localClient.entities.WorkOrder.update(id, { attachments });
    setOrder(prev => ({ ...prev, attachments }));
    setUploading(false);
    e.target.value = "";
  };

  const handleDeleteAttachment = async (index) => {
    const attachments = [...(order.attachments || [])];
    attachments.splice(index, 1);
    setSaving(true);
    await localClient.entities.WorkOrder.update(id, { attachments });
    setOrder(prev => ({ ...prev, attachments }));
    setSaving(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Ordem de serviço não encontrada</p>
        <Button className="mt-4" onClick={() => navigate(createPageUrl(fromPage))}>Voltar</Button>
      </div>
    );
  }

  const statusFlow = ["pendente", "em_producao", "finalizado", "entregue"];
  const currentIdx = statusFlow.indexOf(order.status);
  const nextStatus = currentIdx < statusFlow.length - 1 ? statusFlow[currentIdx + 1] : null;
  const statusLabels = { pendente: "Iniciar Produção", em_producao: "Finalizar", finalizado: "Marcar como Entregue" };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl(fromPage))}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">O.S. #{String(order.id ?? '')}</h1>
            <p className="text-slate-500 mt-0.5">{order.client_name}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isClient && !isEmployee && !editing && (
            <>
              <ExportTabs 
                data={[order]}
                filename={`ordem-servico-${String(order.id ?? '')}`}
                columns={[
                  { key: "client_name", label: "Cliente" },
                  { key: "job", label: "Job" },
                  { key: "description", label: "Descrição" },
                  { key: "created_date", label: "Criado", format: (v) => new Date(v).toLocaleDateString("pt-BR") },
                  { key: "status", label: "Status" },
                ]}
                onPDF={async () => {
                  const tid = toast.loading('Gerando PDF...');
                  try {
                    await downloadWorkOrderPDF(order, companySettings, `ordem-servico-${String(order.id ?? '')}.pdf`);
                    toast.dismiss(tid);
                  } catch (e) {
                    toast.dismiss(tid);
                    toast.error('Erro ao gerar PDF: ' + (e?.message || 'tente novamente'));
                  }
                }}
                onPrint={async () => {
                  const tid = toast.loading('Gerando impressão...');
                  try {
                    await printDocument('workOrder', order, companySettings);
                    toast.dismiss(tid);
                  } catch (e) {
                    toast.dismiss(tid);
                    toast.error('Erro ao imprimir: ' + (e?.message || 'tente novamente'));
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={toggleUrgent}
                disabled={saving}
                className={order.is_urgent
                  ? "border-red-400 text-red-600 bg-red-50 hover:bg-red-100"
                  : "text-slate-600 hover:text-orange-600 hover:border-orange-400"}
              >
                {order.is_urgent ? <ZapOff className="h-3.5 w-3.5 mr-1.5" /> : <Zap className="h-3.5 w-3.5 mr-1.5" />}
                {order.is_urgent ? "Remover Urgência" : "Marcar Urgente"}
              </Button>
              {order.client_id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(createPageUrl("ClientDetail") + `?id=${order.client_id}`)}
                  className="text-indigo-600 hover:text-indigo-700 hover:border-indigo-400"
                >
                  <Edit className="h-3.5 w-3.5 mr-1.5" /> Editar Cliente
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit className="h-3.5 w-3.5 mr-1.5" /> Editar O.S.
              </Button>
              {nextStatus && (
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => updateStatus(nextStatus)} disabled={saving}>
                  {statusLabels[order.status]}
                </Button>
              )}
            </>
          )}
          {!isClient && !isEmployee && editing && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={saveChanges} disabled={saving}>
                <Save className="h-3.5 w-3.5 mr-1.5" /> {saving ? "Salvando..." : "Salvar"}
              </Button>
            </>
          )}
          {isEmployee && nextStatus && (
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => updateStatus(nextStatus)} disabled={saving}>
              {statusLabels[order.status]}
            </Button>
          )}
          {!isClient && !isEmployee && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600">
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir ordem de serviço?</AlertDialogTitle>
                  <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {isClient && (
            <>
              <Button variant="outline" size="sm" onClick={async () => {
                const tid = toast.loading('Gerando impressão...');
                try { await printDocument('workOrder', order, companySettings); toast.dismiss(tid); }
                catch (e) { toast.dismiss(tid); toast.error('Erro ao imprimir'); }
              }}>
                <Printer className="h-3.5 w-3.5 mr-1.5" /> Imprimir
              </Button>
              <Button variant="outline" size="sm" onClick={async () => {
                const tid = toast.loading('Gerando PDF...');
                try { await downloadWorkOrderPDF(order, companySettings, `ordem-servico-${String(order.id ?? '')}.pdf`); toast.dismiss(tid); }
                catch (e) { toast.dismiss(tid); toast.error('Erro ao gerar PDF'); }
              }}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {computedUrgent && order.status !== 'entregue' && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">
              {order.is_urgent ? "Pedido marcado como URGENTE" : `⚠️ Atenção: faltam ${daysUntilDelivery <= 0 ? "0" : daysUntilDelivery} dia(s) para a data de entrega!`}
            </p>
            {daysUntilDelivery !== null && (
              <p className="text-xs text-red-500 mt-0.5">
                Data de entrega: {new Date(order.delivery_date).toLocaleDateString("pt-BR")}
                {daysUntilDelivery <= 0 ? " — Prazo vencido!" : ""}
              </p>
            )}
          </div>
        </div>
      )}

      {order.employee_name && !isEmployee && !isClient && (
        <div className="flex items-start justify-between gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 space-y-0.5">
              <p>Esta O.S. foi criada pelo funcionário <strong>{order.employee_name}</strong>.</p>
              {!order.budget_id && <p className="text-amber-700 font-medium">Não possui orçamento vinculado — crie um orçamento para ela.</p>}
              {order.client_id && <p className="text-blue-600">O cadastro do cliente pode estar incompleto — use o botão <strong>Editar Cliente</strong> para preencher os dados.</p>}
            </div>
          </div>
        </div>
      )}

      {!isEmployee && !isClient && Array.isArray(order.pending_items) && order.pending_items.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">
                🔔 {order.employee_name ? `O gerente ${order.employee_name} adicionou` : "Itens adicionados"} {order.pending_items.length} item(ns) — precisam de preço
              </p>
              
              {/* ✅ TABELA COM DESTAQUE */}
              <table className="w-full mt-3 bg-white rounded border border-amber-200">
                <thead>
                  <tr className="border-b border-amber-200 bg-amber-100">
                    <th className="text-left text-xs font-bold text-amber-800 uppercase py-2 px-3">Item</th>
                    <th className="text-center text-xs font-bold text-amber-800 uppercase py-2 px-3">Qtd</th>
                    <th className="text-right text-xs font-bold text-amber-800 uppercase py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {order.pending_items.map((item, i) => (
                    <tr key={i} className="border-b border-amber-100 hover:bg-amber-50">
                      <td className="py-2 px-3 text-sm text-slate-800 font-medium">{item.name}</td>
                      <td className="py-2 px-3 text-sm text-slate-600 text-center">{item.quantity}</td>
                      <td className="py-2 px-3 text-xs text-amber-700 text-right">⏳ Aguardando preço</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={acceptPendingItems}
                  disabled={saving}
                >
                  Aceitar e Mesclar com os Itens da O.S.
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEmployee && order.status !== "entregue" && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            Você pode adicionar itens abaixo. Os itens já existentes não podem ser removidos. O admin receberá uma notificação para precificar.
          </p>
        </div>
      )}

      <Tabs defaultValue="details" className="no-print">
        <TabsList>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="files">Arquivos ({order?.attachments?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
        {/* Status progress */}
        <div className="no-print mb-6">
          <div className="flex items-center gap-1">
            {statusFlow.map((s, i) => {
              const isActive = i <= currentIdx;
              const labels = { pendente: "Pendente", em_producao: "Em Produção", finalizado: "Finalizado", entregue: "Entregue" };
              return (
                <div key={s} className="flex-1">
                  <div className={`h-2 rounded-full ${isActive ? "bg-indigo-500" : "bg-slate-200"} transition-colors`} />
                  <p className={`text-xs mt-1.5 text-center font-medium ${isActive ? "text-indigo-600" : "text-slate-400"}`}>{labels[s]}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="print:hidden mb-6 flex items-center justify-between">
          <StatusBadge status={order.status} />
          <span className="text-xs text-slate-400">Criado em {new Date(order.created_date).toLocaleDateString("pt-BR")}</span>
        </div>

        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-slate-100">
            <div>
              <Label className="text-xs text-slate-400 uppercase tracking-wider font-medium">Cliente</Label>
              <Input value={order.client_name} onChange={e => setOrder(prev => ({ ...prev, client_name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-400 uppercase tracking-wider font-medium">Telefone</Label>
              <Input value={order.client_phone || ""} onChange={e => setOrder(prev => ({ ...prev, client_phone: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-400 uppercase tracking-wider font-medium">Endereço</Label>
              <Input value={order.client_address || ""} onChange={e => setOrder(prev => ({ ...prev, client_address: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-400 uppercase tracking-wider font-medium">Data de Entrega</Label>
              <Input type="date" value={order.delivery_date || ""} onChange={e => setOrder(prev => ({ ...prev, delivery_date: e.target.value }))} className="mt-1" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-slate-100">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Cliente</p>
              <p className="text-base font-semibold text-slate-900 mt-1">{order.client_name}</p>
            </div>
            {order.client_phone && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Telefone</p>
                <p className="text-sm text-slate-700 mt-1">{order.client_phone}</p>
              </div>
            )}
            {order.client_address && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Endereço</p>
                <p className="text-sm text-slate-700 mt-1">{order.client_address}</p>
              </div>
            )}
            {order.delivery_date && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Data de Entrega</p>
                <p className="text-sm text-slate-700 mt-1">{new Date(order.delivery_date).toLocaleDateString("pt-BR")}</p>
              </div>
            )}
            {order.job && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Job</p>
                <p className="text-sm text-slate-700 mt-1">{order.job}</p>
              </div>
            )}
            {order.producer && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Produtor</p>
                <p className="text-sm text-slate-700 mt-1">{order.producer}</p>
              </div>
            )}
          </div>
        )}

        {editing ? (
          <div className="py-4 border-b border-slate-100">
            <Label className="text-xs text-slate-400 uppercase tracking-wider font-medium">Descrição</Label>
            <Textarea value={order.description || ""} onChange={e => setOrder(prev => ({ ...prev, description: e.target.value }))} rows={3} className="mt-1" />
          </div>
        ) : (
          order.description && (
            <div className="py-4 border-b border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Descrição</p>
              <p className="text-sm text-slate-700">{order.description}</p>
            </div>
          )
        )}

        {/* Items (NO PRICES) */}
        {order.items?.length > 0 && (
          <div className="py-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-3">
              Itens {isEmployee && <span className="text-slate-300 normal-case font-normal">(somente leitura)</span>}
            </p>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase py-2 pr-4">#</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase py-2 pr-4">Item</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase py-2">Quantidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {order.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2.5 pr-4 text-sm text-slate-400">{i + 1}</td>
                    <td className="py-2.5 pr-4 text-sm text-slate-800">{item.name}</td>
                    <td className="py-2.5 text-sm text-slate-600 text-center">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Seção de itens pendentes — visível para o funcionário, exceto em O.S. entregue */}
        {isEmployee && order.status !== "entregue" && (
          <div className="py-4 border-t border-slate-100">

            {/* Itens já enviados aguardando aprovação */}
            {Array.isArray(order.pending_items) && order.pending_items.length > 0 && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-3">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">
                  Aguardando aprovação do admin ({order.pending_items.length} item(ns))
                </p>
                <ul className="space-y-1">
                  {order.pending_items.map((it, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{it.name}</span>
                      <span className="text-slate-500 text-xs">Qtd: {it.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-indigo-600 uppercase tracking-wider font-bold">Adicionar Novos Itens</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPendingItems(prev => [...prev, { name: "", quantity: 1 }])}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar Item
              </Button>
            </div>

            {pendingItems.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4 border-2 border-dashed border-slate-200 rounded-lg">
                Nenhum item adicionado ainda — clique em "Adicionar Item"
              </p>
            ) : (
              <div className="space-y-2">
                {pendingItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        value={item.name}
                        onChange={e => setPendingItems(prev => prev.map((p, idx) => idx === i ? { ...p, name: e.target.value } : p))}
                        placeholder="Nome do produto ou serviço"
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => setPendingItems(prev => prev.map((p, idx) => idx === i ? { ...p, quantity: Number(e.target.value) || 1 } : p))}
                        className="text-center"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setPendingItems(prev => prev.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="pt-2">
                  <Button
                    onClick={savePendingItems}
                    disabled={savingPending}
                    className="bg-indigo-600 hover:bg-indigo-700"
                    size="sm"
                  >
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    {savingPending ? "Enviando..." : "Enviar Itens para o Admin"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {editing ? (
          <div className="pt-4 border-t border-slate-100">
            <Label className="text-xs text-slate-400 uppercase tracking-wider font-medium">Observações</Label>
            <Textarea value={order.notes || ""} onChange={e => setOrder(prev => ({ ...prev, notes: e.target.value }))} rows={3} className="mt-1" />
          </div>
        ) : (
          order.notes && (
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Observações</p>
              <p className="text-sm text-slate-600">{order.notes}</p>
            </div>
          )
        )}
          </div>
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Arquivos Anexados</h3>
                <p className="text-sm text-slate-500 mt-1">PDF, CDR, DXF, JPG, ZIP, RAR e outros formatos</p>
              </div>
              <div>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <Button asChild disabled={uploading}>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Enviando..." : "Anexar Arquivo"}
                  </label>
                </Button>
              </div>
            </div>

            {(!order?.attachments || order.attachments.length === 0) ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Nenhum arquivo anexado ainda</p>
                <p className="text-xs text-slate-400 mt-1">Clique em "Anexar Arquivo" para adicionar documentos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {order.attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">
                          {formatFileSize(file.size)} • {new Date(file.uploaded_date).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer">
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          Baixar
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteAttachment(idx)} disabled={saving}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Layout oculto — necessário para captura de PDF/impressão */}
      <div style={{ position: "absolute", left: "-9999px", top: 0, width: "210mm", pointerEvents: "none", opacity: 0 }}>
        <div id="workorder-print-layout">
          {order && <WorkOrderPrintLayoutMultiPage workOrder={order} />}
        </div>
      </div>
    </div>
  );
}
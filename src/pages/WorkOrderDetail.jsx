import { useState, useEffect } from "react";
import { localClient } from "@/api/localClient";
import WorkOrderPrintLayoutMultiPage from "@/components/WorkOrderPrintLayoutMultiPage";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Trash2, Upload, Download, FileText, X, Edit, Save, Zap, ZapOff, AlertTriangle } from "lucide-react";
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
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const [companySettings, setCompanySettings] = useState(null);

  useEffect(() => {
    async function load() {
      const [found, user, settingsList] = await Promise.all([
        localClient.entities.WorkOrder.get(id),
        localClient.auth.me(),
        localClient.entities.Settings.list(),
      ]);
      setOrder(found);
      setIsClient(user?.role === "cliente");
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

  const daysUntilDelivery = order?.delivery_date
    ? Math.ceil((new Date(order.delivery_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const computedUrgent = order?.is_urgent || (
    daysUntilDelivery !== null && daysUntilDelivery <= 3 && order?.status !== 'entregue'
  );



  const handleDelete = async () => {
    await localClient.entities.WorkOrder.delete(id);
    navigate(createPageUrl("WorkOrders"));
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
        <Button className="mt-4" onClick={() => navigate(createPageUrl("WorkOrders"))}>Voltar</Button>
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
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("WorkOrders"))}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">O.S. #{String(order.id ?? '')}</h1>
            <p className="text-slate-500 mt-0.5">{order.client_name}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isClient && !editing && (
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
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit className="h-3.5 w-3.5 mr-1.5" /> Editar
              </Button>
              {nextStatus && (
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => updateStatus(nextStatus)} disabled={saving}>
                  {statusLabels[order.status]}
                </Button>
              )}
            </>
          )}
          {!isClient && editing && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={saveChanges} disabled={saving}>
                <Save className="h-3.5 w-3.5 mr-1.5" /> {saving ? "Salvando..." : "Salvar"}
              </Button>
            </>
          )}
          {!isClient && (
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
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-3">Itens</p>
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
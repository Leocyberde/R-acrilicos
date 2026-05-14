import { useState, useEffect } from "react";
import { api } from "@/api/apiClient";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Wrench, Trash2, RefreshCw, Plus, Upload, Zap, ZapOff, AlertTriangle, Settings2, GripVertical, ChevronRight, ChevronLeft, X } from "lucide-react";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StatusBadge from "@/components/StatusBadge";
import ExportTabs from "@/components/ExportTabs";
import PDFUploadDialog from "@/components/PDFUploadDialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const ALL_COLUMNS = [
  { key: "job",           label: "JOB" },
  { key: "client_name",   label: "EMPRESA / CLIENTE" },
  { key: "status",        label: "STATUS",          align: "center" },
  { key: "producer",      label: "PRODUTOR" },
  { key: "delivery_date", label: "ENTREGA",         align: "center" },
  { key: "created_date",  label: "DATA DE CRIAÇÃO" },
  { key: "description",   label: "DESCRIÇÃO" },
];

const DEFAULT_ACTIVE_KEYS = ["job", "client_name", "status", "producer", "delivery_date"];
const STORAGE_KEY = "workorders_column_config_v1";

function getDaysUntilDelivery(deliveryDate) {
  if (!deliveryDate) return null;
  return Math.ceil((new Date(deliveryDate) - new Date()) / (1000 * 60 * 60 * 24));
}

function isOrderUrgent(order) {
  if (order.status === "entregue") return false;
  if (order.is_urgent) return true;
  const days = getDaysUntilDelivery(order.delivery_date);
  return days !== null && days <= 3;
}

function loadColumnConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const valid = ALL_COLUMNS.map(c => c.key);
      const filtered = parsed.filter(k => valid.includes(k));
      if (filtered.length > 0) return filtered;
    }
  } catch {}
  return [...DEFAULT_ACTIVE_KEYS];
}

function colByKey(key) {
  return ALL_COLUMNS.find(c => c.key === key);
}

function renderCellContent(key, o, navigate, urgent) {
  const days = getDaysUntilDelivery(o.delivery_date);
  switch (key) {
    case "job":
      return (
        <div className="flex items-center gap-2">
          {urgent && <Zap className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
          <p className="text-sm font-semibold text-slate-800">{o.job || "—"}</p>
        </div>
      );
    case "client_name":
      return <p className="text-sm text-slate-700 truncate max-w-[180px]">{o.client_name || "—"}</p>;
    case "status":
      return <StatusBadge status={o.status} />;
    case "producer":
      return <p className="text-sm text-slate-600 truncate max-w-[140px]">{o.producer || "—"}</p>;
    case "delivery_date":
      return o.delivery_date ? (
        <div>
          <p className={`text-xs font-medium ${urgent ? "text-red-600" : "text-slate-600"}`}>
            {new Date(o.delivery_date).toLocaleDateString("pt-BR")}
          </p>
          {days !== null && o.status !== "entregue" && (
            <p className={`text-xs ${days <= 0 ? "text-red-600 font-bold" : days <= 3 ? "text-orange-500" : "text-slate-400"}`}>
              {days <= 0 ? "Vencido!" : `${days}d`}
            </p>
          )}
        </div>
      ) : <span className="text-xs text-slate-400">—</span>;
    case "created_date":
      return <p className="text-sm text-slate-600">{o.created_date ? new Date(o.created_date).toLocaleDateString("pt-BR") : "—"}</p>;
    case "description":
      return <p className="text-sm text-slate-600 truncate max-w-[180px]">{o.description || "—"}</p>;
    default:
      return <p className="text-sm text-slate-600">{o[key] || "—"}</p>;
  }
}

function ColumnConfigDialog({ open, onClose, activeKeys, onSave }) {
  const [pendingActive, setPendingActive] = useState([]);
  const [pendingInactive, setPendingInactive] = useState([]);

  useEffect(() => {
    if (open) {
      const active = activeKeys.filter(k => ALL_COLUMNS.find(c => c.key === k));
      const inactiveKeys = ALL_COLUMNS.map(c => c.key).filter(k => !active.includes(k));
      setPendingActive(active);
      setPendingInactive(inactiveKeys);
    }
  }, [open, activeKeys]);

  const onDragEnd = ({ source, destination }) => {
    if (!destination) return;
    const srcId = source.droppableId;
    const dstId = destination.droppableId;
    if (srcId === dstId) {
      const list = [...(srcId === "active" ? pendingActive : pendingInactive)];
      const [removed] = list.splice(source.index, 1);
      list.splice(destination.index, 0, removed);
      srcId === "active" ? setPendingActive(list) : setPendingInactive(list);
    } else {
      const src = [...(srcId === "active" ? pendingActive : pendingInactive)];
      const dst = [...(dstId === "active" ? pendingActive : pendingInactive)];
      const [removed] = src.splice(source.index, 1);
      dst.splice(destination.index, 0, removed);
      if (srcId === "active") { setPendingActive(src); setPendingInactive(dst); }
      else { setPendingInactive(src); setPendingActive(dst); }
    }
  };

  const moveToInactive = (key) => { setPendingActive(p => p.filter(k => k !== key)); setPendingInactive(p => [...p, key]); };
  const moveToActive   = (key) => { setPendingInactive(p => p.filter(k => k !== key)); setPendingActive(p => [...p, key]); };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">CONFIGURAR COLUNAS</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-2 gap-4">
            {[{ id: "active", label: "COLUNAS ATIVAS", list: pendingActive, border: "border-indigo-200", hover: "border-indigo-400 bg-indigo-50/50", itemCls: "border-slate-200 text-slate-700 hover:border-indigo-300", action: moveToInactive, ActionIcon: ChevronRight, actionTitle: "Mover para inativas" },
              { id: "inactive", label: "COLUNAS INATIVAS", list: pendingInactive, border: "border-slate-200", hover: "border-slate-400 bg-slate-100", itemCls: "border-slate-200 text-slate-500 hover:border-slate-300", action: moveToActive, ActionIcon: ChevronLeft, actionTitle: "Mover para ativas" }
            ].map(panel => (
              <div key={panel.id}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{panel.label}</p>
                <Droppable droppableId={panel.id}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                      className={`min-h-[240px] rounded-xl border-2 p-2 space-y-1.5 transition-colors ${snapshot.isDraggingOver ? panel.hover : `${panel.border} bg-slate-50`}`}>
                      {panel.list.map((key, index) => {
                        const col = colByKey(key);
                        if (!col) return null;
                        return (
                          <Draggable key={key} draggableId={`${panel.id}-${key}`} index={index}>
                            {(p2, s2) => (
                              <div ref={p2.innerRef} {...p2.draggableProps}
                                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border text-sm font-semibold select-none transition-shadow ${s2.isDragging ? "shadow-lg border-indigo-400 text-indigo-700" : panel.itemCls}`}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <span {...p2.dragHandleProps} className="text-slate-300 cursor-grab active:cursor-grabbing flex-shrink-0"><GripVertical className="h-4 w-4" /></span>
                                  <span className="truncate uppercase text-xs tracking-wide">{col.label}</span>
                                </div>
                                <button onClick={() => panel.action(key)} className="text-slate-400 hover:text-indigo-500 flex-shrink-0 transition-colors" title={panel.actionTitle}>
                                  <panel.ActionIcon className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                      {panel.list.length === 0 && <p className="text-xs text-slate-400 text-center py-8">Arraste colunas aqui</p>}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
        <p className="text-xs text-slate-400 mt-3 mb-5">Arraste para reordenar ou mover entre os painéis. Use as setas para mover rapidamente.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { onSave(pendingActive); onClose(); }} className="bg-indigo-600 hover:bg-indigo-700">Salvar</Button>
        </div>
      </div>
    </div>
  );
}

export default function WorkOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [showPDFUpload, setShowPDFUpload] = useState(false);
  const [showColConfig, setShowColConfig] = useState(false);
  const [activeKeys, setActiveKeys] = useState(loadColumnConfig);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    async function load() {
      let data;
      if (user?.role === "cliente") {
        data = await api.entities.WorkOrder.filter({ client_email: user.email }, "-created_date", 200);
      } else {
        data = await api.entities.WorkOrder.list("-created_date", 200);
      }
      setOrders(data || []);
      setLoading(false);
    }
    load();
  }, [user]);

  const filtered = orders.filter(o => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q ||
      o.client_name?.toLowerCase().includes(q) ||
      o.job?.toLowerCase().includes(q) ||
      o.producer?.toLowerCase().includes(q) ||
      o.description?.toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusFilters = [
    { value: "all",          label: "Todos" },
    { value: "pendente",     label: "Pendentes" },
    { value: "em_producao",  label: "Em Produção" },
    { value: "finalizado",   label: "Finalizados" },
    { value: "entregue",     label: "Entregues" },
  ];

  const handleSelectAll = (checked) => setSelected(checked ? filtered.map(o => o.id) : []);
  const handleSelect = (id, checked) => setSelected(checked ? [...selected, id] : selected.filter(s => s !== id));

  const handleDeleteSelected = async () => {
    if (!selected.length || !confirm(`Tem certeza que deseja excluir ${selected.length} ordem(ns) de serviço?`)) return;
    setDeleting(true);
    try {
      await Promise.all(selected.map(id => api.entities.WorkOrder.delete(id)));
      setOrders(orders.filter(o => !selected.includes(o.id)));
      setSelected([]);
      toast.success(`${selected.length} ordem(ns) excluída(s) com sucesso`);
    } catch { toast.error("Erro ao excluir ordens de serviço"); }
    finally { setDeleting(false); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.entities.WorkOrder.update(id, { status: newStatus });
      setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
      toast.success("Status alterado com sucesso");
    } catch { toast.error("Erro ao alterar status"); }
  };

  const handleToggleUrgent = async (id, currentVal) => {
    try {
      await api.entities.WorkOrder.update(id, { is_urgent: !currentVal });
      setOrders(orders.map(o => o.id === id ? { ...o, is_urgent: !currentVal } : o));
      toast.success(!currentVal ? "Pedido marcado como urgente" : "Urgência removida");
    } catch { toast.error("Erro ao atualizar urgência"); }
  };

  const handleSaveColumns = (keys) => {
    setActiveKeys(keys);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    toast.success("Colunas atualizadas");
  };

  const activeColumns = activeKeys.map(k => colByKey(k)).filter(Boolean);
  const urgentOrders = orders.filter(o => isOrderUrgent(o));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ordens de Serviço</h1>
          <p className="text-slate-500 mt-0.5">{orders.length} ordens registradas</p>
        </div>
        {user?.role !== "cliente" && (
          <div className="flex gap-2 flex-wrap">
            <ExportTabs
              data={filtered}
              filename="relatorio_ordens_servico"
              hideExcel
              columns={activeColumns.map(col => ({
                key: col.key,
                label: col.label,
                ...(["delivery_date", "created_date"].includes(col.key) ? { format: (v) => v ? new Date(v).toLocaleDateString("pt-BR") : "—" } : {}),
              }))}
            />
            <Button variant="outline" size="sm" onClick={() => setShowColConfig(true)} className="text-xs text-slate-600">
              <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Colunas
            </Button>
            <Button variant="outline" onClick={() => setShowPDFUpload(true)}>
              <Upload className="h-4 w-4 mr-2" /> Importar PDF
            </Button>
            <Button onClick={() => navigate(createPageUrl("WorkOrderCreate"))} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" /> Nova Ordem
            </Button>
            {selected.length > 0 && (
              <Button variant="outline" onClick={handleDeleteSelected} disabled={deleting} className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4 mr-2" /> Excluir ({selected.length})
              </Button>
            )}
          </div>
        )}
      </div>

      {urgentOrders.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">{urgentOrders.length} pedido(s) com prazo urgente!</p>
            <p className="text-xs text-red-500 mt-0.5">
              {urgentOrders.map(o => `O.S. #${o.id} — ${o.client_name}${o.delivery_date ? ` (entrega: ${new Date(o.delivery_date).toLocaleDateString("pt-BR")})` : ""}`).join(" · ")}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchAutocomplete
          placeholder="Buscar por cliente, job, produtor..."
          value={search}
          onChange={setSearch}
          suggestions={[...new Set([
            ...orders.map(o => o.client_name),
            ...orders.map(o => o.job),
            ...orders.map(o => o.producer),
          ].filter(Boolean))]}
        />
        <div className="flex gap-1.5 bg-white border rounded-lg p-1 overflow-x-auto">
          {statusFilters.map(f => (
            <button key={f.value} onClick={() => setFilterStatus(f.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${filterStatus === f.value ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Wrench className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Nenhuma ordem encontrada</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {user?.role !== "cliente" && (
                    <th className="px-5 py-3 w-12">
                      <Checkbox checked={filtered.length > 0 && selected.length === filtered.length} onCheckedChange={handleSelectAll} />
                    </th>
                  )}
                  {user?.role === "cliente" ? (
                    <>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 w-16">Nº</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">JOB</th>
                      <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">STATUS</th>
                      <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">ENTREGA</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 w-16">Nº</th>
                      {activeColumns.map(col => (
                        <th key={col.key} className={`text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}>
                          {col.label}
                        </th>
                      ))}
                      <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 w-20">AÇÕES</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(o => {
                  const urgent = isOrderUrgent(o);
                  return (
                    <tr key={o.id} className={`hover:bg-slate-50/50 transition-colors ${urgent ? "bg-red-50/40" : ""}`}>
                      {user?.role !== "cliente" && (
                        <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                          <Checkbox checked={selected.includes(o.id)} onCheckedChange={checked => handleSelect(o.id, checked)} />
                        </td>
                      )}
                      {user?.role === "cliente" ? (
                        <>
                          <td className="px-4 py-3.5 cursor-pointer" onClick={() => navigate(createPageUrl("WorkOrderDetail") + `?id=${o.id}`)}>
                            <p className="text-xs font-mono text-slate-400">#{String(o.id ?? "")}</p>
                          </td>
                          <td className="px-4 py-3.5 cursor-pointer" onClick={() => navigate(createPageUrl("WorkOrderDetail") + `?id=${o.id}`)}>
                            <div className="flex items-center gap-2">
                              {urgent && <Zap className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                              <p className="text-sm font-semibold text-slate-800">{o.job || "—"}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center cursor-pointer" onClick={() => navigate(createPageUrl("WorkOrderDetail") + `?id=${o.id}`)}>
                            <StatusBadge status={o.status} />
                          </td>
                          <td className="px-5 py-3.5 text-center hidden md:table-cell cursor-pointer" onClick={() => navigate(createPageUrl("WorkOrderDetail") + `?id=${o.id}`)}>
                            {o.delivery_date ? <p className="text-xs text-slate-600">{new Date(o.delivery_date).toLocaleDateString("pt-BR")}</p> : <span className="text-xs text-slate-400">—</span>}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3.5 cursor-pointer" onClick={() => navigate(createPageUrl("WorkOrderDetail") + `?id=${o.id}`)}>
                            <p className="text-xs font-mono text-slate-400">#{String(o.id ?? "")}</p>
                          </td>
                          {activeColumns.map(col => (
                            <td key={col.key}
                              className={`px-4 py-3.5 cursor-pointer ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}`}
                              onClick={() => navigate(createPageUrl("WorkOrderDetail") + `?id=${o.id}`)}>
                              {renderCellContent(col.key, o, navigate, urgent)}
                            </td>
                          ))}
                          <td className="px-5 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><RefreshCw className="h-3.5 w-3.5" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {[
                                  { value: "pendente",    label: "Pendente",     color: "bg-slate-400" },
                                  { value: "em_producao", label: "Em Produção",  color: "bg-blue-400" },
                                  { value: "finalizado",  label: "Finalizado",   color: "bg-purple-400" },
                                  { value: "entregue",    label: "Entregue",     color: "bg-green-500" },
                                ].map(s => (
                                  <DropdownMenuItem key={s.value} onClick={() => handleStatusChange(o.id, s.value)} disabled={o.status === s.value}>
                                    <div className="flex items-center gap-2">
                                      <div className={`h-1.5 w-1.5 rounded-full ${s.color}`} />{s.label}
                                    </div>
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuItem onClick={() => handleToggleUrgent(o.id, o.is_urgent)} className={o.is_urgent ? "text-red-600" : "text-orange-600"}>
                                  <div className="flex items-center gap-2">
                                    {o.is_urgent ? <ZapOff className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                                    {o.is_urgent ? "Remover Urgência" : "Marcar Urgente"}
                                  </div>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PDFUploadDialog open={showPDFUpload} onOpenChange={setShowPDFUpload} entityType="workorder"
        onSuccess={(newOrder) => { setOrders([newOrder, ...orders]); setShowPDFUpload(false); }} />

      {user?.role !== "cliente" && (
        <ColumnConfigDialog open={showColConfig} onClose={() => setShowColConfig(false)} activeKeys={activeKeys} onSave={handleSaveColumns} />
      )}
    </div>
  );
}

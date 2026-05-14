import { useState, useEffect } from "react";
import { api } from "@/api/apiClient";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Factory, ArrowRight, Zap, AlertTriangle, Settings2, GripVertical, ChevronRight, ChevronLeft, X, Search } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import ExportTabs from "@/components/ExportTabs";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const ALL_COLUMNS = [
  { key: "job",          label: "JOB" },
  { key: "client_name",  label: "EMPRESA / CLIENTE" },
  { key: "producer",     label: "PRODUTOR" },
  { key: "items_count",  label: "ITENS",   align: "center" },
  { key: "status",       label: "STATUS" },
  { key: "delivery_date",label: "ENTREGA", align: "center" },
  { key: "description",  label: "DESCRIÇÃO" },
];

const DEFAULT_ACTIVE_KEYS = ["job", "client_name", "producer", "items_count", "status"];
const STORAGE_KEY = "production_column_config_v1";

const statusLabels = { pendente: "Pendente", em_producao: "Em Produção", finalizado: "Finalizado", entregue: "Entregue" };
const statusColors  = { pendente: "border-amber-300 bg-amber-50", em_producao: "border-blue-300 bg-blue-50", finalizado: "border-violet-300 bg-violet-50", entregue: "border-emerald-300 bg-emerald-50" };
const statusFlow    = ["pendente", "em_producao", "finalizado", "entregue"];
const nextActionLabels = { pendente: "Iniciar Produção", em_producao: "Finalizar", finalizado: "Entregar" };

function getDaysUntilDelivery(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));
}
function isOrderUrgent(o) {
  if (o.status === "entregue") return false;
  if (o.is_urgent) return true;
  const days = getDaysUntilDelivery(o.delivery_date);
  return days !== null && days <= 3;
}

function loadColumnConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const valid = ALL_COLUMNS.map(c => c.key);
      const f = parsed.filter(k => valid.includes(k));
      if (f.length > 0) return f;
    }
  } catch {}
  return [...DEFAULT_ACTIVE_KEYS];
}

function colByKey(key) { return ALL_COLUMNS.find(c => c.key === key); }

function renderCellContent(key, order) {
  const itemCount = Array.isArray(order.items) ? order.items.length : 0;
  const days = getDaysUntilDelivery(order.delivery_date);
  const urgent = isOrderUrgent(order);
  switch (key) {
    case "job":
      return (
        <div className="flex items-center gap-1.5">
          {urgent && <Zap className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
          <p className="text-sm font-semibold text-slate-900">{order.job || "—"}</p>
        </div>
      );
    case "client_name":
      return <p className="text-sm text-slate-700 truncate max-w-[180px]">{order.client_name || "—"}</p>;
    case "producer":
      return <p className="text-sm text-slate-600 truncate max-w-[140px]">{order.producer || "—"}</p>;
    case "items_count":
      return itemCount > 0
        ? <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">{itemCount} {itemCount === 1 ? "item" : "itens"}</span>
        : <span className="text-xs text-slate-400">—</span>;
    case "status":
      return <StatusBadge status={order.status} />;
    case "delivery_date":
      return order.delivery_date ? (
        <div>
          <p className={`text-xs font-medium ${urgent ? "text-red-600" : "text-slate-600"}`}>{new Date(order.delivery_date).toLocaleDateString("pt-BR")}</p>
          {days !== null && order.status !== "entregue" && (
            <p className={`text-xs ${days <= 0 ? "text-red-600 font-bold" : days <= 3 ? "text-orange-500" : "text-slate-400"}`}>
              {days <= 0 ? "Vencido!" : `${days}d`}
            </p>
          )}
        </div>
      ) : <span className="text-xs text-slate-400">—</span>;
    case "description":
      return <p className="text-sm text-slate-600 truncate max-w-[180px]">{order.description || "—"}</p>;
    default:
      return <p className="text-sm text-slate-600">{order[key] || "—"}</p>;
  }
}

function ColumnConfigDialog({ open, onClose, activeKeys, onSave }) {
  const [pendingActive, setPendingActive] = useState([]);
  const [pendingInactive, setPendingInactive] = useState([]);

  useEffect(() => {
    if (open) {
      const active = activeKeys.filter(k => ALL_COLUMNS.find(c => c.key === k));
      setPendingActive(active);
      setPendingInactive(ALL_COLUMNS.map(c => c.key).filter(k => !active.includes(k)));
    }
  }, [open, activeKeys]);

  const onDragEnd = ({ source, destination }) => {
    if (!destination) return;
    const srcId = source.droppableId, dstId = destination.droppableId;
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
            {[
              { id: "active",   label: "COLUNAS ATIVAS",   list: pendingActive,   border: "border-indigo-200", hover: "border-indigo-400 bg-indigo-50/50", itemCls: "border-slate-200 text-slate-700 hover:border-indigo-300", action: moveToInactive, ActionIcon: ChevronRight, actionTitle: "Mover para inativas" },
              { id: "inactive", label: "COLUNAS INATIVAS", list: pendingInactive, border: "border-slate-200",  hover: "border-slate-400 bg-slate-100",     itemCls: "border-slate-200 text-slate-500 hover:border-slate-300", action: moveToActive,   ActionIcon: ChevronLeft,  actionTitle: "Mover para ativas" },
            ].map(panel => (
              <div key={panel.id}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{panel.label}</p>
                <Droppable droppableId={panel.id}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                      className={`min-h-[240px] rounded-xl border-2 p-2 space-y-1.5 transition-colors ${snapshot.isDraggingOver ? panel.hover : `${panel.border} bg-slate-50`}`}>
                      {panel.list.map((key, index) => {
                        const col = colByKey(key); if (!col) return null;
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

export default function Production() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [saving, setSaving] = useState(null);
  const [showColConfig, setShowColConfig] = useState(false);
  const [activeKeys, setActiveKeys] = useState(loadColumnConfig);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const data = await api.entities.WorkOrder.list("-created_date", 200);
      setOrders(data);
      setLoading(false);
    }
    load();
  }, []);

  const advanceStatus = async (order) => {
    const currentIdx = statusFlow.indexOf(order.status);
    if (currentIdx >= statusFlow.length - 1) return;
    const nextStatus = statusFlow[currentIdx + 1];
    setSaving(order.id);
    await api.entities.WorkOrder.update(order.id, { status: nextStatus });
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: nextStatus } : o));
    setSaving(null);
  };

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
    { value: "all",         label: "Todos" },
    { value: "pendente",    label: "Pendentes" },
    { value: "em_producao", label: "Em Produção" },
    { value: "finalizado",  label: "Finalizados" },
    { value: "entregue",    label: "Entregues" },
  ];

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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Produção</h1>
          <p className="text-slate-500 mt-0.5">Acompanhe o andamento das ordens de serviço</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportTabs
            data={filtered}
            filename="relatorio_producao"
            hideExcel
            columns={activeColumns.map(col => ({
              key: col.key,
              label: col.label,
              ...(col.key === "delivery_date" ? { format: (v) => v ? new Date(v).toLocaleDateString("pt-BR") : "—" } : {}),
              ...(col.key === "items_count" ? { format: (_, row) => String(Array.isArray(row?.items) ? row.items.length : 0) } : {}),
            }))}
          />
          <Button variant="outline" size="sm" onClick={() => setShowColConfig(true)} className="text-xs text-slate-600">
            <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Colunas
          </Button>
        </div>
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
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            placeholder="Buscar por cliente, job, produtor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          />
        </div>
        <div className="flex gap-1.5 bg-white border rounded-lg p-1 overflow-x-auto">
          {statusFilters.map(f => (
            <button key={f.value} onClick={() => setFilterStatus(f.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${filterStatus === f.value ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statusFlow.map(s => (
          <div key={s} className={`rounded-xl border-2 p-4 ${statusColors[s]}`}>
            <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">{statusLabels[s]}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{orders.filter(o => o.status === s).length}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Factory className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Nenhuma ordem encontrada</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">O.S.</th>
                  {activeColumns.map(col => (
                    <th key={col.key} className={`py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}>
                      {col.label}
                    </th>
                  ))}
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(order => {
                  const urgent = isOrderUrgent(order);
                  return (
                    <tr key={order.id} className={`hover:bg-slate-50 transition-colors ${urgent ? "bg-red-50/50" : ""}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {urgent && <Zap className="h-3.5 w-3.5 text-red-500" />}
                          <p className="text-xs font-mono text-slate-500">#{String(order.id ?? "")}</p>
                        </div>
                      </td>
                      {activeColumns.map(col => (
                        <td key={col.key} className={`py-3 px-4 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}`}>
                          {renderCellContent(col.key, order)}
                        </td>
                      ))}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" className="text-xs"
                            onClick={() => navigate(createPageUrl("WorkOrderDetail") + `?id=${order.id}`)}>
                            Ver Detalhes
                          </Button>
                          {nextActionLabels[order.status] && (
                            <Button size="sm" className="text-xs bg-indigo-600 hover:bg-indigo-700"
                              onClick={() => advanceStatus(order)} disabled={saving === order.id}>
                              {nextActionLabels[order.status]} <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ColumnConfigDialog open={showColConfig} onClose={() => setShowColConfig(false)} activeKeys={activeKeys} onSave={handleSaveColumns} />
    </div>
  );
}

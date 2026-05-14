import { useState, useEffect } from "react";
import { api } from "@/api/apiClient";
import { createPageUrl } from "@/utils";
import { Wrench, Clock, Cog, CheckCircle2, Truck, Settings2, GripVertical, ChevronRight, ChevronLeft, X, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import StatusBadge from "@/components/StatusBadge";
import ExportTabs from "@/components/ExportTabs";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const ALL_COLUMNS = [
  { key: "job",          label: "JOB" },
  { key: "client_name",  label: "EMPRESA / CLIENTE" },
  { key: "producer",     label: "PRODUTOR" },
  { key: "items_count",  label: "ITENS",  align: "center" },
  { key: "status",       label: "STATUS", align: "center" },
  { key: "delivery_date",label: "ENTREGA",align: "center" },
  { key: "created_date", label: "DATA DE CRIAÇÃO" },
];

const DEFAULT_ACTIVE_KEYS = ["job", "client_name", "producer", "items_count", "status"];
const STORAGE_KEY = "wo_dashboard_column_config_v1";

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

function renderCellContent(key, o) {
  const itemCount = Array.isArray(o.items) ? o.items.length : 0;
  switch (key) {
    case "job":
      return <p className="text-sm font-semibold text-slate-800">{o.job || "—"}</p>;
    case "client_name":
      return <p className="text-sm text-slate-700 truncate max-w-[180px]">{o.client_name || "—"}</p>;
    case "producer":
      return <p className="text-sm text-slate-600 truncate max-w-[140px]">{o.producer || "—"}</p>;
    case "items_count":
      return itemCount > 0
        ? <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">{itemCount} {itemCount === 1 ? "item" : "itens"}</span>
        : <span className="text-xs text-slate-400">—</span>;
    case "status":
      return <StatusBadge status={o.status} />;
    case "delivery_date":
      return <p className="text-sm text-slate-600">{o.delivery_date ? new Date(o.delivery_date).toLocaleDateString("pt-BR") : "—"}</p>;
    case "created_date":
      return <p className="text-sm text-slate-600">{o.created_date ? new Date(o.created_date).toLocaleDateString("pt-BR") : "—"}</p>;
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
      setPendingActive(active);
      setPendingInactive(ALL_COLUMNS.map(c => c.key).filter(k => !active.includes(k)));
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

export default function WorkOrderDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showColConfig, setShowColConfig] = useState(false);
  const [activeKeys, setActiveKeys] = useState(loadColumnConfig);

  useEffect(() => {
    async function load() {
      const data = await api.entities.WorkOrder.list("-created_date", 500);
      setOrders(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pending     = orders.filter(o => o.status === "pendente");
  const inProduction= orders.filter(o => o.status === "em_producao");
  const finished    = orders.filter(o => o.status === "finalizado");
  const delivered   = orders.filter(o => o.status === "entregue");

  const statusData = [
    { name: "Pendente",    value: pending.length,      color: "#f59e0b" },
    { name: "Em Produção", value: inProduction.length, color: "#3b82f6" },
    { name: "Finalizado",  value: finished.length,     color: "#8b5cf6" },
    { name: "Entregue",    value: delivered.length,    color: "#10b981" },
  ].filter(d => d.value > 0);

  const monthlyData = {};
  orders.forEach(o => {
    const date = new Date(o.created_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyData[key]) monthlyData[key] = { month: key, count: 0 };
    monthlyData[key].count += 1;
  });
  const monthlyChartData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);

  const filteredOrders = orders.filter(o => {
    const q = search.toLowerCase().trim();
    return !q ||
      o.client_name?.toLowerCase().includes(q) ||
      o.job?.toLowerCase().includes(q) ||
      o.producer?.toLowerCase().includes(q);
  });

  const activeColumns = activeKeys.map(k => colByKey(k)).filter(Boolean);

  const handleSaveColumns = (keys) => {
    setActiveKeys(keys);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    toast.success("Colunas atualizadas");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard de Ordens de Serviço</h1>
        <p className="text-slate-500 mt-1">Visão completa da produção</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total",       value: orders.length,       color: "text-slate-900",   bg: "bg-indigo-100",  Icon: Wrench,        iconColor: "text-indigo-600" },
          { label: "Pendente",    value: pending.length,      color: "text-amber-600",   bg: "bg-amber-100",   Icon: Clock,         iconColor: "text-amber-600" },
          { label: "Em Produção", value: inProduction.length, color: "text-blue-600",    bg: "bg-blue-100",    Icon: Cog,           iconColor: "text-blue-600" },
          { label: "Finalizado",  value: finished.length,     color: "text-purple-600",  bg: "bg-purple-100",  Icon: CheckCircle2,  iconColor: "text-purple-600" },
          { label: "Entregue",    value: delivered.length,    color: "text-emerald-600", bg: "bg-emerald-100", Icon: Truck,         iconColor: "text-emerald-600" },
        ].map(({ label, value, color, bg, Icon, iconColor }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium">{label}</p>
                  <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Ordens por Mês</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                <Legend />
                <Bar dataKey="count" fill="#818cf8" name="Quantidade" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Distribuição por Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80} fill="#8884d8" dataKey="value">
                  {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base">Todas as Ordens ({filteredOrders.length})</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                placeholder="Buscar por cliente, job, produtor..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 w-56"
              />
            </div>
            <ExportTabs
              data={filteredOrders}
              filename="relatorio_ordens_servico"
              hideExcel
              columns={activeColumns.map(col => ({
                key: col.key,
                label: col.label,
                ...(["delivery_date", "created_date"].includes(col.key) ? { format: (v) => v ? new Date(v).toLocaleDateString("pt-BR") : "—" } : {}),
                ...(col.key === "items_count" ? { format: (_, row) => String(Array.isArray(row?.items) ? row.items.length : 0) } : {}),
              }))}
            />
            <Button variant="outline" size="sm" onClick={() => setShowColConfig(true)} className="text-xs text-slate-600">
              <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Colunas
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">Nenhuma ordem encontrada</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Nº</th>
                    {activeColumns.map(col => (
                      <th key={col.key} className={`text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredOrders.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                      onClick={() => window.location.href = createPageUrl("WorkOrderDetail") + `?id=${o.id}`}>
                      <td className="px-4 py-3">
                        <p className="text-xs font-mono text-slate-500">#{String(o.id ?? "")}</p>
                      </td>
                      {activeColumns.map(col => (
                        <td key={col.key} className={`px-4 py-3 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}`}>
                          {renderCellContent(col.key, o)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ColumnConfigDialog open={showColConfig} onClose={() => setShowColConfig(false)} activeKeys={activeKeys} onSave={handleSaveColumns} />
    </div>
  );
}

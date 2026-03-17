import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Factory, ArrowRight } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import ExportTabs from "@/components/ExportTabs";

const statusLabels = {
  pendente: "Pendente",
  em_producao: "Em Produção",
  finalizado: "Finalizado",
  entregue: "Entregue",
};

const statusColors = {
  pendente: "border-amber-300 bg-amber-50",
  em_producao: "border-blue-300 bg-blue-50",
  finalizado: "border-violet-300 bg-violet-50",
  entregue: "border-emerald-300 bg-emerald-50",
};

export default function Production() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [saving, setSaving] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const data = await base44.entities.WorkOrder.list("-created_date", 200);
      setOrders(data);
      setLoading(false);
    }
    load();
  }, []);

  const statusFlow = ["pendente", "em_producao", "finalizado", "entregue"];

  const advanceStatus = async (order) => {
    const currentIdx = statusFlow.indexOf(order.status);
    if (currentIdx >= statusFlow.length - 1) return;
    const nextStatus = statusFlow[currentIdx + 1];
    setSaving(order.id);
    await base44.entities.WorkOrder.update(order.id, { status: nextStatus });
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: nextStatus } : o));
    setSaving(null);
  };

  const filtered = orders.filter(o => {
    const matchSearch = o.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusFilters = [
    { value: "all", label: "Todos" },
    { value: "pendente", label: "Pendentes" },
    { value: "em_producao", label: "Em Produção" },
    { value: "finalizado", label: "Finalizados" },
    { value: "entregue", label: "Entregues" },
  ];

  const nextActionLabels = {
    pendente: "Iniciar Produção",
    em_producao: "Finalizar",
    finalizado: "Entregar",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Group by status for kanban-like view
  const grouped = {};
  statusFlow.forEach(s => { grouped[s] = filtered.filter(o => o.status === s); });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Produção</h1>
          <p className="text-slate-500 mt-0.5">Acompanhe o andamento das ordens de serviço</p>
        </div>
        <ExportTabs 
          data={orders}
          filename="relatorio_producao"
          columns={[
            { key: "client_name", label: "Cliente" },
            { key: "job", label: "Job" },
            { key: "description", label: "Descrição" },
            { key: "created_date", label: "Criado", format: (v) => new Date(v).toLocaleDateString("pt-BR") },
            { key: "status", label: "Status" },
          ]}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar por cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5 bg-white border rounded-lg p-1 overflow-x-auto">
          {statusFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                filterStatus === f.value ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statusFlow.map(s => (
          <div key={s} className={`rounded-xl border-2 p-4 ${statusColors[s]}`}>
            <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">{statusLabels[s]}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{orders.filter(o => o.status === s).length}</p>
          </div>
        ))}
      </div>

      {/* List view */}
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
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">Cliente</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">Job</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">Descrição</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">Itens</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="text-xs font-mono text-slate-500">#{order.id?.slice(-6)}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-slate-900">{order.client_name}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-slate-600">{order.job || "-"}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-slate-600 line-clamp-1">{order.description || "-"}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-xs text-slate-500">{order.items?.length || 0} item(s)</p>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate(createPageUrl("WorkOrderDetail") + `?id=${order.id}`)}>
                          Ver Detalhes
                        </Button>
                        {nextActionLabels[order.status] && (
                          <Button
                            size="sm"
                            className="text-xs bg-indigo-600 hover:bg-indigo-700"
                            onClick={() => advanceStatus(order)}
                            disabled={saving === order.id}
                          >
                            {nextActionLabels[order.status]} <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
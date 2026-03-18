import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Wrench, Trash2, RefreshCw, Plus, Upload, Zap, ZapOff, AlertTriangle } from "lucide-react";
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

function getDaysUntilDelivery(deliveryDate) {
  if (!deliveryDate) return null;
  return Math.ceil((new Date(deliveryDate) - new Date()) / (1000 * 60 * 60 * 24));
}

function isOrderUrgent(order) {
  if (order.status === 'entregue') return false;
  if (order.is_urgent) return true;
  const days = getDaysUntilDelivery(order.delivery_date);
  return days !== null && days <= 3;
}

export default function WorkOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [showPDFUpload, setShowPDFUpload] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    async function load() {
      let data;
      if (user?.role === 'cliente') {
        data = await base44.entities.WorkOrder.filter({ client_email: user.email }, "-created_date", 200);
      } else {
        data = await base44.entities.WorkOrder.list("-created_date", 200);
      }
      setOrders(data || []);
      setLoading(false);
    }
    load();
  }, [user]);

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

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelected(filtered.map(o => o.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelect = (id, checked) => {
    if (checked) {
      setSelected([...selected, id]);
    } else {
      setSelected(selected.filter(s => s !== id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selected.length === 0) return;
    
    if (!confirm(`Tem certeza que deseja excluir ${selected.length} ordem(ns) de serviço?`)) return;

    setDeleting(true);
    try {
      await Promise.all(selected.map(id => base44.entities.WorkOrder.delete(id)));
      setOrders(orders.filter(o => !selected.includes(o.id)));
      setSelected([]);
      toast.success(`${selected.length} ordem(ns) excluída(s) com sucesso`);
    } catch (error) {
      toast.error("Erro ao excluir ordens de serviço");
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await base44.entities.WorkOrder.update(id, { status: newStatus });
      setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
      toast.success("Status alterado com sucesso");
    } catch (error) {
      toast.error("Erro ao alterar status");
    }
  };

  const handleToggleUrgent = async (id, currentVal) => {
    try {
      await base44.entities.WorkOrder.update(id, { is_urgent: !currentVal });
      setOrders(orders.map(o => o.id === id ? { ...o, is_urgent: !currentVal } : o));
      toast.success(!currentVal ? "Pedido marcado como urgente" : "Urgência removida");
    } catch (error) {
      toast.error("Erro ao atualizar urgência");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const urgentOrders = orders.filter(o => isOrderUrgent(o));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ordens de Serviço</h1>
          <p className="text-slate-500 mt-0.5">{orders.length} ordens registradas</p>
        </div>
        <div className="flex gap-2">
          {user?.role !== 'cliente' && (
            <>
              <ExportTabs 
                data={orders}
                filename="relatorio_ordens_servico"
                columns={[
                  { key: "client_name", label: "Cliente" },
                  { key: "job", label: "Job" },
                  { key: "description", label: "Descrição" },
                  { key: "created_date", label: "Criado", format: (v) => new Date(v).toLocaleDateString("pt-BR") },
                  { key: "status", label: "Status" },
                ]}
              />
              <Button 
                variant="outline"
                onClick={() => setShowPDFUpload(true)}
              >
                <Upload className="h-4 w-4 mr-2" /> Importar PDF
              </Button>
              <Button 
                onClick={() => navigate(createPageUrl("WorkOrderCreate"))}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" /> Nova Ordem
              </Button>
              {selected.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={handleDeleteSelected} 
                  disabled={deleting}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir ({selected.length})
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {urgentOrders.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              {urgentOrders.length} pedido(s) com prazo urgente!
            </p>
            <p className="text-xs text-red-500 mt-0.5">
              {urgentOrders.map(o => `O.S. #${o.id} — ${o.client_name}${o.delivery_date ? ` (entrega: ${new Date(o.delivery_date).toLocaleDateString("pt-BR")})` : ""}`).join(" · ")}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchAutocomplete
          placeholder="Buscar por cliente..."
          value={search}
          onChange={setSearch}
          suggestions={[...new Set(orders.map(o => o.client_name).filter(Boolean))]}
        />
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
                  {user?.role !== 'cliente' && <th className="px-5 py-3 w-12">
                    <Checkbox 
                      checked={filtered.length > 0 && selected.length === filtered.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>}
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">{user?.role === 'cliente' ? 'Job' : 'Cliente'}</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Descrição</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Entrega</th>
                  {user?.role !== 'cliente' && <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 w-20">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(o => {
                  const urgent = isOrderUrgent(o);
                  const days = getDaysUntilDelivery(o.delivery_date);
                  return (
                  <tr key={o.id} className={`hover:bg-slate-50/50 transition-colors ${urgent ? "bg-red-50/40" : ""}`}>
                    {user?.role !== 'cliente' && <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={selected.includes(o.id)}
                        onCheckedChange={(checked) => handleSelect(o.id, checked)}
                      />
                    </td>}
                    <td className="px-5 py-3.5 cursor-pointer" onClick={() => navigate(createPageUrl("WorkOrderDetail") + `?id=${o.id}`)}>
                      <div className="flex items-center gap-2">
                        {urgent && <Zap className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                        <p className="text-sm font-medium text-slate-800">{user?.role === 'cliente' ? (o.job || '—') : o.client_name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell cursor-pointer" onClick={() => navigate(createPageUrl("WorkOrderDetail") + `?id=${o.id}`)}>
                      <p className="text-sm text-slate-500 truncate max-w-xs">{o.description || "—"}</p>
                    </td>
                    <td className="px-5 py-3.5 text-center cursor-pointer" onClick={() => navigate(createPageUrl("WorkOrderDetail") + `?id=${o.id}`)}>
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-5 py-3.5 text-center hidden md:table-cell cursor-pointer" onClick={() => navigate(createPageUrl("WorkOrderDetail") + `?id=${o.id}`)}>
                      {o.delivery_date ? (
                        <div>
                          <p className={`text-xs font-medium ${urgent ? "text-red-600" : "text-slate-600"}`}>{new Date(o.delivery_date).toLocaleDateString("pt-BR")}</p>
                          {days !== null && o.status !== 'entregue' && (
                            <p className={`text-xs ${days <= 0 ? "text-red-600 font-bold" : days <= 3 ? "text-orange-500" : "text-slate-400"}`}>
                              {days <= 0 ? "Vencido!" : `${days}d`}
                            </p>
                          )}
                        </div>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    {user?.role !== 'cliente' && <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStatusChange(o.id, "pendente")} disabled={o.status === "pendente"}>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              Pendente
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(o.id, "em_producao")} disabled={o.status === "em_producao"}>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                              Em Produção
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(o.id, "finalizado")} disabled={o.status === "finalizado"}>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                              Finalizado
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(o.id, "entregue")} disabled={o.status === "entregue"}>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              Entregue
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleUrgent(o.id, o.is_urgent)} className={o.is_urgent ? "text-red-600" : "text-orange-600"}>
                            <div className="flex items-center gap-2">
                              {o.is_urgent ? <ZapOff className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                              {o.is_urgent ? "Remover Urgência" : "Marcar Urgente"}
                            </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PDFUploadDialog 
        open={showPDFUpload}
        onOpenChange={setShowPDFUpload}
        entityType="workorder"
        onSuccess={(newOrder) => {
          setOrders([newOrder, ...orders]);
          setShowPDFUpload(false);
        }}
      />
    </div>
  );
}
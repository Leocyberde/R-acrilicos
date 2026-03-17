import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, FileText, Trash2 } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import ExportTabs from "@/components/ExportTabs";
import { toast } from "sonner";

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const data = await base44.entities.Budget.list("-created_date", 200);
      setBudgets(data);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = budgets.filter(b => {
    const matchSearch = b.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || b.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusFilters = [
    { value: "all", label: "Todos" },
    { value: "pendente", label: "Pendentes" },
    { value: "aprovado", label: "Aprovados" },
    { value: "reprovado", label: "Reprovados" },
    { value: "recusado_cliente", label: "Recusados pelo Cliente" },
    { value: "aceito_cliente", label: "Aceitos pelo Cliente" },
  ];

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelected(filtered.map(b => b.id));
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
    
    if (!confirm(`Tem certeza que deseja excluir ${selected.length} orçamento(s)?`)) return;

    setDeleting(true);
    try {
      await Promise.all(selected.map(id => base44.entities.Budget.delete(id)));
      setBudgets(budgets.filter(b => !selected.includes(b.id)));
      setSelected([]);
      toast.success(`${selected.length} orçamento(s) excluído(s) com sucesso`);
    } catch (error) {
      toast.error("Erro ao excluir orçamentos");
    } finally {
      setDeleting(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Orçamentos</h1>
          <p className="text-slate-500 mt-0.5">{budgets.length} orçamentos registrados</p>
        </div>
        <div className="flex gap-2">
          <ExportTabs 
            data={budgets}
            filename="relatorio_orcamentos"
            columns={[
              { key: "client_name", label: "Cliente" },
              { key: "job", label: "Job" },
              { key: "total", label: "Total", format: (v) => `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
              { key: "created_date", label: "Criado", format: (v) => new Date(v).toLocaleDateString("pt-BR") },
              { key: "status", label: "Status" },
            ]}
          />
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
          <Button onClick={() => navigate(createPageUrl("BudgetCreate"))} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" /> Novo Orçamento
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar por cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5 bg-white border rounded-lg p-1">
          {statusFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
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
          <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Nenhum orçamento encontrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3 w-12">
                    <Checkbox 
                      checked={filtered.length > 0 && selected.length === filtered.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Cliente</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Descrição</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Total</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={selected.includes(b.id)}
                        onCheckedChange={(checked) => handleSelect(b.id, checked)}
                      />
                    </td>
                    <td className="px-5 py-3.5 cursor-pointer" onClick={() => navigate(createPageUrl("BudgetDetail") + `?id=${b.id}`)}>
                      <p className="text-sm font-medium text-slate-800">{b.client_name}</p>
                      <p className="text-xs text-slate-400 sm:hidden">{b.description?.substring(0, 30)}</p>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell cursor-pointer" onClick={() => navigate(createPageUrl("BudgetDetail") + `?id=${b.id}`)}>
                      <p className="text-sm text-slate-500 truncate max-w-xs">{b.description || "—"}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right cursor-pointer" onClick={() => navigate(createPageUrl("BudgetDetail") + `?id=${b.id}`)}>
                      <span className="text-sm font-semibold text-slate-800">R$ {(b.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center cursor-pointer" onClick={() => navigate(createPageUrl("BudgetDetail") + `?id=${b.id}`)}>
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right hidden sm:table-cell cursor-pointer" onClick={() => navigate(createPageUrl("BudgetDetail") + `?id=${b.id}`)}>
                      <span className="text-xs text-slate-400">{new Date(b.created_date).toLocaleDateString("pt-BR")}</span>
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
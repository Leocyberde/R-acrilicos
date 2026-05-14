import { useState, useEffect } from "react";
import { api } from "@/api/apiClient";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, FileText, Trash2, Settings2, GripVertical, ChevronRight, ChevronLeft, X } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import ExportTabs from "@/components/ExportTabs";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const ALL_COLUMNS = [
  { key: "job",           label: "JOB" },
  { key: "client_name",   label: "EMPRESA / CLIENTE" },
  { key: "producer",      label: "PRODUTOR" },
  { key: "total",         label: "TOTAL",             align: "right" },
  { key: "status",        label: "STATUS",            align: "center" },
  { key: "emission_date", label: "DATA DE EMISSÃO" },
  { key: "valid_until",   label: "VALIDADE" },
  { key: "created_date",  label: "DATA DE CRIAÇÃO" },
  { key: "payment_terms", label: "COND. DE PAGAMENTO" },
];

const DEFAULT_ACTIVE_KEYS = ["job", "client_name", "producer", "total", "status"];
const STORAGE_KEY = "budgets_column_config_v1";

function loadColumnConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const validKeys = ALL_COLUMNS.map(c => c.key);
      const filtered = parsed.filter(k => validKeys.includes(k));
      if (filtered.length > 0) return filtered;
    }
  } catch {}
  return [...DEFAULT_ACTIVE_KEYS];
}

function colByKey(key) {
  return ALL_COLUMNS.find(c => c.key === key);
}

function renderCellContent(key, b) {
  switch (key) {
    case "job":
      return <p className="text-sm font-semibold text-slate-800">{b.job || "—"}</p>;
    case "client_name":
      return <p className="text-sm text-slate-700 truncate max-w-[180px]">{b.client_name || "—"}</p>;
    case "producer":
      return <p className="text-sm text-slate-600 truncate max-w-[140px]">{b.producer || "—"}</p>;
    case "total":
      return <span className="text-sm font-semibold text-slate-800">R$ {(b.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>;
    case "status":
      return <StatusBadge status={b.status} />;
    case "emission_date":
      return <p className="text-sm text-slate-600">{b.emission_date ? new Date(b.emission_date).toLocaleDateString("pt-BR") : "—"}</p>;
    case "valid_until":
      return <p className="text-sm text-slate-600">{b.valid_until ? new Date(b.valid_until).toLocaleDateString("pt-BR") : "—"}</p>;
    case "created_date":
      return <p className="text-sm text-slate-600">{b.created_date ? new Date(b.created_date).toLocaleDateString("pt-BR") : "—"}</p>;
    case "payment_terms":
      return <p className="text-sm text-slate-600 truncate max-w-[140px]">{b.payment_terms || "—"}</p>;
    default:
      return <p className="text-sm text-slate-600">{b[key] || "—"}</p>;
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

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const srcId = source.droppableId;
    const dstId = destination.droppableId;

    if (srcId === dstId) {
      const list = srcId === "active-cols" ? [...pendingActive] : [...pendingInactive];
      const [removed] = list.splice(source.index, 1);
      list.splice(destination.index, 0, removed);
      if (srcId === "active-cols") setPendingActive(list);
      else setPendingInactive(list);
    } else {
      const srcList = srcId === "active-cols" ? [...pendingActive] : [...pendingInactive];
      const dstList = dstId === "active-cols" ? [...pendingActive] : [...pendingInactive];
      const [removed] = srcList.splice(source.index, 1);
      dstList.splice(destination.index, 0, removed);
      if (srcId === "active-cols") {
        setPendingActive(srcList);
        setPendingInactive(dstList);
      } else {
        setPendingInactive(srcList);
        setPendingActive(dstList);
      }
    }
  };

  const moveToInactive = (key) => {
    setPendingActive(prev => prev.filter(k => k !== key));
    setPendingInactive(prev => [...prev, key]);
  };

  const moveToActive = (key) => {
    setPendingInactive(prev => prev.filter(k => k !== key));
    setPendingActive(prev => [...prev, key]);
  };

  const handleSave = () => {
    onSave(pendingActive);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">CONFIGURAR COLUNAS</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                COLUNAS ATIVAS
              </p>
              <Droppable droppableId="active-cols">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[280px] rounded-xl border-2 p-2 space-y-1.5 transition-colors ${
                      snapshot.isDraggingOver ? "border-indigo-400 bg-indigo-50/50" : "border-indigo-200 bg-slate-50"
                    }`}
                  >
                    {pendingActive.map((key, index) => {
                      const col = colByKey(key);
                      if (!col) return null;
                      return (
                        <Draggable key={key} draggableId={key} index={index}>
                          {(provided2, snapshot2) => (
                            <div
                              ref={provided2.innerRef}
                              {...provided2.draggableProps}
                              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border text-sm font-semibold select-none transition-shadow ${
                                snapshot2.isDragging ? "shadow-lg border-indigo-400 text-indigo-700" : "border-slate-200 text-slate-700 hover:border-indigo-300"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span {...provided2.dragHandleProps} className="text-slate-300 cursor-grab active:cursor-grabbing flex-shrink-0">
                                  <GripVertical className="h-4 w-4" />
                                </span>
                                <span className="truncate uppercase text-xs tracking-wide">{col.label}</span>
                              </div>
                              <button
                                onClick={() => moveToInactive(key)}
                                className="text-slate-400 hover:text-red-500 flex-shrink-0 transition-colors"
                                title="Mover para inativas"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    {pendingActive.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-8">Arraste colunas aqui</p>
                    )}
                  </div>
                )}
              </Droppable>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                COLUNAS INATIVAS
              </p>
              <Droppable droppableId="inactive-cols">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[280px] rounded-xl border-2 p-2 space-y-1.5 transition-colors ${
                      snapshot.isDraggingOver ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    {pendingInactive.map((key, index) => {
                      const col = colByKey(key);
                      if (!col) return null;
                      return (
                        <Draggable key={key} draggableId={key} index={index}>
                          {(provided2, snapshot2) => (
                            <div
                              ref={provided2.innerRef}
                              {...provided2.draggableProps}
                              {...provided2.dragHandleProps}
                              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border text-sm font-semibold select-none cursor-grab active:cursor-grabbing transition-shadow ${
                                snapshot2.isDragging ? "shadow-lg border-slate-400 text-slate-700" : "border-slate-200 text-slate-500 hover:border-slate-300"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <GripVertical className="h-4 w-4 text-slate-300 flex-shrink-0" />
                                <span className="truncate uppercase text-xs tracking-wide">{col.label}</span>
                              </div>
                              <button
                                onClick={() => moveToActive(key)}
                                className="text-slate-400 hover:text-indigo-500 flex-shrink-0 transition-colors"
                                title="Mover para ativas"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    {pendingInactive.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-8">Sem colunas inativas</p>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </DragDropContext>

        <p className="text-xs text-slate-400 mt-3 mb-5">
          Arraste para reordenar ou mover entre os painéis. Use as setas para mover rapidamente.
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">Salvar</Button>
        </div>
      </div>
    </div>
  );
}

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [showColConfig, setShowColConfig] = useState(false);
  const [activeKeys, setActiveKeys] = useState(loadColumnConfig);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const data = await api.entities.Budget.list("-created_date", 200);
      setBudgets(data);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = budgets.filter(b => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q ||
      b.client_name?.toLowerCase().includes(q) ||
      b.producer?.toLowerCase().includes(q) ||
      b.job?.toLowerCase().includes(q) ||
      String(b.total || 0).replace(".", ",").includes(q) ||
      String(b.total || 0).includes(q);
    const matchStatus = filterStatus === "all" || b.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusFilters = [
    { value: "all", label: "Todos" },
    { value: "em_aberto", label: "Em Aberto" },
    { value: "orcamento_fechado", label: "Fechados" },
    { value: "pendente", label: "Pendentes" },
    { value: "aprovado", label: "Aprovados" },
    { value: "reprovado", label: "Reprovados" },
    { value: "recusado_cliente", label: "Recusados pelo Cliente" },
    { value: "aceito_cliente", label: "Aceitos pelo Cliente" },
  ];

  const handleSelectAll = (checked) => {
    setSelected(checked ? filtered.map(b => b.id) : []);
  };

  const handleSelect = (id, checked) => {
    setSelected(checked ? [...selected, id] : selected.filter(s => s !== id));
  };

  const handleDeleteSelected = async () => {
    if (selected.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selected.length} orçamento(s)?`)) return;
    setDeleting(true);
    try {
      await Promise.all(selected.map(id => api.entities.Budget.delete(id)));
      setBudgets(budgets.filter(b => !selected.includes(b.id)));
      setSelected([]);
      toast.success(`${selected.length} orçamento(s) excluído(s) com sucesso`);
    } catch {
      toast.error("Erro ao excluir orçamentos");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveColumns = (newActiveKeys) => {
    setActiveKeys(newActiveKeys);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newActiveKeys));
    toast.success("Colunas atualizadas");
  };

  const activeColumns = activeKeys.map(k => colByKey(k)).filter(Boolean);

  const exportColumns = activeColumns.map(col => ({
    key: col.key,
    label: col.label,
    ...(col.key === "total" ? { format: (v) => `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` } : {}),
    ...(["emission_date", "valid_until", "created_date"].includes(col.key) ? { format: (v) => v ? new Date(v).toLocaleDateString("pt-BR") : "—" } : {}),
  }));

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
        <div className="flex gap-2 flex-wrap">
          <ExportTabs
            data={filtered}
            filename="relatorio_orcamentos"
            columns={exportColumns}
            hideExcel
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowColConfig(true)}
            className="text-xs text-slate-600"
          >
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
            Colunas
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
          <Button onClick={() => navigate(createPageUrl("BudgetCreate"))} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" /> Novo Orçamento
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchAutocomplete
          placeholder="Buscar por cliente, job, produtor, valor..."
          value={search}
          onChange={setSearch}
          suggestions={[
            ...new Set([
              ...budgets.map(b => b.client_name),
              ...budgets.map(b => b.job),
              ...budgets.map(b => b.producer),
            ].filter(Boolean))
          ]}
        />
        <div className="flex gap-1.5 bg-white border rounded-lg p-1 flex-wrap">
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
                  {activeColumns.map(col => (
                    <th
                      key={col.key}
                      className={`text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 ${
                        col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.includes(b.id)}
                        onCheckedChange={checked => handleSelect(b.id, checked)}
                      />
                    </td>
                    {activeColumns.map(col => (
                      <td
                        key={col.key}
                        className={`px-4 py-3.5 cursor-pointer ${
                          col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""
                        }`}
                        onClick={() => navigate(createPageUrl("BudgetDetail") + `?id=${b.id}`)}
                      >
                        {renderCellContent(col.key, b)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ColumnConfigDialog
        open={showColConfig}
        onClose={() => setShowColConfig(false)}
        activeKeys={activeKeys}
        onSave={handleSaveColumns}
      />
    </div>
  );
}

import { useState, useEffect } from "react";
import { api } from "@/api/apiClient";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Receipt, Plus, Trash2, Upload, Settings2, GripVertical, ChevronRight, ChevronLeft, X } from "lucide-react";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import StatusBadge from "@/components/StatusBadge";
import ExportTabs from "@/components/ExportTabs";
import PDFUploadDialog from "@/components/PDFUploadDialog";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const ALL_COLUMNS = [
  { key: "job",            label: "JOB" },
  { key: "client_name",    label: "EMPRESA / CLIENTE" },
  { key: "producer",       label: "PRODUTOR" },
  { key: "total_amount",   label: "TOTAL",               align: "right" },
  { key: "status",         label: "STATUS",              align: "center" },
  { key: "due_date",       label: "VENCIMENTO",          align: "center" },
  { key: "payment_method", label: "FORMA DE PAGAMENTO" },
  { key: "created_date",   label: "DATA DE CRIAÇÃO" },
  { key: "delivery_date",  label: "DATA DE ENTREGA" },
];

const DEFAULT_ACTIVE_KEYS = ["job", "client_name", "producer", "total_amount", "status"];
const STORAGE_KEY = "receipts_column_config_v1";

const PAYMENT_LABELS = {
  dinheiro: "Dinheiro", pix: "PIX",
  cartao_credito: "Cartão de Crédito", cartao_debito: "Cartão de Débito",
  boleto: "Boleto", transferencia: "Transferência",
};

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

function renderCellContent(key, r) {
  switch (key) {
    case "job":
      return <p className="text-sm font-semibold text-slate-800">{r.job || "—"}</p>;
    case "client_name":
      return <p className="text-sm text-slate-700 truncate max-w-[180px]">{r.client_name || "—"}</p>;
    case "producer":
      return <p className="text-sm text-slate-600 truncate max-w-[140px]">{r.producer || "—"}</p>;
    case "total_amount":
      return <span className="text-sm font-semibold text-slate-800">R$ {(r.total_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>;
    case "status":
      return <StatusBadge status={r.status || "em_aberto"} />;
    case "due_date":
      return <p className="text-sm text-slate-600">{r.due_date ? new Date(r.due_date).toLocaleDateString("pt-BR") : "—"}</p>;
    case "payment_method":
      return <p className="text-sm text-slate-600">{PAYMENT_LABELS[r.payment_method] || r.payment_method || "—"}</p>;
    case "created_date":
      return <p className="text-sm text-slate-600">{r.created_date ? new Date(r.created_date).toLocaleDateString("pt-BR") : "—"}</p>;
    case "delivery_date":
      return <p className="text-sm text-slate-600">{r.delivery_date ? new Date(r.delivery_date).toLocaleDateString("pt-BR") : "—"}</p>;
    default:
      return <p className="text-sm text-slate-600">{r[key] || "—"}</p>;
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
                      className={`min-h-[280px] rounded-xl border-2 p-2 space-y-1.5 transition-colors ${snapshot.isDraggingOver ? panel.hover : `${panel.border} bg-slate-50`}`}>
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

export default function Receipts() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [showPDFUpload, setShowPDFUpload] = useState(false);
  const [showColConfig, setShowColConfig] = useState(false);
  const [activeKeys, setActiveKeys] = useState(loadColumnConfig);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const data = await api.entities.Receipt.list("-created_date", 200);
      setReceipts(data);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = receipts.filter(r => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q ||
      r.client_name?.toLowerCase().includes(q) ||
      r.job?.toLowerCase().includes(q) ||
      r.producer?.toLowerCase().includes(q) ||
      String(r.total_amount || 0).replace(".", ",").includes(q) ||
      String(r.total_amount || 0).includes(q);
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusFilters = [
    { value: "all",            label: "Todos" },
    { value: "em_aberto",      label: "Em Aberto" },
    { value: "recibo_fechado", label: "Fechados" },
    { value: "pendente",       label: "Pendentes" },
    { value: "parcial",        label: "Parcial" },
    { value: "pago",           label: "Pagos" },
    { value: "vencido",        label: "Vencidos" },
  ];

  const handleSelectAll = (checked) => setSelected(checked ? filtered.map(r => r.id) : []);
  const handleSelect = (id, checked) => setSelected(checked ? [...selected, id] : selected.filter(s => s !== id));

  const handleDeleteSelected = async () => {
    if (!selected.length || !confirm(`Tem certeza que deseja excluir ${selected.length} recibo(s)?`)) return;
    setDeleting(true);
    try {
      await Promise.all(selected.map(id => api.entities.Receipt.delete(id)));
      setReceipts(receipts.filter(r => !selected.includes(r.id)));
      setSelected([]);
      toast.success(`${selected.length} recibo(s) excluído(s) com sucesso`);
    } catch { toast.error("Erro ao excluir recibos"); }
    finally { setDeleting(false); }
  };

  const handleSaveColumns = (keys) => {
    setActiveKeys(keys);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    toast.success("Colunas atualizadas");
  };

  const activeColumns = activeKeys.map(k => colByKey(k)).filter(Boolean);

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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recibos</h1>
          <p className="text-slate-500 mt-0.5">{receipts.length} recibos registrados</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportTabs
            data={filtered}
            filename="relatorio_recibos"
            hideExcel
            columns={activeColumns.map(col => ({
              key: col.key,
              label: col.label,
              ...(col.key === "total_amount" ? { format: (v) => `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` } : {}),
              ...(col.key === "payment_method" ? { format: (v) => PAYMENT_LABELS[v] || v || "—" } : {}),
              ...(["due_date", "created_date", "delivery_date"].includes(col.key) ? { format: (v) => v ? new Date(v).toLocaleDateString("pt-BR") : "—" } : {}),
            }))}
          />
          <Button variant="outline" size="sm" onClick={() => setShowColConfig(true)} className="text-xs text-slate-600">
            <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Colunas
          </Button>
          {selected.length > 0 && (
            <Button variant="outline" onClick={handleDeleteSelected} disabled={deleting} className="text-red-600 hover:text-red-700">
              <Trash2 className="h-4 w-4 mr-2" /> Excluir ({selected.length})
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowPDFUpload(true)}>
            <Upload className="h-4 w-4 mr-2" /> Importar PDF
          </Button>
          <Button onClick={() => navigate(createPageUrl("ReceiptCreate"))}>
            <Plus className="h-4 w-4 mr-1.5" /> Novo Recibo
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchAutocomplete
          placeholder="Buscar por cliente, job, produtor, valor..."
          value={search}
          onChange={setSearch}
          suggestions={[...new Set([
            ...receipts.map(r => r.client_name),
            ...receipts.map(r => r.job),
            ...receipts.map(r => r.producer),
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
          <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Nenhum recibo encontrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3 w-12">
                    <Checkbox checked={filtered.length > 0 && selected.length === filtered.length} onCheckedChange={handleSelectAll} />
                  </th>
                  {activeColumns.map(col => (
                    <th key={col.key} className={`text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                      <Checkbox checked={selected.includes(r.id)} onCheckedChange={checked => handleSelect(r.id, checked)} />
                    </td>
                    {activeColumns.map(col => (
                      <td key={col.key}
                        className={`px-4 py-3.5 cursor-pointer ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}`}
                        onClick={() => navigate(createPageUrl("ReceiptDetail") + `?id=${r.id}`)}>
                        {renderCellContent(col.key, r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PDFUploadDialog open={showPDFUpload} onOpenChange={setShowPDFUpload} entityType="receipt"
        onSuccess={(newReceipt) => { setReceipts([newReceipt, ...receipts]); setShowPDFUpload(false); }} />

      <ColumnConfigDialog open={showColConfig} onClose={() => setShowColConfig(false)} activeKeys={activeKeys} onSave={handleSaveColumns} />
    </div>
  );
}

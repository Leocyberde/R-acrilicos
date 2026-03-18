import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Receipt, Plus, Trash2, Upload } from "lucide-react";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import StatusBadge from "@/components/StatusBadge";
import ExportTabs from "@/components/ExportTabs";
import PDFUploadDialog from "@/components/PDFUploadDialog";
import { toast } from "sonner";

export default function Receipts() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [showPDFUpload, setShowPDFUpload] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const data = await base44.entities.Receipt.list("-created_date", 200);
      setReceipts(data);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = receipts.filter(r => {
    const matchSearch = r.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusFilters = [
    { value: "all", label: "Todos" },
    { value: "em_aberto", label: "Em Aberto" },
    { value: "recibo_fechado", label: "Fechados" },
    { value: "pendente", label: "Pendentes" },
    { value: "parcial", label: "Parcial" },
    { value: "pago", label: "Pagos" },
    { value: "vencido", label: "Vencidos" },
  ];

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelected(filtered.map(r => r.id));
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
    
    if (!confirm(`Tem certeza que deseja excluir ${selected.length} recibo(s)?`)) return;

    setDeleting(true);
    try {
      await Promise.all(selected.map(id => base44.entities.Receipt.delete(id)));
      setReceipts(receipts.filter(r => !selected.includes(r.id)));
      setSelected([]);
      toast.success(`${selected.length} recibo(s) excluído(s) com sucesso`);
    } catch (error) {
      toast.error("Erro ao excluir recibos");
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recibos</h1>
          <p className="text-slate-500 mt-0.5">{receipts.length} recibos registrados</p>
        </div>
        <div className="flex gap-2">
          <ExportTabs 
            data={filtered}
            filename="relatorio_recibos"
            columns={[
              { key: "client_name", label: "Cliente" },
              { key: "job", label: "Job" },
              { key: "total_amount", label: "Valor", format: (v) => `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
              { key: "payment_method", label: "Pagamento", format: (v) => {
                const methods = { dinheiro: "Dinheiro", pix: "PIX", cartao_credito: "Cartão de Crédito", cartao_debito: "Cartão de Débito", boleto: "Boleto", transferencia: "Transferência" };
                return methods[v] || "";
              }},
              { key: "due_date", label: "Vencimento", format: (v) => v ? new Date(v).toLocaleDateString("pt-BR") : "" },
              { key: "created_date", label: "Criado", format: (v) => new Date(v).toLocaleDateString("pt-BR") },
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
          <Button 
            variant="outline"
            onClick={() => setShowPDFUpload(true)}
          >
            <Upload className="h-4 w-4 mr-2" /> Importar PDF
          </Button>
          <Button onClick={() => navigate(createPageUrl("ReceiptCreate"))}>
            <Plus className="h-4 w-4 mr-1.5" /> Novo Recibo
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchAutocomplete
          placeholder="Buscar por cliente..."
          value={search}
          onChange={setSearch}
          suggestions={[...new Set(receipts.map(r => r.client_name).filter(Boolean))]}
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
                    <Checkbox 
                      checked={filtered.length > 0 && selected.length === filtered.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Job</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Empresa</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Produtor</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Total</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Status</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Cliente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={selected.includes(r.id)}
                        onCheckedChange={(checked) => handleSelect(r.id, checked)}
                      />
                    </td>
                    <td className="px-4 py-3.5 cursor-pointer" onClick={() => navigate(createPageUrl("ReceiptDetail") + `?id=${r.id}`)}>
                      <p className="text-sm font-semibold text-slate-800">{r.job || "—"}</p>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell cursor-pointer" onClick={() => navigate(createPageUrl("ReceiptDetail") + `?id=${r.id}`)}>
                      <p className="text-sm text-slate-700 truncate max-w-[160px]">{r.client_name || "—"}</p>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell cursor-pointer" onClick={() => navigate(createPageUrl("ReceiptDetail") + `?id=${r.id}`)}>
                      <p className="text-sm text-slate-600 truncate max-w-[140px]">{r.producer || "—"}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right cursor-pointer" onClick={() => navigate(createPageUrl("ReceiptDetail") + `?id=${r.id}`)}>
                      <span className="text-sm font-semibold text-slate-800">R$ {(r.total_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center hidden sm:table-cell cursor-pointer" onClick={() => navigate(createPageUrl("ReceiptDetail") + `?id=${r.id}`)}>
                      <StatusBadge status={r.status || "em_aberto"} />
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell cursor-pointer" onClick={() => navigate(createPageUrl("ReceiptDetail") + `?id=${r.id}`)}>
                      <p className="text-sm text-slate-600 truncate max-w-[140px]">{r.client_name || "—"}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PDFUploadDialog 
        open={showPDFUpload}
        onOpenChange={setShowPDFUpload}
        entityType="receipt"
        onSuccess={(newReceipt) => {
          setReceipts([newReceipt, ...receipts]);
          setShowPDFUpload(false);
        }}
      />
    </div>
  );
}
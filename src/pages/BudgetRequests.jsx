import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Inbox, Eye, Paperclip, User, FileText, Link2, ExternalLink, ArrowRight, Truck } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

const statusConfig = {
  nova: { label: "Nova", className: "bg-blue-100 text-blue-700" },
  em_analise: { label: "Em Análise", className: "bg-amber-100 text-amber-700" },
  convertida: { label: "Convertida", className: "bg-emerald-100 text-emerald-700" },
  recusada: { label: "Recusada", className: "bg-red-100 text-red-700" },
};

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || { label: status, className: "bg-slate-100 text-slate-600" };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>{cfg.label}</span>;
}

export default function BudgetRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const data = await base44.entities.BudgetRequest.list("-created_date", 200);
    setRequests(data);
    setLoading(false);
  }

  const handleStatusChange = async (id, newStatus) => {
    await base44.entities.BudgetRequest.update(id, { status: newStatus });
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    if (selected?.id === id) setSelected(prev => ({ ...prev, status: newStatus }));
    toast.success("Status atualizado!");
  };

  const publicLink = `${window.location.origin}/ClientBudgetRequest`;

  const filtered = requests.filter(r => filterStatus === "all" || r.status === filterStatus);

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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Solicitações de Orçamento</h1>
          <p className="text-slate-500 mt-0.5">{requests.length} solicitação(ões) recebida(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { navigator.clipboard.writeText(publicLink); toast.success("Link copiado!"); }}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium transition-colors border border-indigo-200"
          >
            <Link2 className="h-4 w-4" />
            Copiar link do cliente
          </button>
        </div>
      </div>

      {/* Link info */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <Link2 className="h-4 w-4 text-indigo-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-indigo-900">Link público para clientes</p>
          <p className="text-xs text-indigo-600 truncate">{publicLink}</p>
        </div>
        <a href={publicLink} target="_blank" rel="noreferrer" className="flex-shrink-0">
          <ExternalLink className="h-4 w-4 text-indigo-500 hover:text-indigo-700" />
        </a>
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 bg-white border rounded-lg p-1 w-fit">
        {[
          { value: "all", label: "Todas" },
          { value: "nova", label: "Novas" },
          { value: "em_analise", label: "Em Análise" },
          { value: "convertida", label: "Convertidas" },
          { value: "recusada", label: "Recusadas" },
        ].map(f => (
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

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <Inbox className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhuma solicitação encontrada</p>
          <p className="text-slate-400 text-sm mt-1">As solicitações dos clientes aparecerão aqui</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Cliente</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Job</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Produtor</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Itens</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Anexos</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Data</th>
                  <th className="px-5 py-3 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <User className="h-3.5 w-3.5 text-indigo-600" />
                        </div>
                        <p className="text-sm font-medium text-slate-800">{r.client_name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <p className="text-sm text-slate-500">{r.job || "—"}</p>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <p className="text-sm text-slate-500">{r.producer || "—"}</p>
                    </td>
                    <td className="px-5 py-3.5 text-center hidden sm:table-cell">
                      <span className="text-sm text-slate-600">{(r.items || []).length}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center hidden sm:table-cell">
                      <span className="text-sm text-slate-600">{(r.attachments || []).length}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                      <span className="text-xs text-slate-400">{new Date(r.created_date).toLocaleDateString("pt-BR")}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Solicitação de {selected?.client_name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5 pt-2">
              {/* Status + Encaminhar */}
              <div className="flex items-center gap-3 flex-wrap">
                <Label className="text-sm">Status:</Label>
                <Select value={selected.status} onValueChange={(v) => handleStatusChange(selected.id, v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nova">Nova</SelectItem>
                    <SelectItem value="em_analise">Em Análise</SelectItem>
                    <SelectItem value="convertida">Convertida</SelectItem>
                    <SelectItem value="recusada">Recusada</SelectItem>
                  </SelectContent>
                </Select>
                <a
                  href={createPageUrl(`BudgetCreate?client_name=${encodeURIComponent(selected.client_name || "")}&job=${encodeURIComponent(selected.job || "")}&producer=${encodeURIComponent(selected.producer || "")}&description=${encodeURIComponent(selected.description || "")}&notes=${encodeURIComponent(selected.notes || "")}&items=${encodeURIComponent(JSON.stringify(selected.items || []))}&delivery_date=${encodeURIComponent(selected.delivery_date || "")}&client_phone=${encodeURIComponent(selected.client_phone || "")}&client_email=${encodeURIComponent(selected.client_email || "")}`)}
                  className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                  onClick={() => setSelected(null)}
                >
                  <ArrowRight className="h-4 w-4" />
                  Criar Orçamento
                </a>
              </div>

              {/* Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4">
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Cliente</p>
                  <p className="text-sm text-slate-800 font-medium mt-0.5">{selected.client_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Job</p>
                  <p className="text-sm text-slate-800 mt-0.5">{selected.job || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Produtor</p>
                  <p className="text-sm text-slate-800 mt-0.5">{selected.producer || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Data da Solicitação</p>
                  <p className="text-sm text-slate-800 mt-0.5">{new Date(selected.created_date).toLocaleDateString("pt-BR")}</p>
                </div>
                {selected.delivery_date && (
                  <div className="col-span-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <Truck className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-amber-600 font-medium uppercase tracking-wider">Data de Entrega Necessária</p>
                      <p className="text-sm text-amber-800 font-semibold mt-0.5">{new Date(selected.delivery_date).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Itens */}
              {selected.items?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Itens Solicitados</p>
                  <div className="bg-white border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Item</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-slate-500">Qtd</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {selected.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2.5 text-slate-700">{item.name}</td>
                            <td className="px-4 py-2.5 text-right text-slate-600 font-medium">{item.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Descrição */}
              {selected.description && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">Descrição</p>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4 whitespace-pre-wrap">{selected.description}</p>
                </div>
              )}

              {/* Observações */}
              {selected.notes && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">Observações</p>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4 whitespace-pre-wrap">{selected.notes}</p>
                </div>
              )}

              {/* Anexos */}
              {selected.attachments?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Arquivos Anexados ({selected.attachments.length})</p>
                  <div className="space-y-2">
                    {selected.attachments.map((att, idx) => (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 border rounded-lg px-4 py-2.5 transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-slate-700 truncate">{att.name}</span>
                          {att.size && <span className="text-xs text-slate-400">({(att.size / 1024).toFixed(0)}KB)</span>}
                        </div>
                        <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 flex-shrink-0 ml-2" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
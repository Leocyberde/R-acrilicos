import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileText, AlertCircle, Download, Calendar, Tag, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const statusConfig = {
  pendente: { badge: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "Aguardando resposta" },
  aprovado: { badge: "bg-green-100 text-green-800 border-green-200", label: "Aprovado" },
  reprovado: { badge: "bg-red-100 text-red-800 border-red-200", label: "Reprovado" },
  aceito_cliente: { badge: "bg-emerald-100 text-emerald-800 border-emerald-200", label: "Aceito por você" },
  recusado_cliente: { badge: "bg-orange-100 text-orange-800 border-orange-200", label: "Recusado por você" },
};

function formatBRL(value) {
  return (value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ClientBudgets() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [refusing, setRefusing] = useState(null);
  const [counterValue, setCounterValue] = useState("");
  const [counterNotes, setCounterNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      if (currentUser) {
        const data = await base44.entities.Budget.filter({ client_email: currentUser.email });
        const sent = (data || []).filter(b => b.pdf_sent === true || b.pdf_sent === 'true');
        setBudgets(sent);
      }
      setLoading(false);
    };
    load();
  }, []);

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAccept = async (budget) => {
    setSubmitting(true);
    try {
      await base44.entities.Budget.update(budget.id, {
        status: "aceito_cliente",
        client_response_date: new Date().toISOString(),
      });
      setBudgets((prev) =>
        prev.map((b) => b.id === budget.id ? { ...b, status: "aceito_cliente" } : b)
      );
      toast.success("Orçamento aceito com sucesso!");
    } catch {
      toast.error("Erro ao aceitar orçamento.");
    }
    setSubmitting(false);
  };

  const openRefuseDialog = (budget) => {
    setRefusing(budget);
    setCounterValue("");
    setCounterNotes("");
  };

  const handleRefuse = async () => {
    if (!counterValue || isNaN(parseFloat(counterValue.replace(",", ".")))) {
      toast.error("Informe um valor de contraproposta válido.");
      return;
    }
    setSubmitting(true);
    try {
      const numericValue = parseFloat(counterValue.replace(/\./g, "").replace(",", "."));
      await base44.entities.Budget.update(refusing.id, {
        status: "recusado_cliente",
        client_counter_value: numericValue,
        client_counter_notes: counterNotes,
        client_response_date: new Date().toISOString(),
      });
      setBudgets((prev) =>
        prev.map((b) =>
          b.id === refusing.id
            ? { ...b, status: "recusado_cliente", client_counter_value: numericValue, client_counter_notes: counterNotes }
            : b
        )
      );
      toast.success("Resposta enviada com sucesso!");
      setRefusing(null);
    } catch {
      toast.error("Erro ao enviar resposta.");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-slate-500">Carregando...</div>
      </div>
    );
  }

  const pendentes = budgets.filter((b) => b.status === "pendente").length;
  const aceitos = budgets.filter((b) => b.status === "aceito_cliente" || b.status === "aprovado").length;
  const recusados = budgets.filter((b) => b.status === "recusado_cliente" || b.status === "reprovado").length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <FileText className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meus Orçamentos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Acompanhe e responda aos orçamentos enviados para você</p>
        </div>
      </div>

      {budgets.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-5 text-center">
              <div className="text-2xl font-bold text-amber-600">{pendentes}</div>
              <div className="text-xs text-slate-500 mt-1">Aguardando resposta</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-5 text-center">
              <div className="text-2xl font-bold text-emerald-600">{aceitos}</div>
              <div className="text-xs text-slate-500 mt-1">Aceitos</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-5 text-center">
              <div className="text-2xl font-bold text-orange-600">{recusados}</div>
              <div className="text-xs text-slate-500 mt-1">Recusados</div>
            </CardContent>
          </Card>
        </div>
      )}

      {budgets.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-16 pb-16 text-center">
            <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Nenhum orçamento encontrado</p>
            <p className="text-slate-400 text-sm mt-1">Quando um orçamento for gerado para você, ele aparecerá aqui.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {budgets.map((budget) => {
            const cfg = statusConfig[budget.status] || { badge: "bg-slate-100 text-slate-700 border-slate-200", label: budget.status };
            const isOpen = expanded[budget.id];
            const canRespond = budget.status === "pendente" || budget.status === "aprovado";

            return (
              <Card key={budget.id} className="border-0 shadow-sm">
                <CardContent className="pt-5 pb-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">
                          {budget.job || budget.description || "Orçamento"}
                        </h3>
                        <Badge className={`text-xs border ${cfg.badge}`}>{cfg.label}</Badge>
                      </div>
                      {budget.description && budget.job && (
                        <p className="text-sm text-slate-500 mb-2 line-clamp-1">{budget.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                        {budget.emission_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Emissão: {format(new Date(budget.emission_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                          </div>
                        )}
                        {budget.validity_date && (
                          <div className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            <span>Validade: {format(new Date(budget.validity_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xl font-bold text-indigo-600">
                        R$ {formatBRL(budget.total_with_margin || budget.total)}
                      </div>
                      {budget.total_with_margin && budget.total && budget.total_with_margin !== budget.total && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          Sem nota: R$ {formatBRL(budget.total)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Counter-proposal info if refused */}
                  {budget.status === "recusado_cliente" && budget.client_counter_value && (
                    <div className="mt-3 p-3 rounded-lg bg-orange-50 border border-orange-200">
                      <p className="text-xs font-semibold text-orange-700 mb-1">Sua contraproposta enviada</p>
                      <p className="text-sm font-bold text-orange-800">R$ {formatBRL(budget.client_counter_value)}</p>
                      {budget.client_counter_notes && (
                        <p className="text-xs text-orange-700 mt-1">{budget.client_counter_notes}</p>
                      )}
                    </div>
                  )}

                  {/* Toggle items */}
                  <button
                    onClick={() => toggleExpand(budget.id)}
                    className="mt-3 flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {isOpen ? "Ocultar detalhes" : `Ver detalhes dos itens (${budget.items?.length || 0})`}
                  </button>

                  {/* Expanded items */}
                  {isOpen && budget.items?.length > 0 && (
                    <div className="mt-3 rounded-lg border border-slate-100 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-2">Item</th>
                            <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-2">Qtd</th>
                            <th className="text-right text-xs font-semibold text-slate-500 uppercase px-4 py-2">Valor Unit.</th>
                            <th className="text-right text-xs font-semibold text-slate-500 uppercase px-4 py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {budget.items.map((item, i) => {
                            const qty = item.quantity || 1;
                            const unit = item.unit_price || item.price || 0;
                            const total = item.total || qty * unit;
                            return (
                              <tr key={i} className="bg-white">
                                <td className="px-4 py-2.5 text-slate-800">{item.name}</td>
                                <td className="px-4 py-2.5 text-slate-600 text-center">{qty}</td>
                                <td className="px-4 py-2.5 text-slate-600 text-right">R$ {formatBRL(unit)}</td>
                                <td className="px-4 py-2.5 font-medium text-slate-900 text-right">R$ {formatBRL(total)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="bg-slate-50 px-4 py-3 space-y-1.5 border-t border-slate-100">
                        {budget.subtotal && budget.total && budget.subtotal !== budget.total && (
                          <div className="flex justify-between text-sm text-slate-600">
                            <span>Subtotal</span>
                            <span>R$ {formatBRL(budget.subtotal)}</span>
                          </div>
                        )}
                        {budget.discount > 0 && (
                          <div className="flex justify-between text-sm text-red-600">
                            <span>Desconto ({budget.discount}%)</span>
                            <span>- R$ {formatBRL((budget.subtotal || budget.total || 0) * (budget.discount / 100))}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
                          <span>{budget.total_label || "Total sem Nota"}</span>
                          <span>R$ {formatBRL(budget.total)}</span>
                        </div>
                        {budget.total_with_margin && budget.total_with_margin !== budget.total && (
                          <div className="flex justify-between text-sm font-bold text-indigo-700">
                            <span>{budget.total_with_margin_label || "Total com Nota"}</span>
                            <span>R$ {formatBRL(budget.total_with_margin)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex gap-2">
                      {budget.pdf_url && (
                        <a
                          href={budget.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          Baixar PDF
                        </a>
                      )}
                    </div>
                    {canRespond && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => openRefuseDialog(budget)}
                          disabled={submitting}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1.5" />
                          Recusar
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleAccept(budget)}
                          disabled={submitting}
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                          Aceitar Orçamento
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Counter-proposal dialog */}
      <Dialog open={!!refusing} onOpenChange={(open) => !open && setRefusing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recusar orçamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              Informe o valor que considera viável para ambas as partes. Essa contraproposta será enviada para análise.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="counter-value">Valor da contraproposta (R$)</Label>
              <Input
                id="counter-value"
                placeholder="Ex: 5.000,00"
                value={counterValue}
                onChange={(e) => setCounterValue(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="counter-notes">Mensagem / Justificativa (opcional)</Label>
              <Textarea
                id="counter-notes"
                placeholder="Explique os motivos ou condições da sua proposta..."
                value={counterNotes}
                onChange={(e) => setCounterNotes(e.target.value)}
                rows={3}
              />
            </div>
            {refusing && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-500">
                Valor atual do orçamento: <span className="font-semibold text-slate-700">R$ {formatBRL(refusing.total_with_margin || refusing.total)}</span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRefusing(null)} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleRefuse}
              disabled={submitting}
            >
              {submitting ? "Enviando..." : "Enviar Contraproposta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

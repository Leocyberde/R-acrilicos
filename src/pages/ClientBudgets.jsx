import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileText, AlertCircle, CheckCircle, XCircle } from "lucide-react";
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

function BudgetDocument({ budget, settings, onAccept, onRefuse, submitting }) {
  const cfg = statusConfig[budget.status] || { badge: "bg-slate-100 text-slate-700 border-slate-200", label: budget.status };
  const canRespond = budget.status === "pendente" || budget.status === "aprovado";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
      {/* Document header */}
      <div className="p-6 sm:p-8 border-b-2 border-slate-900">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {settings?.company_logo ? (
              <img src={settings.company_logo} alt="Logo" className="h-14 mb-2 object-contain" />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-indigo-100 flex items-center justify-center mb-2">
                <FileText className="h-7 w-7 text-indigo-600" />
              </div>
            )}
            {settings?.company_name && (
              <p className="text-sm font-bold text-slate-800">{settings.company_name}</p>
            )}
            {settings?.company_address && (
              <p className="text-xs text-slate-500 mt-0.5">{settings.company_address}</p>
            )}
            {(settings?.company_phone || settings?.company_email) && (
              <p className="text-xs text-slate-500">
                {settings.company_phone}
                {settings.company_phone && settings.company_email && " • "}
                {settings.company_email}
              </p>
            )}
          </div>
          <div className="text-right ml-4">
            <p className="text-lg font-semibold text-slate-800 uppercase tracking-wide">Orçamento</p>
            <p className="text-lg text-slate-500">#{String(budget.id ?? "")}</p>
            <Badge className={`mt-2 text-xs border ${cfg.badge}`}>{cfg.label}</Badge>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-5">
        {/* Emission date */}
        {budget.emission_date && (
          <div className="pb-4 border-b border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Data de Emissão</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">
              {format(new Date(budget.emission_date), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
        )}

        {/* Client details grid */}
        <div className="pb-4 border-b border-slate-100 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Cliente</p>
              <p className="text-sm font-semibold text-slate-900 mt-1">{budget.client_name}</p>
            </div>
            {budget.job && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Job</p>
                <p className="text-sm text-slate-700 mt-1">{budget.job}</p>
              </div>
            )}
            {budget.producer && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Produtor</p>
                <p className="text-sm text-slate-700 mt-1">{budget.producer}</p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {budget.client_phone && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Telefone</p>
                <p className="text-sm text-slate-700 mt-1">{budget.client_phone}</p>
              </div>
            )}
            {budget.client_email && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Email</p>
                <p className="text-sm text-slate-700 mt-1">{budget.client_email}</p>
              </div>
            )}
            {budget.client_address && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Endereço</p>
                <p className="text-sm text-slate-700 mt-1">{budget.client_address}</p>
              </div>
            )}
            {budget.validity_date && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Validade</p>
                <p className="text-sm text-slate-700 mt-1">
                  {format(new Date(budget.validity_date), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {budget.description && (
          <div className="pb-4 border-b border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Descrição</p>
            <p className="text-sm text-slate-700">{budget.description}</p>
          </div>
        )}

        {/* Items table */}
        {budget.items?.length > 0 && (
          <div className="pb-4 border-b border-slate-100">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase py-2 pr-4">Item</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase py-2 px-4">Qtd</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase py-2 px-4">Preço Unit.</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase py-2 pl-4">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {budget.items.map((item, i) => {
                  const qty = item.quantity || 1;
                  const unit = item.unit_price || item.price || 0;
                  const total = item.total || qty * unit;
                  return (
                    <tr key={i}>
                      <td className="py-2.5 pr-4 text-sm text-slate-800">{item.name}</td>
                      <td className="py-2.5 px-4 text-sm text-slate-600 text-center">{qty}</td>
                      <td className="py-2.5 px-4 text-sm text-slate-600 text-right">R$ {formatBRL(unit)}</td>
                      <td className="py-2.5 pl-4 text-sm font-medium text-slate-800 text-right">R$ {formatBRL(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mt-4 space-y-1.5">
              {budget.subtotal > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal:</span>
                  <span>R$ {formatBRL(budget.subtotal)}</span>
                </div>
              )}
              {budget.discount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Desconto ({budget.discount}%):</span>
                  <span>- R$ {formatBRL((budget.subtotal || budget.total || 0) * (budget.discount / 100))}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t-2 border-slate-900 pt-3 mt-2">
                <span>{budget.total_label || "Total sem Nota"}:</span>
                <span>R$ {formatBRL(budget.total)}</span>
              </div>
              {budget.total_with_margin > 0 && budget.total_with_margin !== budget.total && (
                <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
                  <span>{budget.total_with_margin_label || "Total com Nota"}:</span>
                  <span>R$ {formatBRL(budget.total_with_margin)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {budget.notes && (
          <div className="pb-4 border-b border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Observações</p>
            <p className="text-sm text-slate-600">{budget.notes}</p>
          </div>
        )}

        {/* Counter-proposal sent info */}
        {budget.status === "recusado_cliente" && budget.client_counter_value && (
          <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
            <p className="text-xs font-semibold text-orange-700 mb-1">Sua contraproposta enviada</p>
            <p className="text-sm font-bold text-orange-800">R$ {formatBRL(budget.client_counter_value)}</p>
            {budget.client_counter_notes && (
              <p className="text-xs text-orange-700 mt-1 italic">"{budget.client_counter_notes}"</p>
            )}
          </div>
        )}

        {/* Action buttons */}
        {canRespond && (
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 sm:flex-none border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => onRefuse(budget)}
              disabled={submitting}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Recusar Orçamento
            </Button>
            <Button
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onAccept(budget)}
              disabled={submitting}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Aceitar Orçamento
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClientBudgets() {
  const [budgets, setBudgets] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refusing, setRefusing] = useState(null);
  const [counterValue, setCounterValue] = useState("");
  const [counterNotes, setCounterNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [currentUser, settingsData] = await Promise.all([
        base44.auth.me(),
        base44.entities.Settings.list(),
      ]);
      if (settingsData.length > 0) setSettings(settingsData[0]);
      if (currentUser) {
        const data = await base44.entities.Budget.filter({ client_email: currentUser.email });
        const sent = (data || []).filter(b => b.pdf_sent === true || b.pdf_sent === "true");
        setBudgets(sent);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleAccept = async (budget) => {
    setSubmitting(true);
    try {
      await base44.entities.Budget.update(budget.id, {
        status: "aceito_cliente",
        client_response_date: new Date().toISOString(),
      });
      setBudgets(prev => prev.map(b => b.id === budget.id ? { ...b, status: "aceito_cliente" } : b));
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
      setBudgets(prev =>
        prev.map(b =>
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
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pendentes = budgets.filter(b => b.status === "pendente").length;
  const aceitos = budgets.filter(b => b.status === "aceito_cliente" || b.status === "aprovado").length;
  const recusados = budgets.filter(b => b.status === "recusado_cliente" || b.status === "reprovado").length;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <FileText className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meus Orçamentos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Visualize e responda aos orçamentos enviados para você</p>
        </div>
      </div>

      {budgets.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-amber-600">{pendentes}</div>
            <div className="text-xs text-slate-500 mt-1">Aguardando resposta</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-emerald-600">{aceitos}</div>
            <div className="text-xs text-slate-500 mt-1">Aceitos</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-orange-600">{recusados}</div>
            <div className="text-xs text-slate-500 mt-1">Recusados</div>
          </div>
        </div>
      )}

      {budgets.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-16 text-center">
          <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Nenhum orçamento encontrado</p>
          <p className="text-slate-400 text-sm mt-1">Quando um orçamento for enviado para você, ele aparecerá aqui.</p>
        </div>
      ) : (
        <div>
          {budgets.map(budget => (
            <BudgetDocument
              key={budget.id}
              budget={budget}
              settings={settings}
              onAccept={handleAccept}
              onRefuse={openRefuseDialog}
              submitting={submitting}
            />
          ))}
        </div>
      )}

      {/* Counter-proposal dialog */}
      <Dialog open={!!refusing} onOpenChange={open => !open && setRefusing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recusar orçamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              Informe o valor que considera viável. Essa contraproposta será enviada para análise.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="counter-value">Valor da contraproposta (R$)</Label>
              <Input
                id="counter-value"
                placeholder="Ex: 5.000,00"
                value={counterValue}
                onChange={e => setCounterValue(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="counter-notes">Mensagem / Justificativa (opcional)</Label>
              <Textarea
                id="counter-notes"
                placeholder="Explique os motivos ou condições da sua proposta..."
                value={counterNotes}
                onChange={e => setCounterNotes(e.target.value)}
                rows={3}
              />
            </div>
            {refusing && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-500">
                Valor atual: <span className="font-semibold text-slate-700">R$ {formatBRL(refusing.total_with_margin || refusing.total)}</span>
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

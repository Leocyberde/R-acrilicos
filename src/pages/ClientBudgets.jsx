import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertCircle, Download, Calendar, Tag } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig = {
  pendente: { badge: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  aprovado: { badge: "bg-green-100 text-green-800 border-green-200" },
  reprovado: { badge: "bg-red-100 text-red-800 border-red-200" },
};

const statusLabels = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

export default function ClientBudgets() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const load = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      if (currentUser) {
        const data = await base44.entities.Budget.filter({ client_name: currentUser.full_name });
        setBudgets(data || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-slate-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <FileText className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meus Orçamentos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Acompanhe os orçamentos enviados para você</p>
        </div>
      </div>

      {/* Stats */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {["pendente", "aprovado", "reprovado"].map((s) => {
            const count = budgets.filter((b) => b.status === s).length;
            return (
              <Card key={s} className="border-0 shadow-sm">
                <CardContent className="pt-5 pb-5 text-center">
                  <div className="text-2xl font-bold text-slate-800">{count}</div>
                  <div className="text-xs text-slate-500 mt-1">{statusLabels[s]}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* List */}
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
          {budgets.map((budget) => (
            <Card key={budget.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {budget.job || budget.description || "Orçamento"}
                      </h3>
                      <Badge className={`text-xs border ${statusConfig[budget.status]?.badge || "bg-slate-100 text-slate-700"}`}>
                        {statusLabels[budget.status] || budget.status}
                      </Badge>
                      {budget.pdf_sent && (
                        <Badge className="text-xs border bg-blue-50 text-blue-700 border-blue-200">
                          PDF disponível
                        </Badge>
                      )}
                    </div>

                    {budget.description && budget.job && (
                      <p className="text-sm text-slate-500 mb-3 line-clamp-2">{budget.description}</p>
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

                    {/* Items summary */}
                    {budget.items?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {budget.items.slice(0, 3).map((item, i) => (
                          <span key={i} className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5">
                            {item.name} × {item.quantity}
                          </span>
                        ))}
                        {budget.items.length > 3 && (
                          <span className="text-xs bg-slate-100 text-slate-500 rounded px-2 py-0.5">
                            +{budget.items.length - 3} itens
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xl font-bold text-indigo-600">
                      R$ {(budget.total_with_margin || budget.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    {budget.pdf_url && (
                      <a
                        href={budget.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        Baixar PDF
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
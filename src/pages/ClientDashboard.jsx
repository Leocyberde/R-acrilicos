import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { FileText, Receipt, Wrench, Clock, CheckCircle2, AlertCircle, ChevronRight, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const statusLabels = {
  pendente:        { label: "Aguardando",   color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  aprovado:        { label: "Aprovado",     color: "bg-green-100 text-green-800 border-green-200" },
  aceito_cliente:  { label: "Aceito",       color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  recusado_cliente:{ label: "Recusado",     color: "bg-orange-100 text-orange-800 border-orange-200" },
  reprovado:       { label: "Reprovado",    color: "bg-red-100 text-red-800 border-red-200" },
  em_aberto:       { label: "Em Aberto",    color: "bg-blue-100 text-blue-800 border-blue-200" },
  pago:            { label: "Pago",         color: "bg-green-100 text-green-800 border-green-200" },
  parcial:         { label: "Parcial",      color: "bg-orange-100 text-orange-800 border-orange-200" },
  vencido:         { label: "Vencido",      color: "bg-red-100 text-red-800 border-red-200" },
  recibo_fechado:  { label: "Fechado",      color: "bg-slate-100 text-slate-700 border-slate-200" },
  em_producao:     { label: "Em Produção",  color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  aguardando:      { label: "Aguardando",   color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  concluida:       { label: "Concluída",    color: "bg-green-100 text-green-800 border-green-200" },
};

function StatusPill({ status }) {
  const cfg = statusLabels[status] || { label: status, color: "bg-slate-100 text-slate-700 border-slate-200" };
  return <Badge className={`text-xs border ${cfg.color}`}>{cfg.label}</Badge>;
}

function formatBRL(value) {
  return Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function SummaryCard({ icon: Icon, label, count, sublabel, color, link }) {
  return (
    <Link to={link} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all duration-200 group flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-3xl font-bold text-slate-900 mt-1">{count}</p>
        {sublabel && <p className="text-xs text-slate-400 mt-1">{sublabel}</p>}
      </div>
      <div className={`h-10 w-10 rounded-lg ${color} flex items-center justify-center group-hover:scale-110 transition-transform shrink-0`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
    </Link>
  );
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user?.email) return;
      const [allBudgets, allReceipts, allOrders, settingsList] = await Promise.all([
        base44.entities.Budget.filter({ client_email: user.email }),
        base44.entities.Receipt.filter({ client_email: user.email }),
        base44.entities.WorkOrder.filter({ client_email: user.email }),
        base44.entities.Settings.list(),
      ]);
      const sentBudgets = (allBudgets || []).filter(b => b.pdf_sent === true || b.pdf_sent === "true");
      const sentReceipts = (allReceipts || []).filter(r => r.sent_to_client === true || r.sent_to_client === "true");
      setBudgets(sentBudgets.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      setReceipts(sentReceipts.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      setWorkOrders((allOrders || []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      if (settingsList?.length > 0) setSettings(settingsList[0]);
      setLoading(false);
    }
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const budgetsPendentes = budgets.filter(b => b.status === "pendente" || b.status === "aprovado").length;
  const recibosAbertos = receipts.filter(r => r.status !== "pago" && r.status !== "recibo_fechado").length;
  const osAtivas = workOrders.filter(o => o.status !== "concluida" && o.status !== "cancelada").length;

  const recentBudgets = budgets.slice(0, 4);
  const recentReceipts = receipts.slice(0, 4);

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Welcome */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
          <User className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Olá, {user?.full_name || user?.email?.split("@")[0]}!
          </h1>
          <p className="text-slate-500 mt-0.5">
            {settings?.company_name ? `Bem-vindo ao portal ${settings.company_name}` : "Bem-vindo ao seu portal"}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={FileText}
          label="Meus Orçamentos"
          count={budgets.length}
          sublabel={budgetsPendentes > 0 ? `${budgetsPendentes} aguardando resposta` : "Nenhum pendente"}
          color="bg-indigo-500"
          link={createPageUrl("ClientBudgets")}
        />
        <SummaryCard
          icon={Receipt}
          label="Meus Recibos"
          count={receipts.length}
          sublabel={recibosAbertos > 0 ? `${recibosAbertos} em aberto` : "Todos em dia"}
          color="bg-emerald-500"
          link={createPageUrl("ClientReceipts")}
        />
        <SummaryCard
          icon={Wrench}
          label="Ordens de Serviço"
          count={workOrders.length}
          sublabel={osAtivas > 0 ? `${osAtivas} em andamento` : "Nenhuma ativa"}
          color="bg-orange-500"
          link={createPageUrl("WorkOrders")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent budgets */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-500" />
              <h2 className="text-sm font-semibold text-slate-800">Orçamentos Recentes</h2>
            </div>
            <Link to={createPageUrl("ClientBudgets")} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              Ver todos <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {recentBudgets.length === 0 ? (
            <div className="py-10 text-center">
              <AlertCircle className="h-8 w-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Nenhum orçamento enviado ainda</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentBudgets.map(b => (
                <Link
                  key={b.id}
                  to={createPageUrl("ClientBudgets")}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      Orçamento #{b.id}{b.job ? ` — ${b.job}` : ""}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      R$ {formatBRL(b.total_with_margin || b.total)}
                    </p>
                  </div>
                  <StatusPill status={b.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent receipts */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-500" />
              <h2 className="text-sm font-semibold text-slate-800">Recibos Recentes</h2>
            </div>
            <Link to={createPageUrl("ClientReceipts")} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              Ver todos <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {recentReceipts.length === 0 ? (
            <div className="py-10 text-center">
              <AlertCircle className="h-8 w-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Nenhum recibo enviado ainda</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentReceipts.map(r => (
                <Link
                  key={r.id}
                  to={createPageUrl("ClientReceipts")}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      Recibo #{r.id}{r.job ? ` — ${r.job}` : ""}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      R$ {formatBRL(r.total_value || r.total_amount)}
                    </p>
                  </div>
                  <StatusPill status={r.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Work orders */}
      {workOrders.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-orange-500" />
              <h2 className="text-sm font-semibold text-slate-800">Minhas Ordens de Serviço</h2>
            </div>
            <Link to={createPageUrl("WorkOrders")} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              Ver todas <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {workOrders.slice(0, 4).map(o => (
              <div key={o.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    O.S. #{o.id}{o.job ? ` — ${o.job}` : ""}
                  </p>
                  {o.delivery_date && (
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Entrega: {String(o.delivery_date).split("T")[0].split("-").reverse().join("/")}
                    </p>
                  )}
                </div>
                <StatusPill status={o.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5">
        <p className="text-sm font-semibold text-indigo-800 mb-3">Acesso Rápido</p>
        <div className="flex flex-wrap gap-3">
          <Link
            to={createPageUrl("ClientBudgetRequest")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <FileText className="h-4 w-4" /> Solicitar Orçamento
          </Link>
          <Link
            to={createPageUrl("ClientProfile")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg border border-indigo-200 transition-colors"
          >
            <User className="h-4 w-4" /> Meu Perfil
          </Link>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link, Navigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FileText, Wrench, Receipt, Factory, TrendingUp, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import ExportTabs from "@/components/ExportTabs";
import { useAuth } from "@/lib/AuthContext";

function StatCard({ icon: Icon, label, value, color, link }) {
  return (
    <Link to={link} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`h-10 w-10 rounded-lg ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [b, w, r] = await Promise.all([
        base44.entities.Budget.list("-created_date", 100),
        base44.entities.WorkOrder.list("-created_date", 100),
        base44.entities.Receipt.list("-created_date", 100),
      ]);
      setBudgets(b);
      setWorkOrders(w);
      setReceipts(r);
      setLoading(false);
    }
    load();
  }, []);

  if (user && user.role !== "admin" && user.role !== "cliente") {
    return <Navigate to={createPageUrl("WorkOrderDashboard")} replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pendingBudgets = budgets.filter(b => b.status === "pendente").length;
  const approvedBudgets = budgets.filter(b => b.status === "aprovado").length;
  const inProduction = workOrders.filter(w => w.status === "em_producao").length;
  const overdueReceipts = receipts.filter(r => r.status === "vencido").length;

  const recentBudgets = budgets.slice(0, 5);
  const recentOrders = workOrders.slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1">Visão geral do sistema</p>
        </div>
        <ExportTabs 
          data={[...budgets, ...workOrders, ...receipts]}
          filename="relatorio_dashboard"
          columns={[
            { key: "client_name", label: "Cliente" },
            { key: "job", label: "Job" },
            { key: "created_date", label: "Criado", format: (v) => new Date(v).toLocaleDateString("pt-BR") },
            { key: "status", label: "Status" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Orçamentos Pendentes" value={pendingBudgets} color="bg-amber-500" link={createPageUrl("Budgets")} />
        <StatCard icon={CheckCircle2} label="Orçamentos Aprovados" value={approvedBudgets} color="bg-emerald-500" link={createPageUrl("Budgets")} />
        <StatCard icon={Factory} label="Em Produção" value={inProduction} color="bg-blue-500" link={createPageUrl("Production")} />
        <StatCard icon={AlertCircle} label="Recibos Vencidos" value={overdueReceipts} color="bg-red-500" link={createPageUrl("Receipts")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Budgets */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Últimos Orçamentos</h2>
            <Link to={createPageUrl("Budgets")} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Ver todos</Link>
          </div>
          {recentBudgets.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">Nenhum orçamento ainda</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentBudgets.map(b => (
                <Link key={b.id} to={createPageUrl("BudgetDetail") + `?id=${b.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{b.client_name}</p>
                    <p className="text-xs text-slate-400">R$ {(b.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Work Orders */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Últimas Ordens de Serviço</h2>
            <Link to={createPageUrl("WorkOrders")} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Ver todas</Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">Nenhuma ordem ainda</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentOrders.map(w => (
                <Link key={w.id} to={createPageUrl("WorkOrderDetail") + `?id=${w.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{w.client_name}</p>
                    <p className="text-xs text-slate-400">{w.description?.substring(0, 40) || "Sem descrição"}</p>
                  </div>
                  <StatusBadge status={w.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
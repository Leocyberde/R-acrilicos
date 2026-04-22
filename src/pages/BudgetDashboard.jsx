import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FileText, Clock, CheckCircle2, XCircle, TrendingUp, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import StatusBadge from "@/components/StatusBadge";
import ExportTabs from "@/components/ExportTabs";

export default function BudgetDashboard() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await base44.entities.Budget.list("-created_date", 500);
      setBudgets(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pending = budgets.filter(b => b.status === "pendente");
  const approved = budgets.filter(b => b.status === "aprovado");
  const rejected = budgets.filter(b => b.status === "reprovado");

  const totalValue = budgets.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
  const approvedValue = approved.reduce((sum, b) => sum + (Number(b.total) || 0), 0);

  const statusData = [
    { name: "Pendente", value: pending.length, color: "#f59e0b" },
    { name: "Aprovado", value: approved.length, color: "#10b981" },
    { name: "Reprovado", value: rejected.length, color: "#ef4444" },
  ].filter(d => d.value > 0);

  // Group by month
  const monthlyData = {};
  budgets.forEach(b => {
    const date = new Date(b.created_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyData[key]) monthlyData[key] = { month: key, total: 0, count: 0 };
    monthlyData[key].total += Number(b.total) || 0;
    monthlyData[key].count += 1;
  });
  const monthlyChartData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard de Orçamentos</h1>
        <p className="text-slate-500 mt-1">Visão completa dos orçamentos</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{budgets.length}</p>
                <p className="text-xs text-slate-400 mt-1">orçamentos</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Pendentes</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{pending.length}</p>
                <p className="text-xs text-slate-400 mt-1">aguardando aprovação</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Aprovados</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{approved.length}</p>
                <p className="text-xs text-slate-400 mt-1">confirmados</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Valor Aprovado</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  R$ {approvedValue.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-slate-400 mt-1">total em vendas</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orçamentos por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  formatter={(value, name) => [
                    name === "total" ? `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : value,
                    name === "total" ? "Valor" : "Quantidade"
                  ]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                />
                <Legend />
                <Bar dataKey="count" fill="#818cf8" name="Quantidade" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Todos os Orçamentos ({budgets.length})</CardTitle>
          <div className="flex gap-2">
            <ExportTabs 
              data={budgets}
              filename="relatorio_orcamentos"
              columns={[
                { key: "client_name", label: "Cliente" },
                { key: "total", label: "Valor", format: (v) => `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
                { key: "created_date", label: "Data", format: (v) => new Date(v).toLocaleDateString("pt-BR") },
                { key: "status", label: "Status" },
              ]}
            />
            <Link to={createPageUrl("BudgetCreate")} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium h-9 flex items-center px-3 border border-indigo-200 rounded-lg">
              + Novo Orçamento
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {budgets.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">Nenhum orçamento ainda</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Cliente</th>
                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Valor</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Data</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {budgets.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => window.location.href = createPageUrl("BudgetDetail") + `?id=${b.id}`}>
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-slate-800">{b.client_name}</p>
                        <p className="text-xs text-slate-400">{b.description?.substring(0, 40) || "Sem descrição"}</p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-sm font-semibold text-slate-800">
                          R$ {(Number(b.total) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-xs text-slate-600">{new Date(b.created_date).toLocaleDateString("pt-BR")}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <StatusBadge status={b.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
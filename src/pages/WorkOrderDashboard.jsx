import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Wrench, Clock, Cog, CheckCircle2, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import StatusBadge from "@/components/StatusBadge";
import ExportTabs from "@/components/ExportTabs";

export default function WorkOrderDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await base44.entities.WorkOrder.list("-created_date", 500);
      setOrders(data);
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

  const pending = orders.filter(o => o.status === "pendente");
  const inProduction = orders.filter(o => o.status === "em_producao");
  const finished = orders.filter(o => o.status === "finalizado");
  const delivered = orders.filter(o => o.status === "entregue");

  const statusData = [
    { name: "Pendente", value: pending.length, color: "#f59e0b" },
    { name: "Em Produção", value: inProduction.length, color: "#3b82f6" },
    { name: "Finalizado", value: finished.length, color: "#8b5cf6" },
    { name: "Entregue", value: delivered.length, color: "#10b981" },
  ].filter(d => d.value > 0);

  // Group by month
  const monthlyData = {};
  orders.forEach(o => {
    const date = new Date(o.created_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyData[key]) monthlyData[key] = { month: key, count: 0 };
    monthlyData[key].count += 1;
  });
  const monthlyChartData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard de Ordens de Serviço</h1>
        <p className="text-slate-500 mt-1">Visão completa da produção</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{orders.length}</p>
                <p className="text-xs text-slate-400 mt-1">ordens</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Wrench className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Pendente</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{pending.length}</p>
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
                <p className="text-sm text-slate-500 font-medium">Em Produção</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{inProduction.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Cog className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Finalizado</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{finished.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Entregue</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{delivered.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Truck className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ordens por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
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
          <CardTitle className="text-base">Todas as Ordens ({orders.length})</CardTitle>
          <ExportTabs 
            data={orders}
            filename="relatorio_ordens_servico"
            columns={[
              { key: "client_name", label: "Cliente" },
              { key: "job", label: "Job" },
              { key: "description", label: "Descrição" },
              { key: "created_date", label: "Criado", format: (v) => new Date(v).toLocaleDateString("pt-BR") },
              { key: "status", label: "Status" },
            ]}
          />
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">Nenhuma ordem ainda</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Cliente</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Descrição</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Data</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => window.location.href = createPageUrl("WorkOrderDetail") + `?id=${o.id}`}>
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-slate-800">{o.client_name}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm text-slate-600">{o.description?.substring(0, 50) || "Sem descrição"}</p>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-xs text-slate-600">{new Date(o.created_date).toLocaleDateString("pt-BR")}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <StatusBadge status={o.status} />
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
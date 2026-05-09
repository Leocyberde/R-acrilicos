/**
 * ClientWorkOrders.jsx
 *
 * FIX #8 — Página de Ordens de Serviço do cliente.
 *           Antes o dashboard do cliente linkava para a página admin "WorkOrders",
 *           expondo dados de todos os clientes. Esta página exibe apenas as O.S.
 *           do cliente logado.
 */

import { useEffect, useState } from "react";
import { api } from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Wrench, AlertCircle, Clock, Truck, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig = {
  nova:         { badge: "bg-yellow-100 text-yellow-800 border-yellow-200",  label: "Nova" },
  pendente:     { badge: "bg-yellow-100 text-yellow-800 border-yellow-200",  label: "Pendente" },
  em_andamento: { badge: "bg-blue-100 text-blue-800 border-blue-200",        label: "Em Andamento" },
  em_producao:  { badge: "bg-indigo-100 text-indigo-800 border-indigo-200",  label: "Em Produção" },
  finalizado:   { badge: "bg-purple-100 text-purple-800 border-purple-200",  label: "Finalizado" },
  entregue:     { badge: "bg-green-100 text-green-800 border-green-200",     label: "Entregue" },
  concluido:    { badge: "bg-green-100 text-green-800 border-green-200",     label: "Concluído" },
  cancelado:    { badge: "bg-red-100 text-red-800 border-red-200",           label: "Cancelado" },
};

// FIX #9 — parse seguro de datas sem timezone
function parseDate(d) {
  if (!d) return null;
  return new Date(String(d).replace("T", " ").split(".")[0]);
}

function fmtDate(d) {
  const parsed = parseDate(d);
  if (!parsed) return null;
  try { return format(parsed, "dd/MM/yyyy", { locale: ptBR }); } catch { return null; }
}

function fmtDateTime(d) {
  const parsed = parseDate(d);
  if (!parsed) return null;
  try { return format(parsed, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); } catch { return null; }
}

function DateLine({ icon: Icon, label, value, highlight }) {
  if (!value) return null;
  return (
    <div className={`flex items-center gap-1.5 text-sm ${highlight ? "text-blue-700 font-medium" : "text-slate-500"}`}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="text-slate-400">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function ClientWorkOrders() {
  const { user } = useAuth();
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!user?.email) return;

    const load = async () => {
      try {
        // FIX #2 — tenta resolver client_id para filtro mais seguro
        let clientId = null;
        try {
          const cached = sessionStorage.getItem("_clientId_" + user.email);
          if (cached) {
            clientId = JSON.parse(cached);
          } else {
            const clients = await api.entities.Client.filter({ email: user.email });
            if (clients && clients.length > 0) {
              clientId = clients[0].id;
              sessionStorage.setItem("_clientId_" + user.email, JSON.stringify(clientId));
            }
          }
        } catch { /* fallback */ }

        const filterArgs = clientId
          ? { client_id: clientId }
          : { client_email: user.email };

        const data = await api.entities.WorkOrder.filter(filterArgs);
        const sorted = (data || []).sort(
          (a, b) => parseDate(b.created_date) - parseDate(a.created_date)
        );
        setOrders(sorted);
      } catch (e) {
        console.error("Erro ao carregar O.S.:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const ativas     = orders.filter(o => !["concluido", "entregue", "cancelado"].includes(o.status)).length;
  const concluidas = orders.filter(o => ["concluido", "entregue"].includes(o.status)).length;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
          <Wrench className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Minhas Ordens de Serviço</h1>
          <p className="text-sm text-slate-500 mt-0.5">Acompanhe o andamento dos seus serviços</p>
        </div>
      </div>

      {/* Counters */}
      {orders.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-slate-800">{orders.length}</div>
            <div className="text-xs text-slate-500 mt-1">Total</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{ativas}</div>
            <div className="text-xs text-slate-500 mt-1">Em andamento</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-600">{concluidas}</div>
            <div className="text-xs text-slate-500 mt-1">Concluídas</div>
          </div>
        </div>
      )}

      {/* List */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-16 text-center">
          <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Nenhuma ordem de serviço encontrada</p>
          <p className="text-slate-400 text-sm mt-1">Suas ordens de serviço aparecerão aqui quando forem criadas.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const cfg = statusConfig[order.status] || { badge: "bg-slate-100 text-slate-700 border-slate-200", label: order.status };
            return (
              <div
                key={order.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
              >
                {/* Card header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-700">O.S. #{order.id}</span>
                    {order.job && (
                      <span className="text-sm text-slate-500">— {order.job}</span>
                    )}
                  </div>
                  <Badge className={`text-xs border ${cfg.badge}`}>{cfg.label}</Badge>
                </div>

                {/* Card body */}
                <div className="px-6 py-4 space-y-2">
                  {order.description && (
                    <p className="text-sm text-slate-600 mb-3">{order.description}</p>
                  )}
                  <DateLine icon={Clock}    label="Criado em"           value={fmtDateTime(order.created_date)} />
                  <DateLine icon={Calendar} label="Início da produção"  value={fmtDateTime(order.start_datetime)} highlight={!!order.start_datetime} />
                  <DateLine icon={Truck}    label="Previsão de entrega" value={fmtDate(order.delivery_date)} />

                  {order.notes && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Observações</p>
                      <p className="text-sm text-slate-600">{order.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

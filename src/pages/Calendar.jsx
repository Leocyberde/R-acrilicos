import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, ChevronRight, CalendarDays, Zap, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_CONFIG = {
  pendente: { label: "Pendente", color: "bg-slate-400", text: "text-slate-700", light: "bg-slate-100" },
  em_producao: { label: "Em Produção", color: "bg-blue-500", text: "text-blue-700", light: "bg-blue-50" },
  finalizado: { label: "Finalizado", color: "bg-violet-500", text: "text-violet-700", light: "bg-violet-50" },
  entregue: { label: "Entregue", color: "bg-green-500", text: "text-green-700", light: "bg-green-50" },
};

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function parseLocalDate(str) {
  if (!str) return null;
  const s = typeof str === "string" ? str.slice(0, 10) : null;
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];
const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function Calendar() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const data = await base44.entities.WorkOrder.list("-created_date", 500);
        setOrders(data || []);
      } catch {
        setOrders([]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const eventsByDay = useMemo(() => {
    const map = {};
    orders.forEach(order => {
      const deliveryDate = parseLocalDate(order.delivery_date);
      if (!deliveryDate) return;
      if (deliveryDate.getFullYear() !== viewYear || deliveryDate.getMonth() !== viewMonth) return;
      const key = deliveryDate.getDate();
      if (!map[key]) map[key] = [];
      map[key].push({ date: deliveryDate, type: "delivery", order });
    });
    return map;
  }, [orders, viewYear, viewMonth]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    const events = eventsByDay[selectedDay] || [];
    const deduped = [];
    const seen = new Set();
    events.forEach(ev => {
      const key = `${ev.order.id}-${ev.type}`;
      if (!seen.has(key)) { seen.add(key); deduped.push(ev); }
    });
    return deduped;
  }, [selectedDay, eventsByDay]);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const totalOrders = orders.length;
  const withDelivery = orders.filter(o => o.delivery_date).length;
  const urgent = orders.filter(o => o.is_urgent || (o.delivery_date && o.status !== "entregue" && Math.ceil((new Date(o.delivery_date) - new Date()) / 86400000) <= 3)).length;

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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Calendário</h1>
          <p className="text-slate-500 mt-0.5">Datas de entrega das ordens de serviço</p>
        </div>
        <Button onClick={() => navigate(createPageUrl("WorkOrders"))} variant="outline" size="sm">
          Ver Todas as O.S.
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Total de O.S.</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalOrders}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Com Entrega</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{withDelivery}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Urgentes</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{urgent}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Entregues</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{orders.filter(o => o.status === "entregue").length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            </button>
            <h2 className="text-lg font-semibold text-slate-900">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronRight className="h-5 w-5 text-slate-600" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {DAY_NAMES.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="min-h-[70px] border-b border-r border-slate-50 last:border-r-0 bg-slate-50/40" />;

              const isToday = isSameDay(new Date(viewYear, viewMonth, day), today);
              const isSelected = selectedDay === day;
              const dayEvents = eventsByDay[day] || [];
              const deliveryEvents = dayEvents;
              const hasUrgent = deliveryEvents.some(e =>
                e.order.is_urgent || (e.order.status !== "entregue" && Math.ceil((new Date(viewYear, viewMonth, day) - new Date()) / 86400000) <= 0)
              );

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`min-h-[70px] border-b border-r border-slate-100 last:border-r-0 p-1.5 cursor-pointer transition-colors ${
                    isSelected ? "bg-indigo-50" : "hover:bg-slate-50"
                  } ${(idx + 1) % 7 === 0 ? "border-r-0" : ""}`}
                >
                  <div className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold mb-1 ${
                    isToday ? "bg-indigo-600 text-white" : isSelected ? "bg-indigo-100 text-indigo-700" : "text-slate-700"
                  }`}>
                    {day}
                  </div>

                  <div className="space-y-0.5">
                    {deliveryEvents.slice(0, 3).map((ev, i) => {
                      const evUrgent = ev.order.is_urgent || (ev.order.status !== "entregue" && Math.ceil((new Date(viewYear, viewMonth, day) - new Date()) / 86400000) <= 0);
                      return (
                        <div key={`d-${i}`} className={`flex items-center gap-1 px-1 py-0.5 rounded overflow-hidden ${evUrgent ? "bg-red-50" : "bg-orange-50"}`}>
                          <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${evUrgent ? "bg-red-500" : "bg-orange-400"}`} />
                          <p className={`text-xs truncate leading-none ${evUrgent ? "text-red-700" : "text-orange-700"}`}>{ev.order.job || ev.order.client_name || "O.S."}</p>
                        </div>
                      );
                    })}
                    {deliveryEvents.length > 3 && (
                      <p className="text-xs text-slate-400 px-1">+{deliveryEvents.length - 3} mais</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-6 py-3 border-t border-slate-100 bg-slate-50">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-orange-400" />
              <span className="text-xs text-slate-500">Entrega</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-xs text-slate-500">Entrega Urgente</span>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Selected day detail */}
          {selectedDay ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-indigo-50">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-indigo-600" />
                  <h3 className="font-semibold text-indigo-900">
                    {selectedDay} de {MONTH_NAMES[viewMonth]}
                  </h3>
                </div>
              </div>
              {selectedDayEvents.length === 0 ? (
                <div className="p-6 text-center">
                  <CalendarDays className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Nenhuma O.S. neste dia</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {selectedDayEvents.map((ev, i) => {
                    const cfg = STATUS_CONFIG[ev.order.status] || STATUS_CONFIG.pendente;
                    const isUrgent = ev.order.is_urgent || (ev.order.status !== "entregue" && Math.ceil((new Date(viewYear, viewMonth, selectedDay) - new Date()) / 86400000) <= 0);
                    return (
                      <div
                        key={i}
                        className="p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => navigate(createPageUrl("WorkOrderDetail") + `?id=${ev.order.id}`)}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center ${isUrgent ? "bg-red-100" : "bg-orange-100"}`}>
                            <div className={`h-2 w-2 rounded-full ${isUrgent ? "bg-red-500" : "bg-orange-400"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              {isUrgent && <Zap className="h-3 w-3 text-red-500 flex-shrink-0" />}
                              <p className="text-sm font-semibold text-slate-800 truncate">{ev.order.job || "Sem Job"}</p>
                            </div>
                            <p className="text-xs text-slate-500 truncate">{ev.order.client_name || "—"}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${cfg.light} ${cfg.text}`}>
                                <Circle className="h-1.5 w-1.5 fill-current" />
                                {cfg.label}
                              </span>
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${isUrgent ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                                {isUrgent ? "Entrega Urgente" : "Entrega"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
              <CalendarDays className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500">Selecione um dia</p>
              <p className="text-xs text-slate-400 mt-1">Clique em um dia com marcações para ver os detalhes</p>
            </div>
          )}

          {/* Upcoming deliveries */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 text-sm">Próximas Entregas</h3>
            </div>
            {(() => {
              const upcoming = orders
                .filter(o => o.delivery_date && o.status !== "entregue")
                .map(o => ({ ...o, _days: Math.ceil((parseLocalDate(o.delivery_date) - new Date()) / 86400000) }))
                .sort((a, b) => a._days - b._days)
                .slice(0, 8);

              if (upcoming.length === 0) return (
                <div className="p-4 text-center text-sm text-slate-400">Nenhuma entrega pendente</div>
              );

              return (
                <div className="divide-y divide-slate-50">
                  {upcoming.map(o => {
                    const overdue = o._days < 0;
                    const today = o._days === 0;
                    const urgent = overdue || today || o._days <= 3 || o.is_urgent;
                    return (
                      <div
                        key={o.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => navigate(createPageUrl("WorkOrderDetail") + `?id=${o.id}`)}
                      >
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex flex-col items-center justify-center text-center ${urgent ? "bg-red-50" : "bg-slate-50"}`}>
                          <p className={`text-xs font-bold leading-none ${urgent ? "text-red-600" : "text-slate-600"}`}>
                            {overdue ? "!!!" : today ? "HOJE" : `${o._days}d`}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{o.job || "Sem Job"}</p>
                          <p className="text-xs text-slate-500 truncate">{o.client_name}</p>
                          <p className={`text-xs mt-0.5 ${urgent ? "text-red-500 font-medium" : "text-slate-400"}`}>
                            {parseLocalDate(o.delivery_date)?.toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        {(o.is_urgent || urgent) && <Zap className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

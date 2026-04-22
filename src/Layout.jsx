import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useState, useEffect } from "react";
import { localClient } from "@/api/localClient";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard,
  FileText,
  Wrench,
  Receipt,
  Factory,
  Menu,
  X,
  ChevronRight,
  TrendingUp,
  Users,
  Settings,
  Inbox,
  LogOut,
  User,
  CalendarDays,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppBranding } from "@/lib/useAppBranding";

const navItems = [
  { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Dashboard Orçamentos", icon: FileText, page: "BudgetDashboard", module: "budgets" },
  { name: "Dashboard O.S.", icon: Wrench, page: "WorkOrderDashboard", module: "work_orders" },
  { name: "Clientes", icon: Users, page: "Clients", module: "clients" },
  { name: "Orçamentos", icon: FileText, page: "Budgets", module: "budgets" },
  { name: "Ordens de Serviço", icon: Wrench, page: "WorkOrders", module: "work_orders" },
  { name: "Recibos", icon: Receipt, page: "Receipts", module: "receipts" },
  { name: "Financeiro", icon: TrendingUp, page: "Financial", module: "financial" },
  { name: "Produção", icon: Factory, page: "Production", module: "production" },
  { name: "Contas a Receber", icon: TrendingUp, page: "AccountsReceivable", module: "accounts_receivable" },
  { name: "Calendário", icon: CalendarDays, page: "Calendar" },

  { name: "Meus Orçamentos", icon: FileText, page: "ClientBudgets", clientOnly: true },
  { name: "Solicitar Orçamento", icon: FileText, page: "ClientBudgetRequest", clientOnly: true },
  { name: "Minhas O.S.", icon: Wrench, page: "WorkOrders", clientOnly: true },
  { name: "Perfil", icon: User, page: "ClientProfile", clientOnly: true },

  { name: "Solicitações de Orçamento", icon: Inbox, page: "BudgetRequests", adminOnly: true, showBadge: true },
  { name: "Usuários", icon: Users, page: "AdminUsers", adminOnly: true },
  { name: "Editor de Layout", icon: Settings, page: "LayoutEditor", adminOnly: true },
  { name: "Configurações", icon: Settings, page: "SettingsPage", adminOnly: true },
  { name: "WhatsApp", icon: Smartphone, page: "WhatsAppSettings", adminOnly: true },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [permissions, setPermissions] = useState({});
  const [budgetRequestCount, setBudgetRequestCount] = useState(0);
  const { user, logout } = useAuth();
  const { appName, appLogo } = useAppBranding();

  useEffect(() => {
    async function loadPermissions() {
      if (user && user.role !== "admin") {
        try {
          const userPerms = await localClient.entities.UserPermissions.filter({
            user_email: user.email
          });
          if (userPerms.length > 0) {
            setPermissions(userPerms[0]);
          }
        } catch (e) {
          console.error('Failed to load permissions', e);
        }
      }
    }
    loadPermissions();
  }, [user]);

  useEffect(() => {
    async function loadBudgetRequestCount() {
      if (user?.role === "admin" && currentPageName !== "BudgetRequests") {
        try {
          const requests = await localClient.entities.BudgetRequest.filter({ status: "nova" });
          setBudgetRequestCount(requests.length);
        } catch (e) {
          console.error('Failed to load budget requests count', e);
        }
      }
    }
    if (currentPageName === "BudgetRequests") {
      setBudgetRequestCount(0);
    } else {
      loadBudgetRequestCount();
      const interval = setInterval(loadBudgetRequestCount, 60000);
      return () => clearInterval(interval);
    }
  }, [user, currentPageName]);

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <style>{`
        @page {
          size: A4;
          margin: 0.7cm 1cm;
        }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; font-size: 12px !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          main { margin: 0 !important; padding: 0 !important; min-height: unset !important; }
          main > div { padding: 0 !important; max-width: 100% !important; }
          .print-doc { padding: 0.4cm 0.5cm !important; }
          .print-doc p, .print-doc span, .print-doc td, .print-doc th { font-size: 11px !important; }
          .print-doc .space-y-6 > * + * { margin-top: 0.4rem !important; }
          .print-doc table { margin-bottom: 0.3rem !important; }
        }
      `}</style>

      {/* Mobile header */}
      <div className="no-print lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-slate-100">
          <Menu className="h-5 w-5 text-slate-700" />
        </button>
        <div className="flex items-center gap-2">
          {appLogo && <img src={appLogo} alt="" className="h-7 w-7 object-contain rounded-md" />}
          <span className="font-semibold text-slate-900 tracking-tight">{appName}</span>
        </div>
        <div className="w-9" />
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="no-print lg:hidden fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "no-print fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 transition-transform duration-300 lg:translate-x-0 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            {appLogo ? (
              <img src={appLogo} alt="" className="h-8 w-8 object-contain rounded-lg" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
                <Wrench className="h-4 w-4 text-white" />
              </div>
            )}
            <span className="font-bold text-lg text-slate-900 tracking-tight">{appName}</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-md hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <nav className="p-3 space-y-0.5 mt-2 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            if (item.adminOnly && user?.role !== "admin") return null;
            if (item.clientOnly && user?.role !== "cliente") return null;
            if (user?.role === "cliente") {
              if (!item.clientOnly) return null;
            } else if (user?.role !== "admin") {
              const allowedPages = ["WorkOrderDashboard", "WorkOrders", "Production", "Calendar"];
              if (!allowedPages.includes(item.page)) return null;
            }
            const isActive = currentPageName === item.page;
            const badgeCount = item.showBadge && user?.role === "admin" ? budgetRequestCount : 0;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-indigo-600" : "text-slate-400")} />
                <span className="flex-1">{item.name}</span>
                {badgeCount > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
                    {badgeCount}
                  </span>
                )}
                {isActive && !badgeCount && <ChevronRight className="h-3.5 w-3.5 ml-auto text-indigo-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-150"
          >
            <LogOut className="h-4 w-4 text-slate-400" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

import { useState } from "react";
import { localClient } from "@/api/localClient";
import { Shield, UserCog, User } from "lucide-react";
import { useAppBranding } from "@/lib/useAppBranding";

const panels = [
  {
    role: "admin",
    email: "admin@gestao.pro",
    label: "Administrador",
    description: "Acesso total ao sistema: usuários, configurações, relatórios e todos os módulos.",
    icon: Shield,
    gradient: "from-violet-600 to-indigo-600",
    hoverRing: "hover:ring-violet-300",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    badge: "bg-violet-100 text-violet-700",
    badgeLabel: "Acesso Total",
    features: ["Dashboard completo", "Gestão de usuários", "Configurações", "Todos os módulos"],
  },
  {
    role: "user",
    email: "funcionario@gestao.pro",
    label: "Funcionário",
    description: "Acesso operacional: ordens de serviço, produção e dashboard de O.S.",
    icon: UserCog,
    gradient: "from-blue-600 to-cyan-500",
    hoverRing: "hover:ring-blue-300",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    badge: "bg-blue-100 text-blue-700",
    badgeLabel: "Acesso Operacional",
    features: ["Dashboard O.S.", "Ordens de Serviço", "Produção"],
  },
  {
    role: "cliente",
    email: "cliente@gestao.pro",
    label: "Cliente",
    description: "Portal do cliente: visualize seus orçamentos e solicite novos serviços.",
    icon: User,
    gradient: "from-emerald-500 to-teal-500",
    hoverRing: "hover:ring-emerald-300",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
    badgeLabel: "Portal do Cliente",
    features: ["Meus Orçamentos", "Solicitar Orçamento", "Minhas O.S."],
  },
];

export default function RoleSelector() {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState("");
  const { appName, appLogo } = useAppBranding();

  const handleSelect = async (panel) => {
    setError("");
    setLoading(panel.role);
    try {
      await localClient.auth.quickLogin(panel.role);
      window.location.href = "/";
    } catch (err) {
      setError("Erro ao acessar o painel. Tente novamente.");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          {appLogo ? (
            <img src={appLogo} alt="" className="inline-block h-16 w-16 object-contain rounded-2xl mb-5 shadow-lg shadow-indigo-500/30 bg-white/10 p-2" />
          ) : (
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 mb-5 shadow-lg shadow-indigo-500/30">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
            </div>
          )}
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">{appName}</h1>
          <p className="text-slate-400 text-lg">Selecione o painel que deseja acessar</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 text-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {panels.map((panel) => {
            const Icon = panel.icon;
            const isLoading = loading === panel.role;
            return (
              <button
                key={panel.role}
                onClick={() => handleSelect(panel)}
                disabled={loading !== null}
                className={`
                  group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-7 text-left
                  ring-2 ring-transparent transition-all duration-200
                  hover:bg-white/10 hover:border-white/20 ${panel.hoverRing}
                  disabled:opacity-60 disabled:cursor-not-allowed
                  focus:outline-none focus:ring-2 focus:ring-white/30
                `}
              >
                {/* Gradient top bar */}
                <div className={`absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r ${panel.gradient}`} />

                {/* Icon */}
                <div className={`inline-flex items-center justify-center h-12 w-12 rounded-xl ${panel.iconBg} mb-5`}>
                  <Icon className={`h-6 w-6 ${panel.iconColor}`} />
                </div>

                {/* Badge */}
                <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3 ${panel.badge}`}>
                  {panel.badgeLabel}
                </span>

                {/* Title */}
                <h2 className="text-xl font-bold text-white mb-2">{panel.label}</h2>

                {/* Description */}
                <p className="text-slate-400 text-sm leading-relaxed mb-5">{panel.description}</p>

                {/* Features */}
                <ul className="space-y-1.5 mb-6">
                  {panel.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                      <span className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${panel.gradient} flex-shrink-0`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className={`flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r ${panel.gradient} text-white text-sm font-semibold shadow-sm group-hover:shadow-md transition-all duration-200`}>
                  {isLoading ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      Acessar painel
                      <svg className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-center text-slate-500 text-xs mt-10">
          {appName} · Sistema de Gestão Empresarial
        </p>
      </div>
    </div>
  );
}

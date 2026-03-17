import { cn } from "@/lib/utils";

const statusConfig = {
  pendente: { label: "Pendente", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  aprovado: { label: "Aprovado", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  reprovado: { label: "Reprovado", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  em_producao: { label: "Em Produção", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  finalizado: { label: "Finalizado", bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  entregue: { label: "Entregue", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  pago: { label: "Pago", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  parcial: { label: "Parcial", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  vencido: { label: "Vencido", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-400" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", config.bg, config.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}
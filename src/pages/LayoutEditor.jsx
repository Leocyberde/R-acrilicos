import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { FileText, Receipt, Wrench, ArrowRight } from "lucide-react";

export default function LayoutEditor() {
  const navigate = useNavigate();

  const editors = [
    {
      title: "Layout do Orçamento",
      description: "Personalize cores, fontes, tabela, rodapé e instruções do documento de orçamento.",
      icon: FileText,
      color: "indigo",
      page: "BudgetLayoutEditor",
    },
    {
      title: "Layout do Recibo",
      description: "Personalize cores, fontes, tabela, QR Code, rodapé e instruções do documento de recibo.",
      icon: Receipt,
      color: "emerald",
      page: "ReceiptLayoutEditor",
    },
    {
      title: "Layout da Ordem de Serviço",
      description: "Personalize cores, fontes, tabela, assinatura e rodapé da ordem de serviço.",
      icon: Wrench,
      color: "violet",
      page: "WorkOrderLayoutEditor",
    },
  ];

  const colorMap = {
    indigo: { bg: "bg-indigo-50", icon: "text-indigo-600", iconBg: "bg-indigo-100", btn: "bg-indigo-600 hover:bg-indigo-700" },
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", iconBg: "bg-emerald-100", btn: "bg-emerald-600 hover:bg-emerald-700" },
    violet: { bg: "bg-violet-50", icon: "text-violet-600", iconBg: "bg-violet-100", btn: "bg-violet-600 hover:bg-violet-700" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Editor de Layout</h1>
        <p className="text-slate-500 mt-1">Escolha o documento que deseja personalizar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {editors.map((editor) => {
          const colors = colorMap[editor.color];
          const Icon = editor.icon;
          return (
            <div
              key={editor.page}
              className={`${colors.bg} rounded-2xl border border-slate-200 p-6 flex flex-col gap-4 hover:shadow-md transition-shadow`}
            >
              <div className={`h-12 w-12 rounded-xl ${colors.iconBg} flex items-center justify-center`}>
                <Icon className={`h-6 w-6 ${colors.icon}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{editor.title}</h2>
                <p className="text-sm text-slate-500 mt-1">{editor.description}</p>
              </div>
              <Button
                className={`${colors.btn} text-white mt-auto flex items-center gap-2`}
                onClick={() => navigate(createPageUrl(editor.page))}
              >
                Abrir Editor <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
        <p className="text-sm text-slate-600">
          <strong>Como funciona:</strong> As configurações salvas aqui são aplicadas automaticamente ao imprimir orçamentos, recibos e ordens de serviço. Você pode personalizar cores, fontes, margens, textos e muito mais.
        </p>
      </div>
    </div>
  );
}

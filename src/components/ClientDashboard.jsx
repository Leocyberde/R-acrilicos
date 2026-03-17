import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Wrench, Receipt, TrendingUp } from "lucide-react";

export default function ClientDashboard({ budgets, workOrders, receipts }) {
  const totalBudgets = budgets.length;
  const totalWorkOrders = workOrders.length;
  const totalReceipts = receipts.length;
  
  const totalBudgetValue = budgets.reduce((sum, b) => sum + (b.total_with_margin || b.total || 0), 0);
  const totalReceiptValue = receipts.reduce((sum, r) => sum + (r.total_with_margin || r.total_amount || 0), 0);
  const pendingBudgets = budgets.filter(b => b.status === "pendente").length;
  const inProgressOrders = workOrders.filter(o => o.status === "em_producao" || o.status === "pendente").length;

  const stats = [
    {
      title: "Orçamentos",
      value: totalBudgets,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "O.S. Ativas",
      value: inProgressOrders,
      icon: Wrench,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "Recibos",
      value: totalReceipts,
      icon: Receipt,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Valor Total",
      value: `R$ ${totalBudgetValue.toFixed(2).replace(".", ",")}`,
      icon: TrendingUp,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      subtitle: "de orçamentos"
    }
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 px-4">Resumo</h2>
      
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">{stat.title}</p>
                  <p className="text-xl font-bold text-slate-900 mt-1 break-words">{stat.value}</p>
                  {stat.subtitle && <p className="text-xs text-slate-500 mt-1">{stat.subtitle}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <div className="pt-4 border-t border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900 px-4 mb-3">Status</h3>
        
        {pendingBudgets > 0 && (
          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardContent className="p-3">
              <p className="text-sm text-yellow-800">
                <span className="font-semibold">{pendingBudgets}</span> orçamento{pendingBudgets !== 1 ? 's' : ''} pendente{pendingBudgets !== 1 ? 's' : ''} de aprovação
              </p>
            </CardContent>
          </Card>
        )}

        {inProgressOrders > 0 && (
          <Card className="border-orange-200 bg-orange-50/50 mt-2">
            <CardContent className="p-3">
              <p className="text-sm text-orange-800">
                <span className="font-semibold">{inProgressOrders}</span> ordem{inProgressOrders !== 1 ? 's' : ''} de serviço ativa{inProgressOrders !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        )}

        {totalReceipts > 0 && (
          <Card className="border-green-200 bg-green-50/50 mt-2">
            <CardContent className="p-3">
              <p className="text-sm text-green-800">
                <span className="font-semibold">R$ {totalReceiptValue.toFixed(2).replace(".", ",")}</span> em recibos
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, Clock, CheckCircle2 } from "lucide-react";

const StatCard = ({ icon: Icon, label, value, color }) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function AccountsStats({ stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard 
        icon={DollarSign}
        label="Total a Receber"
        value={stats.total}
        color="bg-indigo-600"
      />
      <StatCard 
        icon={Clock}
        label="Pendente"
        value={stats.pending}
        color="bg-orange-600"
      />
      <StatCard 
        icon={TrendingUp}
        label="Parcialmente Pago"
        value={stats.partial}
        color="bg-blue-600"
      />
      <StatCard 
        icon={CheckCircle2}
        label="Recebido"
        value={stats.paid}
        color="bg-green-600"
      />
    </div>
  );
}
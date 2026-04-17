import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import BudgetForm from "@/components/BudgetForm";
import { toast } from "sonner";

export default function BudgetCreate() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Pré-preenche dados vindos de uma solicitação de orçamento
  const fromRequest = searchParams.get("client_name");
  const prefill = fromRequest ? {
    client_name: searchParams.get("client_name") || "",
    client_phone: searchParams.get("client_phone") || "",
    client_email: searchParams.get("client_email") || "",
    job: searchParams.get("job") || "",
    producer: searchParams.get("producer") || "",
    description: searchParams.get("description") || "",
    notes: searchParams.get("notes") || "",
    delivery_date: searchParams.get("delivery_date") || "",
    items: (() => {
      try {
        const parsed = JSON.parse(searchParams.get("items") || "[]");
        if (parsed.length > 0) {
          return parsed.map(i => ({ name: i.name, quantity: i.quantity || 1, unit_price: 0 }));
        }
      } catch(e) {}
      return [{ name: "", quantity: 1, unit_price: 0 }];
    })(),
  } : undefined;

  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      const created = await base44.entities.Budget.create(data);
      toast.success("Orçamento criado com sucesso!");
      navigate(createPageUrl("BudgetDetail") + `?id=${created.id}`);
    } catch (err) {
      console.error("Erro ao criar orçamento:", err);
      toast.error("Erro ao salvar orçamento. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("Budgets"))}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Novo Orçamento</h1>
          <p className="text-slate-500 mt-0.5">
            {fromRequest ? "Dados pré-preenchidos da solicitação do cliente" : "Preencha os dados do orçamento"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <BudgetForm
          initialData={prefill}
          onSubmit={handleSubmit}
          onCancel={() => navigate(createPageUrl("Budgets"))}
          loading={loading}
        />
      </div>
    </div>
  );
}
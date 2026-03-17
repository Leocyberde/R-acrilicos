import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import BudgetForm from "@/components/BudgetForm";

export default function ReceiptCreate() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (data) => {
    setLoading(true);
    const created = await base44.entities.Receipt.create({
      client_name: data.client_name,
      client_phone: data.client_phone,
      client_email: data.client_email,
      client_address: data.client_address,
      job: data.job,
      producer: data.producer,
      description: data.description,
      emission_date: data.emission_date,
      items: data.items,
      total_amount: data.total,
      notes: data.notes,
    });
    navigate(createPageUrl("ReceiptDetail") + `?id=${created.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("Receipts"))}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Novo Recibo</h1>
          <p className="text-slate-500 mt-0.5">Preencha os dados do recibo</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <BudgetForm onSubmit={handleSubmit} onCancel={() => navigate(createPageUrl("Receipts"))} loading={loading} />
      </div>
    </div>
  );
}
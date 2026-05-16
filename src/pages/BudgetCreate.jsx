import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/api/apiClient";
import { localClient } from "@/api/localClient";
import { createPageUrl } from "@/utils";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import BudgetForm from "@/components/BudgetForm";
import { toast } from "sonner";

export default function BudgetCreate() {
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Detectar workorder_id para pré-preenchimento
  const workorderId = searchParams.get("workorder_id");
  
  // Pré-preenche dados vindos de uma solicitação de orçamento
  const fromRequest = searchParams.get("client_name");
  
  const [prefill, setPrefill] = useState(() => {
    if (fromRequest) {
      return {
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
      };
    }
    return undefined;
  });

  // Carregar dados da O.S. se workorder_id for fornecido
  useEffect(() => {
    async function loadWorkOrder() {
      if (!workorderId) return;
      
      setDataLoading(true);
      try {
        const os = await localClient.entities.WorkOrder.get(workorderId);
        
        setPrefill({
          client_name: os.client_name,
          client_email: os.client_email || "",
          client_phone: os.client_phone || "",
          client_address: os.client_address || "",
          job: os.job || "",
          producer: os.producer || "",
          description: os.description || "",
          notes: os.notes || "",
          delivery_date: os.delivery_date || "",
          items: (os.items || []).map(item => ({
            name: item.name,
            quantity: item.quantity,
            unit_price: 0,
          })),
          work_order_id: os.id,
          // validity_date fica vazio propositalmente — admin preenche no formulário
          validity_date: "",
        });
      } catch (e) {
        console.error("Erro ao carregar O.S.:", e);
        toast.error("O.S. não encontrada");
      }
      setDataLoading(false);
    }

    loadWorkOrder();
  }, [workorderId]);

  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      const created = await api.entities.Budget.create(data);
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
            {workorderId 
              ? `Vinculado à O.S. #${workorderId}` 
              : fromRequest 
              ? "Dados pré-preenchidos da solicitação do cliente" 
              : "Preencha os dados do orçamento"}
          </p>
        </div>
      </div>

      {dataLoading && (
        <div className="flex items-center justify-center h-32">
          <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ✅ Só monta o BudgetForm quando:
           - não há workorderId (formulário normal) OU
           - workorderId existe mas os dados já foram carregados (prefill preenchido)
           Isso garante que initialData chegue cheio no useState do BudgetForm */}
      {!dataLoading && (!workorderId || prefill) && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <BudgetForm
            initialData={prefill}
            onSubmit={handleSubmit}
            onCancel={() => navigate(createPageUrl("Budgets"))}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}
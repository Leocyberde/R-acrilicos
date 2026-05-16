import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function OrphanWorkOrdersAlert() {
  const [orphans, setOrphans] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadOrphans() {
      try {
        // Usa a mesma rota que Budgets.jsx já usa — mais eficiente e consistente
        const token = localStorage.getItem("auth_token");
        const res = await fetch("/api/employee-os-requests", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const all = await res.json();
          // Filtra apenas as sem orçamento (sem pending_items pendentes — esses já aparecem em BudgetDetail)
          setOrphans(all.filter(r => !r.budget_id));
        }
      } catch (e) {
        console.error("Erro ao buscar O.S. órfãs:", e);
      }
      setLoading(false);
    }
    loadOrphans();
  }, []);

  if (loading || orphans.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800">
            ⚠️ {orphans.length} O.S. do gerente aguardando orçamento
          </p>
          <p className="text-xs text-amber-600 mt-1">
            O gerente criou solicitações que precisam de orçamento antes de prosseguir.
          </p>
          <div className="mt-3 space-y-2">
            {orphans.map(os => (
              <div
                key={os.id}
                className="flex items-center justify-between bg-white p-2 rounded border border-amber-200"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    #{os.id} · {os.client_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {os.items?.length || 0} itens · Criado por {os.employee_name}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 whitespace-nowrap"
                  onClick={() => navigate(createPageUrl("BudgetCreate") + `?workorder_id=${os.id}`)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Criar Orçamento
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

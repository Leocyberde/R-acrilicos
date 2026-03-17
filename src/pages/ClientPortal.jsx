import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Wrench, Receipt, AlertCircle, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const statusConfig = {
  pendente: { bg: "bg-yellow-50", text: "text-yellow-700", badge: "bg-yellow-100 text-yellow-800" },
  aprovado: { bg: "bg-green-50", text: "text-green-700", badge: "bg-green-100 text-green-800" },
  reprovado: { bg: "bg-red-50", text: "text-red-700", badge: "bg-red-100 text-red-800" },
  em_producao: { bg: "bg-blue-50", text: "text-blue-700", badge: "bg-blue-100 text-blue-800" },
  finalizado: { bg: "bg-purple-50", text: "text-purple-700", badge: "bg-purple-100 text-purple-800" },
  entregue: { bg: "bg-green-50", text: "text-green-700", badge: "bg-green-100 text-green-800" },
};

const statusLabels = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  em_producao: "Em Produção",
  finalizado: "Finalizado",
  entregue: "Entregue",
};

export default function ClientPortal() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        
        if (!currentUser) {
          navigate("/");
          return;
        }

        setUser(currentUser);

        const clientName = currentUser.full_name;

        const [budgetsData, workOrdersData, receiptsData] = await Promise.all([
          base44.entities.Budget.filter({ client_name: clientName }),
          base44.entities.WorkOrder.filter({ client_name: clientName }),
          base44.entities.Receipt.filter({ client_name: clientName }),
        ]);

        setBudgets(budgetsData || []);
        setWorkOrders(workOrdersData || []);
        setReceipts(receiptsData || []);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Minha Conta</h1>
          <p className="text-slate-600 mt-1">Bem-vindo, {user.full_name}</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="budgets" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
            <TabsTrigger value="budgets" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Orçamentos
            </TabsTrigger>
            <TabsTrigger value="workorders" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Serviços
            </TabsTrigger>
            <TabsTrigger value="receipts" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Recibos
            </TabsTrigger>
          </TabsList>

          {/* Budgets Tab */}
          <TabsContent value="budgets">
            {budgets.length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">Nenhum orçamento encontrado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {budgets.map((budget) => (
                  <Card key={budget.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-slate-900">{budget.job || "Sem descrição"}</h3>
                            <Badge className={statusConfig[budget.status]?.badge}>
                              {statusLabels[budget.status]}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-3">{budget.description}</p>
                          <div className="flex flex-wrap gap-4 text-sm">
                            {budget.emission_date && (
                              <div>
                                <span className="text-slate-500">Emissão: </span>
                                <span className="font-medium">{format(new Date(budget.emission_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                              </div>
                            )}
                            {budget.validity_date && (
                              <div>
                                <span className="text-slate-500">Validade: </span>
                                <span className="font-medium">{format(new Date(budget.validity_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-2xl font-bold text-indigo-600">
                            R$ {(budget.total_with_margin || budget.total || 0).toFixed(2).replace(".", ",")}
                          </div>
                          <div className="flex flex-col gap-2 mt-3 items-end">
                            {budget.pdf_url && (
                              <a
                                href={budget.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-300 rounded-md px-3 py-1.5 hover:bg-indigo-50 transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Baixar PDF
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Work Orders Tab */}
          <TabsContent value="workorders">
            {workOrders.length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">Nenhuma ordem de serviço encontrada</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {workOrders.map((order) => (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-slate-900">{order.job || "Sem descrição"}</h3>
                            <Badge className={statusConfig[order.status]?.badge}>
                              {statusLabels[order.status]}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-3">{order.description}</p>
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div>
                              <span className="text-slate-500">Produtor: </span>
                              <span className="font-medium">{order.producer || "—"}</span>
                            </div>
                            {order.delivery_date && (
                              <div>
                                <span className="text-slate-500">Entrega: </span>
                                <span className="font-medium">{format(new Date(order.delivery_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-4"
                          onClick={() => navigate(`/WorkOrderDetail?id=${order.id}`)}
                        >
                          Ver Detalhes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Receipts Tab */}
          <TabsContent value="receipts">
            {receipts.length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">Nenhum recibo encontrado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {receipts.map((receipt) => (
                  <Card key={receipt.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 mb-2">{receipt.description || "Recibo"}</h3>
                          <p className="text-sm text-slate-600 mb-3">{receipt.notes}</p>
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div>
                              <span className="text-slate-500">Forma de Pagamento: </span>
                              <span className="font-medium text-capitalize">{receipt.payment_method?.replace(/_/g, " ") || "—"}</span>
                            </div>
                            {receipt.emission_date && (
                              <div>
                                <span className="text-slate-500">Emissão: </span>
                                <span className="font-medium">{format(new Date(receipt.emission_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-2xl font-bold text-indigo-600">
                            R$ {(receipt.total_with_margin || receipt.total_amount || 0).toFixed(2).replace(".", ",")}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => navigate(`/ReceiptDetail?id=${receipt.id}`)}
                          >
                            Ver Detalhes
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
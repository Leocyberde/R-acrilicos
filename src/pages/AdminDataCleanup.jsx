import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminDataCleanup() {
  const [email, setEmail] = useState("nonato.luz.1720@gmail.com");
  const [budgets, setBudgets] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const loadData = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const [b, w, r] = await Promise.all([
        base44.entities.Budget.filter({ created_by: email }),
        base44.entities.WorkOrder.filter({ created_by: email }),
        base44.entities.Receipt.filter({ created_by: email }),
      ]);
      setBudgets(b || []);
      setWorkOrders(w || []);
      setReceipts(r || []);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const deleteRecord = async (entity, id) => {
    setDeleting(id);
    try {
      await base44.entities[entity].delete(id);
      toast.success(`${entity} deletado com sucesso`);
      loadData();
    } catch (error) {
      toast.error("Erro ao deletar");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Limpeza de Dados</h1>
        <p className="text-slate-600 mt-2">Gerenciar registros de um usuário específico</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6 flex gap-4">
          <Input
            placeholder="Email do usuário"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
          />
          <Button onClick={loadData} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      <Tabs defaultValue="budgets" className="w-full">
        <TabsList>
          <TabsTrigger value="budgets">
            Orçamentos ({budgets.length})
          </TabsTrigger>
          <TabsTrigger value="workorders">
            O.S. ({workOrders.length})
          </TabsTrigger>
          <TabsTrigger value="receipts">
            Recibos ({receipts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="budgets" className="space-y-4">
          {budgets.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Nenhum orçamento encontrado</p>
              </CardContent>
            </Card>
          ) : (
            budgets.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-6 flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{item.job || "Sem job"}</h3>
                    <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                    <p className="text-xs text-slate-500 mt-2">ID: {item.id}</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteRecord("Budget", item.id)}
                    disabled={deleting === item.id}
                  >
                    {deleting === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="workorders" className="space-y-4">
          {workOrders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Nenhuma O.S. encontrada</p>
              </CardContent>
            </Card>
          ) : (
            workOrders.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-6 flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{item.job || "Sem job"}</h3>
                    <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                    <p className="text-xs text-slate-500 mt-2">ID: {item.id}</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteRecord("WorkOrder", item.id)}
                    disabled={deleting === item.id}
                  >
                    {deleting === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="receipts" className="space-y-4">
          {receipts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Nenhum recibo encontrado</p>
              </CardContent>
            </Card>
          ) : (
            receipts.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-6 flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{item.description || "Recibo"}</h3>
                    <p className="text-sm text-slate-600 mt-1">R$ {item.total_amount || 0}</p>
                    <p className="text-xs text-slate-500 mt-2">ID: {item.id}</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteRecord("Receipt", item.id)}
                    disabled={deleting === item.id}
                  >
                    {deleting === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";

export default function FinancialCreate() {
  const [receipts, setReceipts] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [numInstallments, setNumInstallments] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const data = await base44.entities.Receipt.list("-created_date", 100);
      setReceipts(data);
    }
    load();
  }, []);

  const generateInstallments = (total, num) => {
    const amount = total / num;
    const installments = [];
    for (let i = 0; i < num; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i + 1);
      installments.push({
        number: i + 1,
        amount: Math.round(amount * 100) / 100,
        due_date: dueDate.toISOString().split("T")[0],
        status: "pendente",
      });
    }
    return installments;
  };

  const handleSubmit = async () => {
    if (!selectedReceipt || !paymentMethod) return;
    
    setSaving(true);
    const installments = generateInstallments(selectedReceipt.total_amount, numInstallments);
    const payment = await base44.entities.Financial.create({
      receipt_id: selectedReceipt.id,
      work_order_id: selectedReceipt.work_order_id,
      client_name: selectedReceipt.client_name,
      total_amount: selectedReceipt.total_amount,
      installments,
      payment_method: paymentMethod,
      status: "pendente",
      notes,
    });
    navigate(createPageUrl("FinancialDetail") + `?id=${payment.id}`);
  };

  const paymentLabels = {
    dinheiro: "Dinheiro", pix: "PIX", cartao_credito: "Cartão de Crédito",
    cartao_debito: "Cartão de Débito", boleto: "Boleto", transferencia: "Transferência"
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("Financial"))}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Novo Pagamento</h1>
          <p className="text-slate-500 mt-0.5">Cadastre um novo pagamento vinculado a um recibo</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label>Selecione o Recibo</Label>
            <Select value={selectedReceipt?.id || ""} onValueChange={id => setSelectedReceipt(receipts.find(r => r.id === id))}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Escolha um recibo" /></SelectTrigger>
              <SelectContent>
                {receipts.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.client_name} - R$ {(r.total_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedReceipt && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Cliente</Label>
                  <Input value={selectedReceipt.client_name} disabled className="mt-1 bg-slate-50" />
                </div>
                <div>
                  <Label>Valor Total</Label>
                  <Input value={`R$ ${(selectedReceipt.total_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} disabled className="mt-1 bg-slate-50" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Número de Parcelas</Label>
                  <Input
                    type="number"
                    min="1"
                    value={numInstallments}
                    onChange={e => setNumInstallments(parseInt(e.target.value) || 1)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Forma de Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(paymentLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} className="mt-1" placeholder="Adicione observações..." />
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-slate-600 mb-2">Resumo das Parcelas:</p>
                <p className="text-sm text-slate-800">
                  {numInstallments}x de R$ {((selectedReceipt.total_amount / numInstallments) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>

              <Button onClick={handleSubmit} disabled={saving || !paymentMethod} className="w-full bg-indigo-600 hover:bg-indigo-700">
                <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Criar Pagamento"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
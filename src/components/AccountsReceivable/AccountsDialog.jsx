import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const paymentMethods = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
];

export default function AccountsDialog({ open, onOpenChange, account, onSave }) {
  const [formData, setFormData] = useState({
    client_name: "",
    description: "",
    total_amount: 0,
    payment_method: "pix",
    emission_date: new Date().toISOString().split("T")[0],
    due_date: new Date().toISOString().split("T")[0],
    installments: [{ number: 1, amount: 0, due_date: new Date().toISOString().split("T")[0], status: "pendente" }],
  });

  useEffect(() => {
    if (account) {
      setFormData({
        client_name: account.client_name || "",
        description: account.description || "",
        total_amount: account.total_amount || 0,
        payment_method: account.payment_method || "pix",
        emission_date: account.emission_date || new Date().toISOString().split("T")[0],
        due_date: account.due_date || new Date().toISOString().split("T")[0],
        installments: account.installments || [{ number: 1, amount: 0, due_date: new Date().toISOString().split("T")[0], status: "pendente" }],
      });
    }
  }, [account]);

  const handleSave = async () => {
    if (!formData.client_name || !formData.description || formData.total_amount <= 0) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      if (account?.id) {
        await base44.entities.Receipt.update(account.id, formData);
        toast.success("Recebimento atualizado com sucesso");
      } else {
        await base44.entities.Receipt.create(formData);
        toast.success("Recebimento criado com sucesso");
      }
      onSave();
    } catch (error) {
      toast.error("Erro ao salvar recebimento");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {account ? "Editar Recebimento" : "Novo Recebimento"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Cliente *</Label>
            <Input
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              placeholder="Nome do cliente"
            />
          </div>

          <div>
            <Label>Descrição *</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição do recebimento"
            />
          </div>

          <div>
            <Label>Valor *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.total_amount}
              onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) })}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label>Forma de Pagamento</Label>
            <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map(method => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data de Emissão</Label>
              <Input
                type="date"
                value={formData.emission_date}
                onChange={(e) => setFormData({ ...formData, emission_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Data de Vencimento</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            {account ? "Atualizar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
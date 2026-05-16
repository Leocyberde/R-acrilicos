import { useState } from "react";
import { localClient } from "@/api/localClient";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Send, Info } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

export default function EmployeeOSRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_name: "",
    client_phone: "",
    client_address: "",
    job: "",
    description: "",
    notes: "",
  });
  const [items, setItems] = useState([{ name: "", quantity: 1 }]);

  const addItem = () => setItems(prev => [...prev, { name: "", quantity: 1 }]);

  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const updateItem = (i, field, value) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const handleSubmit = async () => {
    if (!form.client_name.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    const validItems = items.filter(it => it.name.trim());
    if (validItems.length === 0) {
      toast.error("Adicione pelo menos um item ao serviço");
      return;
    }
    setSaving(true);
    try {
      const os = await localClient.entities.WorkOrder.create({
        client_name: form.client_name,
        client_phone: form.client_phone,
        client_address: form.client_address,
        job: form.job,
        description: form.description,
        notes: form.notes,
        items: validItems,
        status: "pendente",
        employee_name: user?.full_name || user?.email || "Funcionário",
        created_by_employee: true,
        start_date: new Date().toISOString().split("T")[0],
      });
      toast.success(`Solicitação enviada! O.S. #${os.id} criada — o admin será notificado.`, { duration: 5000 });
      navigate(createPageUrl("WorkOrders"));
    } catch (e) {
      toast.error("Erro ao criar solicitação: " + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("WorkOrders"))}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Solicitar Nova O.S.</h1>
          <p className="text-slate-500 mt-0.5">Informe os dados e o admin será notificado para criar o orçamento</p>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-700">
          Preencha os dados do cliente e os itens do serviço. Os <strong>preços não são necessários</strong> — o administrador receberá uma notificação e definirá os valores no orçamento.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dados do Cliente</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-slate-500 uppercase tracking-wider font-medium">Nome do Cliente *</Label>
            <Input
              value={form.client_name}
              onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))}
              placeholder="Nome completo ou empresa"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500 uppercase tracking-wider font-medium">Telefone</Label>
            <Input
              value={form.client_phone}
              onChange={e => setForm(p => ({ ...p, client_phone: e.target.value }))}
              placeholder="(11) 99999-9999"
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs text-slate-500 uppercase tracking-wider font-medium">Endereço / Empresa</Label>
            <Input
              value={form.client_address}
              onChange={e => setForm(p => ({ ...p, client_address: e.target.value }))}
              placeholder="Rua, número, bairro, cidade..."
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs text-slate-500 uppercase tracking-wider font-medium">Job / Tipo de Serviço</Label>
            <Input
              value={form.job}
              onChange={e => setForm(p => ({ ...p, job: e.target.value }))}
              placeholder="Ex: Adesivagem veículo, Banner 3x2m, Fachada..."
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-slate-500 uppercase tracking-wider font-medium">Descrição do Serviço</Label>
          <Textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Detalhes do que precisa ser feito..."
            rows={3}
            className="mt-1"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Itens do Serviço</h2>
            <p className="text-xs text-slate-400 mt-0.5">Apenas nome e quantidade — preços serão definidos pelo admin</p>
          </div>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar Item
          </Button>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            <div className="col-span-9">Item / Produto</div>
            <div className="col-span-2 text-center">Qtd</div>
          </div>
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-9">
                <Input
                  value={item.name}
                  onChange={e => updateItem(i, "name", e.target.value)}
                  placeholder="Nome do produto ou serviço"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={e => updateItem(i, "quantity", Number(e.target.value) || 1)}
                  className="text-center"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                {items.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => removeItem(i)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <Label className="text-xs text-slate-500 uppercase tracking-wider font-medium">Observações / Urgência</Label>
        <Textarea
          value={form.notes}
          onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          placeholder="Prazo, urgência, instruções especiais para o admin..."
          rows={3}
          className="mt-1"
        />
      </div>

      <div className="flex gap-3 justify-end pb-6">
        <Button variant="outline" onClick={() => navigate(createPageUrl("WorkOrders"))}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
          <Send className="h-4 w-4 mr-2" />
          {saving ? "Enviando..." : "Enviar Solicitação"}
        </Button>
      </div>
    </div>
  );
}

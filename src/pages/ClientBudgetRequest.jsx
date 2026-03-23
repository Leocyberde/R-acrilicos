import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Send, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";

export default function ClientBudgetRequest() {
  const [form, setForm] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    job: "",
    producer: "",
    delivery_date: "",
    description: "",
    notes: "",
  });
  const [items, setItems] = useState([{ name: "", quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const addItem = () => {
    setItems(prev => [...prev, { name: "", quantity: 1 }]);
  };

  const removeItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleSubmit = async () => {
    if (!form.client_name.trim()) {
      toast.error("Por favor, informe seu nome.");
      return;
    }
    if (!form.client_phone.trim() && !form.client_email.trim()) {
      toast.error("Informe pelo menos um contato (telefone ou email).");
      return;
    }
    const validItems = items.filter(i => i.name.trim());
    if (validItems.length === 0) {
      toast.error("Adicione pelo menos um item ao pedido.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/public/budget-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: form.client_name,
          client_email: form.client_email,
          client_phone: form.client_phone,
          job: form.job,
          producer: form.producer,
          delivery_date: form.delivery_date || null,
          description: form.description,
          notes: form.notes,
          items: validItems,
          status: "nova",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao enviar');
      }
      setSubmitted(true);
    } catch (err) {
      toast.error(err.message || "Erro ao enviar solicitação. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Solicitação Enviada!</h2>
          <p className="text-slate-500">Sua solicitação de orçamento foi recebida com sucesso. Entraremos em contato em breve.</p>
          <Button
            variant="outline"
            onClick={() => {
              setSubmitted(false);
              setForm({ client_name: "", client_email: "", client_phone: "", job: "", producer: "", delivery_date: "", description: "", notes: "" });
              setItems([{ name: "", quantity: 1 }]);
            }}
            className="mt-4"
          >
            Fazer nova solicitação
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-slate-900">Solicitação de Orçamento</h1>
          <p className="text-slate-500">Preencha o formulário abaixo e envie sua solicitação</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800 text-base border-b pb-2">Seus Dados</h2>
          <div>
            <Label>Nome / Empresa <span className="text-red-500">*</span></Label>
            <Input
              className="mt-1"
              placeholder="Seu nome ou nome da empresa"
              value={form.client_name}
              onChange={e => handleChange("client_name", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Telefone / WhatsApp</Label>
              <Input
                className="mt-1"
                placeholder="(11) 99999-0000"
                value={form.client_phone}
                onChange={e => handleChange("client_phone", e.target.value)}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                className="mt-1"
                type="email"
                placeholder="email@exemplo.com"
                value={form.client_email}
                onChange={e => handleChange("client_email", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800 text-base border-b pb-2">Dados do Pedido</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Job / Projeto</Label>
              <Input
                className="mt-1"
                placeholder="Nome do projeto"
                value={form.job}
                onChange={e => handleChange("job", e.target.value)}
              />
            </div>
            <div>
              <Label>Produtor</Label>
              <Input
                className="mt-1"
                placeholder="Nome do produtor"
                value={form.producer}
                onChange={e => handleChange("producer", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Data de Entrega Necessária</Label>
            <Input
              className="mt-1"
              type="date"
              value={form.delivery_date}
              onChange={e => handleChange("delivery_date", e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="font-semibold text-slate-800 text-base">Itens <span className="text-red-500">*</span></h2>
            <Button size="sm" variant="outline" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar Item
            </Button>
          </div>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-3 items-center">
                <Input
                  className="flex-1"
                  placeholder="Descrição do item"
                  value={item.name}
                  onChange={e => updateItem(idx, "name", e.target.value)}
                />
                <Input
                  className="w-24"
                  type="number"
                  min={1}
                  placeholder="Qtd"
                  value={item.quantity}
                  onChange={e => updateItem(idx, "quantity", Number(e.target.value))}
                />
                {items.length > 1 && (
                  <button onClick={() => removeItem(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800 text-base border-b pb-2">Detalhes</h2>
          <div>
            <Label>Descrição</Label>
            <Textarea
              className="mt-1"
              placeholder="Descreva o que você precisa..."
              rows={3}
              value={form.description}
              onChange={e => handleChange("description", e.target.value)}
            />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea
              className="mt-1"
              placeholder="Alguma observação adicional?"
              rows={2}
              value={form.notes}
              onChange={e => handleChange("notes", e.target.value)}
            />
          </div>
        </div>

        <Button
          className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-base"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Enviando...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Enviar Solicitação
            </div>
          )}
        </Button>
      </div>
    </div>
  );
}

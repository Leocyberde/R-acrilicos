import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function WorkOrderCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    client_name: "",
    client_phone: "",
    client_address: "",
    job: "",
    producer: "",
    description: "",
    items: [{ name: "", quantity: 1 }],
    notes: "",
    start_date: "",
    delivery_date: "",
  });

  useEffect(() => {
    async function loadClients() {
      const data = await base44.entities.Client.list();
      setClients(data);
    }
    loadClients();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index][field] = field === "quantity" ? Number(value) : value;
    setForm(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { name: "", quantity: 1 }]
    }));
  };

  const removeItem = (index) => {
    if (form.items.length === 1) {
      toast.error("Deve haver pelo menos um item");
      return;
    }
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.client_name.trim()) {
      toast.error("Cliente é obrigatório");
      return;
    }

    if (form.items.some(item => !item.name.trim())) {
      toast.error("Todos os itens devem ter um nome");
      return;
    }

    setLoading(true);
    try {
      await base44.entities.WorkOrder.create({
        client_name: form.client_name,
        client_phone: form.client_phone,
        client_address: form.client_address,
        job: form.job,
        producer: form.producer,
        description: form.description,
        items: form.items.filter(item => item.name.trim()),
        notes: form.notes,
        status: "pendente",
        budget_id: null,
        start_date: form.start_date || null,
        delivery_date: form.delivery_date || null,
      });
      toast.success("Ordem de serviço criada com sucesso");
      navigate(createPageUrl("WorkOrders"));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar ordem de serviço");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(createPageUrl("WorkOrders"))}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nova Ordem de Serviço</h1>
          <p className="text-slate-500 text-sm mt-1">Preencha os dados para criar uma nova ordem</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        {/* Cliente */}
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">Cliente *</label>
          <div className="relative">
            <Input
              type="text"
              name="client_name"
              value={form.client_name}
              onChange={handleInputChange}
              placeholder="Digite ou selecione um cliente"
              list="clients-list"
              className="w-full"
            />
            <datalist id="clients-list">
              {clients.map(client => (
                <option key={client.id} value={client.name} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Job */}
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">Job</label>
          <Input
            type="text"
            name="job"
            value={form.job}
            onChange={handleInputChange}
            placeholder="Ex: Projeto A, Job 001"
            className="w-full"
          />
        </div>

        {/* Produtor */}
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">Produtor</label>
          <Input
            type="text"
            name="producer"
            value={form.producer}
            onChange={handleInputChange}
            placeholder="Nome do produtor"
            className="w-full"
          />
        </div>

        {/* Datas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Data de Início</label>
            <Input
              type="date"
              name="start_date"
              value={form.start_date}
              onChange={handleInputChange}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Data de Entrega</label>
            <Input
              type="date"
              name="delivery_date"
              value={form.delivery_date}
              onChange={handleInputChange}
              className="w-full"
            />
          </div>
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">Descrição</label>
          <Textarea
            name="description"
            value={form.description}
            onChange={handleInputChange}
            placeholder="Descrição geral da ordem de serviço"
            className="w-full min-h-24"
          />
        </div>

        {/* Itens */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-slate-900">Itens *</label>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar Item
            </button>
          </div>
          <div className="space-y-3 bg-slate-50 rounded-lg p-4">
            {form.items.map((item, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs text-slate-500 mb-1 block">Produto/Serviço</label>
                  <Input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleItemChange(index, "name", e.target.value)}
                    placeholder="Nome do item"
                    className="w-full"
                  />
                </div>
                <div className="w-24">
                  <label className="text-xs text-slate-500 mb-1 block">Quantidade</label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                    min="1"
                    className="w-full"
                  />
                </div>
                {form.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-600 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">Observações</label>
          <Textarea
            name="notes"
            value={form.notes}
            onChange={handleInputChange}
            placeholder="Observações adicionais"
            className="w-full min-h-20"
          />
        </div>

        {/* Botões */}
        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(createPageUrl("WorkOrders"))}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
          >
            {loading ? "Salvando..." : "Criar Ordem"}
          </Button>
        </div>
      </form>
    </div>
  );
}
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export default function BudgetForm({ initialData, onSubmit, onCancel, loading }) {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    client_name: initialData?.client_name || "",
    client_phone: initialData?.client_phone || "",
    client_email: initialData?.client_email || "",
    client_address: initialData?.client_address || "",
    job: initialData?.job || "",
    producer: initialData?.producer || "",
    description: initialData?.description || "",
    emission_date: initialData?.emission_date || new Date().toISOString().split('T')[0],
    validity_date: initialData?.validity_date || "",
    notes: initialData?.notes || "",
    discount: initialData?.discount || 0,
    apply_margin: initialData?.apply_margin !== undefined ? initialData.apply_margin : true,
    margin_percentage: initialData?.margin_percentage || 15,
    total_label: initialData?.total_label || "Total sem Nota",
    total_with_margin_label: initialData?.total_with_margin_label || "Total com Nota",
    items: initialData?.items?.length ? initialData.items : [{ name: "", quantity: 1, unit_price: 0 }],
  });

  useEffect(() => {
    async function loadClients() {
      const data = await base44.entities.Client.list();
      setClients(data);
    }
    loadClients();
  }, []);

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleClientSelect = (clientId) => {
    const selectedClient = clients.find(c => String(c.id) === String(clientId));
    if (selectedClient) {
      const addressParts = [
        selectedClient.address_street,
        selectedClient.address_number ? `nº ${selectedClient.address_number}` : null,
        selectedClient.address_complement,
        selectedClient.address_city,
        selectedClient.address_state,
        selectedClient.address_zip_code ? `CEP ${selectedClient.address_zip_code}` : null,
      ].filter(Boolean);
      const composedAddress = addressParts.length > 0
        ? addressParts.join(", ")
        : selectedClient.address || selectedClient.city || "";

      setForm(prev => ({
        ...prev,
        client_id: selectedClient.id,
        client_name: selectedClient.name || "",
        client_phone: selectedClient.phone || selectedClient.mobile || "",
        client_email: selectedClient.email || "",
        client_address: composedAddress,
      }));
    }
  };

  const updateItem = (index, field, value) => {
    const items = [...form.items];
    items[index] = { ...items[index], [field]: value };
    setForm(prev => ({ ...prev, items }));
  };

  const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, { name: "", quantity: 1, unit_price: 0 }] }));

  const removeItem = (index) => {
    if (form.items.length <= 1) return;
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const subtotal = form.items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0);
  const discountAmount = subtotal * (form.discount / 100);
  const total = subtotal - discountAmount;
  const totalWithMargin = form.apply_margin ? total * (1 + form.margin_percentage / 100) : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ 
      ...form, 
      subtotal,
      total, 
      margin_percentage: form.apply_margin ? form.margin_percentage : null,
      total_with_margin: totalWithMargin,
      status: initialData?.status || "pendente" 
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label className="mb-2 block">Selecionar Cliente Cadastrado</Label>
        <Select onValueChange={handleClientSelect} value={form.client_id ? String(form.client_id) : ""}>
          <SelectTrigger>
            <SelectValue placeholder="Clique para selecionar um cliente..." />
          </SelectTrigger>
          <SelectContent>
            {clients.map(client => (
              <SelectItem key={client.id} value={String(client.id)}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.client_id && form.client_name && (
          <p className="text-xs text-indigo-600 mt-1 font-medium">✓ Cliente selecionado: {form.client_name}</p>
        )}
        <p className="text-xs text-slate-500 mt-1">Ou preencha os dados manualmente abaixo</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Nome do Cliente *</Label>
          <Input value={form.client_name} onChange={e => updateField("client_name", e.target.value)} required className="mt-1" />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input value={form.client_phone} onChange={e => updateField("client_phone", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={form.client_email} onChange={e => updateField("client_email", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Job</Label>
          <Input value={form.job} onChange={e => updateField("job", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Produtor</Label>
          <Input value={form.producer} onChange={e => updateField("producer", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Data de Emissão</Label>
          <Input type="date" value={form.emission_date} onChange={e => updateField("emission_date", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Validade</Label>
          <Input type="date" value={form.validity_date} onChange={e => updateField("validity_date", e.target.value)} className="mt-1" />
        </div>
      </div>

      <div>
        <Label>Endereço</Label>
        <Input value={form.client_address} onChange={e => updateField("client_address", e.target.value)} className="mt-1" />
      </div>

      <div>
        <Label>Descrição</Label>
        <Textarea value={form.description} onChange={e => updateField("description", e.target.value)} rows={3} className="mt-1" />
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-base font-semibold">Itens do Orçamento</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Item
          </Button>
        </div>
        <div className="space-y-3">
          {form.items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end bg-slate-50 p-3 rounded-lg">
              <div className="col-span-12 sm:col-span-5">
                <Label className="text-xs">Produto/Serviço</Label>
                <Input value={item.name} onChange={e => updateItem(i, "name", e.target.value)} placeholder="Nome do item" className="mt-1" />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Label className="text-xs">Qtd</Label>
                <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, "quantity", Number(e.target.value))} className="mt-1" />
              </div>
              <div className="col-span-5 sm:col-span-3">
                <Label className="text-xs">Preço Unit. (R$)</Label>
                <Input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(i, "unit_price", Number(e.target.value))} className="mt-1" />
              </div>
              <div className="col-span-3 sm:col-span-2 flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600 whitespace-nowrap">
                  R$ {((item.quantity || 0) * (item.unit_price || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => removeItem(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Totals Section */}
        <div className="mt-4 space-y-2 bg-slate-50 p-4 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Subtotal:</span>
            <span className="font-medium">R$ {subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          </div>
          
          <div className="flex items-center justify-between gap-4">
            <Label className="text-sm">Desconto (%):</Label>
            <Input 
              type="number" 
              min="0" 
              max="100" 
              step="0.01"
              value={form.discount} 
              onChange={e => updateField("discount", Number(e.target.value))} 
              className="w-24 text-right"
            />
          </div>
          
          {form.discount > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span>Desconto aplicado:</span>
              <span>- R$ {discountAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center text-base font-bold border-t pt-2">
            <Input 
              type="text" 
              value={form.total_label} 
              onChange={e => updateField("total_label", e.target.value)} 
              className="w-40 text-base font-bold text-slate-900"
            />
            <span className="text-slate-900">R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          </div>
          
          <div className="flex items-center gap-4 border-t pt-2">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="apply_margin" 
                checked={form.apply_margin} 
                onCheckedChange={(checked) => updateField("apply_margin", checked)} 
              />
              <Label htmlFor="apply_margin" className="text-sm cursor-pointer">Aplicar margem</Label>
            </div>
            {form.apply_margin && (
              <div className="flex items-center gap-2">
                <Label className="text-sm">Margem (%):</Label>
                <Input 
                  type="number" 
                  min="0" 
                  max="100" 
                  step="0.01"
                  value={form.margin_percentage} 
                  onChange={e => updateField("margin_percentage", Number(e.target.value))} 
                  className="w-20 text-right"
                />
              </div>
            )}
          </div>
          
          {form.apply_margin && (
            <div className="flex justify-between items-center text-base font-bold">
              <Input 
                type="text" 
                value={form.total_with_margin_label} 
                onChange={e => updateField("total_with_margin_label", e.target.value)} 
                className="w-40 text-base font-bold text-slate-900"
              />
              <span className="text-slate-900">R$ {totalWithMargin.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>
      </div>

      <div>
        <Label>Observações</Label>
        <Textarea value={form.notes} onChange={e => updateField("notes", e.target.value)} rows={3} className="mt-1" />
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
          {loading ? "Salvando..." : "Salvar Orçamento"}
        </Button>
      </div>
    </form>
  );
}
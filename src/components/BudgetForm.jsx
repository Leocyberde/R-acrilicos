import { useState, useRef } from "react";
import ClientSearchInput from "@/components/ClientSearchInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

import { Plus, Trash2, AlertCircle } from "lucide-react";
import { toDateInputValue } from "@/utils/dateFormat";

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-600 mt-1">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

export default function BudgetForm({ initialData, onSubmit, onCancel, loading }) {
  const [errors, setErrors] = useState({});
  const firstErrorRef = useRef(null);

  const [form, setForm] = useState({
    client_name: initialData?.client_name || "",
    client_phone: initialData?.client_phone || "",
    client_email: initialData?.client_email || "",
    client_address: initialData?.client_address || "",
    job: initialData?.job || "",
    producer: initialData?.producer || "",
    description: initialData?.description || "",
    emission_date: toDateInputValue(initialData?.emission_date) || new Date().toISOString().split('T')[0],
    validity_date: toDateInputValue(initialData?.validity_date),
    delivery_date: toDateInputValue(initialData?.delivery_date),
    notes: initialData?.notes || "",
    discount: initialData?.discount || 0,
    apply_margin: initialData?.apply_margin !== undefined ? initialData.apply_margin : true,
    margin_percentage: initialData?.margin_percentage || 15,
    total_label: initialData?.total_label || "Total sem Nota",
    total_with_margin_label: initialData?.total_with_margin_label || "Total com Nota",
    items: initialData?.items?.length ? initialData.items : [{ name: "", quantity: 1, unit_price: 0 }],
  });

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const handleClientSearchSelect = (client) => {
    if (!client) return;
    const addressParts = [
      client.address_street,
      client.address_number ? `nº ${client.address_number}` : null,
      client.address_complement,
      client.address_city,
      client.address_state,
      client.address_zip_code ? `CEP ${client.address_zip_code}` : null,
    ].filter(Boolean);
    const composedAddress = addressParts.length > 0
      ? addressParts.join(", ")
      : client.address || client.city || "";

    setForm(prev => ({
      ...prev,
      client_id: client.id,
      client_name: client.name || "",
      client_phone: client.phone || client.mobile || prev.client_phone,
      client_email: client.email || prev.client_email,
      client_address: composedAddress || prev.client_address,
    }));
    setErrors(prev => ({ ...prev, client_name: "" }));
  };

  const updateItem = (index, field, value) => {
    const items = [...form.items];
    items[index] = { ...items[index], [field]: value };
    setForm(prev => ({ ...prev, items }));
    if (errors[`item_${index}_name`]) {
      setErrors(prev => ({ ...prev, [`item_${index}_name`]: "" }));
    }
  };

  const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, { name: "", quantity: 1, unit_price: 0 }] }));

  const removeItem = (index) => {
    if (form.items.length <= 1) return;
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const subtotal = form.items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0);
  const discountAmount = Math.min(Number(form.discount) || 0, subtotal);
  const total = subtotal - discountAmount;
  const totalWithMargin = form.apply_margin ? total * (1 + form.margin_percentage / 100) : null;

  const validate = () => {
    const newErrors = {};

    if (!form.client_name?.trim()) {
      newErrors.client_name = "Nome do cliente é obrigatório.";
    }
    if (!form.validity_date) {
      newErrors.validity_date = "Data de validade é obrigatória.";
    }
    if (!form.emission_date) {
      newErrors.emission_date = "Data de emissão é obrigatória.";
    }

    form.items.forEach((item, i) => {
      if (!item.name?.trim()) {
        newErrors[`item_${i}_name`] = "Informe o nome do produto/serviço.";
      }
    });

    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validate();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTimeout(() => {
        if (firstErrorRef.current) {
          firstErrorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
          firstErrorRef.current.focus?.();
        }
      }, 50);
      return;
    }

    onSubmit({
      ...form,
      subtotal,
      total,
      margin_percentage: form.apply_margin ? form.margin_percentage : null,
      total_with_margin: totalWithMargin,
      status: initialData?.status || "pendente"
    });
  };

  const errorFieldRef = (field) => errors[field] ? firstErrorRef : undefined;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="mb-2 block">Nome do Cliente <span className="text-red-500">*</span></Label>
          <div ref={errors.client_name ? firstErrorRef : undefined}>
            <ClientSearchInput
              value={form.client_name}
              onChange={(val) => updateField("client_name", val)}
              onClientSelect={handleClientSearchSelect}
              placeholder="Digite ou selecione um cliente..."
              error={!!errors.client_name}
            />
          </div>
          <FieldError message={errors.client_name} />
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
          <Label>Data de Emissão <span className="text-red-500">*</span></Label>
          <Input
            ref={!errors.client_name && errors.emission_date ? firstErrorRef : undefined}
            type="date"
            value={form.emission_date}
            onChange={e => updateField("emission_date", e.target.value)}
            className={`mt-1 ${errors.emission_date ? "border-red-500 focus-visible:ring-red-400" : ""}`}
          />
          <FieldError message={errors.emission_date} />
        </div>
        <div>
          <Label>Validade <span className="text-red-500">*</span></Label>
          <Input
            ref={!errors.client_name && !errors.emission_date && errors.validity_date ? firstErrorRef : undefined}
            type="date"
            value={form.validity_date}
            onChange={e => updateField("validity_date", e.target.value)}
            className={`mt-1 ${errors.validity_date ? "border-red-500 focus-visible:ring-red-400" : ""}`}
          />
          <FieldError message={errors.validity_date} />
        </div>
        <div>
          <Label>Data de Entrega</Label>
          <Input type="date" value={form.delivery_date} onChange={e => updateField("delivery_date", e.target.value)} className="mt-1" />
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
            <div key={i} className={`grid grid-cols-12 gap-2 items-end p-3 rounded-lg ${errors[`item_${i}_name`] ? "bg-red-50 border border-red-200" : "bg-slate-50"}`}>
              <div className="col-span-12 sm:col-span-5">
                <Label className="text-xs">Produto/Serviço <span className="text-red-500">*</span></Label>
                <Input
                  value={item.name}
                  onChange={e => updateItem(i, "name", e.target.value)}
                  placeholder="Nome do item"
                  className={`mt-1 ${errors[`item_${i}_name`] ? "border-red-500 focus-visible:ring-red-400" : ""}`}
                />
                <FieldError message={errors[`item_${i}_name`]} />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Label className="text-xs">Qtd</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity === 0 || item.quantity === "" ? "" : item.quantity}
                  onChange={e => updateItem(i, "quantity", e.target.value === "" ? 0 : Number(e.target.value))}
                  placeholder="1"
                  className="mt-1"
                />
              </div>
              <div className="col-span-5 sm:col-span-3">
                <Label className="text-xs">Preço Unit. (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_price === 0 || item.unit_price === "" ? "" : item.unit_price}
                  onChange={e => updateItem(i, "unit_price", e.target.value === "" ? 0 : Number(e.target.value))}
                  placeholder="0,00"
                  className="mt-1"
                />
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
            <Label className="text-sm">Desconto (R$):</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.discount === 0 || form.discount === "" ? "" : form.discount}
              onChange={e => updateField("discount", e.target.value === "" ? 0 : Number(e.target.value))}
              placeholder="0,00"
              className="w-32 text-right"
            />
          </div>

          {discountAmount > 0 && (
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

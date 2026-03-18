import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Paperclip, Send, CheckCircle2, X, Upload } from "lucide-react";
import { toast } from "sonner";

export default function ClientBudgetRequest() {
  const [form, setForm] = useState({
    client_name: "",
    job: "",
    producer: "",
    delivery_date: "",
    description: "",
    notes: "",
  });
  const [items, setItems] = useState([{ name: "", quantity: 1 }]);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function loadClient() {
      const user = await base44.auth.me();
      if (user) {
        const clients = await base44.entities.Client.list();
        const userClient = clients.find(c => c.email === user.email);
        setForm(prev => ({ ...prev, client_name: userClient?.name || user.full_name || "" }));
      }
    }
    loadClient();
  }, []);

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

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAttachments(prev => [...prev, { name: file.name, url: file_url, size: file.size }]);
    }
    setUploading(false);
    e.target.value = "";
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!form.client_name.trim()) {
      toast.error("Por favor, informe seu nome.");
      return;
    }
    const validItems = items.filter(i => i.name.trim());
    if (validItems.length === 0) {
      toast.error("Adicione pelo menos um item.");
      return;
    }
    setSubmitting(true);
    try {
      const user = await base44.auth.me();
      await base44.entities.BudgetRequest.create({
        client_name: form.client_name,
        client_email: user?.email || "",
        job: form.job,
        producer: form.producer,
        delivery_date: form.delivery_date || null,
        description: form.description,
        notes: form.notes,
        items: validItems,
        attachments,
        status: "nova",
      });
      setSubmitted(true);
    } catch (err) {
      toast.error("Erro ao enviar solicitação. Tente novamente.");
      console.error("BudgetRequest create error:", err);
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
              setForm({ client_name: "", job: "", producer: "", description: "", notes: "" });
              setItems([{ name: "", quantity: 1 }]);
              setAttachments([]);
              location.reload();
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
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-slate-900">Solicitação de Orçamento</h1>
          <p className="text-slate-500">Preencha o formulário abaixo e envie sua solicitação</p>
        </div>

        {/* Nome do Cliente */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800 text-base border-b pb-2">Informações</h2>
          <div>
            <Label>Empresa/Cliente <span className="text-red-500">*</span></Label>
            <Input
              className="mt-1"
              placeholder="Sua empresa"
              value={form.client_name}
              onChange={e => handleChange("client_name", e.target.value)}
              disabled
            />
          </div>
        </div>

        {/* Card pedido */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800 text-base border-b pb-2">Dados do Pedido</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Job</Label>
              <Input
                className="mt-1"
                placeholder="Nome do projeto / job"
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
            <Label>Data de Entrega Necessária <span className="text-red-500">*</span></Label>
            <p className="text-xs text-slate-500 mb-1">Informe a data em que você precisa que o projeto esteja pronto</p>
            <Input
              className="mt-1"
              type="date"
              value={form.delivery_date}
              onChange={e => handleChange("delivery_date", e.target.value)}
            />
          </div>
        </div>

        {/* Itens */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="font-semibold text-slate-800 text-base">Itens</h2>
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

        {/* Descrição e Observações */}
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

        {/* Anexos */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800 text-base border-b pb-2">Arquivos Anexados</h2>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all">
            {uploading ? (
              <div className="flex items-center gap-2 text-indigo-600">
                <div className="h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Enviando...</span>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-slate-400 mb-2" />
                <span className="text-sm text-slate-500">Clique para selecionar arquivos</span>
                <span className="text-xs text-slate-400 mt-1">Qualquer tipo de arquivo</span>
              </>
            )}
            <input type="file" multiple className="hidden" onChange={handleFileChange} disabled={uploading} />
          </label>

          {attachments.length > 0 && (
            <div className="space-y-2 mt-2">
              {attachments.map((att, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-slate-700 truncate">{att.name}</span>
                    <span className="text-xs text-slate-400 flex-shrink-0">({(att.size / 1024).toFixed(0)}KB)</span>
                  </div>
                  <button onClick={() => removeAttachment(idx)} className="text-slate-400 hover:text-red-500 flex-shrink-0 ml-2">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <Button
          className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-base"
          onClick={handleSubmit}
          disabled={submitting || uploading}
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
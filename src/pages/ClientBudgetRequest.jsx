import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Send, CheckCircle2, X, Paperclip } from "lucide-react";
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
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef(null);

  const formatPhone = (raw) => {
    if (!raw) return "";
    // Se for um JID do WhatsApp (ex: 5511910509385@s.whatsapp.net), pega apenas os números
    const cleanRaw = raw.includes("@") ? raw.split("@")[0] : raw;
    const digits = cleanRaw.replace(/\D/g, "");
    // Remove country code 55 (Brazil) if present and number is long enough
    const local = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
    if (local.length === 11) {
      return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
    }
    if (local.length === 10) {
      return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
    }
    return local;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get("name");
    const email = params.get("email");
    const whatsapp = params.get("whatsapp");
    
    if (name || email || whatsapp) {
      setForm(prev => ({
        ...prev,
        client_name: name || prev.client_name,
        client_email: email || prev.client_email,
        client_phone: whatsapp ? formatPhone(whatsapp) : prev.client_phone,
      }));
    }
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

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (attachments.length + files.length > 10) {
      toast.error("Você pode anexar no máximo 10 arquivos.");
      return;
    }
    setAttachments(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      toast.error("Adicione pelo menos um item ao pedido.");
      return;
    }
    
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("client_name", form.client_name);
      formData.append("client_email", form.client_email);
      formData.append("client_phone", form.client_phone);
      formData.append("job", form.job);
      formData.append("producer", form.producer);
      formData.append("delivery_date", form.delivery_date || "");
      formData.append("description", form.description);
      formData.append("notes", form.notes);
      formData.append("items", JSON.stringify(validItems));
      formData.append("status", "nova");
      
      attachments.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch('/api/public/budget-requests', {
        method: 'POST',
        body: formData,
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
              setAttachments([]);
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
            <Label>Nome / Razão Social <span className="text-red-500">*</span></Label>
            <Input
              className="mt-1"
              placeholder="Seu nome ou razão social"
              value={form.client_name}
              onChange={e => handleChange("client_name", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>WhatsApp</Label>
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
                placeholder="Digite seu nome"
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
          <h2 className="font-semibold text-slate-800 text-base border-b pb-2">Anexos <span className="text-sm font-normal text-slate-500">(máx 10 arquivos)</span></h2>
          <div className="space-y-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer group"
            >
              <Paperclip className="h-8 w-8 text-slate-400 mx-auto mb-2 group-hover:text-indigo-500 transition-colors" />
              <p className="text-sm text-slate-600 font-medium">Clique para anexar arquivos</p>
              <p className="text-xs text-slate-400 mt-1">JPG, PNG, PDF, CDR, PPTX, DXF, AI, DOCX, ZIP, PSD, etc.</p>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                className="hidden"
                accept=".jpg,.jpeg,.png,.pdf,.cdr,.pptx,.ppsx,.potx,.pptm,.dxf,.ai,.docx,.zip,.rar,.xls,.xlsx,.psd"
              />
            </div>

            {attachments.length > 0 && (
              <div className="grid grid-cols-1 gap-2">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Paperclip className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="text-sm text-slate-700 truncate">{file.name}</span>
                      <span className="text-xs text-slate-400 shrink-0">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                    <button 
                      onClick={() => removeAttachment(idx)}
                      className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
          {submitting ? "Enviando..." : "Enviar Solicitação"}
        </Button>
      </div>
    </div>
  );
}

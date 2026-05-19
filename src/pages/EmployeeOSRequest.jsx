import { useState, useEffect, useRef } from "react";
import { localClient } from "@/api/localClient";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Send, Info, Search, X, User, ChevronDown, UserPlus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

function ClientSearchWithCreate({ onClientSelect }) {
  const [allClients, setAllClients] = useState([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "", phone: "", email: "", address: "", city: "",
  });
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    localClient.entities.Client.list()
      .then(data => setAllClients(data || []))
      .catch(() => setAllClients([]));
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = query.toLowerCase().trim();
    if (!q) {
      setSuggestions(allClients);
    } else {
      setSuggestions(allClients.filter(c => (c.name || "").toLowerCase().includes(q)));
    }
  }, [query, allClients, open]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (client) => {
    setSelectedClient(client);
    setQuery(client.name);
    setOpen(false);
    setShowNewForm(false);
    onClientSelect({ type: "existing", client });
  };

  const handleClear = () => {
    setSelectedClient(null);
    setQuery("");
    setShowNewForm(false);
    setNewClient({ name: "", phone: "", email: "", address: "", city: "" });
    onClientSelect(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleStartNew = () => {
    setSelectedClient(null);
    setShowNewForm(true);
    setOpen(false);
    const filled = { ...newClient, name: query };
    setNewClient(filled);
    onClientSelect({ type: "new", data: filled });
  };

  const updateNew = (field, value) => {
    const updated = { ...newClient, [field]: value };
    setNewClient(updated);
    onClientSelect({ type: "new", data: updated });
  };

  const cancelNew = () => {
    setShowNewForm(false);
    setNewClient({ name: "", phone: "", email: "", address: "", city: "" });
    setQuery("");
    onClientSelect(null);
  };

  const noMatchFound = open && query.trim().length > 0 && suggestions.length === 0;
  const hasResults = open && suggestions.length > 0;

  return (
    <div className="space-y-4">
      {!showNewForm ? (
        <div ref={containerRef} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); setSelectedClient(null); }}
            onFocus={() => setOpen(true)}
            placeholder="Buscar cliente cadastrado..."
            autoComplete="off"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9 pr-8"
          />
          {query ? (
            <button onClick={handleClear} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10" type="button">
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none z-10" />
          )}

          {(hasResults || noMatchFound) && (
            <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
              {hasResults && suggestions.map(client => (
                <button
                  key={client.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors"
                  onMouseDown={() => handleSelect(client)}
                >
                  <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-3 w-3 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{client.name}</p>
                    {client.phone && <p className="text-xs text-slate-400 truncate">{client.phone}</p>}
                  </div>
                </button>
              ))}

              {noMatchFound && (
                <div className="px-3 py-3 space-y-2">
                  <p className="text-sm text-slate-400 text-center">Nenhum cliente encontrado para "{query}"</p>
                  <button
                    type="button"
                    onMouseDown={handleStartNew}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors border border-indigo-200"
                  >
                    <UserPlus className="h-4 w-4" />
                    Cadastrar "{query}" como novo cliente
                  </button>
                </div>
              )}
            </div>
          )}

          {open && !query.trim() && allClients.length === 0 && (
            <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg">
              <div className="px-3 py-3 space-y-2">
                <p className="text-sm text-slate-400 text-center">Nenhum cliente cadastrado ainda</p>
                <button
                  type="button"
                  onMouseDown={() => { setOpen(false); setShowNewForm(true); onClientSelect({ type: "new", data: newClient }); }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors border border-indigo-200"
                >
                  <UserPlus className="h-4 w-4" />
                  Cadastrar novo cliente
                </button>
              </div>
            </div>
          )}

          {selectedClient && (
            <div className="mt-2 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>Cliente selecionado: <strong>{selectedClient.name}</strong>{selectedClient.phone ? ` · ${selectedClient.phone}` : ""}</span>
            </div>
          )}

          {!selectedClient && !showNewForm && (
            <button
              type="button"
              onClick={() => { setShowNewForm(true); onClientSelect({ type: "new", data: newClient }); }}
              className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Ou cadastrar novo cliente manualmente
            </button>
          )}
        </div>
      ) : (
        <div className="border border-indigo-200 bg-indigo-50/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-800">Novo cliente</span>
            </div>
            <button type="button" onClick={cancelNew} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
              <X className="h-3.5 w-3.5" /> Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500 uppercase tracking-wider font-medium">Nome *</Label>
              <Input
                value={newClient.name}
                onChange={e => updateNew("name", e.target.value)}
                placeholder="Nome completo ou empresa"
                className="mt-1 bg-white"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500 uppercase tracking-wider font-medium">Telefone</Label>
              <Input
                value={newClient.phone}
                onChange={e => updateNew("phone", e.target.value)}
                placeholder="(11) 99999-9999"
                className="mt-1 bg-white"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500 uppercase tracking-wider font-medium">E-mail</Label>
              <Input
                value={newClient.email}
                onChange={e => updateNew("email", e.target.value)}
                placeholder="email@exemplo.com"
                className="mt-1 bg-white"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500 uppercase tracking-wider font-medium">Cidade</Label>
              <Input
                value={newClient.city}
                onChange={e => updateNew("city", e.target.value)}
                placeholder="Ex: São Paulo"
                className="mt-1 bg-white"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-slate-500 uppercase tracking-wider font-medium">Endereço</Label>
              <Input
                value={newClient.address}
                onChange={e => updateNew("address", e.target.value)}
                placeholder="Rua, número, bairro..."
                className="mt-1 bg-white"
              />
            </div>
          </div>

          <p className="text-xs text-indigo-600">
            Este cliente será cadastrado automaticamente ao enviar a O.S.
          </p>
        </div>
      )}
    </div>
  );
}

export default function EmployeeOSRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [clientSelection, setClientSelection] = useState(null);
  const [form, setForm] = useState({
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
    if (!clientSelection) {
      toast.error("Selecione ou cadastre um cliente");
      return;
    }
    if (clientSelection.type === "new" && !clientSelection.data?.name?.trim()) {
      toast.error("Informe o nome do novo cliente");
      return;
    }

    const validItems = items.filter(it => it.name.trim());
    if (validItems.length === 0) {
      toast.error("Adicione pelo menos um item ao serviço");
      return;
    }

    setSaving(true);
    try {
      let clientId = null;
      let clientName = "";
      let clientPhone = "";
      let clientAddress = "";

      if (clientSelection.type === "existing") {
        const c = clientSelection.client;
        clientId = c.id;
        clientName = c.name || "";
        clientPhone = c.phone || "";
        clientAddress = [c.address, c.city, c.state].filter(Boolean).join(", ");
      } else {
        const nd = clientSelection.data;
        const created = await localClient.entities.Client.create({
          name: nd.name.trim(),
          phone: nd.phone || "",
          email: nd.email || "",
          address: nd.address || "",
          city: nd.city || "",
        });
        clientId = created.id;
        clientName = created.name || nd.name;
        clientPhone = created.phone || nd.phone || "";
        clientAddress = [created.address, created.city].filter(Boolean).join(", ");
      }

      const os = await localClient.entities.WorkOrder.create({
        client_name: clientName,
        client_id: clientId,
        client_phone: clientPhone,
        client_address: clientAddress,
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
          <p className="text-slate-500 mt-0.5">Informe os dados e o admin será notificado para definir os valores</p>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-700">
          Busque um cliente já cadastrado ou cadastre um novo diretamente aqui. Os <strong>preços não são necessários</strong> — o administrador definirá os valores.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</h2>
        <ClientSearchWithCreate onClientSelect={setClientSelection} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detalhes do Serviço</h2>
        <div>
          <Label className="text-xs text-slate-500 uppercase tracking-wider font-medium">Job / Tipo de Serviço</Label>
          <Input
            value={form.job}
            onChange={e => setForm(p => ({ ...p, job: e.target.value }))}
            placeholder="Ex: Adesivagem veículo, Banner 3x2m, Fachada..."
            className="mt-1"
          />
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

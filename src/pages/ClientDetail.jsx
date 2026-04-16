import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Upload, Download, Trash2, X, FileText, Search, Smartphone, Plus, UserCheck } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const formatPhone = (raw) => {
  if (!raw) return raw;
  // Se for um JID do WhatsApp (ex: 5511910509385@s.whatsapp.net), pega apenas os números
  const cleanRaw = raw.includes("@") ? raw.split("@")[0] : raw;
  const digits = cleanRaw.replace(/\D/g, "");
  if (digits.length < 10) return raw;
  const local = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return raw;
};

export default function ClientDetail() {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [fetchingCep, setFetchingCep] = useState(false);
  const [linkedPhones, setLinkedPhones] = useState([]);
  const [newPhone, setNewPhone] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [addingPhone, setAddingPhone] = useState(false);
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  useEffect(() => {
    async function load() {
      try {
        const found = await base44.entities.Client.get(id);
        setClient({ ...found, mobile: formatPhone(found.mobile) });
      } catch {
        toast.error("Erro ao carregar cliente.");
      }
      setLoading(false);
    }
    load();
    loadLinkedPhones();
  }, [id]);

  async function loadLinkedPhones() {
    try {
      const res = await fetch(`/api/clients/${id}/phones`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (res.ok) setLinkedPhones(await res.json());
    } catch {}
  }

  async function handleAddPhone() {
    if (!newPhone.trim()) return toast.error("Informe o número.");
    setAddingPhone(true);
    try {
      const res = await fetch(`/api/clients/${id}/phones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ phone: newPhone.trim(), label: newLabel.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao vincular número.');
      setLinkedPhones(prev => [...prev, data]);
      setNewPhone("");
      setNewLabel("");
      toast.success("Número vinculado com sucesso!");
    } catch (e) {
      toast.error(e.message);
    }
    setAddingPhone(false);
  }

  async function handleRemovePhone(phoneId) {
    try {
      await fetch(`/api/clients/${id}/phones/${phoneId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      setLinkedPhones(prev => prev.filter(p => p.id !== phoneId));
      toast.success("Número removido.");
    } catch {
      toast.error("Erro ao remover número.");
    }
  }

  const handleCepLookup = async (cep) => {
    const cleaned = cep.replace(/\D/g, "");
    if (cleaned.length !== 8) return;
    setFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setClient(prev => ({
          ...prev,
          address_street: data.logradouro || prev.address_street,
          address_city: data.localidade || prev.address_city,
          address_state: data.uf || prev.address_state,
          address_zip_code: cep,
        }));
        toast.success("Endereço preenchido automaticamente!");
      } else {
        toast.error("CEP não encontrado.");
      }
    } catch {
      toast.error("Erro ao buscar CEP.");
    }
    setFetchingCep(false);
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const updateData = {
        name: client.name,
        phone: client.phone,
        mobile: client.mobile,
        email: client.email,
        person_type: client.person_type,
        notes: client.notes,
        address_street: client.address_street,
        address_number: client.address_number,
        address_complement: client.address_complement,
        address_zip_code: client.address_zip_code,
        address_city: client.address_city,
        address_state: client.address_state,
        cpf: client.person_type === "fisica" ? client.cpf : null,
        cnpj: client.person_type === "juridica" ? client.cnpj : null,
        cpf_cnpj: client.person_type === "fisica" ? client.cpf : client.cnpj,
      };
      await base44.entities.Client.update(id, updateData);
      toast.success("Cliente salvo com sucesso!");
    } catch {
      toast.error("Erro ao salvar cliente.");
    }
    setSaving(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const files = [...(client.registration_files || [])];
      files.push({
        name: file.name,
        url: file_url,
        size: file.size,
        uploaded_date: new Date().toISOString(),
      });
      await base44.entities.Client.update(id, { registration_files: files });
      setClient(prev => ({ ...prev, registration_files: files }));
      toast.success("Arquivo anexado com sucesso!");
    } catch {
      toast.error("Erro ao enviar arquivo.");
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDeleteFile = async (index) => {
    const files = [...(client.registration_files || [])];
    files.splice(index, 1);
    try {
      await base44.entities.Client.update(id, { registration_files: files });
      setClient(prev => ({ ...prev, registration_files: files }));
    } catch {
      toast.error("Erro ao remover arquivo.");
    }
  };

  const handleDelete = async () => {
    try {
      await base44.entities.Client.delete(id);
      navigate(createPageUrl("Clients"));
    } catch {
      toast.error("Erro ao excluir cliente.");
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Cliente não encontrado</p>
        <Button className="mt-4" onClick={() => navigate(createPageUrl("Clients"))}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("Clients"))}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{client.name}</h1>
            <p className="text-slate-500 mt-0.5">Detalhes do cliente</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={handleUpdate} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1.5" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-slate-50 p-0">
            <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-white">
              Informações
            </TabsTrigger>
            <TabsTrigger value="phones" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-white flex items-center gap-2">
              <Smartphone className="h-4 w-4" /> WhatsApp Vinculados
              {linkedPhones.length > 0 && (
                <span className="ml-1 bg-green-100 text-green-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">{linkedPhones.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="files" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-white flex items-center gap-2">
              <FileText className="h-4 w-4" /> FICHA CADASTRAL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="p-6 space-y-6 mt-0">
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">Informações do Cliente</h3>

              <div className="mb-6">
                <Label className="mb-2 block">Tipo de Pessoa *</Label>
                <Select value={client.person_type || "fisica"} onValueChange={value => setClient(prev => ({ ...prev, person_type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fisica">Pessoa Física</SelectItem>
                    <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>{client.person_type === "juridica" ? "Empresa/Cliente *" : "Nome *"}</Label>
                  <Input value={client.name || ""} onChange={e => setClient(prev => ({ ...prev, name: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>{client.person_type === "juridica" ? "CNPJ" : "CPF"}</Label>
                  <Input
                    value={client.person_type === "juridica" ? (client.cnpj || "") : (client.cpf || "")}
                    onChange={e => setClient(prev => ({
                      ...prev,
                      [client.person_type === "juridica" ? "cnpj" : "cpf"]: e.target.value
                    }))}
                    placeholder={client.person_type === "juridica" ? "00.000.000/0000-00" : "000.000.000-00"}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={client.phone || ""} onChange={e => setClient(prev => ({ ...prev, phone: e.target.value }))} className="mt-1" placeholder="(11) 3333-4444" />
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <Input value={client.mobile || ""} onChange={e => setClient(prev => ({ ...prev, mobile: e.target.value }))} className="mt-1" placeholder="(11) 99999-8888" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Email</Label>
                  <Input type="email" value={client.email || ""} onChange={e => setClient(prev => ({ ...prev, email: e.target.value }))} className="mt-1" />
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium text-slate-900 mb-4">Endereço</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>CEP</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={client.address_zip_code || ""}
                        onChange={e => setClient(prev => ({ ...prev, address_zip_code: e.target.value }))}
                        onBlur={e => handleCepLookup(e.target.value)}
                        placeholder="00000-000"
                        maxLength={9}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCepLookup(client.address_zip_code || "")}
                        disabled={fetchingCep}
                        title="Buscar CEP"
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                    {fetchingCep && <p className="text-xs text-indigo-600 mt-1">Buscando endereço...</p>}
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <Input value={client.address_state || ""} onChange={e => setClient(prev => ({ ...prev, address_state: e.target.value }))} maxLength="2" className="mt-1" placeholder="SP" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Rua / Logradouro</Label>
                    <Input value={client.address_street || ""} onChange={e => setClient(prev => ({ ...prev, address_street: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label>Número</Label>
                    <Input value={client.address_number || ""} onChange={e => setClient(prev => ({ ...prev, address_number: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label>Complemento</Label>
                    <Input value={client.address_complement || ""} onChange={e => setClient(prev => ({ ...prev, address_complement: e.target.value }))} className="mt-1" placeholder="Apto, sala, bloco..." />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Cidade</Label>
                    <Input value={client.address_city || ""} onChange={e => setClient(prev => ({ ...prev, address_city: e.target.value }))} className="mt-1" />
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Label>Observações</Label>
                <Textarea value={client.notes || ""} onChange={e => setClient(prev => ({ ...prev, notes: e.target.value }))} rows={3} className="mt-1" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="phones" className="p-6 space-y-6 mt-0">
            <div>
              <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-green-600" /> Números de WhatsApp Vinculados
              </h3>
              <p className="text-sm text-slate-500 mb-5">
                Qualquer número vinculado aqui será reconhecido pelo bot como pertencente a este cliente — sem precisar digitar CPF/CNPJ.
              </p>

              {/* Formulário para adicionar */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
                <p className="text-sm font-medium text-slate-700 mb-3">Vincular novo número</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Label className="text-xs text-slate-500">Número WhatsApp (somente dígitos)</Label>
                    <Input
                      className="mt-1"
                      placeholder="Ex: 11910509385"
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value.replace(/\D/g, ""))}
                      maxLength={13}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-slate-500">Identificação (opcional)</Label>
                    <Input
                      className="mt-1"
                      placeholder="Ex: João - Compras"
                      value={newLabel}
                      onChange={e => setNewLabel(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                      onClick={handleAddPhone}
                      disabled={addingPhone || !newPhone.trim()}
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      {addingPhone ? "Vinculando..." : "Vincular"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Lista de números vinculados */}
              {linkedPhones.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                  <Smartphone className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Nenhum número adicional vinculado.<br />
                  O número principal do cadastro ({formatPhone(client?.mobile) || "não definido"}) já é usado pelo bot.
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedPhones.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <UserCheck className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-mono text-sm font-semibold text-slate-800">{p.phone}</p>
                          {p.label && <p className="text-xs text-slate-500">{p.label}</p>}
                          <p className="text-xs text-slate-400">Vinculado em {new Date(p.created_date).toLocaleDateString("pt-BR")}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleRemovePhone(p.id)}
                        title="Remover vínculo"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="files" className="p-6 space-y-4 mt-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Arquivos da Ficha Cadastral</h3>
                <p className="text-sm text-slate-500 mt-1">Anexe documentos de todos os tipos</p>
              </div>
              <div className="relative">
                <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={uploading} />
                <Button size="sm" variant="outline" disabled={uploading}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> {uploading ? "Enviando..." : "Anexar Arquivo"}
                </Button>
              </div>
            </div>

            {(client.registration_files?.length || 0) === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
                Nenhum arquivo anexado
              </div>
            ) : (
              <div className="space-y-2">
                {client.registration_files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-8 w-8 rounded bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <Download className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">{formatFileSize(file.size)} • {new Date(file.uploaded_date).toLocaleDateString("pt-BR")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(file.url, "_blank")}>
                        <Download className="h-4 w-4 text-slate-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDeleteFile(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

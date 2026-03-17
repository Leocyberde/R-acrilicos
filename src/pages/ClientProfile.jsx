import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Camera, Save, MapPin, Search, Edit2, X } from "lucide-react";
import { toast } from "sonner";

export default function ClientProfile() {
  const [user, setUser] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const photoInputRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      if (currentUser) {
        const clients = await base44.entities.Client.filter({ email: currentUser.email });
        if (clients.length > 0) {
          setClient(clients[0]);
        } else {
          setClient({
            name: currentUser.full_name || "",
            email: currentUser.email || "",
            phone: "",
            mobile: "",
            person_type: "fisica",
            cpf: "",
            cnpj: "",
            photo_url: "",
            address_zip_code: "",
            address_street: "",
            address_number: "",
            address_complement: "",
            address_city: "",
            address_state: "",
            notes: "",
          });
        }
      }
    } catch {
      toast.error("Erro ao carregar perfil.");
    }
    setLoading(false);
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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setClient(prev => ({ ...prev, photo_url: file_url }));
      toast.success("Foto atualizada!");
    } catch {
      toast.error("Erro ao fazer upload da foto.");
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        name: client.name,
        email: client.email,
        phone: client.phone,
        mobile: client.mobile,
        person_type: client.person_type,
        cpf: client.person_type === "fisica" ? client.cpf : null,
        cnpj: client.person_type === "juridica" ? client.cnpj : null,
        photo_url: client.photo_url,
        address_zip_code: client.address_zip_code,
        address_street: client.address_street,
        address_number: client.address_number,
        address_complement: client.address_complement,
        address_city: client.address_city,
        address_state: client.address_state,
        notes: client.notes,
      };

      if (client.id) {
        await base44.entities.Client.update(client.id, data);
      } else {
        const created = await base44.entities.Client.create(data);
        setClient(prev => ({ ...prev, id: created.id }));
      }
      setEditingAddress(false);
      toast.success("Perfil salvo com sucesso!");
    } catch {
      toast.error("Erro ao salvar perfil.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasAddress = client?.address_street || client?.address_city || client?.address_zip_code;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <User className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meu Perfil</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gerencie suas informações pessoais</p>
        </div>
      </div>

      {/* Photo */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Foto de Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-indigo-100 overflow-hidden flex items-center justify-center border-2 border-indigo-200">
                {client?.photo_url ? (
                  <img src={client.photo_url} alt="Foto de perfil" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-indigo-400" />
                )}
              </div>
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">{client?.name || user?.full_name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploading}
              >
                <Camera className="h-3 w-3 mr-1.5" />
                {uploading ? "Enviando..." : "Alterar foto"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block text-sm">Tipo de Pessoa</Label>
            <Select
              value={client?.person_type || "fisica"}
              onValueChange={value => setClient(prev => ({ ...prev, person_type: value }))}
            >
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
            <div className="sm:col-span-2">
              <Label className="text-sm">{client?.person_type === "juridica" ? "Razão Social / Nome" : "Nome completo"}</Label>
              <Input
                value={client?.name || ""}
                onChange={e => setClient(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
                placeholder="Seu nome"
              />
            </div>
            <div>
              <Label className="text-sm">{client?.person_type === "juridica" ? "CNPJ" : "CPF"}</Label>
              <Input
                value={client?.person_type === "juridica" ? (client?.cnpj || "") : (client?.cpf || "")}
                onChange={e => setClient(prev => ({
                  ...prev,
                  [client?.person_type === "juridica" ? "cnpj" : "cpf"]: e.target.value,
                }))}
                placeholder={client?.person_type === "juridica" ? "00.000.000/0000-00" : "000.000.000-00"}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Email</Label>
              <Input type="email" value={client?.email || ""} onChange={e => setClient(prev => ({ ...prev, email: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Telefone</Label>
              <Input value={client?.phone || ""} onChange={e => setClient(prev => ({ ...prev, phone: e.target.value }))} className="mt-1" placeholder="(00) 0000-0000" />
            </div>
            <div>
              <Label className="text-sm">Celular / WhatsApp</Label>
              <Input value={client?.mobile || ""} onChange={e => setClient(prev => ({ ...prev, mobile: e.target.value }))} className="mt-1" placeholder="(00) 00000-0000" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-indigo-500" />
            Endereço
          </CardTitle>
          {!editingAddress && (
            <Button variant="ghost" size="sm" onClick={() => setEditingAddress(true)} className="text-indigo-600 h-8">
              <Edit2 className="h-3.5 w-3.5 mr-1.5" />
              {hasAddress ? "Editar" : "Adicionar"}
            </Button>
          )}
          {editingAddress && (
            <Button variant="ghost" size="sm" onClick={() => setEditingAddress(false)} className="text-slate-500 h-8">
              <X className="h-3.5 w-3.5 mr-1.5" />
              Cancelar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!editingAddress && hasAddress ? (
            <div className="text-sm text-slate-700 space-y-1">
              <p>{client?.address_street}{client?.address_number ? `, ${client.address_number}` : ""}{client?.address_complement ? ` - ${client.address_complement}` : ""}</p>
              <p>{client?.address_city}{client?.address_state ? ` - ${client.address_state}` : ""}{client?.address_zip_code ? `, CEP: ${client.address_zip_code}` : ""}</p>
            </div>
          ) : !editingAddress && !hasAddress ? (
            <p className="text-sm text-slate-400 italic">Nenhum endereço cadastrado. Clique em "Adicionar" para incluir.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">CEP</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={client?.address_zip_code || ""}
                    onChange={e => setClient(prev => ({ ...prev, address_zip_code: e.target.value }))}
                    onBlur={e => handleCepLookup(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCepLookup(client?.address_zip_code || "")}
                    disabled={fetchingCep}
                    title="Buscar CEP"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {fetchingCep && <p className="text-xs text-indigo-600 mt-1">Buscando endereço...</p>}
              </div>
              <div>
                <Label className="text-sm">Estado</Label>
                <Input
                  value={client?.address_state || ""}
                  onChange={e => setClient(prev => ({ ...prev, address_state: e.target.value }))}
                  maxLength={2}
                  placeholder="SP"
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-sm">Rua / Logradouro</Label>
                <Input
                  value={client?.address_street || ""}
                  onChange={e => setClient(prev => ({ ...prev, address_street: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Número</Label>
                <Input
                  value={client?.address_number || ""}
                  onChange={e => setClient(prev => ({ ...prev, address_number: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Complemento</Label>
                <Input
                  value={client?.address_complement || ""}
                  onChange={e => setClient(prev => ({ ...prev, address_complement: e.target.value }))}
                  placeholder="Apto, sala..."
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-sm">Cidade</Label>
                <Input
                  value={client?.address_city || ""}
                  onChange={e => setClient(prev => ({ ...prev, address_city: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={client?.notes || ""}
            onChange={e => setClient(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            placeholder="Informações adicionais..."
          />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700">
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Salvando..." : "Salvar Perfil"}
      </Button>
    </div>
  );
}

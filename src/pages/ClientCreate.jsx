import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Save, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function ClientCreate() {
  const [form, setForm] = useState({
    person_type: "fisica",
    name: "",
    cpf: "",
    cnpj: "",
    phone: "",
    mobile: "",
    email: "",
    address_zip_code: "",
    address_street: "",
    address_number: "",
    address_complement: "",
    address_city: "",
    address_state: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);
  const navigate = useNavigate();

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleCepLookup = async (cep) => {
    const cleaned = cep.replace(/\D/g, "");
    if (cleaned.length !== 8) return;
    setFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm(prev => ({
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const clientData = {
        name: form.name,
        person_type: form.person_type,
        phone: form.phone,
        mobile: form.mobile,
        email: form.email,
        cpf: form.person_type === "fisica" ? form.cpf : null,
        cnpj: form.person_type === "juridica" ? form.cnpj : null,
        cpf_cnpj: form.person_type === "fisica" ? form.cpf : form.cnpj,
        address_zip_code: form.address_zip_code,
        address_street: form.address_street,
        address_number: form.address_number,
        address_complement: form.address_complement,
        address_city: form.address_city,
        address_state: form.address_state,
        notes: form.notes,
      };
      await base44.entities.Client.create(clientData);
      toast.success("Cliente cadastrado com sucesso!");
      navigate(createPageUrl("Clients"));
    } catch {
      toast.error("Erro ao salvar cliente.");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("Clients"))}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Novo Cliente</h1>
          <p className="text-slate-500 mt-0.5">Preencha os dados para cadastrar um novo cliente</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Tipo de Pessoa */}
            <div>
              <Label className="mb-2 block">Tipo de Pessoa *</Label>
              <Select value={form.person_type} onValueChange={v => set("person_type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fisica">Pessoa Física</SelectItem>
                  <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Identificação */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-1 border-b border-slate-100">Identificação</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>{form.person_type === "juridica" ? "Razão Social / Nome da Empresa *" : "Nome Completo *"}</Label>
                  <Input
                    value={form.name}
                    onChange={e => set("name", e.target.value)}
                    required
                    className="mt-1"
                    placeholder={form.person_type === "juridica" ? "Ex: Empresa LTDA" : "Ex: João Silva"}
                  />
                </div>
                <div>
                  <Label>{form.person_type === "juridica" ? "CNPJ" : "CPF"}</Label>
                  <Input
                    value={form.person_type === "juridica" ? form.cnpj : form.cpf}
                    onChange={e => set(form.person_type === "juridica" ? "cnpj" : "cpf", e.target.value)}
                    className="mt-1"
                    placeholder={form.person_type === "juridica" ? "00.000.000/0000-00" : "000.000.000-00"}
                  />
                </div>
              </div>
            </div>

            {/* Contato */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-1 border-b border-slate-100">Contato</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={form.phone}
                    onChange={e => set("phone", e.target.value)}
                    className="mt-1"
                    placeholder="(11) 3333-4444"
                  />
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <Input
                    value={form.mobile}
                    onChange={e => set("mobile", e.target.value)}
                    className="mt-1"
                    placeholder="(11) 99999-0000"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => set("email", e.target.value)}
                    className="mt-1"
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-1 border-b border-slate-100">Endereço</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>CEP</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={form.address_zip_code}
                      onChange={e => set("address_zip_code", e.target.value)}
                      onBlur={e => handleCepLookup(e.target.value)}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleCepLookup(form.address_zip_code)}
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
                  <Input
                    value={form.address_state}
                    onChange={e => set("address_state", e.target.value)}
                    maxLength={2}
                    className="mt-1"
                    placeholder="SP"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Rua / Logradouro</Label>
                  <Input
                    value={form.address_street}
                    onChange={e => set("address_street", e.target.value)}
                    className="mt-1"
                    placeholder="Rua das Flores"
                  />
                </div>
                <div>
                  <Label>Número</Label>
                  <Input
                    value={form.address_number}
                    onChange={e => set("address_number", e.target.value)}
                    className="mt-1"
                    placeholder="123"
                  />
                </div>
                <div>
                  <Label>Complemento</Label>
                  <Input
                    value={form.address_complement}
                    onChange={e => set("address_complement", e.target.value)}
                    className="mt-1"
                    placeholder="Apto, sala, bloco..."
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Cidade</Label>
                  <Input
                    value={form.address_city}
                    onChange={e => set("address_city", e.target.value)}
                    className="mt-1"
                    placeholder="São Paulo"
                  />
                </div>
              </div>
            </div>

            {/* Observações */}
            <div>
              <Label>Observações</Label>
              <Textarea
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="Informações adicionais sobre o cliente..."
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => navigate(createPageUrl("Clients"))}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar Cliente"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

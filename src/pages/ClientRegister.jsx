import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, UserPlus, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ClientRegister() {
  const [form, setForm] = useState({
    person_type: "fisica",
    name: "",
    cpf: "",
    cnpj: "",
    phone: "",
    mobile: "",
    email: "",
    password: "",
    confirm_password: "",
    address_zip_code: "",
    address_street: "",
    address_number: "",
    address_complement: "",
    address_city: "",
    address_state: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);

  const formatPhone = (raw) => {
    if (!raw) return "";
    const digits = raw.replace(/\D/g, "");
    const local = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
    if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
    if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
    return local;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const whatsapp = params.get("whatsapp");
    if (whatsapp) {
      setForm(prev => ({ ...prev, mobile: formatPhone(whatsapp) }));
    }
  }, []);

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
      toast.error("Nome é obrigatório.");
      return;
    }
    if (form.password !== form.confirm_password) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (form.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch('/api/public/clients/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          person_type: form.person_type,
          phone: form.phone,
          mobile: form.mobile,
          email: form.email,
          password: form.password,
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
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao cadastrar');
      }
      setRegistered(true);
    } catch (err) {
      toast.error(err.message || "Erro ao cadastrar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Cadastro Realizado!</h2>
          <p className="text-slate-500">
            Seu cadastro foi realizado com sucesso. Agora você já pode solicitar um orçamento!
          </p>
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700 mt-2"
            onClick={() => window.location.href = '/ClientBudgetRequest'}
          >
            Solicitar Orçamento Agora
          </Button>
          <p className="text-xs text-slate-400 pt-2">
            Ou retorne ao WhatsApp e escolha a opção de orçamento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <div className="h-14 w-14 rounded-full bg-indigo-100 flex items-center justify-center">
              <UserPlus className="h-7 w-7 text-indigo-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Novo Cadastro</h1>
          <p className="text-slate-500">Preencha seus dados para se cadastrar e solicitar orçamentos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="font-semibold text-slate-800 text-base border-b pb-2">Tipo de Pessoa</h2>
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

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="font-semibold text-slate-800 text-base border-b pb-2">Identificação</h2>
            <div>
              <Label>{form.person_type === "juridica" ? "Razão Social / Nome da Empresa" : "Nome Completo"} <span className="text-red-500">*</span></Label>
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

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="font-semibold text-slate-800 text-base border-b pb-2">Contato</h2>
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
                <Label>Número do WhatsApp</Label>
                <Input
                  value={form.mobile}
                  onChange={e => set("mobile", e.target.value)}
                  className="mt-1"
                  placeholder="(11) 99999-8888"
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

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="font-semibold text-slate-800 text-base border-b pb-2">Segurança</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Senha</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={e => set("password", e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label>Confirmar Senha</Label>
                <Input
                  type="password"
                  value={form.confirm_password}
                  onChange={e => set("confirm_password", e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="font-semibold text-slate-800 text-base border-b pb-2">Endereço <span className="text-sm font-normal text-slate-500">(opcional)</span></h2>
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

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="font-semibold text-slate-800 text-base border-b pb-2">Observações <span className="text-sm font-normal text-slate-500">(opcional)</span></h2>
            <Textarea
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              rows={3}
              className="mt-1"
              placeholder="Informações adicionais..."
            />
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-base"
          >
            {saving ? "Cadastrando..." : "Realizar Cadastro"}
          </Button>
        </form>
      </div>
    </div>
  );
}

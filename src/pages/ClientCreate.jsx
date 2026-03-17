import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ClientCreate() {
  const [form, setForm] = useState({
    name: "",
    person_type: "fisica",
    cpf_cnpj: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const clientData = {
      name: form.name,
      person_type: form.person_type,
      phone: form.phone,
      email: form.email,
      address_street: form.address,
      notes: form.notes,
      registration_files: [],
    };
    
    if (form.person_type === "fisica") {
      clientData.cpf = form.cpf_cnpj;
    } else {
      clientData.cnpj = form.cpf_cnpj;
    }
    
    const client = await base44.entities.Client.create(clientData);
    navigate(createPageUrl("ClientDetail") + `?id=${client.id}`);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("Clients"))}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Novo Cliente</h1>
          <p className="text-slate-500 mt-0.5">Cadastre um novo cliente</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="mb-6">
              <Label className="mb-2 block">Tipo de Pessoa *</Label>
              <Select value={form.person_type} onValueChange={value => setForm(prev => ({ ...prev, person_type: value }))}>
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
                <Label>{form.person_type === "juridica" ? "Empresa/Cliente *" : "Nome *"}</Label>
                <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} required className="mt-1" />
              </div>
              <div>
                <Label>{form.person_type === "juridica" ? "CNPJ" : "CPF"}</Label>
                <Input value={form.cpf_cnpj} onChange={e => setForm(prev => ({ ...prev, cpf_cnpj: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} className="mt-1" />
              </div>
            </div>

            <div>
              <Label>Endereço</Label>
              <Input value={form.address} onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))} className="mt-1" />
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} rows={3} className="mt-1" />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate(createPageUrl("Clients"))}>Cancelar</Button>
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
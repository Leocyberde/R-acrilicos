import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Image as ImageIcon, Shield, Layout } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [settingsData, me] = await Promise.all([
      base44.entities.Settings.list(),
      base44.auth.me(),
    ]);
    setCurrentUser(me);
    if (settingsData.length > 0) {
      setSettings(settingsData[0]);
    } else {
      setSettings({
        company_name: "",
        company_address: "",
        company_phone: "",
        company_email: "",
        company_logo: "",
      });
    }
    setLoading(false);
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setSettings(prev => ({ ...prev, company_logo: file_url }));
    setUploading(false);
    e.target.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    if (settings.id) {
      await base44.entities.Settings.update(settings.id, settings);
    } else {
      const created = await base44.entities.Settings.create(settings);
      setSettings(created);
    }
    toast.success("Configurações salvas com sucesso!");
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (currentUser?.role !== "admin") {
    return (
      <div className="text-center py-16">
        <Shield className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Acesso restrito a administradores</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configurações</h1>
        <p className="text-slate-500 mt-0.5">Configure as informações da sua empresa</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logo da Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings?.company_logo && (
            <div className="flex items-center justify-center p-6 bg-slate-50 rounded-lg border border-slate-200">
              <img src={settings.company_logo} alt="Logo" className="max-h-32" />
            </div>
          )}
          <div>
            <input
              type="file"
              id="logo-upload"
              className="hidden"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={uploading}
            />
            <Button asChild variant="outline" disabled={uploading} className="w-full">
              <label htmlFor="logo-upload" className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Enviando..." : "Fazer Upload do Logo"}
              </label>
            </Button>
            <p className="text-xs text-slate-500 mt-2">Formatos aceitos: JPG, PNG. Recomendado: 300x100px</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nome da Empresa</Label>
            <Input
              value={settings?.company_name || ""}
              onChange={e => setSettings(prev => ({ ...prev, company_name: e.target.value }))}
              className="mt-1"
              placeholder="Minha Empresa Ltda"
            />
          </div>
          <div>
            <Label>Endereço</Label>
            <Input
              value={settings?.company_address || ""}
              onChange={e => setSettings(prev => ({ ...prev, company_address: e.target.value }))}
              className="mt-1"
              placeholder="Rua Exemplo, 123 - Cidade/UF"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Telefone</Label>
              <Input
                value={settings?.company_phone || ""}
                onChange={e => setSettings(prev => ({ ...prev, company_phone: e.target.value }))}
                className="mt-1"
                placeholder="(00) 0000-0000"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={settings?.company_email || ""}
                onChange={e => setSettings(prev => ({ ...prev, company_email: e.target.value }))}
                className="mt-1"
                placeholder="contato@empresa.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Layout de Documentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">Customize o layout e a aparência de orçamentos e recibos.</p>
          <Link to={createPageUrl("LayoutEditor")} className="w-full">
            <Button variant="outline" className="w-full">
              Editar Layout
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700">
        {saving ? "Salvando..." : "Salvar Configurações"}
      </Button>
      </div>
      );
      }
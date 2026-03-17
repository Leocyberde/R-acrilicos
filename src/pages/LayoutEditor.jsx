import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const fontMap = {
  'sans-serif': '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'arial': 'Arial, sans-serif',
  'cambria': 'Cambria, serif',
  'serif': 'Georgia, serif',
  'monospace': 'monospace'
};

const SECTIONS = [
  { id: "cliente", label: "Cliente" },
  { id: "job", label: "Job" },
  { id: "produtor", label: "Produtor" },
  { id: "telefone", label: "Telefone" },
  { id: "email", label: "Email" },
  { id: "endereco", label: "Endereço" },
  { id: "descricao", label: "Descrição" },
  { id: "itens", label: "Itens" },
  { id: "subtotal", label: "Subtotal" },
  { id: "desconto", label: "Desconto" },
  { id: "total", label: "Total" },
  { id: "observacoes", label: "Observações" },
];

function SectionStylesEditor() {
  const [styles, setStyles] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [docType, setDocType] = useState("budget");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const allStyles = await base44.entities.SectionStyles.list();
      const filtered = allStyles.filter(s => s.document_type === docType);
      setStyles(filtered);
    }
    load();
  }, [docType]);

  const handleSaveStyle = async (sectionId) => {
    setSaving(true);
    const existingStyle = styles.find(s => s.section_name === sectionId);
    const { section_name, id, created_date, updated_date, created_by, ...styleData } = selectedSection || {};

    try {
      if (existingStyle?.id) {
        await base44.entities.SectionStyles.update(existingStyle.id, styleData);
      } else {
        await base44.entities.SectionStyles.create({
          document_type: docType,
          section_name: sectionId,
          ...styleData
        });
      }
      
      const allStyles = await base44.entities.SectionStyles.list();
      const filtered = allStyles.filter(s => s.document_type === docType);
      setStyles(filtered);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStyle = async (styleId) => {
    await base44.entities.SectionStyles.delete(styleId);
    const allStyles = await base44.entities.SectionStyles.list();
    const filtered = allStyles.filter(s => s.document_type === docType);
    setStyles(filtered);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setDocType("budget")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            docType === "budget" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Orçamento
        </button>
        <button
          onClick={() => setDocType("receipt")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            docType === "receipt" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Recibo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sections List */}
        <div className="space-y-2">
          <h3 className="font-medium text-slate-900">Seções Disponíveis</h3>
          {SECTIONS.map(section => {
            const existingStyle = styles.find(s => s.section_name === section.id);
            return (
              <button
                key={section.id}
                onClick={() => setSelectedSection(existingStyle || { section_name: section.id })}
                className={`w-full text-left px-4 py-2 rounded-lg border-2 transition-all ${
                  selectedSection?.section_name === section.id
                    ? "border-indigo-500 bg-indigo-50"
                    : existingStyle ? "border-slate-200 bg-slate-50" : "border-slate-200"
                }`}
              >
                <div className="text-sm font-medium text-slate-900">{section.label}</div>
                {existingStyle && (
                  <div className="text-xs text-slate-500 mt-1">
                    {existingStyle.font_family} • {existingStyle.font_size}px • {existingStyle.text_color}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Style Editor */}
        {selectedSection && (
          <div className="space-y-4 bg-slate-50 p-4 rounded-lg">
            <h3 className="font-medium text-slate-900">Editar: {SECTIONS.find(s => s.id === selectedSection.section_name)?.label}</h3>

            <div>
              <label className="text-sm font-medium text-slate-700">Fonte</label>
              <select
                value={selectedSection?.font_family || "sans-serif"}
                onChange={(e) => setSelectedSection({ ...selectedSection, font_family: e.target.value })}
                className="mt-2 w-full px-3 py-2 rounded border border-slate-200 text-sm"
              >
                <option value="sans-serif">Sans Serif</option>
                <option value="arial">Arial</option>
                <option value="cambria">Cambria</option>
                <option value="serif">Serif</option>
                <option value="monospace">Monospace</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Tamanho (px)</label>
              <input
                type="number"
                min="8"
                max="32"
                value={selectedSection?.font_size || 14}
                onChange={(e) => setSelectedSection({ ...selectedSection, font_size: parseInt(e.target.value) })}
                className="mt-2 w-full px-3 py-2 rounded border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Cor</label>
              <input
                type="color"
                value={selectedSection?.text_color || "#1f2937"}
                onChange={(e) => setSelectedSection({ ...selectedSection, text_color: e.target.value })}
                className="mt-2 w-12 h-10 rounded border border-slate-200 cursor-pointer"
              />
            </div>

            <div className="flex gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSection?.font_weight === "bold"}
                  onChange={(e) => setSelectedSection({ ...selectedSection, font_weight: e.target.checked ? "bold" : "normal" })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">Negrito</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSection?.is_italic || false}
                  onChange={(e) => setSelectedSection({ ...selectedSection, is_italic: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">Itálico</span>
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => handleSaveStyle(selectedSection.section_name)}
                disabled={saving}
              >
                Salvar
              </Button>
              {selectedSection?.id && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteStyle(selectedSection.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LayoutEditor() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [budgetLayout, setBudgetLayout] = useState(null);
  const [receiptLayout, setReceiptLayout] = useState(null);

  useEffect(() => {
    async function load() {
      const settings = await base44.entities.LayoutSettings.list();
      const budget = settings.find(s => s.document_type === "budget") || {};
      const receipt = settings.find(s => s.document_type === "receipt") || {};
      setBudgetLayout(budget);
      setReceiptLayout(receipt);
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (budgetLayout.id) {
        await base44.entities.LayoutSettings.update(budgetLayout.id, budgetLayout);
      } else {
        await base44.entities.LayoutSettings.create({ ...budgetLayout, document_type: "budget" });
      }

      if (receiptLayout.id) {
        await base44.entities.LayoutSettings.update(receiptLayout.id, receiptLayout);
      } else {
        await base44.entities.LayoutSettings.create({ ...receiptLayout, document_type: "receipt" });
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleField = (document, field) => {
    if (document === "budget") {
      setBudgetLayout(prev => ({ ...prev, [field]: !prev[field] }));
    } else {
      setReceiptLayout(prev => ({ ...prev, [field]: !prev[field] }));
    }
  };

  const updateColor = (document, field, value) => {
    if (document === "budget") {
      setBudgetLayout(prev => ({ ...prev, [field]: value }));
    } else {
      setReceiptLayout(prev => ({ ...prev, [field]: value }));
    }
  };

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl("SettingsPage"))}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold text-slate-900">Editor de Layout</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Budget Layout */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Orçamento</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Cor do Tema</label>
              <input
                type="color"
                value={budgetLayout?.theme_color || "#1e293b"}
                onChange={(e) => updateColor("budget", "theme_color", e.target.value)}
                className="mt-2 w-12 h-10 rounded border border-slate-200 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Cor do Texto</label>
              <input
                type="color"
                value={budgetLayout?.text_color || "#1f2937"}
                onChange={(e) => updateColor("budget", "text_color", e.target.value)}
                className="mt-2 w-12 h-10 rounded border border-slate-200 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Fonte</label>
              <select
                value={budgetLayout?.font_family || "sans-serif"}
                onChange={(e) => updateColor("budget", "font_family", e.target.value)}
                className="mt-2 w-full px-3 py-2 rounded border border-slate-200"
              >
                <option value="sans-serif">Sans Serif (Padrão)</option>
                <option value="arial">Arial</option>
                <option value="cambria">Cambria</option>
                <option value="serif">Serif</option>
                <option value="monospace">Monospace</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Tamanho da Letra (px)</label>
              <input
                type="number"
                min="10"
                max="24"
                value={budgetLayout?.font_size || 14}
                onChange={(e) => updateColor("budget", "font_size", parseInt(e.target.value))}
                className="mt-2 w-full px-3 py-2 rounded border border-slate-200"
              />
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Campos Visíveis</h3>
              <div className="space-y-3">
                {[
                  { field: "show_client", label: "Cliente" },
                  { field: "show_job", label: "Job" },
                  { field: "show_producer", label: "Produtor" },
                  { field: "show_phone", label: "Telefone" },
                  { field: "show_email", label: "Email" },
                  { field: "show_address", label: "Endereço" },
                  { field: "show_description", label: "Descrição" },
                  { field: "show_notes", label: "Observações" },
                ].map(({ field, label }) => (
                  <label key={field} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={budgetLayout?.[field] !== false}
                      onChange={() => toggleField("budget", field)}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Receipt Layout */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Recibo</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Cor do Tema</label>
              <input
                type="color"
                value={receiptLayout?.theme_color || "#1e293b"}
                onChange={(e) => updateColor("receipt", "theme_color", e.target.value)}
                className="mt-2 w-12 h-10 rounded border border-slate-200 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Cor do Texto</label>
              <input
                type="color"
                value={receiptLayout?.text_color || "#1f2937"}
                onChange={(e) => updateColor("receipt", "text_color", e.target.value)}
                className="mt-2 w-12 h-10 rounded border border-slate-200 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Fonte</label>
              <select
                value={receiptLayout?.font_family || "sans-serif"}
                onChange={(e) => updateColor("receipt", "font_family", e.target.value)}
                className="mt-2 w-full px-3 py-2 rounded border border-slate-200"
              >
                <option value="sans-serif">Sans Serif (Padrão)</option>
                <option value="arial">Arial</option>
                <option value="cambria">Cambria</option>
                <option value="serif">Serif</option>
                <option value="monospace">Monospace</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Tamanho da Letra (px)</label>
              <input
                type="number"
                min="10"
                max="24"
                value={receiptLayout?.font_size || 14}
                onChange={(e) => updateColor("receipt", "font_size", parseInt(e.target.value))}
                className="mt-2 w-full px-3 py-2 rounded border border-slate-200"
              />
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Campos Visíveis</h3>
              <div className="space-y-3">
                {[
                  { field: "show_client", label: "Cliente" },
                  { field: "show_job", label: "Job" },
                  { field: "show_producer", label: "Produtor" },
                  { field: "show_phone", label: "Telefone" },
                  { field: "show_email", label: "Email" },
                  { field: "show_address", label: "Endereço" },
                  { field: "show_description", label: "Descrição" },
                  { field: "show_notes", label: "Observações" },
                ].map(({ field, label }) => (
                  <label key={field} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={receiptLayout?.[field] !== false}
                      onChange={() => toggleField("receipt", field)}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Styles */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
       <h2 className="text-xl font-semibold text-slate-900 mb-4">Estilos por Seção</h2>
       <p className="text-sm text-slate-600 mb-4">Customize o estilo de cada seção do documento. Clique em uma seção e depois na palavra no documento para aplicar estilos.</p>
       <SectionStylesEditor />
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate(createPageUrl("SettingsPage"))}>
          Cancelar
        </Button>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
}
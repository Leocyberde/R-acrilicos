import { useState, useEffect } from "react";
import { localClient } from "@/api/localClient";
import { Button } from "@/components/ui/button";
import { Save, RotateCcw } from "lucide-react";

const SAMPLE_ORDER = {
  id: "preview000",
  created_date: new Date().toISOString(),
  delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  client_name: "Cliente Exemplo Ltda",
  job: "Comunicação Visual - Fachada",
  producer: "Raimundo",
  items: [
    { name: "Placa ACM 3mm (2x1m)", quantity: 2 },
    { name: "Adesivo Recorte", quantity: 5 },
    { name: "Instalação", quantity: 1 },
  ],
  notes: "Confirmar cor do adesivo antes de iniciar produção.",
};

const DEFAULT_CONFIG = {
  title_text: "Ordem de Serviço",
  title_font_size: 22,
  title_color: "#1a1a1a",
  title_bold: true,
  body_font_family: "Arial, sans-serif",
  body_font_size: 12,
  body_color: "#1a1a1a",
  divider_color: "#1a1a1a",
  divider_thickness: 2,
  table_header_bg: "#ffffff",
  table_header_color: "#1a1a1a",
  table_row_border_color: "#eeeeee",
  table_row_height: 24,
  blank_rows: 10,
  show_signature: true,
  show_delivery_date: true,
  show_elaborado_por: true,
  elaborado_por_text: "",
  show_instructions: false,
  instructions_text: "",
  instructions_text_color: "#1a1a1a",
  instructions_bg: "#fff8f0",
  instructions_border_color: "#aaaaaa",
  show_footer: true,
  footer_line1: "Caso você tenha alguma dúvida entre em contato conosco",
  footer_line2: "AGRADECEMOS SUA PREFERÊNCIA!",
  notes_border_color: "#cccccc",
  notes_bg: "#fefefe",
  page_padding: 14,
  logo_height: 60,
  show_job: true,
  show_producer: true,
  show_client: true,
  show_phone: true,
  show_email: true,
  show_address_company: true,
  table_number_width: 6,
  table_item_width: 76,
  table_quantity_width: 18,
  table_font_family: "Arial, sans-serif",
  table_font_size: 12,
  table_text_color: "#1a1a1a",
  table_row_bg: "#ffffff",
  email_font_family: "Arial, sans-serif",
  email_font_size: 12,
  email_color: "#1a1a1a",
  phone_font_family: "Arial, sans-serif",
  phone_font_size: 12,
  phone_color: "#1a1a1a",
  address_font_family: "Arial, sans-serif",
  address_font_size: 12,
  address_color: "#1a1a1a",
};

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function ColorInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value || "#000000"} onChange={e => onChange(e.target.value)} className="h-8 w-12 rounded border border-slate-200 cursor-pointer p-0.5" />
      <input type="text" value={value || ""} onChange={e => onChange(e.target.value)} className="flex-1 px-2 py-1.5 rounded border border-slate-200 text-xs font-mono" />
    </div>
  );
}

function NumberInput({ value, onChange, min = 1, max = 100 }) {
  return <input type="number" min={min} max={max} value={value || ""} onChange={e => onChange(Number(e.target.value))} className="w-full px-2 py-1.5 rounded border border-slate-200 text-sm" />;
}

function TextInput({ value, onChange, placeholder }) {
  return <input type="text" value={value || ""} placeholder={placeholder} onChange={e => onChange(e.target.value)} className="w-full px-2 py-1.5 rounded border border-slate-200 text-sm" />;
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div onClick={() => onChange(!checked)} className={`relative w-9 h-5 rounded-full transition-colors ${checked ? "bg-indigo-600" : "bg-slate-300"}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

function Section({ title, children }) {
  return (
    <div className="border-b border-slate-100 pb-4 mb-4 last:border-0 last:mb-0 last:pb-0">
      <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <span className="w-1.5 h-4 bg-violet-500 rounded-full inline-block" />
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function WorkOrderPreview({ config, settings }) {
  const order = SAMPLE_ORDER;
  const createdDate = new Date(order.created_date).toLocaleDateString("pt-BR");
  const deliveryDate = new Date(order.delivery_date + "T00:00:00").toLocaleDateString("pt-BR");
  const c = config;

  return (
    <div style={{ fontFamily: c.body_font_family, fontSize: `${c.body_font_size}px`, color: c.body_color, background: "#fff", width: "210mm", height: "297mm", padding: `${c.page_padding}mm`, paddingBottom: "24mm", boxSizing: "border-box", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
        <div>
          {settings?.company_logo ? (
            <img src={settings.company_logo} alt="Logo" style={{ height: `${c.logo_height}px`, marginBottom: "4px" }} />
          ) : (
            <div style={{ fontWeight: "bold", fontSize: "18px", color: "#c00" }}>{settings?.company_name || "GestãoPro"}</div>
          )}
          {c.show_phone !== false && settings?.company_phone && <div style={{ fontFamily: c.phone_font_family, fontSize: `${c.phone_font_size}px`, color: c.phone_color, marginTop: "4px" }}>{settings.company_phone}</div>}
          {c.show_email !== false && settings?.company_email && <div style={{ fontFamily: c.email_font_family, fontSize: `${c.email_font_size}px`, color: c.email_color, marginTop: "4px" }}>{settings.company_email}</div>}
          {c.show_address_company !== false && settings?.company_address && <div style={{ fontFamily: c.address_font_family, fontSize: `${c.address_font_size}px`, color: c.address_color, marginTop: "4px" }}>{settings.company_address}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: `${c.title_font_size}px`, fontWeight: c.title_bold !== false ? "bold" : "normal", color: c.title_color }}>{c.title_text || "Ordem de Serviço"}</div>
          <div style={{ fontSize: "12px", marginTop: "4px" }}>Data: {createdDate}</div>
          {c.show_delivery_date !== false && <div style={{ fontSize: "12px" }}>Entrega: {deliveryDate}</div>}
        </div>
      </div>
      <hr style={{ border: "none", borderTop: `${c.divider_thickness}px solid ${c.divider_color}`, margin: "8px 0" }} />
      <div style={{ marginBottom: "12px", lineHeight: "1.8" }}>
        {c.show_job !== false && <div><strong>JOB:</strong> {order.job}</div>}
        {c.show_producer !== false && <div><strong>Produtor:</strong> {order.producer}</div>}
        {c.show_client !== false && <div><strong>Cliente:</strong> {order.client_name}</div>}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: c.table_font_family, fontSize: `${c.table_font_size || 12}px` }}>
        <thead>
          <tr style={{ borderTop: "1px solid #333", background: c.table_header_bg }}>
            <th style={{ textAlign: "left", padding: "5px 4px", fontWeight: "bold", fontSize: "12px", color: c.table_header_color, width: `${c.table_number_width ?? 6}%` }}>#</th>
            <th style={{ textAlign: "left", padding: "5px 4px", fontWeight: "bold", fontSize: "12px", color: c.table_header_color, width: `${c.table_item_width ?? 76}%` }}>Item / Produto / Serviço</th>
            <th style={{ textAlign: "center", padding: "5px 4px", fontWeight: "bold", fontSize: "12px", color: c.table_header_color, width: `${c.table_quantity_width ?? 18}%` }}>Quantidade</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colSpan={3} style={{ height: "8px" }} /></tr>
          {order.items.map((item, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${c.table_row_border_color}`, height: `${c.table_row_height || 24}px`, background: c.table_row_bg }}>
              <td style={{ padding: "2px 4px", color: c.table_text_color }}>{i + 1}</td>
              <td style={{ padding: "2px 4px", wordBreak: "break-word", color: c.table_text_color }}>{item.name}</td>
              <td style={{ padding: "2px 4px", textAlign: "center", color: c.table_text_color }}>{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {c.show_instructions !== false && c.instructions_text && (
        <div style={{ marginTop: "14px", padding: "8px 12px", border: `1px solid ${c.instructions_border_color}`, borderRadius: "4px", background: c.instructions_bg, fontSize: "11px", lineHeight: "1.7", whiteSpace: "pre-wrap", fontWeight: "bold", color: c.instructions_text_color }}>{c.instructions_text}</div>
      )}
      {c.show_elaborado_por !== false && (
        <div style={{ textAlign: "right", fontStyle: "italic", fontSize: "11px", marginTop: "6px", color: "#555" }}>Elaborado por: {c.elaborado_por_text || order.producer}</div>
      )}
      <div style={{ marginTop: "14px", padding: "10px 12px", border: `1px solid ${c.notes_border_color}`, borderRadius: "4px", background: c.notes_bg, fontSize: "11px", lineHeight: "1.7" }}><strong>Observações:</strong> {order.notes}</div>
      {c.show_signature !== false && (
        <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-around" }}>
          <div style={{ textAlign: "center" }}><div style={{ width: "160px", borderTop: "1px solid #555", paddingTop: "6px", fontSize: "11px", color: "#555" }}>Assinatura do Cliente</div></div>
          <div style={{ textAlign: "center" }}><div style={{ width: "160px", borderTop: "1px solid #555", paddingTop: "6px", fontSize: "11px", color: "#555" }}>Assinatura do Responsável</div></div>
        </div>
      )}
      {c.show_footer !== false && (
        <div style={{ position: "absolute", bottom: `${c.page_padding}mm`, left: `${c.page_padding}mm`, right: `${c.page_padding}mm`, textAlign: "center", borderTop: "1px solid #ccc", paddingTop: "10px", fontSize: "12px", lineHeight: "1.8", color: "#333" }}>
          <div>{c.footer_line1}</div>
          <div style={{ fontWeight: "bold", fontSize: "14px" }}>{c.footer_line2}</div>
        </div>
      )}
    </div>
  );
}

export default function WorkOrderLayoutEditor() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [configId, setConfigId] = useState(null);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const [configs, settingsList] = await Promise.all([
        localClient.entities.WorkOrderLayoutConfig.list(),
        localClient.entities.Settings.list(),
      ]);
      if (configs.length > 0) {
        const { id, created_date, updated_date, ...rest } = configs[0];
        setConfig({ ...DEFAULT_CONFIG, ...rest });
        setConfigId(id);
      }
      if (settingsList.length > 0) setSettings(settingsList[0]);
    }
    load();
  }, []);

  const set = (key, val) => setConfig(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (configId) {
        await localClient.entities.WorkOrderLayoutConfig.update(configId, config);
      } else {
        const created = await localClient.entities.WorkOrderLayoutConfig.create(config);
        setConfigId(created.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => setConfig(DEFAULT_CONFIG);

  const fontOptions = [
    { value: "Arial, sans-serif", label: "Arial" },
    { value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", label: "System" },
    { value: "'Times New Roman', serif", label: "Times New Roman" },
    { value: "Georgia, serif", label: "Georgia" },
    { value: "'Courier New', monospace", label: "Courier New" },
    { value: "Verdana, sans-serif", label: "Verdana" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Editor de Layout — Ordem de Serviço</h1>
          <p className="text-slate-500 text-sm mt-0.5">Edite o layout e veja o preview ao vivo à direita</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}><RotateCcw className="h-4 w-4 mr-1.5" /> Restaurar Padrão</Button>
          <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1.5" />{saved ? "Salvo!" : saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        <div className="w-80 flex-shrink-0 bg-white rounded-xl border border-slate-200 p-5 space-y-0 overflow-y-auto max-h-[85vh] sticky top-4">

          <Section title="Título do Documento">
            <Field label="Texto do Título"><TextInput value={config.title_text} onChange={v => set("title_text", v)} /></Field>
            <Field label="Tamanho (px)"><NumberInput value={config.title_font_size} onChange={v => set("title_font_size", v)} min={14} max={48} /></Field>
            <Field label="Cor"><ColorInput value={config.title_color} onChange={v => set("title_color", v)} /></Field>
            <Toggle checked={config.title_bold !== false} onChange={v => set("title_bold", v)} label="Negrito" />
          </Section>

          <Section title="Corpo do Documento">
            <Field label="Fonte">
              <select value={config.body_font_family} onChange={e => set("body_font_family", e.target.value)} className="w-full px-2 py-1.5 rounded border border-slate-200 text-sm">
                {fontOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Tamanho da Letra (px)"><NumberInput value={config.body_font_size} onChange={v => set("body_font_size", v)} min={8} max={20} /></Field>
            <Field label="Cor do Texto"><ColorInput value={config.body_color} onChange={v => set("body_color", v)} /></Field>
            <Field label="Margem da Página (mm)"><NumberInput value={config.page_padding} onChange={v => set("page_padding", v)} min={5} max={30} /></Field>
            <Field label="Altura da Logo (px)"><NumberInput value={config.logo_height} onChange={v => set("logo_height", v)} min={20} max={120} /></Field>
          </Section>

          <Section title="Linha Divisória">
            <Field label="Cor"><ColorInput value={config.divider_color} onChange={v => set("divider_color", v)} /></Field>
            <Field label="Espessura (px)"><NumberInput value={config.divider_thickness} onChange={v => set("divider_thickness", v)} min={1} max={6} /></Field>
          </Section>

          <Section title="Campos Visíveis">
            <Toggle checked={config.show_job !== false} onChange={v => set("show_job", v)} label="JOB" />
            <Toggle checked={config.show_producer !== false} onChange={v => set("show_producer", v)} label="Produtor" />
            <Toggle checked={config.show_client !== false} onChange={v => set("show_client", v)} label="Cliente" />
            <Toggle checked={config.show_delivery_date !== false} onChange={v => set("show_delivery_date", v)} label="Data de Entrega" />
            <Toggle checked={config.show_phone !== false} onChange={v => set("show_phone", v)} label="Telefone da Empresa" />
            <Toggle checked={config.show_email !== false} onChange={v => set("show_email", v)} label="Email da Empresa" />
            <Toggle checked={config.show_address_company !== false} onChange={v => set("show_address_company", v)} label="Endereço da Empresa" />
          </Section>

          <Section title="Tabela de Itens">
            <Field label="Fonte da Tabela">
              <select value={config.table_font_family || "Arial, sans-serif"} onChange={e => set("table_font_family", e.target.value)} className="w-full px-2 py-1.5 rounded border border-slate-200 text-sm">
                {fontOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Tamanho da Fonte (px)"><NumberInput value={config.table_font_size ?? 12} onChange={v => set("table_font_size", v)} min={8} max={16} /></Field>
            <Field label="Fundo do Cabeçalho"><ColorInput value={config.table_header_bg} onChange={v => set("table_header_bg", v)} /></Field>
            <Field label="Cor do Cabeçalho"><ColorInput value={config.table_header_color} onChange={v => set("table_header_color", v)} /></Field>
            <Field label="Cor das Linhas"><ColorInput value={config.table_row_border_color} onChange={v => set("table_row_border_color", v)} /></Field>
            <Field label="Cor do Texto"><ColorInput value={config.table_text_color || "#1a1a1a"} onChange={v => set("table_text_color", v)} /></Field>
            <Field label="Fundo das Linhas"><ColorInput value={config.table_row_bg || "#ffffff"} onChange={v => set("table_row_bg", v)} /></Field>
            <Field label="Altura das Linhas (px)"><NumberInput value={config.table_row_height ?? 24} onChange={v => set("table_row_height", v)} min={16} max={60} /></Field>
            <Field label="Mínimo de Linhas"><NumberInput value={config.blank_rows ?? 10} onChange={v => set("blank_rows", v)} min={5} max={50} /></Field>
            <Field label="Largura Coluna # (%)"><NumberInput value={config.table_number_width ?? 6} onChange={v => set("table_number_width", v)} min={3} max={15} /></Field>
            <Field label="Largura Coluna Item (%)"><NumberInput value={config.table_item_width ?? 76} onChange={v => set("table_item_width", v)} min={50} max={90} /></Field>
            <Field label="Largura Coluna Quantidade (%)"><NumberInput value={config.table_quantity_width ?? 18} onChange={v => set("table_quantity_width", v)} min={10} max={30} /></Field>
          </Section>

          <Section title="Instruções">
            <Toggle checked={config.show_instructions !== false} onChange={v => set("show_instructions", v)} label="Mostrar Instruções" />
            {config.show_instructions !== false && (
              <>
                <Field label="Texto das Instruções">
                  <textarea value={config.instructions_text || ""} onChange={e => set("instructions_text", e.target.value)} rows={4} className="w-full px-2 py-1.5 rounded border border-slate-200 text-sm resize-y" />
                </Field>
                <Field label="Cor do Texto"><ColorInput value={config.instructions_text_color} onChange={v => set("instructions_text_color", v)} /></Field>
                <Field label="Cor do Fundo"><ColorInput value={config.instructions_bg} onChange={v => set("instructions_bg", v)} /></Field>
                <Field label="Cor da Borda"><ColorInput value={config.instructions_border_color} onChange={v => set("instructions_border_color", v)} /></Field>
              </>
            )}
          </Section>

          <Section title="Elaborado Por">
            <Toggle checked={config.show_elaborado_por !== false} onChange={v => set("show_elaborado_por", v)} label="Mostrar 'Elaborado por'" />
            {config.show_elaborado_por !== false && (
              <Field label="Texto fixo (deixe vazio para usar o Produtor)">
                <TextInput value={config.elaborado_por_text} onChange={v => set("elaborado_por_text", v)} placeholder="Gleissa" />
              </Field>
            )}
          </Section>

          <Section title="Assinatura">
            <Toggle checked={config.show_signature !== false} onChange={v => set("show_signature", v)} label="Mostrar linha de assinatura" />
          </Section>

          <Section title="Observações">
            <Field label="Cor da Borda"><ColorInput value={config.notes_border_color} onChange={v => set("notes_border_color", v)} /></Field>
            <Field label="Cor do Fundo"><ColorInput value={config.notes_bg} onChange={v => set("notes_bg", v)} /></Field>
          </Section>

          <Section title="Rodapé">
            <Toggle checked={config.show_footer !== false} onChange={v => set("show_footer", v)} label="Mostrar Rodapé" />
            {config.show_footer !== false && (
              <>
                <Field label="Linha 1"><TextInput value={config.footer_line1} onChange={v => set("footer_line1", v)} /></Field>
                <Field label="Linha 2 (destaque)"><TextInput value={config.footer_line2} onChange={v => set("footer_line2", v)} /></Field>
              </>
            )}
          </Section>
        </div>

        <div className="flex-1 overflow-auto">
          <div style={{ transform: "scale(0.7)", transformOrigin: "top left", width: "calc(100% / 0.7)" }}>
            <WorkOrderPreview config={config} settings={settings} />
          </div>
        </div>
      </div>
    </div>
  );
}

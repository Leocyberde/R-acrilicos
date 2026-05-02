import { useState, useEffect } from "react";
import { localClient } from "@/api/localClient";
import { Button } from "@/components/ui/button";
import { Save, RotateCcw } from "lucide-react";

const SAMPLE_RECEIPT = {
  id: "preview000",
  created_date: new Date().toISOString(),
  emission_date: new Date().toISOString().split("T")[0],
  client_name: "Cliente Exemplo Ltda",
  job: "Comunicação Visual - Fachada",
  producer: "Raimundo",
  items: [
    { name: "Placa ACM 3mm (2x1m)", quantity: 2, unit_price: 350 },
    { name: "Adesivo Recorte", quantity: 5, unit_price: 80 },
    { name: "Instalação", quantity: 1, unit_price: 200 },
  ],
  subtotal: 1100,
  discount: 0,
  total_amount: 1100,
  total_label: "SEM NOTA",
  apply_margin: true,
  margin_percentage: 15,
  total_with_margin: 1265,
  total_with_margin_label: "COM NOTA",
  notes: "Exemplo de observação do recibo.",
};

const DEFAULT_CONFIG = {
  title_text: "Recibo",
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
  table_value_color: "#1565c0",
  table_item_width: 55,
  table_quantity_width: 8,
  table_unit_price_width: 18,
  table_subtotal_width: 19,
  blank_rows: 10,
  totals_bg: "#f9f9f9",
  totals_value_color: "#cc0000",
  totals_border_color: "#333333",
  totals_border_thickness: 2,
  totals_label_sem_nota: "SEM NOTA",
  totals_label_com_nota: "COM NOTA",
  show_elaborado_por: true,
  elaborado_por_text: "",
  show_instructions: false,
  instructions_text: "",
  instructions_text_color: "#1a1a1a",
  instructions_bg: "#fff8f0",
  instructions_border_color: "#aaaaaa",
  instructions_qrcode_url: "",
  instructions_qrcode_size: 80,
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
        <span className="w-1.5 h-4 bg-emerald-500 rounded-full inline-block" />
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ReceiptPreview({ config, settings }) {
  const fmt = (v) => (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const receipt = SAMPLE_RECEIPT;
  const emissionDate = new Date(receipt.emission_date + "T00:00:00").toLocaleDateString("pt-BR");
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
          <div style={{ fontSize: `${c.title_font_size}px`, fontWeight: c.title_bold !== false ? "bold" : "normal", color: c.title_color }}>{c.title_text || "Recibo"}</div>
          <div style={{ fontSize: "12px", marginTop: "4px" }}>Data: {emissionDate}</div>
        </div>
      </div>
      <hr style={{ border: "none", borderTop: `${c.divider_thickness}px solid ${c.divider_color}`, margin: "8px 0" }} />
      <div style={{ marginBottom: "12px", lineHeight: "1.8" }}>
        {c.show_job !== false && <div><strong>JOB:</strong> {receipt.job}</div>}
        {c.show_producer !== false && <div><strong>Produtor:</strong> {receipt.producer}</div>}
        {c.show_client !== false && <div><strong>Cliente:</strong> {receipt.client_name}</div>}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderTop: "1px solid #333", background: c.table_header_bg }}>
            <th style={{ textAlign: "left", padding: "5px 4px", fontWeight: "bold", fontSize: "12px", color: c.table_header_color, width: `${c.table_item_width ?? 55}%` }}>Item</th>
            <th style={{ textAlign: "center", padding: "5px 4px", fontWeight: "bold", fontSize: "12px", color: c.table_header_color, width: `${c.table_quantity_width ?? 8}%` }}>Qtd</th>
            <th style={{ textAlign: "right", padding: "5px 4px", fontWeight: "bold", fontSize: "12px", color: c.table_header_color, width: `${c.table_unit_price_width ?? 18}%` }}>V.Unitário</th>
            <th style={{ textAlign: "right", padding: "5px 4px", fontWeight: "bold", fontSize: "12px", color: c.table_header_color, width: `${c.table_subtotal_width ?? 19}%` }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colSpan={4} style={{ height: "8px" }} /></tr>
          {receipt.items.map((item, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${c.table_row_border_color}`, height: `${c.table_row_height || 24}px` }}>
              <td style={{ padding: "2px 6px", wordBreak: "break-word" }}>{item.name}</td>
              <td style={{ padding: "2px 6px", textAlign: "center" }}>{item.quantity}</td>
              <td style={{ padding: "2px 6px", textAlign: "right", color: c.table_value_color }}>R$ {fmt(item.unit_price)}</td>
              <td style={{ padding: "2px 6px", textAlign: "right", color: c.table_value_color }}>R$ {fmt(item.quantity * item.unit_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr style={{ borderTop: `${c.totals_border_thickness || 2}px solid ${c.totals_border_color || "#333"}`, borderBottom: `1px solid ${c.totals_border_color || "#aaa"}`, background: c.totals_bg }}>
            <td style={{ padding: "6px", fontWeight: "bold", width: "50%" }} /><td style={{ width: "10%" }} />
            <td style={{ padding: "6px", fontWeight: "bold", textAlign: "right", width: "20%" }}>{c.totals_label_sem_nota || "SEM NOTA"}</td>
            <td style={{ padding: "6px", fontWeight: "bold", textAlign: "right", width: "20%", color: c.totals_value_color }}>R${fmt(receipt.total_amount)}</td>
          </tr>
          <tr style={{ borderBottom: `${c.totals_border_thickness || 2}px solid ${c.totals_border_color || "#333"}`, background: c.totals_bg }}>
            <td style={{ padding: "6px", fontWeight: "bold" }} /><td />
            <td style={{ padding: "6px", fontWeight: "bold", textAlign: "right" }}>{c.totals_label_com_nota || "COM NOTA"}</td>
            <td style={{ padding: "6px", fontWeight: "bold", textAlign: "right", color: c.totals_value_color }}>R${fmt(receipt.total_with_margin)}</td>
          </tr>
        </tbody>
      </table>
      {c.show_instructions !== false && (c.instructions_text || c.instructions_qrcode_url) && (
        <div style={{ marginTop: "14px", padding: "8px 12px", border: `1px solid ${c.instructions_border_color}`, borderRadius: "4px", background: c.instructions_bg, fontSize: "11px", lineHeight: "1.7", display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ flex: 1, whiteSpace: "pre-wrap", fontWeight: "bold", color: c.instructions_text_color }}>{c.instructions_text}</div>
          {c.instructions_qrcode_url && <img src={c.instructions_qrcode_url} alt="QR Code" style={{ width: `${c.instructions_qrcode_size || 80}px`, height: `${c.instructions_qrcode_size || 80}px`, objectFit: "contain", flexShrink: 0 }} />}
        </div>
      )}
      {c.show_elaborado_por !== false && (
        <div style={{ textAlign: "right", fontStyle: "italic", fontSize: "11px", marginTop: "6px", color: "#555" }}>Elaborado por: {c.elaborado_por_text || receipt.producer}</div>
      )}
      <div style={{ marginTop: "18px", padding: "10px 12px", border: `1px solid ${c.notes_border_color}`, borderRadius: "4px", background: c.notes_bg, fontSize: "11px", lineHeight: "1.7" }}>{receipt.notes}</div>
      {c.show_footer !== false && (
        <div style={{ position: "absolute", bottom: `${c.page_padding}mm`, left: `${c.page_padding}mm`, right: `${c.page_padding}mm`, textAlign: "center", borderTop: "1px solid #ccc", paddingTop: "10px", fontSize: "12px", lineHeight: "1.8", color: "#333" }}>
          <div>{c.footer_line1}</div>
          <div style={{ fontWeight: "bold", fontSize: "14px" }}>{c.footer_line2}</div>
        </div>
      )}
    </div>
  );
}

export default function ReceiptLayoutEditor() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [configId, setConfigId] = useState(null);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const [configs, settingsList] = await Promise.all([
        localClient.entities.ReceiptLayoutConfig.list(),
        localClient.entities.Settings.list(),
      ]);
      if (configs.length > 0) {
        setConfig({ ...DEFAULT_CONFIG, ...(configs[0].config_data || {}) });
        setConfigId(configs[0].id);
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
        await localClient.entities.ReceiptLayoutConfig.update(configId, { config_data: config });
      } else {
        const created = await localClient.entities.ReceiptLayoutConfig.create({ config_data: config });
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
          <h1 className="text-2xl font-bold text-slate-900">Editor de Layout — Recibo</h1>
          <p className="text-slate-500 text-sm mt-0.5">Edite o layout e veja o preview ao vivo à direita</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}><RotateCcw className="h-4 w-4 mr-1.5" /> Restaurar Padrão</Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={saving}>
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
            <Toggle checked={config.show_phone !== false} onChange={v => set("show_phone", v)} label="Telefone da Empresa" />
            <Toggle checked={config.show_email !== false} onChange={v => set("show_email", v)} label="Email da Empresa" />
            <Toggle checked={config.show_address_company !== false} onChange={v => set("show_address_company", v)} label="Endereço da Empresa" />
          </Section>

          <Section title="Tabela de Itens">
            <Field label="Fundo do Cabeçalho"><ColorInput value={config.table_header_bg} onChange={v => set("table_header_bg", v)} /></Field>
            <Field label="Cor do Cabeçalho"><ColorInput value={config.table_header_color} onChange={v => set("table_header_color", v)} /></Field>
            <Field label="Cor das Linhas"><ColorInput value={config.table_row_border_color} onChange={v => set("table_row_border_color", v)} /></Field>
            <Field label="Altura das Linhas (px)"><NumberInput value={config.table_row_height ?? 24} onChange={v => set("table_row_height", v)} min={16} max={60} /></Field>
            <Field label="Mínimo de Linhas"><NumberInput value={config.blank_rows ?? 10} onChange={v => set("blank_rows", v)} min={5} max={50} /></Field>
            <Field label="Cor dos Valores (R$)"><ColorInput value={config.table_value_color} onChange={v => set("table_value_color", v)} /></Field>
            <Field label="Largura Coluna Item (%)"><NumberInput value={config.table_item_width ?? 55} onChange={v => set("table_item_width", v)} min={10} max={80} /></Field>
            <Field label="Largura Coluna Qtd (%)"><NumberInput value={config.table_quantity_width ?? 8} onChange={v => set("table_quantity_width", v)} min={5} max={20} /></Field>
            <Field label="Largura Coluna V. Unitário (%)"><NumberInput value={config.table_unit_price_width ?? 18} onChange={v => set("table_unit_price_width", v)} min={10} max={30} /></Field>
            <Field label="Largura Coluna Subtotal (%)"><NumberInput value={config.table_subtotal_width ?? 19} onChange={v => set("table_subtotal_width", v)} min={10} max={30} /></Field>
          </Section>

          <Section title="Totais">
            <Field label="Fundo dos Totais"><ColorInput value={config.totals_bg} onChange={v => set("totals_bg", v)} /></Field>
            <Field label="Cor dos Valores Totais"><ColorInput value={config.totals_value_color} onChange={v => set("totals_value_color", v)} /></Field>
            <Field label="Cor da Linha dos Totais"><ColorInput value={config.totals_border_color} onChange={v => set("totals_border_color", v)} /></Field>
            <Field label="Espessura da Linha (px)"><NumberInput value={config.totals_border_thickness} onChange={v => set("totals_border_thickness", v)} min={1} max={6} /></Field>
            <Field label="Rótulo 'Sem Nota'"><TextInput value={config.totals_label_sem_nota} onChange={v => set("totals_label_sem_nota", v)} /></Field>
            <Field label="Rótulo 'Com Nota'"><TextInput value={config.totals_label_com_nota} onChange={v => set("totals_label_com_nota", v)} /></Field>
          </Section>

          <Section title="Instruções / PIX">
            <Toggle checked={config.show_instructions !== false} onChange={v => set("show_instructions", v)} label="Mostrar Instruções" />
            {config.show_instructions !== false && (
              <>
                <Field label="Texto das Instruções">
                  <textarea value={config.instructions_text || ""} onChange={e => set("instructions_text", e.target.value)} rows={4} className="w-full px-2 py-1.5 rounded border border-slate-200 text-sm resize-y" />
                </Field>
                <Field label="Cor do Texto"><ColorInput value={config.instructions_text_color} onChange={v => set("instructions_text_color", v)} /></Field>
                <Field label="Cor do Fundo"><ColorInput value={config.instructions_bg} onChange={v => set("instructions_bg", v)} /></Field>
                <Field label="Cor da Borda"><ColorInput value={config.instructions_border_color} onChange={v => set("instructions_border_color", v)} /></Field>
                <Field label="URL do QR Code PIX"><TextInput value={config.instructions_qrcode_url} onChange={v => set("instructions_qrcode_url", v)} placeholder="https://..." /></Field>
                <Field label="Tamanho do QR Code (px)"><NumberInput value={config.instructions_qrcode_size ?? 80} onChange={v => set("instructions_qrcode_size", v)} min={40} max={200} /></Field>
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
            <ReceiptPreview config={config} settings={settings} />
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { localClient } from "@/api/localClient";
import { BUDGET_LAYOUT_DEFAULTS } from "@/utils/defaultLayoutConfig";

// FIX #4 — Cache de sessão para settings e configs de layout.
// Evita que cada componente faça queries separadas ao banco toda vez que é montado.
const _settingsCache = { data: null, at: 0 };
const _configCache   = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function loadSettings() {
  if (_settingsCache.data && Date.now() - _settingsCache.at < CACHE_TTL) {
    return _settingsCache.data;
  }
  const list = await localClient.entities.Settings.list();
  _settingsCache.data = list[0] || null;
  _settingsCache.at   = Date.now();
  return _settingsCache.data;
}

async function loadLayoutConfig(entityName) {
  const cached = _configCache[entityName];
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.data;
  const list = await localClient.entities[entityName].list();
  _configCache[entityName] = { data: list[0]?.config_data || null, at: Date.now() };
  return _configCache[entityName].data;
}



export default function BudgetPrintLayoutMultiPage({ budget, onReady }) {
  const [settings, setSettings] = useState(null);
  const [config, setConfig] = useState(BUDGET_LAYOUT_DEFAULTS);
  const [pages, setPages] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      // FIX #4 — usa cache de sessão para evitar queries repetidas ao banco
      const [settingsData, configData] = await Promise.all([
        loadSettings(),
        loadLayoutConfig('BudgetLayoutConfig'),
      ]);
      if (settingsData) setSettings(settingsData);
      if (configData) {
        setConfig({ ...BUDGET_LAYOUT_DEFAULTS, ...configData });
      }
      setDataLoaded(true);
    }
    load();
  }, []);

  useEffect(() => {
    if (!config || !budget) return;

    const itemsPerPage = 30;
    const items = budget.items || [];
    const itemChunks = [];

    if (items.length === 0) {
      setPages([[]]);
      return;
    }

    let idx = 0;
    while (idx < items.length) {
      itemChunks.push(items.slice(idx, idx + itemsPerPage));
      idx += itemsPerPage;
    }

    setPages(itemChunks);
  }, [config, budget]);

  useEffect(() => {
    if (dataLoaded && pages.length > 0 && onReady) {
      onReady();
    }
  }, [dataLoaded, pages]);

  const fmt = (v) =>
    (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      // Tenta extrair apenas a parte da data YYYY-MM-DD
      const cleanDate = String(dateStr).split("T")[0];
      const parts = cleanDate.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? "" : date.toLocaleDateString("pt-BR");
    } catch (e) {
      return "";
    }
  };

  const emissionDate = formatDate(budget?.emission_date) || formatDate(budget?.created_date);

  const c = config;

  if (!settings || !config) return <div>Carregando...</div>;

  const BudgetPage = ({ items, pageNum, pageIdx, isFirstPage }) => (
    <div
      style={{
        fontFamily: c.body_font_family,
        fontSize: `${c.body_font_size}px`,
        color: c.body_color,
        background: "#fff",
        width: "210mm",
        minHeight: "297mm",
        padding: `${c.page_padding}mm`,
        paddingBottom: "24mm",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {isFirstPage && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
            <div>
              {settings?.company_logo ? (
                <img src={settings.company_logo} alt="Logo" style={{ height: `${c.logo_height}px`, marginBottom: "4px" }} />
              ) : (
                <div style={{ fontWeight: "bold", fontSize: "18px", color: "#c00" }}>{settings?.company_name || "GestãoPro"}</div>
              )}
              {c.show_phone !== false && settings?.company_phone && (
                <div style={{ fontSize: `${c.phone_font_size || 11}px`, fontFamily: c.phone_font_family, color: c.phone_color, marginTop: "4px" }}>{settings.company_phone}</div>
              )}
              {c.show_email !== false && settings?.company_email && (
                <div style={{ fontSize: "11px", color: "#1565c0", marginTop: "4px" }}>{settings.company_email}</div>
              )}
              {c.show_address_company !== false && settings?.company_address && (
                <div style={{ fontSize: "10px", marginTop: "4px" }}>{settings.company_address}</div>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{
                fontSize: `${c.title_font_size}px`,
                fontWeight: c.title_bold !== false ? "bold" : "normal",
                color: c.title_color,
              }}>
                {c.title_text || "Orçamento"}
              </div>
              <div style={{ fontSize: "12px", marginTop: "4px" }}>Data: {emissionDate}</div>
              {budget.validity_date && <div style={{ fontSize: "12px", marginTop: "2px" }}>Validade: {formatDate(budget.validity_date)}</div>}
              <div style={{ fontSize: "12px", marginTop: "4px", fontWeight: "bold" }}>Nº {String(budget.id || "")}</div>
            </div>
          </div>

          <hr style={{ border: "none", borderTop: `${c.divider_thickness}px solid ${c.divider_color}`, margin: "8px 0" }} />

          <div style={{ marginBottom: "12px", display: "flex", gap: "32px", lineHeight: "1.8" }}>
            <div>
              {c.show_job !== false && <div>JOB:</div>}
              {c.show_producer !== false && <div>Produtor:</div>}
              {c.show_client !== false && <div>Cliente:</div>}
            </div>
            <div>
              {c.show_job !== false && <div><strong>{(budget.job || "").toUpperCase()}</strong></div>}
              {c.show_producer !== false && <div><strong>{(budget.producer || "").toUpperCase()}</strong></div>}
              {c.show_client !== false && <div><strong>{(budget.client_name || "").toUpperCase()}</strong></div>}
            </div>
          </div>
        </>
      )}

      {!isFirstPage && (
        <div style={{ fontSize: "11px", color: "#999", marginBottom: "8px", textAlign: "right" }}>
          (continuação) Página {pageNum}
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: `${c.table_item_width ?? 55}%` }} />
          <col style={{ width: `${c.table_quantity_width ?? 8}%` }} />
          <col style={{ width: `${c.table_unit_price_width ?? 18}%` }} />
          <col style={{ width: `${c.table_subtotal_width ?? 19}%` }} />
        </colgroup>
        <thead>
          <tr style={{ borderTop: `2px solid ${c.divider_color || "#333"}`, borderBottom: `1px solid ${c.divider_color || "#333"}`, background: c.table_header_bg }}>
            <th style={{ textAlign: "left", padding: "6px 4px", fontWeight: "bold", fontSize: `${c.body_font_size ?? 12}px`, color: c.table_header_color, verticalAlign: "middle", lineHeight: "1.2" }}>Item</th>
            <th style={{ textAlign: "center", padding: "6px 4px", fontWeight: "bold", fontSize: `${c.body_font_size ?? 12}px`, color: c.table_header_color, verticalAlign: "middle", lineHeight: "1.2" }}>Qtd</th>
            <th style={{ textAlign: "right", padding: "6px 4px", fontWeight: "bold", fontSize: `${c.body_font_size ?? 12}px`, color: c.table_header_color, verticalAlign: "middle", lineHeight: "1.2" }}>V.Unitário</th>
            <th style={{ textAlign: "right", padding: "6px 4px", fontWeight: "bold", fontSize: `${c.body_font_size ?? 12}px`, color: c.table_header_color, verticalAlign: "middle", lineHeight: "1.2" }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${c.table_row_border_color}`, height: `${c.table_row_height ?? 24}px` }}>
              <td style={{ padding: "4px 4px", fontSize: `${c.body_font_size ?? 12}px`, wordBreak: "break-word", verticalAlign: "middle", textTransform: "uppercase", lineHeight: "1.3" }}>{item.name}</td>
              <td style={{ padding: "4px 4px", fontSize: `${c.body_font_size ?? 12}px`, textAlign: "center", verticalAlign: "middle", lineHeight: "1.3" }}>{item.quantity}</td>
              <td style={{ padding: "4px 4px", fontSize: `${c.body_font_size ?? 12}px`, textAlign: "right", color: c.table_value_color, verticalAlign: "middle", lineHeight: "1.3", whiteSpace: "nowrap" }}>R$ {fmt(item.unit_price)}</td>
              <td style={{ padding: "4px 4px", fontSize: `${c.body_font_size ?? 12}px`, textAlign: "right", color: c.table_value_color, verticalAlign: "middle", lineHeight: "1.3", whiteSpace: "nowrap" }}>
                R$ {fmt((item.quantity || 0) * (item.unit_price || 0))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {pages.length > 0 && pageIdx === pages.length - 1 && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr style={{ borderTop: `${c.totals_border_thickness || 2}px solid ${c.totals_border_color || "#333"}`, borderBottom: `1px solid ${c.totals_border_color || "#aaa"}`, background: c.totals_bg }}>
                <td style={{ padding: "6px", fontWeight: "bold", width: "50%" }} />
                <td style={{ width: "10%" }} />
                <td style={{ padding: "6px", fontWeight: "bold", textAlign: "right", width: "20%" }}>
                  {budget.total_label || c.totals_label_sem_nota || "SEM NOTA"}
                </td>
                <td style={{ padding: "6px", fontWeight: "bold", textAlign: "right", width: "20%", color: c.totals_value_color }}>
                  R${fmt(budget.total)}
                </td>
              </tr>
              {budget.total_with_margin > 0 && (
                <tr style={{ borderBottom: `${c.totals_border_thickness || 2}px solid ${c.totals_border_color || "#333"}`, background: c.totals_bg }}>
                  <td style={{ padding: "6px", fontWeight: "bold" }} />
                  <td />
                  <td style={{ padding: "6px", fontWeight: "bold", textAlign: "right" }}>
                    {budget.total_with_margin_label || c.totals_label_com_nota || "COM NOTA"}
                  </td>
                  <td style={{ padding: "6px", fontWeight: "bold", textAlign: "right", color: c.totals_value_color }}>
                    R${fmt(budget.total_with_margin)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {c.show_instructions !== false && c.instructions_text && (
            <div style={{
              marginTop: "14px", padding: "8px 12px",
              border: `1px solid ${c.instructions_border_color || "#aaa"}`, borderRadius: "4px",
              background: c.instructions_bg || "#fff8f0", fontSize: "11px",
              lineHeight: "1.7", whiteSpace: "pre-wrap", fontWeight: "bold",
              color: c.instructions_text_color || "#1a1a1a",
            }}>
              {c.instructions_text}
            </div>
          )}

          {c.show_elaborado_por !== false && (c.elaborado_por_text || budget.producer) && (
            <div style={{ textAlign: "right", fontStyle: "italic", fontSize: "11px", marginTop: "6px", color: "#555" }}>
              Elaborado por: {c.elaborado_por_text || budget.producer}
            </div>
          )}

          {(budget.description || budget.notes) && (
            <div style={{
              marginTop: "18px", padding: "10px 12px",
              border: `1px solid ${c.notes_border_color}`,
              borderRadius: "4px", background: c.notes_bg,
              fontSize: "11px", lineHeight: "1.7", whiteSpace: "pre-wrap",
            }}>
              {budget.description && (
                <div style={{ marginBottom: budget.notes ? "8px" : "0" }}>
                  <strong>Descrição:</strong> {budget.description}
                </div>
              )}
              {budget.notes && (
                <div><strong>Observações:</strong> {budget.notes}</div>
              )}
            </div>
          )}
        </>
      )}

      {c.show_footer !== false && (
        <div style={{
          position: "absolute",
          bottom: `${c.page_padding}mm`,
          left: `${c.page_padding}mm`,
          right: `${c.page_padding}mm`,
          textAlign: "center",
          borderTop: "1px solid #ccc",
          paddingTop: "10px",
          fontSize: "12px",
          lineHeight: "1.8",
          color: "#333",
        }}>
          <div>{c.footer_line1}</div>
          <div style={{ fontWeight: "bold", fontSize: "14px" }}>{c.footer_line2}</div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .pages-container {
            display: block !important;
            gap: 0 !important;
          }
          .budget-page {
            page-break-after: always;
            break-after: page;
          }
          .budget-page:last-child {
            page-break-after: avoid;
            break-after: auto;
          }
        }
      `}</style>
      <div className="pages-container" style={{ display: "block" }}>
        {pages.map((itemsInPage, idx) => (
          <div key={idx} className="budget-page">
            <BudgetPage items={itemsInPage} pageNum={idx + 1} pageIdx={idx} isFirstPage={idx === 0} />
          </div>
        ))}
      </div>
    </div>
  );
}

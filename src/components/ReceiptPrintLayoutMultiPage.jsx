import { useState, useEffect } from "react";
import { localClient } from "@/api/localClient";
import { RECEIPT_LAYOUT_DEFAULTS } from "@/utils/defaultLayoutConfig";

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



export default function ReceiptPrintLayoutMultiPage({ receipt }) {
  const [settings, setSettings] = useState(null);
  const [config, setConfig] = useState(RECEIPT_LAYOUT_DEFAULTS);
  const [pages, setPages] = useState([]);

  useEffect(() => {
    async function load() {
      // FIX #4 — usa cache de sessão para evitar queries repetidas ao banco
      const [settingsData, configData] = await Promise.all([
        loadSettings(),
        loadLayoutConfig('ReceiptLayoutConfig'),
      ]);
      if (settingsData) setSettings(settingsData);
      if (configData) {
        setConfig({ ...RECEIPT_LAYOUT_DEFAULTS, ...configData });
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!config || !receipt) return;

    const itemsPerPage = 30;
    const items = receipt.items || [];
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
  }, [config, receipt]);

  const fmt = (v) =>
    (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const emissionDate = receipt?.emission_date
    ? new Date(receipt.emission_date + "T00:00:00").toLocaleDateString("pt-BR")
    : receipt?.created_date ? new Date(receipt.created_date).toLocaleDateString("pt-BR") : "";

  const c = config;

  if (!settings || !config) return <div>Carregando...</div>;

  const ReceiptPage = ({ items, pageNum, pageIdx, isFirstPage }) => (
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
                {c.title_text || "Recibo"}
              </div>
              <div style={{ fontSize: "12px", marginTop: "4px" }}>Data: {emissionDate}</div>
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
              {c.show_job !== false && <div><strong>{receipt.job || ""}</strong></div>}
              {c.show_producer !== false && <div><strong>{receipt.producer || ""}</strong></div>}
              {c.show_client !== false && <div><strong>{receipt.client_name || ""}</strong></div>}
            </div>
          </div>
        </>
      )}

      {!isFirstPage && (
        <div style={{ fontSize: "11px", color: "#999", marginBottom: "8px", textAlign: "right" }}>
          (continuação) Página {pageNum}
        </div>
      )}

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
          {items.map((item, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${c.table_row_border_color}`, height: `${c.table_row_height || 24}px` }}>
              <td style={{ padding: "2px 4px", wordBreak: "break-word" }}>{item.name}</td>
              <td style={{ padding: "2px 4px", textAlign: "center" }}>{item.quantity}</td>
              <td style={{ padding: "2px 4px", textAlign: "right", color: c.table_value_color }}>R$ {fmt(item.unit_price)}</td>
              <td style={{ padding: "2px 4px", textAlign: "right", color: c.table_value_color }}>
                R$ {fmt((item.quantity || 0) * (item.unit_price || 0))}
              </td>
            </tr>
          ))}
          <tr><td colSpan={4} style={{ height: "10px" }} /></tr>
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
                  {receipt.total_label || c.totals_label_sem_nota || "SEM NOTA"}
                </td>
                <td style={{ padding: "6px", fontWeight: "bold", textAlign: "right", width: "20%", color: c.totals_value_color }}>
                  R${fmt(receipt.total_amount)}
                </td>
              </tr>
              {receipt.total_with_margin > 0 && (
                <tr style={{ borderBottom: `${c.totals_border_thickness || 2}px solid ${c.totals_border_color || "#333"}`, background: c.totals_bg }}>
                  <td style={{ padding: "6px", fontWeight: "bold" }} />
                  <td />
                  <td style={{ padding: "6px", fontWeight: "bold", textAlign: "right" }}>
                    {receipt.total_with_margin_label || c.totals_label_com_nota || "COM NOTA"}
                  </td>
                  <td style={{ padding: "6px", fontWeight: "bold", textAlign: "right", color: c.totals_value_color }}>
                    R${fmt(receipt.total_with_margin)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {c.show_instructions !== false && (c.instructions_text || c.instructions_qrcode_url) && (
            <div style={{
              marginTop: "14px", padding: "8px 12px",
              border: `1px solid ${c.instructions_border_color || "#aaa"}`, borderRadius: "4px",
              background: c.instructions_bg || "#fff8f0", fontSize: "11px",
              lineHeight: "1.7", display: "flex", alignItems: "flex-start", gap: "12px",
            }}>
              <div style={{ flex: 1, whiteSpace: "pre-wrap", fontWeight: "bold", color: c.instructions_text_color || "#1a1a1a" }}>
                {c.instructions_text}
              </div>
              {c.instructions_qrcode_url && (
                <img src={c.instructions_qrcode_url} alt="QR Code" style={{ width: `${c.instructions_qrcode_size || 80}px`, height: `${c.instructions_qrcode_size || 80}px`, objectFit: "contain", flexShrink: 0 }} />
              )}
            </div>
          )}

          {c.show_elaborado_por !== false && (c.elaborado_por_text || receipt.producer) && (
            <div style={{ textAlign: "right", fontStyle: "italic", fontSize: "11px", marginTop: "6px", color: "#555" }}>
              Elaborado por: {c.elaborado_por_text || receipt.producer}
            </div>
          )}

          {receipt.notes && (
            <div style={{
              marginTop: "18px", padding: "10px 12px",
              border: `1px solid ${c.notes_border_color}`,
              borderRadius: "4px", background: c.notes_bg,
              fontSize: "11px", lineHeight: "1.7", whiteSpace: "pre-wrap",
            }}>
              <strong>Observações:</strong> {receipt.notes}
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
          .receipt-page {
            page-break-after: always;
            break-after: page;
          }
          .receipt-page:last-child {
            page-break-after: avoid;
            break-after: auto;
          }
        }
      `}</style>
      <div className="pages-container" style={{ display: "block" }}>
        {pages.map((itemsInPage, idx) => (
          <div key={idx} className="receipt-page">
            <ReceiptPage items={itemsInPage} pageNum={idx + 1} pageIdx={idx} isFirstPage={idx === 0} />
          </div>
        ))}
      </div>
    </div>
  );
}

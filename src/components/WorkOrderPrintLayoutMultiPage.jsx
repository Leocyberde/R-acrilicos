import { useState, useEffect } from "react";
import { localClient } from "@/api/localClient";
import { WORK_ORDER_LAYOUT_DEFAULTS } from "@/utils/defaultLayoutConfig";

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



export default function WorkOrderPrintLayoutMultiPage({ workOrder }) {
  const [settings, setSettings] = useState(null);
  const [config, setConfig] = useState(WORK_ORDER_LAYOUT_DEFAULTS);
  const [pages, setPages] = useState([]);

  useEffect(() => {
    async function load() {
      // FIX #4 — usa cache de sessão para evitar queries repetidas ao banco
      const [settingsData, configData] = await Promise.all([
        loadSettings(),
        loadLayoutConfig('WorkOrderLayoutConfig'),
      ]);
      if (settingsData) setSettings(settingsData);
      if (configData) {
        setConfig({ ...WORK_ORDER_LAYOUT_DEFAULTS, ...configData });
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!config || !workOrder) return;

    const itemsPerPage = 30;
    const items = workOrder.items || [];
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
  }, [config, workOrder]);

  const createdDate = workOrder?.created_date ? new Date(workOrder.created_date).toLocaleDateString("pt-BR") : "";
  const deliveryDate = workOrder?.delivery_date
    ? (() => {
        const raw = String(workOrder.delivery_date).split("T")[0];
        const d = new Date(raw + "T12:00:00");
        return isNaN(d.getTime()) ? workOrder.delivery_date : d.toLocaleDateString("pt-BR");
      })()
    : null;

  const c = config;

  if (!settings || !config) return <div>Carregando...</div>;

  const WorkOrderPage = ({ items, pageNum, pageIdx, isFirstPage }) => (
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
                <div style={{ fontSize: "11px", marginTop: "4px" }}>{settings.company_phone}</div>
              )}
              {c.show_email !== false && (settings?.company_email || settings?.company_email2) && (
                <div style={{ fontSize: "11px", color: "#1565c0", marginTop: "4px" }}>
                  {settings.company_email && <div>{settings.company_email}</div>}
                  {settings.company_email2 && <div>{settings.company_email2}</div>}
                </div>
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
                {c.title_text || "Ordem de Serviço"}
              </div>
              <div style={{ fontSize: "12px", marginTop: "4px" }}>Data: {createdDate}</div>
              {c.show_delivery_date !== false && deliveryDate && (
                <div style={{ fontSize: "12px", marginTop: "2px" }}>Entrega: {deliveryDate}</div>
              )}
            </div>
          </div>

          <hr style={{ border: "none", borderTop: `${c.divider_thickness}px solid ${c.divider_color}`, margin: "8px 0" }} />

          <div style={{ marginBottom: "8px", display: "flex", gap: "32px", lineHeight: "1.8" }}>
            <div>
              {c.show_job !== false && <div>JOB:</div>}
              {c.show_producer !== false && <div>Produtor:</div>}
              {c.show_client !== false && <div>Cliente:</div>}
            </div>
            <div>
              {c.show_job !== false && <div><strong>{workOrder.job || ""}</strong></div>}
              {c.show_producer !== false && <div><strong>{workOrder.producer || ""}</strong></div>}
              {c.show_client !== false && <div><strong>{workOrder.client_name || ""}</strong></div>}
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
            <th style={{ textAlign: "left", padding: "5px 4px", fontWeight: "bold", fontSize: "12px", color: c.table_header_color, width: `${c.table_number_width ?? 6}%` }}>#</th>
            <th style={{ textAlign: "left", padding: "5px 4px", fontWeight: "bold", fontSize: "12px", color: c.table_header_color, width: `${c.table_item_width ?? 76}%` }}>Item / Produto / Serviço</th>
            <th style={{ textAlign: "center", padding: "5px 4px", fontWeight: "bold", fontSize: "12px", color: c.table_header_color, width: `${c.table_quantity_width ?? 18}%` }}>Quantidade</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colSpan={3} style={{ height: "8px" }} /></tr>
          {items.map((item, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${c.table_row_border_color}`, height: `${c.table_row_height || 24}px` }}>
              <td style={{ padding: "2px 4px", color: "#888" }}>{i + 1}</td>
              <td style={{ padding: "2px 4px", wordBreak: "break-word" }}>{item.name}</td>
              <td style={{ padding: "2px 4px", textAlign: "center" }}>{item.quantity}</td>
            </tr>
          ))}
          <tr><td colSpan={3} style={{ height: "10px" }} /></tr>
        </tbody>
      </table>

      {pages.length > 0 && pageIdx === pages.length - 1 && (
        <>
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

          {c.show_elaborado_por !== false && (c.elaborado_por_text || workOrder.producer) && (
            <div style={{ textAlign: "right", fontStyle: "italic", fontSize: "11px", marginTop: "6px", color: "#555" }}>
              Elaborado por: {c.elaborado_por_text || workOrder.producer}
            </div>
          )}

          {(workOrder.description || workOrder.notes) && (
            <div style={{
              marginTop: "14px", padding: "10px 12px",
              border: `1px solid ${c.notes_border_color}`,
              borderRadius: "4px", background: c.notes_bg,
              fontSize: "11px", lineHeight: "1.7", whiteSpace: "pre-wrap",
            }}>
              {workOrder.description && (
                <div style={{ marginBottom: workOrder.notes ? "8px" : "0" }}>
                  <strong>Descrição:</strong> {workOrder.description}
                </div>
              )}
              {workOrder.notes && (
                <div><strong>Observações:</strong> {workOrder.notes}</div>
              )}
            </div>
          )}

          {c.show_signature !== false && (
            <div style={{ marginTop: "80px", display: "flex", justifyContent: "space-around" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: "160px", borderTop: "1px solid #555", paddingTop: "6px", fontSize: "11px", color: "#555" }}>
                  Assinatura do Cliente
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: "160px", borderTop: "1px solid #555", paddingTop: "6px", fontSize: "11px", color: "#555" }}>
                  Assinatura do Responsável
                </div>
              </div>
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
    <div style={{ margin: 0, padding: 0 }}>
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
          .workorder-page {
            page-break-after: always;
            break-after: page;
          }
          .workorder-page:last-child {
            page-break-after: avoid;
            break-after: auto;
          }
        }
      `}</style>
      <div className="pages-container" style={{ display: "block" }}>
        {pages.map((itemsInPage, idx) => (
          <div key={idx} className="workorder-page">
            <WorkOrderPage items={itemsInPage} pageNum={idx + 1} pageIdx={idx} isFirstPage={idx === 0} />
          </div>
        ))}
      </div>
    </div>
  );
}

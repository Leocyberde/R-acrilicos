/**
 * DownloadPDF.jsx
 *
 * FIX #1 — PDF real com texto selecionável usando @react-pdf/renderer.
 *           Antes usava html2canvas que gerava uma imagem dentro do PDF
 *           (sem texto selecionável, tamanho grande, qualidade inferior).
 *
 * FIX #7 — Impressão via iframe oculto em vez de window.open('','_blank'),
 *           que era bloqueado como popup pelos navegadores modernos.
 *
 * FIX #9 — Math.ceil em vez de Math.round no cálculo de páginas,
 *           evitando cortar a última página quando ela tem < 50% de altura.
 *
 * INSTALAÇÃO (rodar uma vez):
 *   npm install @react-pdf/renderer
 */

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
  Font,
} from "@react-pdf/renderer";

// ─── Paleta de cores ────────────────────────────────────────────────────────
const C = {
  slate900: "#0f172a",
  slate800: "#1e293b",
  slate700: "#334155",
  slate600: "#475569",
  slate500: "#64748b",
  slate400: "#94a3b8",
  slate300: "#cbd5e1",
  slate200: "#e2e8f0",
  slate50:  "#f8fafc",
  red600:   "#dc2626",
  blue700:  "#1d4ed8",
  white:    "#ffffff",
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (v) =>
  `R$ ${Number(v || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (d) => {
  if (!d) return "-";
  try {
    const clean = String(d).split("T")[0];
    const [y, m, day] = clean.split("-");
    if (y && m && day) return `${day}/${m}/${y}`;
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return String(d);
  }
};

// ─── Estilos compartilhados ─────────────────────────────────────────────────
const shared = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.slate800,
    backgroundColor: C.white,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
  },
  // Cabeçalho
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  logo: { height: 60, objectFit: "contain" },
  companyName: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.slate900 },
  contactLine: { fontSize: 7.5, color: C.slate700, marginTop: 2 },
  titleBlock: { alignItems: "flex-end" },
  docTitle: { fontSize: 22, color: C.slate900 },
  docMeta: { fontSize: 8, color: C.slate600, marginTop: 3 },
  docNumber: { fontSize: 8, color: C.slate700, marginTop: 2 },
  divider2: { borderBottomWidth: 2, borderBottomColor: C.slate800, marginVertical: 8 },
  divider1: { borderBottomWidth: 0.5, borderBottomColor: C.slate300, marginVertical: 6 },
  // Campos
  fieldRow: { flexDirection: "row", marginBottom: 3 },
  fieldLabel: { width: 64, fontSize: 8, fontFamily: "Helvetica-Bold", color: C.slate700 },
  fieldValue: { flex: 1, fontSize: 8, fontFamily: "Helvetica-Bold", color: C.slate900 },
  // Tabela
  tableHeader: { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: C.slate800, paddingBottom: 4, marginBottom: 4 },
  tableHeaderCell: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.slate800 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.slate200, paddingVertical: 3 },
  tableCell: { fontSize: 8, color: C.slate800 },
  // Totais
  totalsBlock: { alignItems: "flex-end", marginTop: 8 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", width: 200, paddingTop: 4 },
  totalsLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.slate800 },
  totalsValue: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.slate900 },
  // Observações
  notesBox: { marginTop: 10, padding: 8, backgroundColor: C.slate50, borderWidth: 0.5, borderColor: C.slate200, borderRadius: 3 },
  notesLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.slate700, marginBottom: 4, textTransform: "uppercase" },
  notesText: { fontSize: 8, color: C.slate700, lineHeight: 1.5 },
  // Rodapé
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, borderTopWidth: 0.5, borderTopColor: C.slate200, paddingTop: 6, alignItems: "center" },
  footerText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.slate800 },
  footerSub: { fontSize: 7, color: C.slate500, marginTop: 2 },
  // Instruções
  instructionsBox: { marginTop: 10, padding: 8, backgroundColor: "#fff8f0", borderWidth: 0.5, borderColor: "#aaaaaa", borderRadius: 3 },
  instructionsText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.slate900, lineHeight: 1.6 },
  // Assinatura
  signatureArea: { flexDirection: "row", justifyContent: "space-around", marginTop: 50 },
  signatureLine: { width: 140, borderTopWidth: 0.8, borderTopColor: C.slate400, alignItems: "center", paddingTop: 4 },
  signatureLabel: { fontSize: 7.5, color: C.slate500 },
  // Desconto
  discountRow: { flexDirection: "row", justifyContent: "space-between", width: 200 },
  discountLabel: { fontSize: 8, color: C.red600 },
  discountValue: { fontSize: 8, color: C.red600 },
});

// ────────────────────────────────────────────────────────────────────────────
// ORÇAMENTO
// ────────────────────────────────────────────────────────────────────────────
function BudgetDocument({ budget, company }) {
  const items = Array.isArray(budget?.items) ? budget.items : [];
  const emissionDate = fmtDate(budget?.emission_date || budget?.created_date);

  return (
    <Document>
      <Page size="A4" style={shared.page}>
        {/* Cabeçalho */}
        <View style={shared.headerRow}>
          <View>
            {company?.company_logo
              ? <Image src={company.company_logo} style={shared.logo} />
              : <Text style={shared.companyName}>{company?.company_name || ""}</Text>
            }
            {company?.company_logo && company?.company_name && (
              <Text style={[shared.contactLine, { fontFamily: "Helvetica-Bold" }]}>{company.company_name}</Text>
            )}
            {company?.company_phone  && <Text style={shared.contactLine}>{company.company_phone}</Text>}
            {company?.company_email  && <Text style={shared.contactLine}>{company.company_email}</Text>}
            {company?.company_email2 && <Text style={shared.contactLine}>{company.company_email2}</Text>}
            {company?.company_address && <Text style={shared.contactLine}>{company.company_address}</Text>}
          </View>
          <View style={shared.titleBlock}>
            <Text style={shared.docTitle}>Orçamento</Text>
            <Text style={shared.docMeta}>Data: {emissionDate}</Text>
            {budget?.validity_date && (
              <Text style={[shared.docMeta, { color: C.slate500 }]}>Válido até: {fmtDate(budget.validity_date)}</Text>
            )}
            <Text style={shared.docNumber}>Nº {budget?.id}</Text>
          </View>
        </View>

        <View style={shared.divider2} />

        {/* Campos */}
        {budget?.job && (
          <View style={shared.fieldRow}>
            <Text style={shared.fieldLabel}>JOB:</Text>
            <Text style={shared.fieldValue}>{String(budget.job).toUpperCase()}</Text>
          </View>
        )}
        {budget?.producer && (
          <View style={shared.fieldRow}>
            <Text style={shared.fieldLabel}>Produtor:</Text>
            <Text style={shared.fieldValue}>{String(budget.producer).toUpperCase()}</Text>
          </View>
        )}
        {budget?.client_name && (
          <View style={shared.fieldRow}>
            <Text style={shared.fieldLabel}>Empresa:</Text>
            <Text style={shared.fieldValue}>{String(budget.client_name).toUpperCase()}</Text>
          </View>
        )}
        {budget?.client_email && (
          <View style={shared.fieldRow}>
            <Text style={[shared.fieldLabel, { fontFamily: "Helvetica" }]}>E-mail:</Text>
            <Text style={[shared.fieldValue, { fontFamily: "Helvetica" }]}>{budget.client_email}</Text>
          </View>
        )}

        <View style={shared.divider1} />

        {budget?.description && (
          <Text style={{ fontSize: 8, color: C.slate600, fontFamily: "Helvetica-Oblique", marginBottom: 8 }}>
            {budget.description}
          </Text>
        )}

        {/* Tabela de itens */}
        {items.length > 0 && (
          <View>
            <View style={shared.tableHeader}>
              <Text style={[shared.tableHeaderCell, { flex: 5 }]}>Item</Text>
              <Text style={[shared.tableHeaderCell, { width: 30, textAlign: "center" }]}>Qtd</Text>
              <Text style={[shared.tableHeaderCell, { width: 70, textAlign: "right" }]}>Preço Unit.</Text>
              <Text style={[shared.tableHeaderCell, { width: 70, textAlign: "right" }]}>Subtotal</Text>
            </View>
            {items.map((item, i) => {
              const qty = Number(item.quantity || 1);
              const unit = Number(item.unit_price || item.price || 0);
              const lineTotal = Number(item.total || item.line_total || qty * unit || 0);
              return (
                <View key={i} style={shared.tableRow}>
                  <Text style={[shared.tableCell, { flex: 5 }]}>{String(item.name || "-").toUpperCase()}</Text>
                  <Text style={[shared.tableCell, { width: 30, textAlign: "center" }]}>{qty}</Text>
                  <Text style={[shared.tableCell, { width: 70, textAlign: "right" }]}>{fmt(unit)}</Text>
                  <Text style={[shared.tableCell, { width: 70, textAlign: "right" }]}>{fmt(lineTotal)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Totais */}
        <View style={shared.totalsBlock}>
          {Number(budget?.discount) > 0 && (
            <View style={shared.discountRow}>
              <Text style={shared.discountLabel}>Desconto:</Text>
              <Text style={shared.discountValue}>- {fmt(budget.discount)}</Text>
            </View>
          )}
          <View style={[shared.totalsRow, { borderTopWidth: 1.5, borderTopColor: C.slate800 }]}>
            <Text style={shared.totalsLabel}>{budget?.total_label || "Sem Nota Total"}</Text>
            <Text style={shared.totalsValue}>{fmt(budget?.total)}</Text>
          </View>
          {Number(budget?.total_with_margin) > 0 && (
            <View style={[shared.totalsRow, { borderTopWidth: 0.5, borderTopColor: C.slate400 }]}>
              <Text style={shared.totalsLabel}>{budget?.total_with_margin_label || "Com Nota Total"}</Text>
              <Text style={shared.totalsValue}>{fmt(budget?.total_with_margin)}</Text>
            </View>
          )}
          {budget?.producer && (
            <Text style={{ fontSize: 7.5, color: C.slate500, fontFamily: "Helvetica-Oblique", marginTop: 4 }}>
              Elaborado por: {budget.producer}
            </Text>
          )}
        </View>

        {/* Observações */}
        {budget?.notes && (
          <View style={shared.notesBox}>
            <Text style={shared.notesLabel}>Observações</Text>
            <Text style={shared.notesText}>{budget.notes}</Text>
          </View>
        )}

        {/* Instruções (footer_notes) */}
        {company?.footer_notes && (
          <View style={{ marginTop: 10 }}>
            <View style={[shared.divider1, { marginBottom: 4 }]} />
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: C.red600, marginBottom: 4 }}>
              ATENÇÃO ! LEIA AS INSTRUÇÕES ABAIXO
            </Text>
            <Text style={{ fontSize: 8, color: C.slate800, lineHeight: 1.5 }}>{company.footer_notes}</Text>
          </View>
        )}

        {/* Rodapé */}
        <View style={shared.footer}>
          <Text style={shared.footerText}>AGRADECEMOS SUA PREFERÊNCIA!</Text>
          <Text style={shared.footerSub}>Caso você tenha alguma dúvida entre em contato conosco</Text>
        </View>
      </Page>
    </Document>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ORDEM DE SERVIÇO
// ────────────────────────────────────────────────────────────────────────────
function WorkOrderDocument({ order, company }) {
  const items = Array.isArray(order?.items) ? order.items : [];

  const statusLabels = {
    pendente: "Pendente", em_producao: "Em Produção",
    finalizado: "Finalizado", entregue: "Entregue",
    cancelado: "Cancelado", nova: "Nova", em_andamento: "Em Andamento",
  };

  return (
    <Document>
      <Page size="A4" style={shared.page}>
        {/* Cabeçalho */}
        <View style={shared.headerRow}>
          <View>
            {company?.company_logo
              ? <Image src={company.company_logo} style={shared.logo} />
              : <Text style={shared.companyName}>{company?.company_name || ""}</Text>
            }
            {company?.company_logo && company?.company_name && (
              <Text style={[shared.contactLine, { fontFamily: "Helvetica-Bold" }]}>{company.company_name}</Text>
            )}
            {company?.company_phone   && <Text style={shared.contactLine}>{company.company_phone}</Text>}
            {company?.company_email   && <Text style={shared.contactLine}>{company.company_email}</Text>}
            {company?.company_address && <Text style={shared.contactLine}>{company.company_address}</Text>}
          </View>
          <View style={shared.titleBlock}>
            <Text style={[shared.docTitle, { fontSize: 18, fontFamily: "Helvetica-Bold" }]}>Ordem de Serviço</Text>
            <Text style={shared.docNumber}>Nº {order?.id}</Text>
            <Text style={shared.docMeta}>Data: {fmtDate(order?.created_date)}</Text>
            {order?.delivery_date && (
              <Text style={[shared.docMeta, { color: C.slate500 }]}>Entrega: {fmtDate(order.delivery_date)}</Text>
            )}
          </View>
        </View>

        <View style={shared.divider2} />

        {/* Status */}
        <View style={[shared.fieldRow, { marginBottom: 8 }]}>
          <Text style={shared.fieldLabel}>Status:</Text>
          <Text style={[shared.fieldValue, { color: C.slate900 }]}>
            {statusLabels[order?.status] || order?.status || "-"}
          </Text>
        </View>

        <View style={shared.divider1} />

        {/* Campos */}
        {order?.client_name && (
          <View style={shared.fieldRow}>
            <Text style={shared.fieldLabel}>Cliente:</Text>
            <Text style={shared.fieldValue}>{order.client_name}</Text>
          </View>
        )}
        {order?.client_phone && (
          <View style={shared.fieldRow}>
            <Text style={[shared.fieldLabel, { fontFamily: "Helvetica" }]}>Telefone:</Text>
            <Text style={[shared.fieldValue, { fontFamily: "Helvetica" }]}>{order.client_phone}</Text>
          </View>
        )}
        {order?.client_address && (
          <View style={shared.fieldRow}>
            <Text style={[shared.fieldLabel, { fontFamily: "Helvetica" }]}>Endereço:</Text>
            <Text style={[shared.fieldValue, { fontFamily: "Helvetica" }]}>{order.client_address}</Text>
          </View>
        )}
        {order?.job && (
          <View style={shared.fieldRow}>
            <Text style={shared.fieldLabel}>Job:</Text>
            <Text style={shared.fieldValue}>{order.job}</Text>
          </View>
        )}
        {order?.producer && (
          <View style={shared.fieldRow}>
            <Text style={[shared.fieldLabel, { fontFamily: "Helvetica" }]}>Produtor:</Text>
            <Text style={[shared.fieldValue, { fontFamily: "Helvetica" }]}>{order.producer}</Text>
          </View>
        )}

        <View style={shared.divider1} />

        {order?.description && (
          <Text style={{ fontSize: 8, color: C.slate600, fontFamily: "Helvetica-Oblique", marginBottom: 8 }}>
            {order.description}
          </Text>
        )}

        {/* Tabela */}
        {items.length > 0 && (
          <View>
            <View style={shared.tableHeader}>
              <Text style={[shared.tableHeaderCell, { width: 24 }]}>#</Text>
              <Text style={[shared.tableHeaderCell, { flex: 1 }]}>Item / Produto / Serviço</Text>
              <Text style={[shared.tableHeaderCell, { width: 80, textAlign: "center" }]}>Quantidade</Text>
            </View>
            {items.map((item, i) => (
              <View key={i} style={shared.tableRow}>
                <Text style={[shared.tableCell, { width: 24, color: C.slate500 }]}>{i + 1}</Text>
                <Text style={[shared.tableCell, { flex: 1 }]}>{item.name || item.description || "-"}</Text>
                <Text style={[shared.tableCell, { width: 80, textAlign: "center" }]}>{item.quantity || 1}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Observações */}
        {order?.notes && (
          <View style={shared.notesBox}>
            <Text style={shared.notesLabel}>Observações</Text>
            <Text style={shared.notesText}>{order.notes}</Text>
          </View>
        )}

        {/* Elaborado por */}
        {order?.producer && (
          <Text style={{ fontSize: 7.5, color: C.slate500, fontFamily: "Helvetica-Oblique", textAlign: "right", marginTop: 6 }}>
            Elaborado por: {order.producer}
          </Text>
        )}

        {/* Assinaturas */}
        <View style={shared.signatureArea}>
          <View style={shared.signatureLine}>
            <Text style={shared.signatureLabel}>Assinatura do Cliente</Text>
          </View>
          <View style={shared.signatureLine}>
            <Text style={shared.signatureLabel}>Assinatura do Responsável</Text>
          </View>
        </View>

        {/* Rodapé */}
        <View style={shared.footer}>
          <Text style={shared.footerText}>AGRADECEMOS SUA PREFERÊNCIA!</Text>
          <Text style={shared.footerSub}>Caso você tenha alguma dúvida entre em contato conosco</Text>
        </View>
      </Page>
    </Document>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// RECIBO
// ────────────────────────────────────────────────────────────────────────────
function ReceiptDocument({ receipt, company }) {
  const items = Array.isArray(receipt?.items) ? receipt.items : [];
  const emissionDate = fmtDate(receipt?.emission_date || receipt?.created_date);

  return (
    <Document>
      <Page size="A4" style={shared.page}>
        {/* Cabeçalho */}
        <View style={shared.headerRow}>
          <View>
            {company?.company_logo
              ? <Image src={company.company_logo} style={shared.logo} />
              : <Text style={shared.companyName}>{company?.company_name || ""}</Text>
            }
            {company?.company_logo && company?.company_name && (
              <Text style={[shared.contactLine, { fontFamily: "Helvetica-Bold" }]}>{company.company_name}</Text>
            )}
            {company?.company_phone   && <Text style={shared.contactLine}>{company.company_phone}</Text>}
            {company?.company_email   && <Text style={shared.contactLine}>{company.company_email}</Text>}
            {company?.company_address && <Text style={shared.contactLine}>{company.company_address}</Text>}
          </View>
          <View style={shared.titleBlock}>
            <Text style={shared.docTitle}>Recibo</Text>
            <Text style={shared.docMeta}>Data: {emissionDate}</Text>
            {receipt?.due_date && (
              <Text style={[shared.docMeta, { color: C.slate500 }]}>Vencimento: {fmtDate(receipt.due_date)}</Text>
            )}
            <Text style={shared.docNumber}>Nº {receipt?.id}</Text>
          </View>
        </View>

        <View style={shared.divider2} />

        {/* Campos */}
        {receipt?.job && (
          <View style={shared.fieldRow}>
            <Text style={shared.fieldLabel}>JOB:</Text>
            <Text style={shared.fieldValue}>{String(receipt.job).toUpperCase()}</Text>
          </View>
        )}
        {receipt?.producer && (
          <View style={shared.fieldRow}>
            <Text style={shared.fieldLabel}>Produtor:</Text>
            <Text style={shared.fieldValue}>{String(receipt.producer).toUpperCase()}</Text>
          </View>
        )}
        {receipt?.client_name && (
          <View style={shared.fieldRow}>
            <Text style={shared.fieldLabel}>Empresa:</Text>
            <Text style={shared.fieldValue}>{String(receipt.client_name).toUpperCase()}</Text>
          </View>
        )}
        {receipt?.client_email && (
          <View style={shared.fieldRow}>
            <Text style={[shared.fieldLabel, { fontFamily: "Helvetica" }]}>E-mail:</Text>
            <Text style={[shared.fieldValue, { fontFamily: "Helvetica" }]}>{receipt.client_email}</Text>
          </View>
        )}
        {receipt?.client_address && (
          <View style={shared.fieldRow}>
            <Text style={[shared.fieldLabel, { fontFamily: "Helvetica" }]}>Endereço:</Text>
            <Text style={[shared.fieldValue, { fontFamily: "Helvetica" }]}>{receipt.client_address}</Text>
          </View>
        )}

        <View style={shared.divider1} />

        {receipt?.description && (
          <Text style={{ fontSize: 8, color: C.slate600, fontFamily: "Helvetica-Oblique", marginBottom: 8 }}>
            {receipt.description}
          </Text>
        )}

        {/* Tabela */}
        {items.length > 0 && (
          <View>
            <View style={shared.tableHeader}>
              <Text style={[shared.tableHeaderCell, { flex: 5 }]}>Item</Text>
              <Text style={[shared.tableHeaderCell, { width: 30, textAlign: "center" }]}>Qtd</Text>
              <Text style={[shared.tableHeaderCell, { width: 70, textAlign: "right" }]}>Preço Unit.</Text>
              <Text style={[shared.tableHeaderCell, { width: 70, textAlign: "right" }]}>Subtotal</Text>
            </View>
            {items.map((item, i) => {
              const qty = Number(item.quantity || 1);
              const unit = Number(item.unit_price || 0);
              const lineTotal = qty * unit;
              return (
                <View key={i} style={shared.tableRow}>
                  <Text style={[shared.tableCell, { flex: 5 }]}>{String(item.name || "-").toUpperCase()}</Text>
                  <Text style={[shared.tableCell, { width: 30, textAlign: "center" }]}>{qty}</Text>
                  <Text style={[shared.tableCell, { width: 70, textAlign: "right" }]}>{fmt(unit)}</Text>
                  <Text style={[shared.tableCell, { width: 70, textAlign: "right" }]}>{fmt(lineTotal)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Totais */}
        <View style={shared.totalsBlock}>
          {Number(receipt?.discount) > 0 && (
            <View style={shared.discountRow}>
              <Text style={shared.discountLabel}>Desconto:</Text>
              <Text style={shared.discountValue}>- {fmt(receipt.discount)}</Text>
            </View>
          )}
          <View style={[shared.totalsRow, { borderTopWidth: 1.5, borderTopColor: C.slate800 }]}>
            <Text style={shared.totalsLabel}>{receipt?.total_label || "Total sem Nota"}</Text>
            <Text style={shared.totalsValue}>{fmt(receipt?.total_amount)}</Text>
          </View>
          {Number(receipt?.total_with_margin) > 0 && (
            <View style={[shared.totalsRow, { borderTopWidth: 0.5, borderTopColor: C.slate400 }]}>
              <Text style={shared.totalsLabel}>{receipt?.total_with_margin_label || "Total com Nota"}</Text>
              <Text style={shared.totalsValue}>{fmt(receipt?.total_with_margin)}</Text>
            </View>
          )}
          {receipt?.producer && (
            <Text style={{ fontSize: 7.5, color: C.slate500, fontFamily: "Helvetica-Oblique", marginTop: 4 }}>
              Elaborado por: {receipt.producer}
            </Text>
          )}
        </View>

        {/* Forma de pagamento */}
        {receipt?.payment_method && (
          <Text style={{ fontSize: 8, color: C.slate600, marginTop: 6 }}>
            Forma de pagamento: {receipt.payment_method}
          </Text>
        )}

        {/* Observações */}
        {receipt?.notes && (
          <View style={shared.notesBox}>
            <Text style={shared.notesLabel}>Observações</Text>
            <Text style={shared.notesText}>{receipt.notes}</Text>
          </View>
        )}

        {/* Instruções */}
        {company?.footer_notes && (
          <View style={{ marginTop: 10 }}>
            <View style={[shared.divider1, { marginBottom: 4 }]} />
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: C.red600, marginBottom: 4 }}>
              ATENÇÃO ! LEIA AS INSTRUÇÕES ABAIXO
            </Text>
            <Text style={{ fontSize: 8, color: C.slate800, lineHeight: 1.5 }}>{company.footer_notes}</Text>
          </View>
        )}

        {/* FIX #5 — Dados bancários e PIX (ausentes antes desta correção) */}
        {(company?.receipt_bank_name || company?.receipt_pix_cnpj || company?.receipt_pix_qrcode) && (
          <View style={{ marginTop: 10, paddingTop: 6, borderTopWidth: 1.5, borderTopColor: "#334155" }}>
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#f97316", marginBottom: 4 }}>
              DADOS BANCÁRIOS
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                {company.receipt_bank_name && (
                  <Text style={{ fontSize: 8, color: C.slate800, marginBottom: 2 }}>
                    <Text style={{ fontFamily: "Helvetica-Bold" }}>Banco: </Text>
                    {company.receipt_bank_name}
                    {company.receipt_bank_agency ? `  Ag: ${company.receipt_bank_agency}` : ""}
                    {company.receipt_bank_account ? `  Conta: ${company.receipt_bank_account}` : ""}
                  </Text>
                )}
                {company.receipt_pix_cnpj && (
                  <Text style={{ fontSize: 8, color: C.slate800, marginBottom: 2 }}>
                    <Text style={{ fontFamily: "Helvetica-Bold" }}>PIX CNPJ: </Text>
                    {company.receipt_pix_cnpj}
                  </Text>
                )}
                {company.receipt_beneficiary && (
                  <Text style={{ fontSize: 8, color: "#f97316" }}>
                    <Text style={{ fontFamily: "Helvetica-Bold" }}>Favorecido: </Text>
                    {company.receipt_beneficiary}
                  </Text>
                )}
              </View>
              {company.receipt_pix_qrcode && (
                <View style={{ alignItems: "center", marginLeft: 12 }}>
                  <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: C.slate600, marginBottom: 3 }}>
                    PAGUE NO PIX
                  </Text>
                  <Image src={company.receipt_pix_qrcode} style={{ width: 60, height: 60 }} />
                </View>
              )}
            </View>
          </View>
        )}

        {/* Rodapé */}
        <View style={shared.footer}>
          <Text style={shared.footerText}>AGRADECEMOS SUA PREFERÊNCIA!</Text>
          <Text style={shared.footerSub}>Caso você tenha alguma dúvida entre em contato conosco</Text>
        </View>
      </Page>
    </Document>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// API PÚBLICA — funções exportadas usadas pelas pages
// ────────────────────────────────────────────────────────────────────────────

/**
 * Gera e baixa um PDF de orçamento com texto selecionável.
 * @param {object} budget  - dados do orçamento
 * @param {object} company - dados da empresa (settings)
 * @param {string} filename - nome do arquivo (ex: "orcamento-42.pdf")
 */
export async function downloadBudgetPDF(budget, company, filename) {
  const blob = await pdf(<BudgetDocument budget={budget} company={company} />).toBlob();
  triggerDownload(blob, filename || `orcamento-${budget?.id || "novo"}.pdf`);
}

/**
 * Gera e baixa um PDF de ordem de serviço com texto selecionável.
 */
export async function downloadWorkOrderPDF(order, company, filename) {
  const blob = await pdf(<WorkOrderDocument order={order} company={company} />).toBlob();
  triggerDownload(blob, filename || `ordem-servico-${order?.id || "nova"}.pdf`);
}

/**
 * Gera e baixa um PDF de recibo com texto selecionável.
 */
export async function downloadReceiptPDF(receipt, company, filename) {
  const blob = await pdf(<ReceiptDocument receipt={receipt} company={company} />).toBlob();
  triggerDownload(blob, filename || `recibo-${receipt?.id || "novo"}.pdf`);
}

/**
 * Abre o diálogo de impressão do navegador usando um iframe oculto.
 * FIX #7: evita window.open() que era bloqueado como popup.
 *
 * @param {"budget"|"workOrder"|"receipt"} type - tipo do documento
 * @param {object} data    - budget | order | receipt
 * @param {object} company - dados da empresa
 */
export async function printDocument(type, data, company) {
  const docMap = {
    budget:    <BudgetDocument    budget={data}  company={company} />,
    workOrder: <WorkOrderDocument order={data}   company={company} />,
    receipt:   <ReceiptDocument   receipt={data} company={company} />,
  };

  const doc = docMap[type];
  if (!doc) throw new Error(`Tipo de documento inválido: ${type}`);

  const blob = await pdf(doc).toBlob();
  const url  = URL.createObjectURL(blob);

  // FIX #7 — iframe oculto em vez de window.open para evitar bloqueio de popup
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;width:0;height:0;border:0;opacity:0;";
  document.body.appendChild(iframe);
  iframe.src = url;

  iframe.onload = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch {
      // fallback: abre em nova aba se o iframe falhar (ex: bloqueio de segurança)
      window.open(url, "_blank");
    }
    // limpa após 2 minutos
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    }, 120_000);
  };
}

// ─── Utilitário interno ─────────────────────────────────────────────────────
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// ─── Exports de compatibilidade (mantidos para não quebrar imports antigos) ──
// Se quiser migrar gradualmente, as funções antigas continuam funcionando
// mas agora geram erros claros orientando ao novo uso.
export async function downloadPDF(elementId, filename) {
  console.error(
    `[DownloadPDF] downloadPDF("${elementId}") foi substituída.\n` +
    `Use downloadBudgetPDF(budget, company, filename), ` +
    `downloadWorkOrderPDF(order, company, filename) ou ` +
    `downloadReceiptPDF(receipt, company, filename).`
  );
}

export async function printFromCanvas(elementId) {
  console.error(
    `[DownloadPDF] printFromCanvas("${elementId}") foi substituída.\n` +
    `Use printDocument("budget"|"workOrder"|"receipt", data, company).`
  );
}

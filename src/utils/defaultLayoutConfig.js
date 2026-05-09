/**
 * defaultLayoutConfig.js
 *
 * FIX #11 — Configurações padrão de layout centralizadas em um único arquivo.
 *            Antes eram copiadas manualmente em cada um dos 3 componentes
 *            (BudgetPrintLayoutMultiPage, WorkOrderPrintLayoutMultiPage,
 *             ReceiptPrintLayoutMultiPage), tornando qualquer mudança global
 *            propensa a erros por esquecer de atualizar os outros arquivos.
 */

export const DEFAULT_LAYOUT = {
  // Título
  title_font_size: 22,
  title_color: "#1a1a1a",
  title_bold: true,

  // Corpo
  body_font_family: "Arial, sans-serif",
  body_font_size: 12,
  body_color: "#1a1a1a",

  // Divisor
  divider_color: "#1a1a1a",
  divider_thickness: 2,

  // Tabela
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

  // Totais
  totals_bg: "#f9f9f9",
  totals_value_color: "#cc0000",
  totals_border_color: "#333333",
  totals_border_thickness: 2,
  totals_label_sem_nota: "SEM NOTA",
  totals_label_com_nota: "COM NOTA",

  // Elaborado por
  show_elaborado_por: true,
  elaborado_por_text: "",

  // Instruções
  show_instructions: true,
  instructions_text: "ATENÇÃO! LEIA AS INSTRUÇÕES ABAIXO\n\nA PRODUÇÃO SERÁ INICIADA: APÓS ADIANTAMENTO DE 50%\nFATURAMENTO: 50% P/INICIAR PRODUÇÃO E 50% NA RETIRADA",
  instructions_text_color: "#1a1a1a",
  instructions_bg: "#fff8f0",
  instructions_border_color: "#aaaaaa",

  // Rodapé
  show_footer: true,
  footer_line1: "Caso você tenha alguma dúvida entre em contato conosco",
  footer_line2: "AGRADECEMOS SUA PREFERÊNCIA!",

  // Observações
  notes_border_color: "#cccccc",
  notes_bg: "#fefefe",

  // Layout geral
  page_padding: 14,
  logo_height: 60,

  // Campos visíveis
  show_job: true,
  show_producer: true,
  show_client: true,
  show_phone: true,
  phone_font_size: 11,
  phone_font_family: "Arial, sans-serif",
  phone_color: "#333333",
  show_email: true,
  show_address_company: true,
};

/** Defaults específicos do Orçamento — sobrescrevem DEFAULT_LAYOUT quando necessário */
export const BUDGET_LAYOUT_DEFAULTS = {
  ...DEFAULT_LAYOUT,
  title_text: "Orçamento",
};

/** Defaults específicos da Ordem de Serviço */
export const WORK_ORDER_LAYOUT_DEFAULTS = {
  ...DEFAULT_LAYOUT,
  title_text: "Ordem de Serviço",
  show_instructions: false,
  instructions_text: "",
  table_number_width: 6,
  table_item_width: 76,
  table_quantity_width: 18,
  show_signature: true,
  show_delivery_date: true,
};

/** Defaults específicos do Recibo */
export const RECEIPT_LAYOUT_DEFAULTS = {
  ...DEFAULT_LAYOUT,
  title_text: "Recibo",
  show_instructions: false,
  instructions_text: "",
  instructions_qrcode_url: "",
  instructions_qrcode_size: 80,
};

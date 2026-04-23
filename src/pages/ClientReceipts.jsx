import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Receipt, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig = {
  em_aberto:      { badge: "bg-blue-100 text-blue-800 border-blue-200",    label: "Em Aberto" },
  pendente:       { badge: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "Pendente" },
  parcial:        { badge: "bg-orange-100 text-orange-800 border-orange-200", label: "Parcial" },
  pago:           { badge: "bg-green-100 text-green-800 border-green-200",  label: "Pago" },
  vencido:        { badge: "bg-red-100 text-red-800 border-red-200",        label: "Vencido" },
  recibo_fechado: { badge: "bg-slate-100 text-slate-700 border-slate-200",  label: "Fechado" },
};

const paymentLabels = {
  dinheiro:       "Dinheiro",
  pix:            "PIX",
  cartao_credito: "Cartão de Crédito",
  cartao_debito:  "Cartão de Débito",
  boleto:         "Boleto",
  transferencia:  "Transferência",
};

function formatBRL(value) {
  return Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ReceiptDocument({ receipt, settings }) {
  const cfg = statusConfig[receipt.status] || { badge: "bg-slate-100 text-slate-700 border-slate-200", label: receipt.status };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
      {/* Header */}
      <div className="p-6 sm:p-8 border-b-2 border-slate-900">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {settings?.company_logo ? (
              <img src={settings.company_logo} alt="Logo" className="h-14 mb-2 object-contain" />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-indigo-100 flex items-center justify-center mb-2">
                <Receipt className="h-7 w-7 text-indigo-600" />
              </div>
            )}
            {settings?.company_name && <p className="text-sm font-bold text-slate-800">{settings.company_name}</p>}
            {settings?.company_address && <p className="text-xs text-slate-500 mt-0.5">{settings.company_address}</p>}
            {(settings?.company_phone || settings?.company_email) && (
              <p className="text-xs text-slate-500">
                {settings.company_phone}
                {settings.company_phone && settings.company_email && " • "}
                {settings.company_email}
              </p>
            )}
          </div>
          <div className="text-right ml-4">
            <p className="text-lg font-semibold text-slate-800 uppercase tracking-wide">Recibo</p>
            <p className="text-lg text-slate-500">#{String(receipt.id ?? "")}</p>
            <Badge className={`mt-2 text-xs border ${cfg.badge}`}>{cfg.label}</Badge>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-5">
        {/* Client details */}
        <div className="pb-4 border-b border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {receipt.client_name && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Cliente</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{receipt.client_name}</p>
              </div>
            )}
            {receipt.job && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Job</p>
                <p className="text-sm text-slate-700 mt-1">{receipt.job}</p>
              </div>
            )}
            {receipt.payment_method && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Forma de Pagamento</p>
                <p className="text-sm text-slate-700 mt-1">{paymentLabels[receipt.payment_method] || receipt.payment_method}</p>
              </div>
            )}
            {receipt.emission_date && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Data de Emissão</p>
                <p className="text-sm text-slate-700 mt-1">
                  {format(new Date(receipt.emission_date), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            )}
            {receipt.due_date && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Vencimento</p>
                <p className="text-sm text-slate-700 mt-1">
                  {String(receipt.due_date).split("T")[0].split("-").reverse().join("/")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Items table */}
        {receipt.items?.length > 0 && (
          <div className="pb-4 border-b border-slate-100">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase py-2 pr-4">Item</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase py-2 px-4">Qtd</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase py-2 px-4">Preço Unit.</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase py-2 pl-4">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {receipt.items.map((item, i) => {
                  const qty = item.quantity || 1;
                  const unit = item.unit_price || item.price || 0;
                  const total = item.total || qty * unit;
                  return (
                    <tr key={i}>
                      <td className="py-2.5 pr-4 text-sm text-slate-800">{item.name}</td>
                      <td className="py-2.5 px-4 text-sm text-slate-600 text-center">{qty}</td>
                      <td className="py-2.5 px-4 text-sm text-slate-600 text-right">R$ {formatBRL(unit)}</td>
                      <td className="py-2.5 pl-4 text-sm font-medium text-slate-800 text-right">R$ {formatBRL(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-4 space-y-1.5">
              {Number(receipt.amount_paid) > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Valor Pago:</span>
                  <span>R$ {formatBRL(receipt.amount_paid)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t-2 border-slate-900 pt-3 mt-2">
                <span>Total:</span>
                <span>R$ {formatBRL(receipt.total_value || receipt.total_amount)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {receipt.notes && (
          <div className="pb-4 border-b border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Observações</p>
            <p className="text-sm text-slate-600 whitespace-pre-line">{receipt.notes}</p>
          </div>
        )}

        {/* Banking footer */}
        {(settings?.receipt_bank_name || settings?.receipt_pix_cnpj || settings?.receipt_pix_qrcode) && (
          <div className="pt-4 border-t-2 border-slate-300">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-bold text-orange-500 mb-2">DADOS BANCÁRIOS</p>
                {settings.receipt_bank_name && (
                  <p className="text-sm text-slate-700">
                    <span className="font-semibold">Banco:</span> {settings.receipt_bank_name}
                    {settings.receipt_bank_agency && <>&nbsp;&nbsp;<span className="font-semibold">Ag:</span> {settings.receipt_bank_agency}</>}
                    {settings.receipt_bank_account && <>&nbsp;&nbsp;<span className="font-semibold">Conta:</span> {settings.receipt_bank_account}</>}
                  </p>
                )}
                {settings.receipt_pix_cnpj && (
                  <p className="text-sm text-slate-700 mt-1">
                    <span className="font-semibold">PIX CNPJ:</span>&nbsp;&nbsp;{settings.receipt_pix_cnpj}
                  </p>
                )}
                {settings.receipt_beneficiary && (
                  <p className="text-sm mt-1">
                    <span className="font-semibold text-orange-500">Favorecido:</span> {settings.receipt_beneficiary}
                  </p>
                )}
              </div>
              {settings.receipt_pix_qrcode && (
                <div className="text-center shrink-0">
                  <p className="text-xs font-semibold text-slate-600 mb-1">PAGUE NO PIX</p>
                  <img src={settings.receipt_pix_qrcode} alt="QR Code PIX" className="w-24 h-24 object-contain border border-slate-200" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Thank you */}
        <div className="pt-4 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-500">Caso você tenha alguma dúvida entre em contato conosco</p>
          <p className="text-sm font-bold text-slate-800 mt-1">AGRADECEMOS SUA PREFERÊNCIA!</p>
        </div>
      </div>
    </div>
  );
}

export default function ClientReceipts() {
  const [receipts, setReceipts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [currentUser, settingsData] = await Promise.all([
        base44.auth.me(),
        base44.entities.Settings.list(),
      ]);
      if (settingsData.length > 0) setSettings(settingsData[0]);
      if (currentUser) {
        const data = await base44.entities.Receipt.filter({ client_email: currentUser.email });
        const sent = (data || []).filter(r => r.sent_to_client === true || r.sent_to_client === "true");
        setReceipts(sent.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pagos = receipts.filter(r => r.status === "pago").length;
  const pendentes = receipts.filter(r => r.status !== "pago" && r.status !== "recibo_fechado").length;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <Receipt className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meus Recibos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Visualize os recibos emitidos para você</p>
        </div>
      </div>

      {receipts.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-600">{pagos}</div>
            <div className="text-xs text-slate-500 mt-1">Pagos</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-amber-600">{pendentes}</div>
            <div className="text-xs text-slate-500 mt-1">Pendentes</div>
          </div>
        </div>
      )}

      {receipts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-16 text-center">
          <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Nenhum recibo encontrado</p>
          <p className="text-slate-400 text-sm mt-1">Quando um recibo for enviado para você, ele aparecerá aqui.</p>
        </div>
      ) : (
        <div>
          {receipts.map(receipt => (
            <ReceiptDocument key={receipt.id} receipt={receipt} settings={settings} />
          ))}
        </div>
      )}
    </div>
  );
}

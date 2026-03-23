import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import P from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateBudgetPDF } from './pdfGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_DIR = path.join(__dirname, '..', 'whatsapp_auth');

const conversations = new Map();
const CONVO_TIMEOUT_MS = 15 * 60 * 1000;

let sock = null;
let status = 'disconnected';
let qrData = null;
let dbPool = null;
let appUrl = '';

setInterval(() => {
  const now = Date.now();
  for (const [phone, state] of conversations) {
    if (now - state.lastActivity > CONVO_TIMEOUT_MS) {
      conversations.delete(phone);
    }
  }
}, 5 * 60 * 1000);

export function setPool(pool) {
  dbPool = pool;
}

export function setAppUrl(url) {
  appUrl = url || '';
}

export function getStatus() {
  return { status, qr: status === 'qr' ? qrData : null };
}

async function generateQRImage(text) {
  try {
    return await QRCode.toDataURL(text, { width: 300, margin: 2 });
  } catch {
    return null;
  }
}

async function sendMsg(jid, text) {
  if (!sock || status !== 'connected') return;
  try {
    await sock.sendMessage(jid, { text });
  } catch (e) {
    console.error('[WhatsApp] Send error:', e.message);
  }
}

async function sendDoc(jid, buffer, fileName, caption) {
  if (!sock || status !== 'connected') return;
  try {
    await sock.sendMessage(jid, {
      document: buffer,
      mimetype: 'application/pdf',
      fileName,
      caption: caption || '',
    });
  } catch (e) {
    console.error('[WhatsApp] Send document error:', e.message);
  }
}

async function getCompanySettings() {
  if (!dbPool) return {};
  try {
    const result = await dbPool.query('SELECT * FROM settings ORDER BY id LIMIT 1');
    return result.rows[0] || {};
  } catch {
    return {};
  }
}

function normPhone(jid) {
  return jid.split('@')[0];
}

function fmtCurrency(value) {
  return `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtStatus(s) {
  const map = {
    pendente: 'Pendente',
    em_aberto: 'Em Aberto',
    aprovado: 'Aprovado',
    recusado: 'Recusado',
    em_producao: 'Em Produção',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
    entregue: 'Entregue',
    nova: 'Nova',
    em_andamento: 'Em Andamento',
  };
  return map[s] || s;
}

function fmtDate(d) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('pt-BR');
  } catch {
    return String(d);
  }
}

async function getLink(path) {
  if (!appUrl) return null;
  let base = appUrl.replace(/\/$/, '');
  
  // Se a base já termina com o path solicitado, não adiciona novamente
  if (path && base.endsWith(path)) {
    return base;
  }
  
  return `${base}${path}`;
}

async function handleMessage(jid, text) {
  const phone = normPhone(jid);
  const now = Date.now();
  const input = text.trim();
  const lc = input.toLowerCase();

  const RESET_WORDS = ['oi', 'olá', 'ola', 'menu', 'início', 'inicio', 'comecar', 'começar', '0'];

  if (!conversations.has(phone) || RESET_WORDS.includes(lc)) {
    conversations.set(phone, { step: 'menu', lastActivity: now, data: {} });
    await sendMenu(jid);
    return;
  }

  const state = conversations.get(phone);
  state.lastActivity = now;

  if (state.step === 'menu') {
    if (input === '1') {
      state.step = 'awaiting_has_registration';
      await sendMsg(jid, '📋 *Solicitar Orçamento*\n\nVocê já tem cadastro conosco?\n\nResponda *sim* ou *não*.\n\n_Digite *menu* a qualquer momento para voltar ao início._');
    } else if (input === '2') {
      state.step = 'awaiting_cpf';
      await sendMsg(jid, '🔍 *Consultar Orçamentos*\n\nPor favor, informe seu *CPF ou CNPJ* (pode incluir pontuação ou somente números):\n\nExemplo: _123.456.789-00_ ou _12345678900_');
    } else if (input === '3') {
      const link = await getLink('/ClientPortal');
      const msg = link
        ? `🔧 *Acompanhar Minhas O.S.*\n\nAcesse o link abaixo para acompanhar o status das suas Ordens de Serviço:\n\n🔗 ${link}\n\n_Faça login com suas credenciais para visualizar suas ordens._`
        : `🔧 *Acompanhar Minhas O.S.*\n\nEntre em contato com nossa equipe para verificar o status da sua O.S. Responda com *4* para falar com o suporte.`;
      await sendMsg(jid, msg);
      conversations.delete(phone);
    } else if (input === '4') {
      await sendMsg(jid, '💬 *Suporte*\n\nObrigado por entrar em contato! ⏳\n\nUm membro da nossa equipe já vai te atender!\n\n_Horário de atendimento: Seg–Sex, 8h às 18h._');
      conversations.delete(phone);
    } else {
      await sendMsg(jid, '❓ Opção não reconhecida. Responda com *1*, *2*, *3* ou *4*.\n\nDigite *menu* para ver o cardápio novamente.');
    }
  } else if (state.step === 'awaiting_has_registration') {
    const YES = ['sim', 's', 'yes', '1', 'tenho', 'já tenho', 'ja tenho'];
    const NO = ['não', 'nao', 'n', 'no', 'não tenho', 'nao tenho', 'nunca', 'novo'];

    if (YES.includes(lc)) {
      const link = await getLink('/ClientBudgetRequest');
      const msg = link
        ? `✅ Perfeito! Acesse o link abaixo para preencher seu pedido de orçamento:\n\n🔗 ${link}\n\nNossos especialistas analisarão e entrarão em contato em breve! 😊`
        : `✅ Perfeito! Entre em contato conosco diretamente para solicitar seu orçamento. Responda com *4* para falar com nossa equipe!`;
      await sendMsg(jid, msg);
      conversations.delete(phone);
    } else if (NO.includes(lc)) {
      const link = await getLink('/ClientRegister');
      const msg = link
        ? `👤 *Novo Cadastro*\n\nSem problema! Primeiro faça seu cadastro acessando o link abaixo:\n\n🔗 ${link}\n\nApós o cadastro, você poderá solicitar seu orçamento diretamente pelo formulário! 😊`
        : `👤 *Novo Cadastro*\n\nEntre em contato com nossa equipe para realizar seu cadastro. Responda com *4* para falar com o suporte.`;
      await sendMsg(jid, msg);
      conversations.delete(phone);
    } else {
      await sendMsg(jid, '❓ Não entendi. Responda *sim* se já tem cadastro ou *não* se for novo cliente.\n\nDigite *menu* para voltar ao início.');
    }
  } else if (state.step === 'awaiting_cpf') {
    const digits = input.replace(/\D/g, '');
    if (digits.length < 11) {
      await sendMsg(jid, '⚠️ CPF/CNPJ inválido. Envie pelo menos 11 dígitos.\n\nExemplo: _12345678900_\n\nOu digite *menu* para voltar ao início.');
      return;
    }
    try {
      if (!dbPool) throw new Error('DB unavailable');

      const clientResult = await dbPool.query(
        `SELECT id, name FROM clients
         WHERE replace(replace(replace(cpf_cnpj,'.',''),'-',''),'/','') = $1
            OR replace(replace(cpf_cnpj,'.',''),'-','') = $1
            OR cpf_cnpj ILIKE $2
         LIMIT 1`,
        [digits, `%${input}%`]
      );

      if (clientResult.rows.length === 0) {
        await sendMsg(jid, `🔍 Nenhum cadastro encontrado para o CPF/CNPJ *${input}*.\n\nVerifique se o número está correto ou contate o suporte (opção *4*).\n\nDigite *menu* para voltar ao início.`);
        conversations.delete(phone);
        return;
      }

      const client = clientResult.rows[0];

      const budgetsResult = await dbPool.query(
        `SELECT * FROM budgets
         WHERE (client_id = $1 OR client_name ILIKE $2)
           AND status NOT IN ('cancelado', 'recusado')
         ORDER BY created_date DESC
         LIMIT 5`,
        [client.id, `%${client.name}%`]
      );

      if (budgetsResult.rows.length === 0) {
        await sendMsg(jid, `🔍 Nenhum orçamento em aberto para *${client.name}*.\n\nPara solicitar um novo orçamento, responda com *1*.\n\nDigite *menu* para voltar ao início.`);
        conversations.delete(phone);
        return;
      }

      const company = await getCompanySettings();
      const count = budgetsResult.rows.length;

      await sendMsg(jid, `📊 *${count} orçamento(s) encontrado(s) para ${client.name}.*\n\nEnviando os PDFs agora, aguarde...`);

      for (const budget of budgetsResult.rows) {
        try {
          const pdfBuffer = await generateBudgetPDF(budget, company);
          const valor = fmtCurrency(budget.total_with_margin || budget.total);
          const status = fmtStatus(budget.status);
          const fileName = `Orcamento_${budget.id}_${(budget.job || 'GestãoPro').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}.pdf`;
          const caption = `📄 *Orçamento #${budget.id}*\n• Job: ${budget.job || '-'}\n• Status: ${status}\n• Valor: ${valor}\n• Emissão: ${fmtDate(budget.emission_date)}\n• Validade: ${fmtDate(budget.validity_date)}`;
          await sendDoc(jid, pdfBuffer, fileName, caption);
          await new Promise(r => setTimeout(r, 800));
        } catch (pdfErr) {
          console.error(`[WhatsApp Bot] PDF generation error for budget ${budget.id}:`, pdfErr.message);
          await sendMsg(jid, `⚠️ Não foi possível gerar o PDF do Orçamento #${budget.id}. Status: ${fmtStatus(budget.status)} — Valor: ${fmtCurrency(budget.total_with_margin || budget.total)}`);
        }
      }

      await sendMsg(jid, `✅ PDFs enviados!\n\nDigite *menu* para outras opções ou *1* para solicitar um novo orçamento.`);
    } catch (e) {
      console.error('[WhatsApp Bot] CPF lookup error:', e.message);
      await sendMsg(jid, '⚠️ Erro ao consultar seus orçamentos. Por favor, tente novamente mais tarde ou contate o suporte (opção *4*).');
    }
    conversations.delete(phone);
  }
}

async function sendMenu(jid) {
  const menu = `Olá! 👋 Bem-vindo ao atendimento automático!\n\nEscolha uma opção:\n\n1️⃣ *Solicitar orçamento*\n2️⃣ *Consultar meus orçamentos* (via CPF/CNPJ)\n3️⃣ *Acompanhar status da minha O.S.*\n4️⃣ *Falar com suporte*\n\n_Responda com o número da opção desejada._\n_Digite *menu* a qualquer momento para voltar aqui._`;
  await sendMsg(jid, menu);
}

export async function connect() {
  if (status === 'connected' || status === 'connecting') {
    return { success: false, message: 'Já conectando ou conectado' };
  }

  status = 'connecting';
  qrData = null;

  try {
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    sock = makeWASocket({
      version,
      auth: state,
      logger: P({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['GestãoPro', 'Chrome', '120.0.0'],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        status = 'qr';
        qrData = await generateQRImage(qr);
        console.log('[WhatsApp] QR code gerado, aguardando leitura...');
      }

      if (connection === 'close') {
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        console.log('[WhatsApp] Conexão encerrada, código:', reason);

        if (reason === DisconnectReason.loggedOut) {
          console.log('[WhatsApp] Deslogado. Sessão removida.');
          status = 'disconnected';
          sock = null;
          qrData = null;
          try {
            const { rm } = await import('fs/promises');
            await rm(AUTH_DIR, { recursive: true, force: true });
          } catch {}
        } else {
          status = 'disconnected';
          sock = null;
          if (reason !== DisconnectReason.timedOut) {
            console.log('[WhatsApp] Reconectando em 5s...');
            setTimeout(connect, 5000);
          }
        }
      } else if (connection === 'open') {
        status = 'connected';
        qrData = null;
        console.log('[WhatsApp] Conectado com sucesso!');
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        if (!msg.message) continue;
        const jid = msg.key.remoteJid;
        if (!jid || jid.endsWith('@g.us')) continue;

        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          '';
        if (!text) continue;

        console.log(`[WhatsApp Bot] Mensagem de ${jid}: ${text}`);
        await handleMessage(jid, text);
      }
    });

    return { success: true };
  } catch (e) {
    status = 'disconnected';
    sock = null;
    console.error('[WhatsApp] Falha ao conectar:', e.message);
    return { success: false, message: e.message };
  }
}

export async function disconnect() {
  if (sock) {
    try {
      await sock.logout();
    } catch {}
    sock = null;
  }
  status = 'disconnected';
  qrData = null;
  conversations.clear();

  try {
    const { rm } = await import('fs/promises');
    await rm(AUTH_DIR, { recursive: true, force: true });
  } catch {}

  return { success: true };
}

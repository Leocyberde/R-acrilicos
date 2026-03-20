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
      const link = await getLink('/ClientBudgetRequest');
      const msg = link
        ? `📋 *Solicitar Orçamento*\n\nAcesse o link abaixo para preencher seu pedido de orçamento:\n\n🔗 ${link}\n\nNossos especialistas analisarão sua solicitação e entrarão em contato em breve! 😊`
        : `📋 *Solicitar Orçamento*\n\nEntre em contato conosco diretamente para solicitar seu orçamento. Responda com *4* para falar com nossa equipe!`;
      await sendMsg(jid, msg);
      conversations.delete(phone);
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
        `SELECT id, job, status, total_with_margin, total, emission_date, validity_date
         FROM budgets
         WHERE (client_id = $1 OR client_name ILIKE $2)
           AND status NOT IN ('cancelado', 'recusado')
         ORDER BY created_date DESC
         LIMIT 8`,
        [client.id, `%${client.name}%`]
      );

      if (budgetsResult.rows.length === 0) {
        await sendMsg(jid, `🔍 Nenhum orçamento em aberto para *${client.name}*.\n\nPara solicitar um novo orçamento, responda com *1*.\n\nDigite *menu* para voltar ao início.`);
      } else {
        const lines = budgetsResult.rows.map((b, i) => {
          const valor = fmtCurrency(b.total_with_margin || b.total);
          const st = fmtStatus(b.status);
          const emissao = fmtDate(b.emission_date);
          const validade = fmtDate(b.validity_date);
          return `${i + 1}. 📄 *${b.job || 'Orçamento #' + b.id}*\n   • Status: ${st}\n   • Valor: ${valor}\n   • Emissão: ${emissao}\n   • Validade: ${validade}`;
        });

        const portalLink = await getLink('/ClientPortal');
        const linkLine = portalLink ? `\n\n🔗 Acesse o portal completo: ${portalLink}` : '';
        const msg = `📊 *Orçamentos de ${client.name}:*\n\n${lines.join('\n\n')}${linkLine}\n\nDigite *menu* para outras opções.`;
        await sendMsg(jid, msg);
      }
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

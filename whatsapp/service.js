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
import { generateBudgetPDF, generateWorkOrderPDF } from './pdfGenerator.js';

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
let reconnectTimer = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

setInterval(() => {
  const now = Date.now();
  for (const [phone, state] of conversations) {
    if (now - state.lastActivity > CONVO_TIMEOUT_MS) {
      state.step = "menu";
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
  const raw = jid.split('@')[0];
  const base = raw.includes(':') ? raw.split(':')[0] : raw;
  return base.replace(/\D/g, '');
}

// Verifica se o valor extraído do JID é um número de telefone real (não LID interno do WhatsApp)
// LIDs são identificadores internos do WhatsApp multi-device com mais de 15 dígitos
function isValidPhoneFromJid(rawPhone) {
  const digits = rawPhone.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

// Retorna o número de telefone real para uso em formulários/banco de dados.
// Se o JID retornar um LID (>15 dígitos), usa o telefone cadastrado do cliente como fallback.
function resolveDisplayPhone(sessionPhone, client) {
  const digits = sessionPhone.replace(/\D/g, '');
  if (isValidPhoneFromJid(digits)) {
    return cleanPhoneDigits(digits);
  }
  // Fallback: número cadastrado do cliente
  if (client) {
    const registered = cleanPhoneDigits(client.mobile || client.phone || '');
    if (registered) return registered;
  }
  return ''; // não temos como inferir o número real
}

function cleanPhoneDigits(raw) {
  if (!raw) return "";
  const cleanRaw = raw.includes("@") ? raw.split("@")[0] : raw;
  let digits = cleanRaw.replace(/\D/g, "");
  // Se for Brasil (55) e tiver código do país, removemos para manter padrão local (DDD + número)
  if (digits.startsWith("55") && digits.length >= 12) {
    digits = digits.slice(2);
  }
  return digits;
}

function formatPhone(raw) {
  const local = cleanPhoneDigits(raw);
  if (!local) return "";
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return local;
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
  let base = appUrl.trim().replace(/\/$/, '');

  try {
    const parsed = new URL(base);
    base = parsed.origin;
  } catch {
    const match = base.match(/^(https?:\/\/[^/]+)/);
    if (match) base = match[1];
  }

  return `${base}${path}`;
}

async function findClientByPhone(phone) {
  if (!dbPool) return null;
  const clean = cleanPhoneDigits(phone);
  if (!clean) return null;

  // Gera variante com/sem o 9º dígito (padrão brasileiro)
  // Ex: "11987654321" (11 dígitos) → variante sem 9: "1187654321"
  // Ex: "1187654321"  (10 dígitos) → variante com 9: "11987654321"
  let variant = null;
  if (clean.length === 11) {
    // Tem 9º dígito — tenta sem ele
    const ddd = clean.slice(0, 2);
    const num = clean.slice(2);
    if (num.startsWith('9')) {
      variant = ddd + num.slice(1); // remove o 9
    }
  } else if (clean.length === 10) {
    // Sem 9º dígito — tenta com ele
    const ddd = clean.slice(0, 2);
    const num = clean.slice(2);
    variant = ddd + '9' + num;
  }

  const numbersToSearch = [clean];
  if (variant) numbersToSearch.push(variant);

  try {
    // Normaliza o campo do banco para comparar apenas dígitos
    const normalize = `regexp_replace(coalesce(mobile,''), '\\D', '', 'g')`;
    const normalizeP = `regexp_replace(coalesce(phone,''), '\\D', '', 'g')`;

    const params = [clean];
    let variantClause = '';
    if (variant) {
      params.push(variant);
      variantClause = `OR ${normalize} = $2 OR ${normalizeP} = $2`;
    }

    // 1. Busca nos campos mobile/phone do cliente
    // Priorizamos mobile (WhatsApp) sobre o telefone fixo
    const result = await dbPool.query(
      `SELECT *,
        CASE
          WHEN ${normalize} = $1 THEN 1
          WHEN ${normalizeP} = $1 THEN 2
          ${variant ? `WHEN ${normalize} = $2 THEN 3` : ''}
          ${variant ? `WHEN ${normalizeP} = $2 THEN 4` : ''}
          ELSE 5
        END AS match_priority
       FROM clients
       WHERE ${normalize} = $1 OR ${normalizeP} = $1
         ${variantClause}
       ORDER BY match_priority ASC, id ASC
       LIMIT 1`,
      params
    );
    if (result.rows.length > 0) return result.rows[0];

    // 2. Se não encontrou, busca na tabela client_phones (números adicionais vinculados)
    const phoneParams = numbersToSearch.map((_, i) => `$${i + 1}`).join(', ');
    const linkedResult = await dbPool.query(
      `SELECT c.* FROM clients c
       INNER JOIN client_phones cp ON cp.client_id = c.id
       WHERE cp.phone IN (${phoneParams})
       ORDER BY c.id ASC
       LIMIT 1`,
      numbersToSearch
    );
    return linkedResult.rows[0] || null;
  } catch (e) {
    console.error('[WhatsApp Bot] Error finding client:', e.message);
    return null;
  }
}

async function handleMessage(jid, text) {
  const phone = normPhone(jid);
  const now = Date.now();
  const input = text.trim();
  const lc = input.toLowerCase();

  const RESET_WORDS = ['oi', 'olá', 'ola', 'menu', 'início', 'inicio', 'comecar', 'começar', '0'];

  // Verifica se o cliente já existe pelo número de WhatsApp
  const client = await findClientByPhone(phone);

  if (!conversations.has(phone) || RESET_WORDS.includes(lc)) {
    if (client) {
      // Número reconhecido — usa nome do cliente cadastrado (razão social se CNPJ, primeiro nome se CPF)
      const displayName = client.person_type === 'juridica'
        ? (client.razao_social || client.name) // Usa razão social se existir, senão cai para o nome/empresa
        : client.name.split(' ')[0];
      conversations.set(phone, { step: 'menu', lastActivity: now, data: { client } });
      await sendMsg(jid, `Olá! 👋 *${displayName}*, bem-vindo ao atendimento automático!`);
      await sendMenu(jid);
    } else {
      // Número não cadastrado — oferece link de cadastro
      conversations.set(phone, { step: 'not_registered', lastActivity: now, data: {} });
      const registerLink = await getLink(`/ClientRegister`);
      await sendMsg(jid, '⚠️ Olá! Seu número não está cadastrado em nosso sistema.\n\nAcesse o link abaixo para realizar seu cadastro:');
      await new Promise(r => setTimeout(r, 800));
      await sendMsg(jid, registerLink || 'Entre em contato com nossa equipe para realizar o cadastro.');
    }
    return;
  }

  const state = conversations.get(phone);
  state.lastActivity = now;

  // Número não cadastrado — reenvia o link de cadastro a cada mensagem
  if (state.step === 'not_registered') {
    const registerLink = await getLink(`/ClientRegister`);
    await sendMsg(jid, '⚠️ Seu número não está cadastrado. Use o link abaixo para se cadastrar:');
    await new Promise(r => setTimeout(r, 800));
    await sendMsg(jid, registerLink || 'Entre em contato com nossa equipe para realizar o cadastro.');
    return;
  }

  if (state.step === 'menu') {
    const currentClient = state.data.client;
    
    if (input === '1') {
      const link = await getLink(`/ClientBudgetRequest`);
      await sendMsg(jid, "Acesse o link abaixo para preencher seu pedido de orçamento:"); 
      await new Promise(r => setTimeout(r, 1000)); 
      await sendMsg(jid, link);
      state.step = "menu";
      return;
    } else if (input === '2') {
      // Consultar orçamentos
      if (!currentClient) {
        await sendMsg(jid, '⚠️ Para consultar orçamentos, você precisa estar cadastrado.');
        state.step = "menu";
        return;
      }
      
      await sendMsg(jid, `📊 Buscando orçamentos para *${currentClient.name}*...`);
      
      const budgetsResult = await dbPool.query(
        `SELECT * FROM budgets
         WHERE (client_id = $1 OR client_name ILIKE $2)
           AND status NOT IN ('cancelado', 'recusado')
         ORDER BY created_date DESC
         LIMIT 5`,
        [currentClient.id, `%${currentClient.name}%`]
      );

      if (budgetsResult.rows.length === 0) {
        await sendMsg(jid, `🔍 Nenhum orçamento em aberto encontrado.`);
      } else {
        const company = await getCompanySettings();
        for (const budget of budgetsResult.rows) {
          try {
            const pdfBuffer = await generateBudgetPDF(budget, company);
            const valor = fmtCurrency(budget.total_with_margin || budget.total);
            const status = fmtStatus(budget.status);
            const fileName = `Orcamento_${budget.id}.pdf`;
            const caption = `📄 *Orçamento #${budget.id}*\n• Job: ${budget.job || '-'}\n• Status: ${status}\n• Valor: ${valor}`;
            await sendDoc(jid, pdfBuffer, fileName, caption);
          } catch (e) {
            await sendMsg(jid, `⚠️ Erro ao gerar PDF do Orçamento #${budget.id}`);
          }
        }
      }
      state.step = "menu";
    } else if (input === '3') {
      // Acompanhar O.S.
      if (!currentClient) {
        await sendMsg(jid, '⚠️ Para acompanhar suas O.S., você precisa estar cadastrado.');
        state.step = "menu";
        return;
      }

      await sendMsg(jid, `🔧 Buscando Ordens de Serviço para *${currentClient.name}*...`);

      const ordersResult = await dbPool.query(
        `SELECT * FROM work_orders
         WHERE (client_id = $1 OR client_name ILIKE $2)
           AND status NOT IN ('cancelado')
         ORDER BY created_date DESC
         LIMIT 5`,
        [currentClient.id, `%${currentClient.name}%`]
      );

      if (ordersResult.rows.length === 0) {
        await sendMsg(jid, `🔍 Nenhuma Ordem de Serviço encontrada.`);
      } else {
        const company = await getCompanySettings();
        for (const order of ordersResult.rows) {
          try {
            const pdfBuffer = await generateWorkOrderPDF(order, company);
            const statusLabel = fmtStatus(order.status);
            const fileName = `OS_${order.id}.pdf`;
            const caption = `📋 *O.S. #${order.id}*\n• Status: ${statusLabel}\n• Data: ${fmtDate(order.created_date)}`;
            await sendDoc(jid, pdfBuffer, fileName, caption);
          } catch (e) {
            await sendMsg(jid, `⚠️ Erro ao gerar PDF da O.S. #${order.id}`);
          }
        }
      }
      state.step = "menu";
    } else if (input === '4') {
      await sendMsg(jid, '💬 *Suporte*\n\nUm membro da nossa equipe já vai te atender! ⏳');
      state.step = "menu";
    } else {
      await sendMsg(jid, '❓ Opção inválida. Responda com *1*, *2*, *3* ou *4*.');
    }
  }
}

async function sendMenu(jid, isRegistered = false) {
  const menu = `Escolha uma opção:\n\n1️⃣ *Solicitar orçamento*\n2️⃣ *Consultar meus orçamentos*\n3️⃣ *Acompanhar status da minha O.S.*\n4️⃣ *Falar com suporte*`;
  await sendMsg(jid, menu);
}

function scheduleReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.log(`[WhatsApp] Limite de ${MAX_RECONNECT_ATTEMPTS} reconexões atingido. Reconexão manual necessária.`);
    status = 'disconnected';
    return;
  }
  const delay = Math.min(5000 * Math.pow(1.5, reconnectAttempts), 60000);
  reconnectAttempts++;
  console.log(`[WhatsApp] Reconectando em ${Math.round(delay / 1000)}s (tentativa ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
  reconnectTimer = setTimeout(connect, delay);
}

export async function connect() {
  if (status === 'connected' || status === 'connecting') {
    return { success: false, message: 'Já conectando ou conectado' };
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
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
        sock = null;
        qrData = null;

        if (reason === DisconnectReason.loggedOut) {
          console.log('[WhatsApp] Sessão encerrada (logout). Limpando dados de autenticação...');
          status = 'disconnected';
          reconnectAttempts = 0;
          try {
            const { rm } = await import('fs/promises');
            await rm(AUTH_DIR, { recursive: true, force: true });
          } catch {}
        } else {
          status = 'disconnected';
          scheduleReconnect();
        }
      } else if (connection === 'open') {
        // Ignora eventos duplicados de 'open'
        if (status === 'connected') return;
        status = 'connected';
        qrData = null;
        reconnectAttempts = 0;
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
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

        await handleMessage(jid, text);
      }
    });

    return { success: true };
  } catch (e) {
    status = 'disconnected';
    sock = null;
    return { success: false, message: e.message };
  }
}

export async function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempts = 0;

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

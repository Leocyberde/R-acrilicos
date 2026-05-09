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
import { generateBudgetPDF, generateWorkOrderPDF, generateReceiptPDF } from './pdfGenerator.js';

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

// FIX #4 — Cache em memória para configurações da empresa (TTL: 10 minutos)
let _companyCache = null;
let _companyCacheAt = 0;
const COMPANY_CACHE_TTL_MS = 10 * 60 * 1000;

// FIX #5 — Limpeza completa do estado ao expirar sessão
setInterval(() => {
  const now = Date.now();
  for (const [phone, state] of conversations) {
    if (now - state.lastActivity > CONVO_TIMEOUT_MS) {
      // Reseta o step E apaga os dados do cliente para forçar nova consulta no banco
      state.step = 'menu';
      state.data = {};
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

// FIX #4 — Cache com TTL para evitar queries repetidas ao banco para dados que raramente mudam
async function getCompanySettings() {
  if (!dbPool) return {};
  if (_companyCache && Date.now() - _companyCacheAt < COMPANY_CACHE_TTL_MS) {
    return _companyCache;
  }
  try {
    const result = await dbPool.query(
      'SELECT id, name, cnpj, phone, email, address, logo_url FROM settings ORDER BY id LIMIT 1'
    );
    _companyCache = result.rows[0] || {};
    _companyCacheAt = Date.now();
    return _companyCache;
  } catch {
    return _companyCache || {};
  }
}

function normPhone(jid) {
  const raw = jid.split('@')[0];
  const base = raw.includes(':') ? raw.split(':')[0] : raw;
  return base.replace(/\D/g, '');
}

function isValidPhoneFromJid(rawPhone) {
  const digits = rawPhone.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

function resolveDisplayPhone(sessionPhone, client) {
  const digits = sessionPhone.replace(/\D/g, '');
  if (isValidPhoneFromJid(digits)) {
    return cleanPhoneDigits(digits);
  }
  if (client) {
    const registered = cleanPhoneDigits(client.mobile || client.phone || '');
    if (registered) return registered;
  }
  return '';
}

function cleanPhoneDigits(raw) {
  if (!raw) return '';
  const cleanRaw = raw.includes('@') ? raw.split('@')[0] : raw;
  let digits = cleanRaw.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.slice(2);
  }
  return digits;
}

function formatPhone(raw) {
  const local = cleanPhoneDigits(raw);
  if (!local) return '';
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

async function getLink(p) {
  if (!appUrl) return null;
  let base = appUrl.trim().replace(/\/$/, '');
  try {
    const parsed = new URL(base);
    base = parsed.origin;
  } catch {
    const match = base.match(/^(https?:\/\/[^/]+)/);
    if (match) base = match[1];
  }
  return `${base}${p}`;
}

async function findClientByPhone(phone) {
  if (!dbPool) return null;
  const clean = cleanPhoneDigits(phone);
  if (!clean) return null;

  let variant = null;
  if (clean.length === 11) {
    const ddd = clean.slice(0, 2);
    const num = clean.slice(2);
    if (num.startsWith('9')) variant = ddd + num.slice(1);
  } else if (clean.length === 10) {
    variant = clean.slice(0, 2) + '9' + clean.slice(2);
  }

  const numbersToSearch = [clean];
  if (variant) numbersToSearch.push(variant);

  try {
    // FIX #7 — Seleciona apenas as colunas usadas pelo bot (evita tráfego desnecessário)
    const normalize = `regexp_replace(coalesce(mobile,''), '\\D', '', 'g')`;
    const normalizeP = `regexp_replace(coalesce(phone,''), '\\D', '', 'g')`;
    const params = [clean];
    let variantClause = '';
    if (variant) {
      params.push(variant);
      variantClause = `OR ${normalize} = $2 OR ${normalizeP} = $2`;
    }

    const result = await dbPool.query(
      `SELECT id, name, razao_social, person_type, mobile, phone,
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

    const phoneParams = numbersToSearch.map((_, i) => `$${i + 1}`).join(', ');
    const linkedResult = await dbPool.query(
      `SELECT c.id, c.name, c.razao_social, c.person_type, c.mobile, c.phone
       FROM clients c
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

// FIX #9 — Indicador de "digitando" nativo do Baileys em vez de setTimeout hardcoded
async function sendTyping(jid, durationMs = 800) {
  if (!sock || status !== 'connected') return;
  try {
    await sock.sendPresenceUpdate('composing', jid);
    await new Promise(r => setTimeout(r, durationMs));
    await sock.sendPresenceUpdate('paused', jid);
  } catch {
    // Se falhar, apenas aguarda o tempo sem o indicador visual
    await new Promise(r => setTimeout(r, durationMs));
  }
}

async function handleMessage(jid, text) {
  const phone = normPhone(jid);
  const now = Date.now();
  const input = text.trim();
  const lc = input.toLowerCase();

  const RESET_WORDS = ['oi', 'olá', 'ola', 'menu', 'início', 'inicio', 'comecar', 'começar', '0'];

  // FIX #1 — Reutiliza dados do cliente já em memória se a sessão existir e não for reset
  const existingState = conversations.get(phone);
  const isReset = !existingState || RESET_WORDS.includes(lc);

  let client;
  if (isReset || !existingState?.data?.client) {
    // Só vai ao banco se for início/reset de conversa ou se ainda não tiver o cliente em memória
    client = await findClientByPhone(phone);
  } else {
    client = existingState.data.client;
  }

  if (isReset) {
    if (client) {
      const displayName =
        client.person_type === 'juridica'
          ? client.razao_social || client.name
          : client.name.split(' ')[0];
      conversations.set(phone, { step: 'menu', lastActivity: now, data: { client } });
      await sendMsg(jid, `Olá! 👋 *${displayName}*, bem-vindo ao atendimento automático!`);
      await sendMenu(jid);
    } else {
      conversations.set(phone, { step: 'not_registered', lastActivity: now, data: {} });
      const registerLink = await getLink('/ClientRegister');
      await sendMsg(jid, '⚠️ Olá! Seu número não está cadastrado em nosso sistema.\n\nAcesse o link abaixo para realizar seu cadastro:');
      await sendTyping(jid, 800); // FIX #9
      await sendMsg(jid, registerLink || 'Entre em contato com nossa equipe para realizar o cadastro.');
    }
    return;
  }

  const state = conversations.get(phone);
  state.lastActivity = now;

  if (state.step === 'not_registered') {
    const registerLink = await getLink('/ClientRegister');
    await sendMsg(jid, '⚠️ Seu número não está cadastrado. Use o link abaixo para se cadastrar:');
    await sendTyping(jid, 800); // FIX #9
    await sendMsg(jid, registerLink || 'Entre em contato com nossa equipe para realizar o cadastro.');
    return;
  }

  if (state.step === 'menu') {
    const currentClient = state.data.client;

    if (input === '1') {
      const p = currentClient
        ? `/ClientBudgetRequest?client=${currentClient.id}`
        : '/ClientBudgetRequest';
      const link = await getLink(p);
      await sendMsg(jid, 'Acesse o link abaixo para preencher seu pedido de orçamento:');
      await sendTyping(jid, 1000); // FIX #9
      await sendMsg(jid, link);
      state.step = 'menu';
      return;

    } else if (input === '2') {
      if (!currentClient) {
        await sendMsg(jid, '⚠️ Para consultar orçamentos, você precisa estar cadastrado.');
        state.step = 'menu';
        return;
      }

      await sendMsg(jid, `📊 Buscando orçamentos para *${currentClient.name}*...`);

      // FIX #6 — Remove ILIKE por nome (impreciso e custoso); filtra apenas por client_id
      // FIX #7 — Seleciona apenas as colunas usadas pelo bot
      const budgetsResult = await dbPool.query(
        `SELECT id, job, status, total, total_with_margin, producer, created_date
         FROM budgets
         WHERE client_id = $1
           AND status NOT IN ('cancelado', 'recusado')
         ORDER BY created_date DESC
         LIMIT 5`,
        [currentClient.id]
      );

      if (budgetsResult.rows.length === 0) {
        await sendMsg(jid, '🔍 Nenhum orçamento em aberto encontrado.');
      } else {
        // FIX #2 — getCompanySettings chamada UMA vez, fora do loop
        // FIX #4 — resultado vem do cache em memória (sem query ao banco)
        const company = await getCompanySettings();

        // FIX #3 — Geração e envio de PDFs em paralelo (Promise.all)
        await Promise.all(
          budgetsResult.rows.map(async (budget) => {
            try {
              const pdfBuffer = await generateBudgetPDF(budget, company);
              const valor = fmtCurrency(budget.total_with_margin || budget.total);
              const statusLabel = fmtStatus(budget.status);
              const fileName = `Orcamento_${budget.id}.pdf`;
              const produtor = budget.producer ? `\n• Produtor: ${budget.producer}` : '';
              const caption = `📄 *Orçamento #${budget.id}*\n• Job: ${budget.job || '-'}${produtor}\n• Status: ${statusLabel}\n• Valor: ${valor}`;
              await sendDoc(jid, pdfBuffer, fileName, caption);
            } catch {
              await sendMsg(jid, `⚠️ Erro ao gerar PDF do Orçamento #${budget.id}`);
            }
          })
        );
      }
      state.step = 'menu';

    } else if (input === '3') {
      if (!currentClient) {
        await sendMsg(jid, '⚠️ Para acompanhar suas O.S., você precisa estar cadastrado.');
        state.step = 'menu';
        return;
      }

      await sendMsg(jid, `🔧 Buscando Ordens de Serviço para *${currentClient.name}*...`);

      // FIX #6 — Remove ILIKE por nome; filtra apenas por client_id
      // FIX #7 — Seleciona apenas as colunas usadas pelo bot
      const ordersResult = await dbPool.query(
        `SELECT id, status, created_date
         FROM work_orders
         WHERE client_id = $1
           AND status NOT IN ('cancelado')
         ORDER BY created_date DESC
         LIMIT 5`,
        [currentClient.id]
      );

      if (ordersResult.rows.length === 0) {
        await sendMsg(jid, '🔍 Nenhuma Ordem de Serviço encontrada.');
      } else {
        // FIX #2 — getCompanySettings chamada UMA vez, fora do loop
        // FIX #4 — resultado vem do cache em memória
        const company = await getCompanySettings();

        // FIX #3 — Geração e envio de PDFs em paralelo (Promise.all)
        await Promise.all(
          ordersResult.rows.map(async (order) => {
            try {
              const pdfBuffer = await generateWorkOrderPDF(order, company);
              const statusLabel = fmtStatus(order.status);
              const fileName = `OS_${order.id}.pdf`;
              const caption = `📋 *O.S. #${order.id}*\n• Status: ${statusLabel}\n• Data: ${fmtDate(order.created_date)}`;
              await sendDoc(jid, pdfBuffer, fileName, caption);
            } catch {
              await sendMsg(jid, `⚠️ Erro ao gerar PDF da O.S. #${order.id}`);
            }
          })
        );
      }
      state.step = 'menu';

    } else if (input === '4') {
      await sendMsg(jid, '💬 *Suporte*\n\nUm membro da nossa equipe já vai te atender! ⏳');
      state.step = 'menu';
    } else {
      await sendMsg(jid, '❓ Opção inválida. Responda com *1*, *2*, *3* ou *4*.');
    }
  }
}

// FIX #8 — Parâmetro isRegistered removido pois nunca foi utilizado
async function sendMenu(jid) {
  const menu = `Escolha uma opção:\n\n1️⃣ *Solicitar orçamento*\n2️⃣ *Consultar meus orçamentos*\n3️⃣ *Acompanhar status da minha O.S.*\n4️⃣ *Falar com suporte*`;
  await sendMsg(jid, menu);
}

// FIX #10 — Logs de reconexão rebaixados para console.warn para não poluir logs de produção
function scheduleReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn(`[WhatsApp] Limite de ${MAX_RECONNECT_ATTEMPTS} reconexões atingido. Reconexão manual necessária.`);
    status = 'disconnected';
    return;
  }
  const delay = Math.min(5000 * Math.pow(1.5, reconnectAttempts), 60000);
  reconnectAttempts++;
  console.warn(`[WhatsApp] Reconectando em ${Math.round(delay / 1000)}s (tentativa ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
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
        const rawJid = msg.key.remoteJid;
        if (!rawJid || rawJid.endsWith('@g.us')) continue;

        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          '';
        if (!text) continue;

        let jid = rawJid;
        if (rawJid.endsWith('@lid')) {
          if (msg.key.remoteJidAlt && !msg.key.remoteJidAlt.endsWith('@lid')) {
            jid = msg.key.remoteJidAlt;
          } else {
            try {
              const pn = await sock.signalRepository?.lidMapping?.getPNForLID?.(rawJid);
              if (pn) {
                jid = pn;
              } else {
                console.warn('[WhatsApp Bot] Não foi possível resolver LID para PN: %s', rawJid);
              }
            } catch (e) {
              console.warn('[WhatsApp Bot] Erro ao resolver LID:', e.message);
            }
          }
        }

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

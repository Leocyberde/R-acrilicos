import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi_boom';
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
  try {
    // Procura por mobile ou phone que contenha o número do WhatsApp
    const result = await dbPool.query(
      `SELECT * FROM clients 
       WHERE mobile LIKE $1 OR phone LIKE $1 
       OR replace(replace(replace(replace(mobile, ' ', ''), '-', ''), '(', ''), ')', '') LIKE $2
       OR replace(replace(replace(replace(phone, ' ', ''), '-', ''), '(', ''), ')', '') LIKE $2
       LIMIT 1`,
      [`%${phone}%`, `%${phone.slice(-8)}%`]
    );
    return result.rows[0] || null;
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
    conversations.set(phone, { step: 'menu', lastActivity: now, data: { client } });
    
    if (client) {
      // Se já tem cadastro, chama pelo nome e manda o menu diretamente
      const name = client.person_type === 'juridica' ? client.name : client.name.split(' ')[0];
      await sendMsg(jid, `Olá! 👋 *${name}*, bem-vindo ao atendimento automático!`);
      await sendMenu(jid, true);
    } else {
      // Se não tem cadastro, pergunta
      await sendMsg(jid, 'Olá! 👋 Seja bem-vindo, escolha uma das opções abaixo:\n\n1️⃣ *Tenho cadastro*\n2️⃣ *Não tenho cadastro*');
      conversations.get(phone).step = 'initial_check';
    }
    return;
  }

  const state = conversations.get(phone);
  state.lastActivity = now;

  if (state.step === 'initial_check') {
    if (input === '1') {
      // O usuário diz que tem cadastro, mas não identificamos pelo número
      state.step = 'awaiting_cpf_identification';
      await sendMsg(jid, 'Para eu te identificar, por favor informe seu *CPF ou CNPJ*:');
    } else if (input === '2') {
      const link = await getLink(`/ClientRegister?whatsapp=${phone}`);
      await sendMsg(jid, `Acesse o link abaixo e realize seu cadastro:\n\n🔗 Link: ${link}`);
      conversations.delete(phone);
    } else {
      await sendMsg(jid, 'Opção inválida. Escolha *1* ou *2*.');
    }
  } else if (state.step === 'awaiting_cpf_identification') {
    const digits = input.replace(/\D/g, '');
    if (digits.length < 11) {
      await sendMsg(jid, '⚠️ CPF/CNPJ inválido. Envie pelo menos 11 dígitos.');
      return;
    }
    
    const clientResult = await dbPool.query(
      `SELECT * FROM clients
       WHERE replace(replace(replace(cpf_cnpj,'.',''),'-',''),'/','') = $1
          OR replace(replace(cpf_cnpj,'.',''),'-','') = $1
       LIMIT 1`,
      [digits]
    );

    if (clientResult.rows.length > 0) {
      const foundClient = clientResult.rows[0];
      state.data.client = foundClient;
      // Vincula o WhatsApp ao cadastro
      await dbPool.query('UPDATE clients SET mobile = $1 WHERE id = $2', [phone, foundClient.id]);
      
      const name = foundClient.person_type === 'juridica' ? foundClient.name : foundClient.name.split(' ')[0];
      await sendMsg(jid, `Cadastro localizado! Olá *${name}*.`);
      await sendMenu(jid, true);
      state.step = 'menu';
    } else {
      await sendMsg(jid, 'Não encontrei seu cadastro com esse CPF/CNPJ. Deseja tentar novamente ou fazer um novo cadastro?\n\n1️⃣ Tentar CPF/CNPJ novamente\n2️⃣ Fazer novo cadastro');
      state.step = 'initial_check';
    }
  } else if (state.step === 'menu') {
    const currentClient = state.data.client;
    
    if (input === '1') {
      // Solicitar orçamento
      const params = currentClient ? `?name=${encodeURIComponent(currentClient.name)}&whatsapp=${encodeURIComponent(phone)}&email=${encodeURIComponent(currentClient.email || '')}` : '';
      const link = await getLink(`/ClientBudgetRequest${params}`);
      await sendMsg(jid, `✅ Acesse o link abaixo para preencher seu pedido de orçamento:\n\n🔗 ${link}`);
      conversations.delete(phone);
    } else if (input === '2') {
      // Consultar orçamentos
      if (!currentClient) {
        await sendMsg(jid, '⚠️ Para consultar orçamentos, você precisa estar cadastrado.');
        conversations.delete(phone);
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
      conversations.delete(phone);
    } else if (input === '3') {
      // Acompanhar O.S.
      if (!currentClient) {
        await sendMsg(jid, '⚠️ Para acompanhar suas O.S., você precisa estar cadastrado.');
        conversations.delete(phone);
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
      conversations.delete(phone);
    } else if (input === '4') {
      await sendMsg(jid, '💬 *Suporte*\n\nUm membro da nossa equipe já vai te atender! ⏳');
      conversations.delete(phone);
    } else {
      await sendMsg(jid, '❓ Opção inválida. Responda com *1*, *2*, *3* ou *4*.');
    }
  }
}

async function sendMenu(jid, isRegistered = false) {
  const menu = `Escolha uma opção:\n\n1️⃣ *Solicitar orçamento*\n2️⃣ *Consultar meus orçamentos*\n3️⃣ *Acompanhar status da minha O.S.*\n4️⃣ *Falar com suporte*`;
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
        if (reason === DisconnectReason.loggedOut) {
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
          setTimeout(connect, 5000);
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

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'gestao-pro-secret-2024';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.random().toString(36).slice(2);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use('/uploads', express.static(uploadsDir));

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        full_name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        created_date TIMESTAMP DEFAULT NOW(),
        updated_date TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_permissions (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        budgets BOOLEAN DEFAULT FALSE,
        work_orders BOOLEAN DEFAULT FALSE,
        receipts BOOLEAN DEFAULT FALSE,
        financial BOOLEAN DEFAULT FALSE,
        production BOOLEAN DEFAULT FALSE,
        accounts_receivable BOOLEAN DEFAULT FALSE,
        clients BOOLEAN DEFAULT FALSE,
        created_date TIMESTAMP DEFAULT NOW(),
        updated_date TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(100),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(50),
        zip_code VARCHAR(20),
        cpf_cnpj VARCHAR(50),
        person_type VARCHAR(20) DEFAULT 'fisica',
        notes TEXT,
        created_date TIMESTAMP DEFAULT NOW(),
        updated_date TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id SERIAL PRIMARY KEY,
        job VARCHAR(255),
        client_name VARCHAR(255),
        client_id INTEGER,
        client_phone VARCHAR(100),
        client_email VARCHAR(255),
        client_address TEXT,
        producer VARCHAR(255),
        description TEXT,
        status VARCHAR(100) DEFAULT 'pendente',
        total_value DECIMAL(15,2) DEFAULT 0,
        subtotal DECIMAL(15,2) DEFAULT 0,
        total DECIMAL(15,2) DEFAULT 0,
        total_with_margin DECIMAL(15,2) DEFAULT 0,
        discount DECIMAL(5,2) DEFAULT 0,
        apply_margin BOOLEAN DEFAULT TRUE,
        margin_percentage DECIMAL(5,2) DEFAULT 15,
        total_label VARCHAR(100),
        total_with_margin_label VARCHAR(100),
        items JSONB DEFAULT '[]',
        notes TEXT,
        valid_until DATE,
        emission_date DATE,
        validity_date DATE,
        payment_terms TEXT,
        pdf_url TEXT,
        created_by VARCHAR(255),
        created_date TIMESTAMP DEFAULT NOW(),
        updated_date TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS budget_requests (
        id SERIAL PRIMARY KEY,
        client_name VARCHAR(255),
        client_email VARCHAR(255),
        job VARCHAR(255),
        producer VARCHAR(255),
        description TEXT,
        status VARCHAR(100) DEFAULT 'nova',
        notes TEXT,
        items JSONB DEFAULT '[]',
        attachments JSONB DEFAULT '[]',
        created_by VARCHAR(255),
        created_date TIMESTAMP DEFAULT NOW(),
        updated_date TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS work_orders (
        id SERIAL PRIMARY KEY,
        job VARCHAR(255),
        client_name VARCHAR(255),
        client_id INTEGER,
        budget_id INTEGER,
        producer VARCHAR(255),
        status VARCHAR(100) DEFAULT 'pendente',
        priority VARCHAR(50) DEFAULT 'normal',
        description TEXT,
        items JSONB DEFAULT '[]',
        notes TEXT,
        start_date DATE,
        due_date DATE,
        completed_date DATE,
        total_value DECIMAL(15,2) DEFAULT 0,
        created_by VARCHAR(255),
        created_date TIMESTAMP DEFAULT NOW(),
        updated_date TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS receipts (
        id SERIAL PRIMARY KEY,
        job VARCHAR(255),
        client_name VARCHAR(255),
        client_id INTEGER,
        work_order_id INTEGER,
        budget_id INTEGER,
        status VARCHAR(100) DEFAULT 'pendente',
        total_value DECIMAL(15,2) DEFAULT 0,
        amount_paid DECIMAL(15,2) DEFAULT 0,
        due_date DATE,
        payment_date DATE,
        payment_method VARCHAR(100),
        items JSONB DEFAULT '[]',
        notes TEXT,
        pdf_url TEXT,
        created_by VARCHAR(255),
        created_date TIMESTAMP DEFAULT NOW(),
        updated_date TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS financial (
        id SERIAL PRIMARY KEY,
        description VARCHAR(255),
        category VARCHAR(100),
        type VARCHAR(50),
        value DECIMAL(15,2) DEFAULT 0,
        date DATE,
        status VARCHAR(100) DEFAULT 'pendente',
        notes TEXT,
        receipt_id INTEGER,
        created_by VARCHAR(255),
        created_date TIMESTAMP DEFAULT NOW(),
        updated_date TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255),
        company_address TEXT,
        company_phone VARCHAR(100),
        company_email VARCHAR(255),
        company_logo TEXT,
        cnpj VARCHAR(50),
        created_date TIMESTAMP DEFAULT NOW(),
        updated_date TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS layout_settings (
        id SERIAL PRIMARY KEY,
        page_name VARCHAR(100),
        layout_config JSONB DEFAULT '{}',
        created_date TIMESTAMP DEFAULT NOW(),
        updated_date TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS section_styles (
        id SERIAL PRIMARY KEY,
        section_name VARCHAR(100),
        styles JSONB DEFAULT '{}',
        created_date TIMESTAMP DEFAULT NOW(),
        updated_date TIMESTAMP DEFAULT NOW()
      );
    `);

    // Migrate existing tables to add missing columns
    const migrations = [
      "ALTER TABLE clients ADD COLUMN IF NOT EXISTS person_type VARCHAR(20) DEFAULT 'fisica'",
      "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS client_phone VARCHAR(100)",
      "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS client_email VARCHAR(255)",
      "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS client_address TEXT",
      "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS producer VARCHAR(255)",
      "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS description TEXT",
      "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) DEFAULT 0",
      "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS total DECIMAL(15,2) DEFAULT 0",
      "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS total_with_margin DECIMAL(15,2) DEFAULT 0",
      "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS discount DECIMAL(5,2) DEFAULT 0",
      "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS apply_margin BOOLEAN DEFAULT TRUE",
      "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS margin_percentage DECIMAL(5,2) DEFAULT 15",
      "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS total_label VARCHAR(100)",
      "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS total_with_margin_label VARCHAR(100)",
      "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS emission_date DATE",
      "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS validity_date DATE",
      "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS pdf_url TEXT",
      "ALTER TABLE budget_requests ADD COLUMN IF NOT EXISTS job VARCHAR(255)",
      "ALTER TABLE budget_requests ADD COLUMN IF NOT EXISTS producer VARCHAR(255)",
      "ALTER TABLE budget_requests ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'",
      "ALTER TABLE budget_requests ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'",
      "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS producer VARCHAR(255)",
      "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS client_counter_value DECIMAL(15,2)",
      "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS client_counter_notes TEXT",
      "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS client_response_date TIMESTAMP",
      "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS pdf_sent BOOLEAN DEFAULT FALSE",
      "ALTER TABLE clients ADD COLUMN IF NOT EXISTS mobile VARCHAR(100)",
      "ALTER TABLE clients ADD COLUMN IF NOT EXISTS cpf VARCHAR(50)",
      "ALTER TABLE clients ADD COLUMN IF NOT EXISTS cnpj VARCHAR(50)",
      "ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_street TEXT",
      "ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_number VARCHAR(50)",
      "ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_complement VARCHAR(100)",
      "ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_zip_code VARCHAR(20)",
      "ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_city VARCHAR(100)",
      "ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_state VARCHAR(50)",
      "ALTER TABLE clients ADD COLUMN IF NOT EXISTS photo_url TEXT",
      "ALTER TABLE clients ADD COLUMN IF NOT EXISTS registration_files JSONB DEFAULT '[]'",
      "ALTER TABLE receipts ADD COLUMN IF NOT EXISTS client_phone VARCHAR(100)",
      "ALTER TABLE receipts ADD COLUMN IF NOT EXISTS client_email VARCHAR(255)",
      "ALTER TABLE receipts ADD COLUMN IF NOT EXISTS client_address TEXT",
      "ALTER TABLE receipts ADD COLUMN IF NOT EXISTS producer VARCHAR(255)",
      "ALTER TABLE receipts ADD COLUMN IF NOT EXISTS description TEXT",
      "ALTER TABLE receipts ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) DEFAULT 0",
      "ALTER TABLE receipts ADD COLUMN IF NOT EXISTS discount DECIMAL(5,2) DEFAULT 0",
      "ALTER TABLE receipts ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15,2) DEFAULT 0",
      "ALTER TABLE receipts ADD COLUMN IF NOT EXISTS total_label VARCHAR(100)",
      "ALTER TABLE receipts ADD COLUMN IF NOT EXISTS apply_margin BOOLEAN DEFAULT TRUE",
      "ALTER TABLE receipts ADD COLUMN IF NOT EXISTS margin_percentage DECIMAL(5,2) DEFAULT 15",
      "ALTER TABLE receipts ADD COLUMN IF NOT EXISTS total_with_margin DECIMAL(15,2) DEFAULT 0",
      "ALTER TABLE receipts ADD COLUMN IF NOT EXISTS total_with_margin_label VARCHAR(100)",
      "ALTER TABLE receipts ADD COLUMN IF NOT EXISTS emission_date DATE",
      "ALTER TABLE receipts ADD COLUMN IF NOT EXISTS validity_date DATE",
      "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS client_phone VARCHAR(100)",
      "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS client_email VARCHAR(255)",
      "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS client_address TEXT",
      "ALTER TABLE settings ADD COLUMN IF NOT EXISTS company_email2 VARCHAR(255)",
      "ALTER TABLE settings ADD COLUMN IF NOT EXISTS footer_notes TEXT",
      "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS description TEXT",
      "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) DEFAULT 0",
      "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS budget_id INTEGER",
      "ALTER TABLE budget_requests ADD COLUMN IF NOT EXISTS delivery_date DATE",
      "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS delivery_date DATE",
      "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS start_datetime TIMESTAMP",
      "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS delivery_date DATE",
      "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS start_datetime TIMESTAMP",
      "ALTER TABLE receipts ADD COLUMN IF NOT EXISTS delivery_date DATE",
      "ALTER TABLE receipts ADD COLUMN IF NOT EXISTS start_datetime TIMESTAMP",
      "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE",
      "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE",
      "ALTER TABLE receipts ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE",
      "ALTER TABLE budgets ALTER COLUMN status SET DEFAULT 'em_aberto'",
      "ALTER TABLE receipts ALTER COLUMN status SET DEFAULT 'em_aberto'",
    ];
    for (const sql of migrations) {
      await client.query(sql);
    }

    const seedUsers = [
      { email: 'admin@gestao.pro', password: 'demo', full_name: 'Administrador', role: 'admin' },
      { email: 'funcionario@gestao.pro', password: 'demo', full_name: 'Funcionário Demo', role: 'user' },
      { email: 'cliente@gestao.pro', password: 'demo', full_name: 'Cliente Demo', role: 'cliente' },
    ];
    for (const u of seedUsers) {
      const check = await client.query("SELECT id FROM users WHERE email = $1", [u.email]);
      if (check.rows.length === 0) {
        const hash = await bcrypt.hash(u.password, 10);
        await client.query(
          "INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4)",
          [u.email, hash, u.full_name, u.role]
        );
      }
    }

    // Seed demo client record linked to cliente@gestao.pro
    const clientCheck = await client.query("SELECT id FROM clients WHERE email = 'cliente@gestao.pro'");
    if (clientCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO clients (name, email, phone, address, city, state, zip_code, cpf_cnpj, person_type, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        'Cliente Demo',
        'cliente@gestao.pro',
        '(11) 98765-4321',
        'Rua das Flores, 123 - Jardim Paulista',
        'São Paulo',
        'SP',
        '01452-001',
        '123.456.789-00',
        'fisica',
        'Cliente de demonstração do sistema GestãoPro'
      ]);
    }

    // Seed demo budget request from client
    const brCheck = await client.query("SELECT id FROM budget_requests WHERE client_email = 'cliente@gestao.pro' LIMIT 1");
    if (brCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO budget_requests (client_name, client_email, job, producer, description, notes, items, attachments, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        'Cliente Demo',
        'cliente@gestao.pro',
        'Projeto Mobiliário 2024',
        'Funcionário Demo',
        'Preciso de orçamento para aquisição e montagem de mobiliário para escritório.',
        'Prazo urgente, necessidade para início de abril.',
        JSON.stringify([
          { name: 'Mesa de escritório executiva', quantity: 2 },
          { name: 'Cadeira ergonômica', quantity: 4 },
          { name: 'Armário de escritório', quantity: 1 }
        ]),
        JSON.stringify([]),
        'nova'
      ]);
    }

    // Seed demo budget for the client
    const budgetCheck = await client.query("SELECT id FROM budgets WHERE client_name = 'Cliente Demo' LIMIT 1");
    if (budgetCheck.rows.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await client.query(`
        INSERT INTO budgets (job, client_name, client_email, producer, description, status, emission_date, validity_date, valid_until,
          items, subtotal, total, total_with_margin, discount, apply_margin, margin_percentage,
          total_label, total_with_margin_label, notes, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      `, [
        'Projeto Mobiliário 2024',
        'Cliente Demo',
        'cliente@gestao.pro',
        'Funcionário Demo',
        'Fornecimento e montagem de mobiliário completo para escritório.',
        'aprovado',
        today,
        validUntil,
        validUntil,
        JSON.stringify([
          { name: 'Mesa de escritório executiva', quantity: 2, unit_price: 1200, total: 2400 },
          { name: 'Cadeira ergonômica', quantity: 4, unit_price: 850, total: 3400 },
          { name: 'Armário de escritório', quantity: 1, unit_price: 800, total: 800 }
        ]),
        6600, 6600, 7590, 0, true, 15,
        'Total sem Nota', 'Total com Nota',
        'Orçamento aprovado pelo cliente. Incluir montagem no local.',
        'admin@gestao.pro'
      ]);
    }

    // Seed demo work order for the client (assigned to the employee)
    const woCheck = await client.query("SELECT id FROM work_orders WHERE client_name = 'Cliente Demo' LIMIT 1");
    if (woCheck.rows.length === 0) {
      const start = new Date().toISOString().split('T')[0];
      const due = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await client.query(`
        INSERT INTO work_orders (job, client_name, producer, status, priority, description, items, notes, start_date, due_date, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `, [
        'Projeto Mobiliário 2024',
        'Cliente Demo',
        'Funcionário Demo',
        'em_producao',
        'normal',
        'Entrega e montagem do mobiliário de escritório conforme orçamento aprovado.',
        JSON.stringify([
          { name: 'Mesa de escritório executiva', quantity: 2 },
          { name: 'Cadeira ergonômica', quantity: 4 },
          { name: 'Armário de escritório', quantity: 1 }
        ]),
        'Montar na sala principal. Coordenar com recepção para acesso.',
        start,
        due,
        'admin@gestao.pro'
      ]);
    }

    // Seed demo receipt for the client
    const receiptCheck = await client.query("SELECT id FROM receipts WHERE client_name = 'Cliente Demo' LIMIT 1");
    if (receiptCheck.rows.length === 0) {
      const dueDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await client.query(`
        INSERT INTO receipts (job, client_name, status, total_value, amount_paid, due_date, payment_method, notes, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [
        'Projeto Mobiliário 2024',
        'Cliente Demo',
        'pendente',
        7590,
        3795,
        dueDate,
        'transferencia',
        'Parcela 1/2 do projeto Mobiliário 2024.',
        'admin@gestao.pro'
      ]);
    }

    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET); } catch {}
  }
  next();
};

app.post('/api/auth/quick-login', async (req, res) => {
  try {
    const roleEmailMap = {
      admin: 'admin@gestao.pro',
      user: 'funcionario@gestao.pro',
      cliente: 'cliente@gestao.pro',
    };
    const { role } = req.body;
    const email = roleEmailMap[role];
    if (!email) return res.status(400).json({ error: 'Função inválida' });
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = result.rows[0];
    if (!user) {
      const hash = await bcrypt.hash('demo', 10);
      const nameMap = { admin: 'Administrador', user: 'Funcionário Demo', cliente: 'Cliente Demo' };
      const ins = await pool.query(
        'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING *',
        [email, hash, nameMap[role], role]
      );
      user = ins.rows[0];
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !user.password_hash) return res.status(401).json({ error: 'Credenciais inválidas' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, full_name, role = 'user' } = req.body;
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email já cadastrado' });
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role',
      [email, hash, full_name || email.split('@')[0], role]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, full_name, role, created_date FROM users WHERE id = $1', [req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/reset-password', authMiddleware, async (req, res) => {
  try {
    const { user_id, new_password } = req.body;
    if (req.user.role !== 'admin' && req.user.id !== user_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user_id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function buildEntityRoutes(tableName, orderDefault = '-created_date') {
  const router = express.Router();

  const toOrder = (sort) => {
    if (!sort) return 'created_date DESC';
    const desc = sort.startsWith('-');
    const col = sort.replace(/^-/, '').replace(/[^a-z0-9_]/gi, '');
    return `${col} ${desc ? 'DESC' : 'ASC'}`;
  };

  router.get('/', optionalAuth, async (req, res) => {
    try {
      const { sort, limit = 500, ...filters } = req.query;
      let query = `SELECT * FROM ${tableName}`;
      const params = [];
      const conditions = [];
      for (const [k, v] of Object.entries(filters)) {
        if (v !== undefined && v !== '') {
          params.push(v);
          conditions.push(`${k} = $${params.length}`);
        }
      }
      if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
      query += ` ORDER BY ${toOrder(sort || orderDefault)} LIMIT $${params.length + 1}`;
      params.push(parseInt(limit));
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/', optionalAuth, async (req, res) => {
    try {
      const data = { ...req.body };
      delete data.id;
      data.created_date = data.created_date || new Date().toISOString();
      data.updated_date = new Date().toISOString();
      const cols = Object.keys(data);
      const vals = Object.values(data).map(v =>
        (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v
      );
      const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
      const result = await pool.query(
        `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        vals
      );
      res.status(201).json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/:id', optionalAuth, async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [req.params.id]);
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.put('/:id', optionalAuth, async (req, res) => {
    try {
      const data = { ...req.body };
      delete data.id;
      delete data.created_date;
      data.updated_date = new Date().toISOString();
      const cols = Object.keys(data);
      const vals = Object.values(data).map(v =>
        (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v
      );
      const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
      vals.push(req.params.id);
      const result = await pool.query(
        `UPDATE ${tableName} SET ${sets} WHERE id = $${vals.length} RETURNING *`,
        vals
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/:id', optionalAuth, async (req, res) => {
    try {
      await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

app.use('/api/entities/Budget', buildEntityRoutes('budgets'));
app.use('/api/entities/BudgetRequest', buildEntityRoutes('budget_requests'));

app.put('/api/entities/WorkOrder/:id', optionalAuth, async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.id;
    delete data.created_date;
    data.updated_date = new Date().toISOString();

    if (data.status === 'em_producao') {
      const current = await pool.query('SELECT status, start_datetime FROM work_orders WHERE id = $1', [req.params.id]);
      if (current.rows[0] && current.rows[0].status !== 'em_producao' && !current.rows[0].start_datetime) {
        data.start_datetime = new Date().toISOString();
      }
    }

    const cols = Object.keys(data);
    const vals = Object.values(data).map(v =>
      (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v
    );
    const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
    vals.push(req.params.id);
    const result = await pool.query(
      `UPDATE work_orders SET ${sets} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });

    const wo = result.rows[0];

    if (wo.start_datetime && wo.budget_id) {
      await pool.query(
        `UPDATE budgets SET start_datetime = $1, updated_date = NOW() WHERE id = $2`,
        [wo.start_datetime, wo.budget_id]
      );
      await pool.query(
        `UPDATE receipts SET start_datetime = $1, updated_date = NOW() WHERE budget_id = $2`,
        [wo.start_datetime, wo.budget_id]
      );
    }

    if (wo.budget_id) {
      if (wo.delivery_date !== undefined) {
        await pool.query(
          `UPDATE budgets SET delivery_date = $1, updated_date = NOW() WHERE id = $2`,
          [wo.delivery_date, wo.budget_id]
        );
        await pool.query(
          `UPDATE receipts SET delivery_date = $1, updated_date = NOW() WHERE budget_id = $2`,
          [wo.delivery_date, wo.budget_id]
        );
      }
      if (data.is_urgent !== undefined) {
        await pool.query(
          `UPDATE budgets SET is_urgent = $1, updated_date = NOW() WHERE id = $2`,
          [wo.is_urgent, wo.budget_id]
        );
        await pool.query(
          `UPDATE receipts SET is_urgent = $1, updated_date = NOW() WHERE budget_id = $2`,
          [wo.is_urgent, wo.budget_id]
        );
      }
    }

    res.json(wo);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function mapWorkOrder(row) {
  if (!row) return row;
  return {
    ...row,
    delivery_date: row.delivery_date || row.due_date || null,
    start_datetime: row.start_datetime || (row.start_date ? new Date(row.start_date).toISOString() : null),
  };
}

app.get('/api/entities/WorkOrder', optionalAuth, async (req, res) => {
  try {
    const { sort, limit, ...filters } = req.query;
    let query = 'SELECT * FROM work_orders';
    const vals = [];
    const conditions = [];
    for (const [k, v] of Object.entries(filters)) {
      vals.push(v);
      conditions.push(`${k} = $${vals.length}`);
    }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    const sortCol = sort?.startsWith('-') ? sort.slice(1) : sort;
    const sortDir = sort?.startsWith('-') ? 'DESC' : 'ASC';
    if (sortCol) query += ` ORDER BY ${sortCol} ${sortDir}`;
    if (limit) query += ` LIMIT ${parseInt(limit)}`;
    const result = await pool.query(query, vals);
    res.json(result.rows.map(mapWorkOrder));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/entities/WorkOrder/:id', optionalAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM work_orders WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(mapWorkOrder(result.rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/entities/WorkOrder', optionalAuth, async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.id;
    data.created_date = new Date().toISOString();
    data.updated_date = new Date().toISOString();
    const cols = Object.keys(data);
    const vals = Object.values(data).map(v =>
      (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v
    );
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const result = await pool.query(
      `INSERT INTO work_orders (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      vals
    );
    res.status(201).json(mapWorkOrder(result.rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/entities/WorkOrder/:id', optionalAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM work_orders WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.use('/api/entities/Receipt', buildEntityRoutes('receipts'));
app.use('/api/entities/Financial', buildEntityRoutes('financial'));
app.use('/api/entities/Client', buildEntityRoutes('clients'));
app.use('/api/entities/Settings', buildEntityRoutes('settings'));
app.use('/api/entities/LayoutSettings', buildEntityRoutes('layout_settings'));
app.use('/api/entities/SectionStyles', buildEntityRoutes('section_styles'));
app.use('/api/entities/UserPermissions', buildEntityRoutes('user_permissions'));

app.get('/api/entities/User', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, full_name, role, created_date FROM users ORDER BY created_date DESC');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/entities/User/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { role, full_name } = req.body;
    const result = await pool.query(
      'UPDATE users SET role = COALESCE($1, role), full_name = COALESCE($2, full_name) WHERE id = $3 RETURNING id, email, full_name, role',
      [role, full_name, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/entities/User/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/integrations/upload', upload.single('file'), optionalAuth, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ file_url: fileUrl, filename: req.file.filename });
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

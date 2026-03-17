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
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
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
        notes TEXT,
        created_date TIMESTAMP DEFAULT NOW(),
        updated_date TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id SERIAL PRIMARY KEY,
        job VARCHAR(255),
        client_name VARCHAR(255),
        client_id INTEGER,
        status VARCHAR(100) DEFAULT 'pendente',
        total_value DECIMAL(15,2) DEFAULT 0,
        items JSONB DEFAULT '[]',
        notes TEXT,
        valid_until DATE,
        payment_terms TEXT,
        created_by VARCHAR(255),
        created_date TIMESTAMP DEFAULT NOW(),
        updated_date TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS budget_requests (
        id SERIAL PRIMARY KEY,
        client_name VARCHAR(255),
        client_email VARCHAR(255),
        description TEXT,
        status VARCHAR(100) DEFAULT 'pendente',
        notes TEXT,
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
        status VARCHAR(100) DEFAULT 'aberto',
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
      const vals = Object.values(data);
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
      const vals = Object.values(data);
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
app.use('/api/entities/WorkOrder', buildEntityRoutes('work_orders'));
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
  const host = req.get('host');
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
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

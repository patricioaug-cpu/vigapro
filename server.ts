import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { open, Database as SqliteDatabase } from 'sqlite';
import sqlite3 from 'sqlite3';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import * as bcryptModule from 'bcryptjs';
import fs from 'fs';

// Handle bcryptjs import variations in ESM
const bcrypt = (bcryptModule as any).default || bcryptModule;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = 'super-secret-key-for-trial-app';
const PORT = 3000;

let db: SqliteDatabase | null = null;

async function getDb() {
  if (db) return db;
  
  const dbPath = process.env.VERCEL ? '/tmp/database.sqlite' : 'database.sqlite';
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'user',
      trial_start DATETIME DEFAULT CURRENT_TIMESTAMP,
      access_granted BOOLEAN DEFAULT 0,
      request_pending BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      password TEXT
    )
  `);

  // Ensure admin user exists
  const adminEmail = 'patricioaug@gmail.com';
  const adminPassword = bcrypt.hashSync('admin123', 10);
  const existingAdmin = await db.get('SELECT * FROM users WHERE email = ?', adminEmail);
  
  if (!existingAdmin) {
    await db.run('INSERT INTO users (email, role, access_granted, password) VALUES (?, ?, ?, ?)', adminEmail, 'admin', 1, adminPassword);
  } else if (!existingAdmin.password) {
    await db.run('UPDATE users SET password = ? WHERE email = ?', adminPassword, adminEmail);
  }

  return db;
}

const app = express();

console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('VERCEL:', process.env.VERCEL);

app.use(cors());
app.use(express.json());

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin Middleware
const isAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
};

// API Routes
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });

  try {
    const database = await getDb();
    const hashedPassword = bcrypt.hashSync(password, 10);
    let user = await database.get('SELECT * FROM users WHERE email = ?', email);
    
    if (user) {
      if (user.password) {
        return res.status(400).json({ error: 'Usuário já cadastrado' });
      } else {
        await database.run('UPDATE users SET password = ? WHERE email = ?', hashedPassword, email);
        user = await database.get('SELECT * FROM users WHERE email = ?', email);
      }
    } else {
      await database.run('INSERT INTO users (email, password) VALUES (?, ?)', email, hashedPassword);
      user = await database.get('SELECT * FROM users WHERE email = ?', email);
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });

  try {
    const database = await getDb();
    const user = await database.get('SELECT * FROM users WHERE email = ?', email);
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Usuário não encontrado ou senha não configurada' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

app.get('/api/user/status', authenticate, async (req: any, res) => {
  try {
    const database = await getDb();
    const user = await database.get('SELECT * FROM users WHERE id = ?', req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    let trialStart: number;
    try {
      const rawDate = user.trial_start;
      if (typeof rawDate === 'number') {
        trialStart = rawDate;
      } else {
        const isoDate = rawDate.includes(' ') ? rawDate.replace(' ', 'T') + 'Z' : rawDate;
        trialStart = new Date(isoDate).getTime();
      }
    } catch (e) {
      trialStart = Date.now();
    }

    const now = Date.now();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const trialExpired = now > (trialStart + sevenDaysInMs);

    res.json({
      ...user,
      trial_expired: trialExpired,
      server_time: now
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar status' });
  }
});

app.post('/api/user/request-access', authenticate, async (req: any, res) => {
  try {
    const database = await getDb();
    await database.run('UPDATE users SET request_pending = 1 WHERE id = ?', req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao solicitar acesso' });
  }
});

// Admin Routes
app.get('/api/admin/users', authenticate, isAdmin, async (req, res) => {
  try {
    const database = await getDb();
    const users = await database.all("SELECT * FROM users WHERE role = 'user'");
    const now = Date.now();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    
    const usersWithStatus = users.map(u => {
      let trialStart: number;
      try {
        const rawDate = u.trial_start;
        if (typeof rawDate === 'number') {
          trialStart = rawDate;
        } else {
          const isoDate = rawDate.includes(' ') ? rawDate.replace(' ', 'T') + 'Z' : rawDate;
          trialStart = new Date(isoDate).getTime();
        }
      } catch (e) {
        trialStart = Date.now();
      }
      
      return {
        ...u,
        trial_expired: now > (trialStart + sevenDaysInMs),
        server_time: now
      };
    });
    
    res.json(usersWithStatus);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

app.post('/api/admin/grant-access', authenticate, isAdmin, async (req, res) => {
  try {
    const database = await getDb();
    const { userId } = req.body;
    await database.run('UPDATE users SET access_granted = 1, request_pending = 0 WHERE id = ?', userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao conceder acesso' });
  }
});

app.post('/api/admin/revoke-access', authenticate, isAdmin, async (req, res) => {
  try {
    const database = await getDb();
    const { userId } = req.body;
    await database.run('UPDATE users SET access_granted = 0 WHERE id = ?', userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao revogar acesso' });
  }
});

async function startServer() {
  try {
    console.log('Starting server initialization...');
    
    // Initialize DB early
    await getDb();
    console.log('Database initialized.');

    if (process.env.NODE_ENV !== 'production') {
      console.log('Starting Vite in middleware mode...');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      console.log('Vite server created.');
      app.use(vite.middlewares);
      console.log('Vite middleware added.');
    }

    if (!process.env.VERCEL) {
      console.log(`Attempting to listen on port ${PORT}...`);
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    } else {
      console.log('Running in Vercel environment, skipping app.listen()');
    }
  } catch (err) {
    console.error('CRITICAL: Failed to start server:', err);
  }
}

startServer();

export default app;

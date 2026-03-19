import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-beam-key';
const ADMIN_EMAIL = 'patricioaug@gmail.com';

// Database setup
const db = new Database('database.sqlite');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    trial_start DATETIME DEFAULT CURRENT_TIMESTAMP,
    access_granted BOOLEAN DEFAULT 0,
    reset_token TEXT,
    reset_token_expiry DATETIME
  );
  
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'beam', 'pillar', 'slab'
    title TEXT NOT NULL,
    input_data TEXT NOT NULL, -- JSON string
    result_data TEXT NOT NULL, -- JSON string
    share_id TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    user_email TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read BOOLEAN DEFAULT 0
  );
`);

// Migration: Add share_id column if it doesn't exist (for existing databases)
try {
  const columns = db.prepare("PRAGMA table_info(reports)").all();
  const hasShareId = columns.some((c: any) => c.name === 'share_id');
  if (!hasShareId) {
    db.prepare('ALTER TABLE reports ADD COLUMN share_id TEXT').run();
    db.prepare('CREATE UNIQUE INDEX idx_reports_share_id ON reports(share_id)').run();
    console.log('Migration: Added share_id column to reports table');
  }
} catch (e) {
  // Table might not exist yet or other error
}

// Ensure admin user has correct role if exists
db.prepare("UPDATE users SET role = 'admin', access_granted = 1 WHERE LOWER(email) = LOWER(?)").run(ADMIN_EMAIL);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      
      // Verify user still exists in database to prevent foreign key errors
      // if the database was reset but the client still has an old token
      const dbUser = db.prepare('SELECT id FROM users WHERE id = ?').get(user.id);
      if (!dbUser) {
        return res.status(401).json({ error: 'Sessão inválida ou usuário não encontrado' });
      }
      
      req.user = user;
      next();
    });
  };

  // API Routes
  app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const is_admin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      const role = is_admin ? 'admin' : 'user';
      const access_granted = is_admin ? 1 : 0;
      
      const stmt = db.prepare('INSERT INTO users (email, password, role, access_granted) VALUES (?, ?, ?, ?)');
      const result = stmt.run(email.toLowerCase(), hashedPassword, role, access_granted);
      
      if (!is_admin) {
        db.prepare('INSERT INTO notifications (type, message, user_email) VALUES (?, ?, ?)').run(
          'registration',
          `Novo usuário registrado: ${email}`,
          email
        );
      }
      
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        res.status(400).json({ error: 'Email already exists' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  app.post('/api/request-access', authenticateToken, (req: any, res) => {
    const email = req.user.email;
    db.prepare('INSERT INTO notifications (type, message, user_email) VALUES (?, ?, ?)').run(
      'access_request',
      `Usuário solicitou acesso: ${email}`,
      email
    );
    res.json({ message: 'Solicitação enviada com sucesso' });
  });

  app.post('/api/forgot-password', (req, res) => {
    const { email } = req.body;
    const user: any = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
    
    if (!user) {
      // Don't reveal if user exists for security, but for this app let's be helpful
      return res.status(404).json({ error: 'E-mail não encontrado' });
    }

    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    db.prepare('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?').run(token, expiry, user.id);

    // In a real app, send email. Here, we log to console and return a success message.
    console.log(`[PASSWORD RESET] Code for ${email}: ${token}`);
    
    // For demo purposes, we'll return the token in the response so the user can actually use it
    // In production, this would be REMOVED.
    res.json({ message: 'Código de recuperação enviado para o seu e-mail.', debug_token: token });
  });

  app.post('/api/reset-password', async (req, res) => {
    const { email, token, newPassword } = req.body;
    const user: any = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND reset_token = ?').get(email, token);

    if (!user || new Date(user.reset_token_expiry) < new Date()) {
      return res.status(400).json({ error: 'Código inválido ou expirado' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?').run(hashedPassword, user.id);

    res.json({ message: 'Senha alterada com sucesso!' });
  });

  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user: any = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    
    // Log login (as requested, admin should know who logged in)
    console.log(`Login detected: ${email} at ${new Date().toISOString()}`);

    res.json({ 
      token, 
      user: { 
        email: user.email, 
        role: user.role, 
        trial_start: user.trial_start,
        access_granted: user.access_granted 
      },
      serverTime: new Date().toISOString()
    });
  });

  app.get('/api/me', authenticateToken, (req: any, res) => {
    const user: any = db.prepare('SELECT email, role, trial_start, access_granted FROM users WHERE id = ?').get(req.user.id);
    res.json({
      ...user,
      serverTime: new Date().toISOString()
    });
  });

  // Reports Routes
  app.post('/api/reports', authenticateToken, (req: any, res) => {
    const { type, title, input_data, result_data } = req.body;
    const user_id = req.user.id;
    
    // Generate a robust unique ID
    const share_id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    
    if (!type || !title || !input_data || !result_data) {
      return res.status(400).json({ error: 'Dados incompletos para salvar o relatório' });
    }
    
    try {
      const stmt = db.prepare('INSERT INTO reports (user_id, type, title, input_data, result_data, share_id) VALUES (?, ?, ?, ?, ?, ?)');
      const result = stmt.run(user_id, type, title, JSON.stringify(input_data), JSON.stringify(result_data), share_id);
      res.status(201).json({ id: result.lastInsertRowid, share_id, message: 'Relatório salvo com sucesso' });
    } catch (error: any) {
      console.error('Error saving report:', error);
      if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || (error.message && error.message.includes('FOREIGN KEY'))) {
        res.status(401).json({ error: 'Sessão expirada ou inválida. Por favor, faça login novamente.' });
      } else if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(500).json({ error: 'Erro de unicidade ao salvar relatório. Tente novamente.' });
      } else {
        res.status(500).json({ error: `Erro ao salvar relatório: ${error.message}` });
      }
    }
  });

  app.get('/api/public/reports/:share_id', (req, res) => {
    try {
      const report: any = db.prepare('SELECT * FROM reports WHERE share_id = ?').get(req.params.share_id);
      if (!report) return res.status(404).json({ error: 'Relatório não encontrado' });
      
      res.json({
        ...report,
        input_data: JSON.parse(report.input_data),
        result_data: JSON.parse(report.result_data)
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar relatório público' });
    }
  });

  app.get('/api/reports', authenticateToken, (req: any, res) => {
    const user_id = req.user.id;
    const reports = db.prepare('SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC').all(user_id);
    
    // Parse JSON strings back to objects
    const parsedReports = reports.map((r: any) => ({
      ...r,
      input_data: JSON.parse(r.input_data),
      result_data: JSON.parse(r.result_data)
    }));
    
    res.json(parsedReports);
  });

  app.delete('/api/reports/:id', authenticateToken, (req: any, res) => {
    const { id } = req.params;
    const user_id = req.user.id;
    
    const report: any = db.prepare('SELECT * FROM reports WHERE id = ? AND user_id = ?').get(id, user_id);
    if (!report) return res.status(404).json({ error: 'Relatório não encontrado' });
    
    db.prepare('DELETE FROM reports WHERE id = ?').run(id);
    res.json({ message: 'Relatório excluído com sucesso' });
  });

  // Admin Routes
  app.get('/api/admin/users', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const users = db.prepare('SELECT id, email, role, trial_start, access_granted FROM users').all();
    res.json(users);
  });

  app.get('/api/admin/notifications', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const notifications = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50').all();
    res.json(notifications);
  });

  app.post('/api/admin/mark-notification-read', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { id } = req.body;
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id);
    res.json({ message: 'Notification marked as read' });
  });

  app.post('/api/admin/toggle-access', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { userId, access } = req.body;
    db.prepare('UPDATE users SET access_granted = ? WHERE id = ?').run(access ? 1 : 0, userId);
    res.json({ message: 'Access updated' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

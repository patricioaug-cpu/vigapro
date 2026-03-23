import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

console.log('API Index starting...');

// Use require for CJS modules to ensure compatibility in ESM/Vercel
let bcrypt: any;
let sqlite3: any;
let open: any;

try {
  bcrypt = require('bcryptjs');
  console.log('bcryptjs loaded successfully');
} catch (e) {
  console.error('Failed to load bcryptjs:', e);
}

try {
  sqlite3 = require('sqlite3');
  console.log('sqlite3 loaded successfully');
} catch (e) {
  console.error('Failed to load sqlite3:', e);
}

try {
  const sqlite = require('sqlite');
  open = sqlite.open;
  console.log('sqlite wrapper loaded successfully');
} catch (e) {
  console.error('Failed to load sqlite wrapper:', e);
}

import jwt from 'jsonwebtoken';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-trial-app';
const PORT = 3000;

let db: any = null;

async function getDb() {
  if (db) return db;
  
  const dbPath = process.env.VERCEL ? '/tmp/database.sqlite' : path.join(process.cwd(), 'database.sqlite');
  console.log(`Initializing database at: ${dbPath}`);
  
  try {
    if (!sqlite3 || !open) {
      throw new Error('Database libraries (sqlite3 or sqlite) not loaded');
    }

    const sqlite3Verbose = sqlite3.verbose ? sqlite3.verbose() : sqlite3;
    
    db = await open({
      filename: dbPath,
      driver: sqlite3Verbose.Database
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
    if (bcrypt && typeof bcrypt.hashSync === 'function') {
      const adminPassword = bcrypt.hashSync('admin123', 10);
      const existingAdmin = await db.get('SELECT * FROM users WHERE email = ?', adminEmail);
      
      if (!existingAdmin) {
        await db.run('INSERT INTO users (email, role, access_granted, password) VALUES (?, ?, ?, ?)', adminEmail, 'admin', 1, adminPassword);
      } else if (!existingAdmin.password) {
        await db.run('UPDATE users SET password = ? WHERE email = ?', adminPassword, adminEmail);
      }
    }

    return db;
  } catch (err) {
    console.error('Database initialization error:', err);
    throw err;
  }
}

const app = express();

app.use(cors());
app.use(express.json());

// Health Check (Before DB middleware to avoid 500 on health check if DB fails)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    env: process.env.NODE_ENV, 
    vercel: !!process.env.VERCEL,
    time: new Date().toISOString()
  });
});

// Middleware to ensure DB is ready
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    try {
      await getDb();
      next();
    } catch (err: any) {
      console.error('DB Middleware Error:', err);
      res.status(500).json({ 
        error: 'Database connection failed',
        message: err.message
      });
    }
  } else {
    next();
  }
});

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
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
};

// API Routes
app.post('/api/auth/register', async (req, res) => {
  console.log('Registration attempt for:', req.body?.email);
  const { email, password } = req.body || {};
  
  if (!email || !password) {
    console.log('Registration failed: Missing email or password');
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    console.log('Getting database...');
    const database = await getDb();
    
    if (!bcrypt || typeof bcrypt.hashSync !== 'function') {
      console.error('Bcrypt error: Library not properly loaded');
      throw new Error('Bcrypt library not properly loaded');
    }

    console.log('Hashing password...');
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    console.log('Checking for existing user...');
    let user = await database.get('SELECT * FROM users WHERE email = ?', email);
    
    if (user) {
      if (user.password) {
        console.log('Registration failed: User already exists');
        return res.status(400).json({ error: 'Usuário já cadastrado' });
      } else {
        console.log('Updating existing user with password...');
        await database.run('UPDATE users SET password = ? WHERE email = ?', hashedPassword, email);
        user = await database.get('SELECT * FROM users WHERE email = ?', email);
      }
    } else {
      console.log('Creating new user...');
      await database.run('INSERT INTO users (email, password) VALUES (?, ?)', email, hashedPassword);
      user = await database.get('SELECT * FROM users WHERE email = ?', email);
    }

    console.log('Generating token...');
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    console.log('Registration successful for:', email);
    res.json({ token, user });
  } catch (err: any) {
    console.error('CRITICAL Registration error:', err);
    res.status(500).json({ 
      error: 'Erro ao registrar usuário', 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  console.log('Login attempt for:', req.body?.email);
  const { email, password } = req.body || {};
  
  if (!email || !password) {
    console.log('Login failed: Missing email or password');
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    console.log('Getting database...');
    const database = await getDb();
    
    console.log('Searching for user...');
    const user = await database.get('SELECT * FROM users WHERE email = ?', email);
    
    if (!user || !user.password) {
      console.log('Login failed: User not found or no password set');
      return res.status(401).json({ error: 'Usuário não encontrado ou senha não configurada' });
    }

    console.log('Verifying password...');
    if (!bcrypt || typeof bcrypt.compareSync !== 'function') {
      console.error('Bcrypt error: Library not properly loaded');
      throw new Error('Bcrypt library not properly loaded');
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      console.log('Login failed: Invalid password');
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    console.log('Generating token...');
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    console.log('Login successful for:', email);
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        access_granted: user.access_granted 
      } 
    });
  } catch (err: any) {
    console.error('CRITICAL Login error:', err);
    res.status(500).json({ 
      error: 'Erro ao fazer login', 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
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

// Catch-all for API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

// Error handling middleware to ensure JSON responses
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

async function startServer() {
  try {
    console.log('Starting server initialization...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('VERCEL:', process.env.VERCEL);
    
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
      console.log('Starting Vite in middleware mode...');
      try {
        // Use dynamic import for Vite to avoid loading it in production
        console.log('Importing vite...');
        const { createServer: createViteServer } = await import('vite');
        console.log('Creating vite server...');
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: 'spa',
        });
        console.log('Vite server created successfully.');
        app.use(vite.middlewares);
        console.log('Vite middleware added to express.');
      } catch (viteErr) {
        console.error('Failed to initialize Vite middleware:', viteErr);
      }
    } else {
      console.log('Serving static files from dist...');
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api/')) {
          res.sendFile(path.join(distPath, 'index.html'));
        }
      });
    }

    if (!process.env.VERCEL) {
      console.log(`Attempting to listen on port ${PORT}...`);
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://0.0.0.0:${PORT}`);
        console.log('Press Ctrl+C to stop');
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

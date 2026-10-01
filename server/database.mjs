import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';

export class DatabaseAdapter {
  constructor(options = {}) {
    this.type = options.type || (process.env.DATABASE_TYPE || (process.env.DATABASE_URL?.startsWith('postgres') ? 'postgres' : 'sqlite'));
    this.sqlitePath = options.sqlitePath || process.env.ALFA_DATABASE || './data/alfa.sqlite';
    this.databaseUrl = options.databaseUrl || process.env.DATABASE_URL;
    this.sqliteDb = null;
    this.pgPool = null;
    this.seedData = options.seedData || null;
  }

  async init() {
    if (this.type === 'postgres') {
      if (!this.databaseUrl) {
        throw new Error('Configuração de PostgreSQL incompleta: variável DATABASE_URL é obrigatória.');
      }
      try {
        let client;
        let lastError;
        const candidateUrls = [this.databaseUrl];

        // Se for um hostname interno curto do Render (sem ponto no host), testar resolução direta e com sufixos de região
        const hostMatch = this.databaseUrl.match(/@([^/:]+)([:/])/);
        if (hostMatch && !hostMatch[1].includes('.')) {
          const shortHost = hostMatch[1];
          for (const region of ['oregon', 'ohio', 'frankfurt', 'virginia', 'singapore']) {
            candidateUrls.push(this.databaseUrl.replace(`@${shortHost}`, `@${shortHost}.${region}-postgres.render.com`));
          }
        }

        for (const currentUrl of candidateUrls) {
          const isRenderInternal = /dpg-[a-z0-9]+(-a)?(:|\/|\.)/i.test(currentUrl) && !/render\.com|sslmode=require/i.test(currentUrl);
          const poolConfig = {
            connectionString: currentUrl,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000
          };
          if (!isRenderInternal && (process.env.NODE_ENV === 'production' || /render\.com|supabase\.co|\.cloud|sslmode=require/i.test(currentUrl))) {
            poolConfig.ssl = { rejectUnauthorized: false };
          }

          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              this.pgPool = new pg.Pool(poolConfig);
              client = await this.pgPool.connect();
              break;
            } catch (err) {
              lastError = err;
              await this.pgPool.end().catch(() => {});
              if (/ssl|not support/i.test(err.message)) {
                if (poolConfig.ssl) delete poolConfig.ssl;
                else poolConfig.ssl = { rejectUnauthorized: false };
                try {
                  this.pgPool = new pg.Pool(poolConfig);
                  client = await this.pgPool.connect();
                  break;
                } catch (sslRetryErr) {
                  lastError = sslRetryErr;
                  await this.pgPool.end().catch(() => {});
                }
              }
              if (attempt < 3 && /ENOTFOUND|ECONNREFUSED/i.test(err.message)) {
                await new Promise(r => setTimeout(r, 2000));
              }
            }
          }
          if (client) {
            console.log(`PostgreSQL conectado com sucesso via ${currentUrl.replace(/:[^:@]+@/, ':****@')}`);
            break;
          }
        }

        if (!client) {
          throw lastError || new Error('Não foi possível conectar ao PostgreSQL.');
        }
        try {
          await client.query(`
            CREATE TABLE IF NOT EXISTS records (
              key VARCHAR(100) PRIMARY KEY,
              value TEXT NOT NULL,
              version INTEGER NOT NULL DEFAULT 1
            );
            CREATE TABLE IF NOT EXISTS orders (
              id VARCHAR(100) PRIMARY KEY,
              number INTEGER UNIQUE NOT NULL,
              token_hash VARCHAR(64) NOT NULL,
              idem_hash VARCHAR(64) UNIQUE NOT NULL,
              data TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
              hash VARCHAR(64) PRIMARY KEY,
              expires BIGINT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS audit (
              id VARCHAR(100) PRIMARY KEY,
              at VARCHAR(50) NOT NULL,
              action VARCHAR(100) NOT NULL,
              resource VARCHAR(200) NOT NULL
            );
          `);

          if (this.seedData) {
            for (const [key, value] of Object.entries(this.seedData)) {
              if (!['alfa_orders', 'alfa_customers'].includes(key)) {
                await client.query(
                  'INSERT INTO records(key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
                  [key, JSON.stringify(value)]
                );
              }
            }
          }
        } finally {
          client.release();
        }
      } catch (err) {
        throw new Error(`Falha crítica ao conectar ao PostgreSQL (${this.databaseUrl.replace(/:[^:@]+@/, ':****@')}): ${err.message}`);
      }
    } else {
      // SQLite
      fs.mkdirSync(path.dirname(this.sqlitePath), { recursive: true, mode: 0o700 });
      this.sqliteDb = new DatabaseSync(this.sqlitePath);
      try { fs.chmodSync(this.sqlitePath, 0o600); } catch { /* ignore if windows permissions */ }
      this.sqliteDb.exec(`
        PRAGMA journal_mode=WAL;
        PRAGMA foreign_keys=ON;
        CREATE TABLE IF NOT EXISTS records(key TEXT PRIMARY KEY, value TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1);
        CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY, number INTEGER UNIQUE NOT NULL, token_hash TEXT NOT NULL, idem_hash TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY, at TEXT NOT NULL, action TEXT NOT NULL, resource TEXT NOT NULL);
      `);

      if (this.seedData) {
        for (const [key, value] of Object.entries(this.seedData)) {
          if (!['alfa_orders', 'alfa_customers'].includes(key)) {
            this.sqliteDb.prepare('INSERT OR IGNORE INTO records(key,value) VALUES (?,?)').run(key, JSON.stringify(value));
          }
        }
      }
    }
  }

  async getRecord(key) {
    if (this.type === 'postgres') {
      const res = await this.pgPool.query('SELECT value FROM records WHERE key = $1', [key]);
      return res.rows[0] ? JSON.parse(res.rows[0].value) : [];
    }
    const row = this.sqliteDb.prepare('SELECT value FROM records WHERE key=?').get(key);
    return row ? JSON.parse(row.value) : [];
  }

  async getRecordWithVersion(key) {
    if (this.type === 'postgres') {
      const res = await this.pgPool.query('SELECT value, version FROM records WHERE key = $1', [key]);
      if (!res.rows[0]) return null;
      return { value: JSON.parse(res.rows[0].value), version: res.rows[0].version };
    }
    const row = this.sqliteDb.prepare('SELECT value, version FROM records WHERE key=?').get(key);
    if (!row) return null;
    return { value: JSON.parse(row.value), version: row.version };
  }

  async putRecord(key, value) {
    if (this.type === 'postgres') {
      await this.pgPool.query(
        'UPDATE records SET value = $1, version = version + 1 WHERE key = $2',
        [JSON.stringify(value), key]
      );
      return;
    }
    this.sqliteDb.prepare('UPDATE records SET value=?, version=version+1 WHERE key=?').run(JSON.stringify(value), key);
  }

  async getAllRecords() {
    if (this.type === 'postgres') {
      const res = await this.pgPool.query('SELECT key, value, version FROM records');
      return res.rows.map(r => ({ key: r.key, value: JSON.parse(r.value), version: r.version }));
    }
    return this.sqliteDb.prepare('SELECT key, value, version FROM records').all().map(r => ({
      key: r.key,
      value: JSON.parse(r.value),
      version: r.version
    }));
  }

  async getAllOrders() {
    if (this.type === 'postgres') {
      const res = await this.pgPool.query('SELECT data FROM orders ORDER BY number DESC');
      return res.rows.map(r => JSON.parse(r.data));
    }
    return this.sqliteDb.prepare('SELECT data FROM orders ORDER BY number DESC').all().map(r => JSON.parse(r.data));
  }

  async getOrderById(id) {
    if (this.type === 'postgres') {
      const res = await this.pgPool.query('SELECT * FROM orders WHERE id = $1', [id]);
      return res.rows[0] ? { ...res.rows[0], data: JSON.parse(res.rows[0].data) } : null;
    }
    const row = this.sqliteDb.prepare('SELECT * FROM orders WHERE id=?').get(id);
    return row ? { ...row, data: JSON.parse(row.data) } : null;
  }

  async getOrderByIdemHash(idemHash) {
    if (this.type === 'postgres') {
      const res = await this.pgPool.query('SELECT data FROM orders WHERE idem_hash = $1', [idemHash]);
      return res.rows[0] ? JSON.parse(res.rows[0].data) : null;
    }
    const row = this.sqliteDb.prepare('SELECT data FROM orders WHERE idem_hash=?').get(idemHash);
    return row ? JSON.parse(row.data) : null;
  }

  async getNextOrderNumber() {
    if (this.type === 'postgres') {
      const res = await this.pgPool.query('SELECT COALESCE(MAX(number), 1000) + 1 AS n FROM orders');
      return Number(res.rows[0].n);
    }
    return Number(this.sqliteDb.prepare('SELECT COALESCE(MAX(number),1000)+1 AS n FROM orders').get().n);
  }

  async insertOrder(id, number, tokenHash, idemHash, order) {
    const dataStr = JSON.stringify(order);
    if (this.type === 'postgres') {
      await this.pgPool.query(
        'INSERT INTO orders (id, number, token_hash, idem_hash, data) VALUES ($1, $2, $3, $4, $5)',
        [id, number, tokenHash, idemHash, dataStr]
      );
      return;
    }
    this.sqliteDb.prepare('INSERT INTO orders VALUES(?,?,?,?,?)').run(id, number, tokenHash, idemHash, dataStr);
  }

  async updateOrder(id, order) {
    const dataStr = JSON.stringify(order);
    if (this.type === 'postgres') {
      await this.pgPool.query('UPDATE orders SET data = $1 WHERE id = $2', [dataStr, id]);
      return;
    }
    this.sqliteDb.prepare('UPDATE orders SET data=? WHERE id=?').run(dataStr, id);
  }

  async insertSession(tokenHash, expires) {
    if (this.type === 'postgres') {
      await this.pgPool.query('DELETE FROM sessions WHERE expires < $1', [Date.now()]);
      await this.pgPool.query(
        'INSERT INTO sessions (hash, expires) VALUES ($1, $2) ON CONFLICT (hash) DO UPDATE SET expires = $2',
        [tokenHash, expires]
      );
      return;
    }
    this.sqliteDb.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
    this.sqliteDb.prepare('INSERT INTO sessions VALUES(?,?)').run(tokenHash, expires);
  }

  async getSession(tokenHash) {
    if (this.type === 'postgres') {
      const res = await this.pgPool.query('SELECT expires FROM sessions WHERE hash = $1', [tokenHash]);
      return res.rows[0] ? { expires: Number(res.rows[0].expires) } : null;
    }
    return this.sqliteDb.prepare('SELECT expires FROM sessions WHERE hash=?').get(tokenHash);
  }

  async deleteSession(tokenHash) {
    if (this.type === 'postgres') {
      await this.pgPool.query('DELETE FROM sessions WHERE hash = $1', [tokenHash]);
      return;
    }
    this.sqliteDb.prepare('DELETE FROM sessions WHERE hash=?').run(tokenHash);
  }

  async addAudit(id, at, action, resource) {
    if (this.type === 'postgres') {
      await this.pgPool.query('INSERT INTO audit (id, at, action, resource) VALUES ($1, $2, $3, $4)', [id, at, action, resource]);
      return;
    }
    this.sqliteDb.prepare('INSERT INTO audit VALUES(?,?,?,?)').run(id, at, action, resource);
  }

  async transaction(fn) {
    if (this.type === 'postgres') {
      const client = await this.pgPool.connect();
      try {
        await client.query('BEGIN');
        const txAdapter = new Proxy(this, {
          get(target, prop) {
            if (prop === 'pgPool') {
              return {
                query: (text, params) => client.query(text, params)
              };
            }
            return target[prop];
          }
        });
        const result = await fn(txAdapter);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      this.sqliteDb.exec('BEGIN IMMEDIATE');
      try {
        const result = await fn(this);
        this.sqliteDb.exec('COMMIT');
        return result;
      } catch (err) {
        this.sqliteDb.exec('ROLLBACK');
        throw err;
      }
    }
  }

  async close() {
    if (this.pgPool) {
      await this.pgPool.end();
    }
  }
}

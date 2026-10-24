import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { backup, DatabaseSync } from 'node:sqlite';

// Recognize existing panel files and the names previously produced by npm run backup.
const currentName = /^alfa-\d{8}T\d{6}-[a-f0-9]{8}\.sqlite$/;
const legacyName = /^alfa-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.sqlite$/;
export const isBackupName = name => currentName.test(name) || legacyName.test(name);
export const backupDirectory = () => path.resolve(process.env.ALFA_BACKUP_DIR || 'backups');

export function listBackups(directory = backupDirectory()) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  return fs.readdirSync(directory).filter(isBackupName).flatMap(name => {
    const stat = fs.lstatSync(path.join(directory, name));
    return stat.isFile() ? [{ name, size: stat.size, createdAt: stat.mtime.toISOString() }] : [];
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.name.localeCompare(a.name));
}

export function verifyBackup(file) {
  const check = new DatabaseSync(file, { readOnly: true });
  try {
    const result = check.prepare('PRAGMA integrity_check').all().map(row => Object.values(row)[0]);
    if (result.length !== 1 || result[0] !== 'ok') throw new Error('Backup não passou na verificação de integridade.');
  } finally { check.close(); }
}

export async function createBackup(database, directory = backupDirectory()) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '');
  const name = `alfa-${stamp}-${randomBytes(4).toString('hex')}.sqlite`;
  const target = path.join(directory, name);
  const partial = target + '.partial';
  try {
    if (database && typeof database.query === 'function') {
      // PostgreSQL pool or client: build standard SQLite snapshot
      const syncDb = new DatabaseSync(partial);
      syncDb.exec(`
        PRAGMA journal_mode=WAL;
        CREATE TABLE records (key TEXT PRIMARY KEY, value TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1);
        CREATE TABLE orders (id TEXT PRIMARY KEY, number INTEGER UNIQUE NOT NULL, token_hash TEXT NOT NULL, idem_hash TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
        CREATE TABLE audit (id TEXT PRIMARY KEY, at TEXT NOT NULL, action TEXT NOT NULL, resource TEXT NOT NULL);
      `);
      const recResult = await database.query('SELECT key, value, version FROM records');
      const insertRec = syncDb.prepare('INSERT INTO records (key, value, version) VALUES (?, ?, ?)');
      for (const row of recResult.rows) {
        insertRec.run(row.key, typeof row.value === 'string' ? row.value : JSON.stringify(row.value), row.version || 1);
      }
      const ordResult = await database.query('SELECT id, number, token_hash, idem_hash, data FROM orders');
      const insertOrd = syncDb.prepare('INSERT INTO orders (id, number, token_hash, idem_hash, data) VALUES (?, ?, ?, ?, ?)');
      for (const row of ordResult.rows) {
        insertOrd.run(row.id, row.number, row.token_hash, row.idem_hash, typeof row.data === 'string' ? row.data : JSON.stringify(row.data));
      }
      const audResult = await database.query('SELECT id, at, action, resource FROM audit');
      const insertAud = syncDb.prepare('INSERT INTO audit (id, at, action, resource) VALUES (?, ?, ?, ?)');
      for (const row of audResult.rows) {
        insertAud.run(row.id, row.at, row.action, row.resource);
      }
      syncDb.close();
    } else {
      await backup(database, partial);
    }
    fs.chmodSync(partial, 0o600);
    verifyBackup(partial);
    fs.renameSync(partial, target);
    return { name, path: target };
  } finally {
    fs.rmSync(partial, { force: true });
  }
}


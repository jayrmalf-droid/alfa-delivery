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
    await backup(database, partial);
    fs.chmodSync(partial, 0o600);
    verifyBackup(partial);
    fs.renameSync(partial, target);
    return { name, path: target };
  } finally {
    fs.rmSync(partial, { force: true });
  }
}

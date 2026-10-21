import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { createBackup } from '../server/backups.mjs';

const type = process.env.DATABASE_TYPE || (process.env.DATABASE_URL?.startsWith('postgres') ? 'postgres' : 'sqlite');
if (type !== 'sqlite') throw new Error('Este comando cria backups de SQLite. Use o procedimento de PostgreSQL para esta instalação.');
const source = process.env.ALFA_DATABASE || './data/alfa.sqlite';
if (!fs.existsSync(source)) throw new Error('O banco ainda não existe. Inicie o servidor primeiro.');
const database = new DatabaseSync(source, { readOnly: true });
try {
  const result = await createBackup(database);
  console.log(`Backup consistente criado e verificado: ${result.path}`);
} finally { database.close(); }

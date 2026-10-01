import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
const source=process.env.ALFA_DATABASE||'./data/alfa.sqlite';
if(!fs.existsSync(source))throw Error('O banco ainda não existe. Inicie o servidor primeiro.');
fs.mkdirSync('backups',{recursive:true,mode:0o700});
const target=path.resolve(`backups/alfa-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`);
const db=new DatabaseSync(source);db.prepare('VACUUM INTO ?').run(target);db.close();fs.chmodSync(target,0o600);
console.log(`Backup consistente criado: ${target}`);

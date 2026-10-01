import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));

function run(program, args, shell = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { stdio: 'inherit', shell });
    child.on('error', reject);
    child.on('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(signal ? `Operação interrompida (${signal}).` : `Operação encerrada com código ${code}.`)));
  });
}
const npm = args => run(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, process.platform === 'win32');

try {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Instale Node.js 24 ou superior para executar o sistema.');
  if (fs.existsSync('.env')) process.loadEnvFile('.env');
  if (process.env.NODE_ENV === 'production') throw new Error('Este assistente é para uso local. Para o ambiente de produção configurado, execute npm start.');
  console.log('\nALFA SALGADOS — iniciar no computador\n');
  if (!fs.existsSync('node_modules/vite/bin/vite.js') || !fs.existsSync('node_modules/typescript/lib/typescript.js')) {
    console.log('Instalando as dependências. Esta primeira etapa precisa de internet.');
    await npm(['ci']);
  }
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD_HASH) {
    console.log('Configure o administrador desta instalação:');
    await run(process.execPath, ['scripts/setup-admin.mjs']);
  }
  console.log('Preparando a loja…');
  await npm(['run', 'build']);
  console.log('\nAbra http://localhost:3001 para a loja e /admin para o painel, se estiver usando a porta padrão.');
  console.log('O endereço efetivo aparecerá abaixo. Mantenha este terminal aberto; Ctrl+C encerra o servidor.\n');
  await run(process.execPath, ['--env-file-if-exists=.env', 'server/index.mjs']);
} catch (error) {
  console.error(`\nNão foi possível iniciar: ${error.message}`);
  process.exitCode = 1;
}

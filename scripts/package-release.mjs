import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import os from 'node:os';

const projectRoot = path.resolve('.');
const targetZip = path.join(projectRoot, 'ALFA_DELIVERY_V0_3_1_PRODUCAO.zip');
const tempStaging = fs.mkdtempSync(path.join(os.tmpdir(), 'alfa-pkg-'));

console.log('Criando pacote limpo de produção...');
console.log(`Staging: ${tempStaging}`);

const includeDirs = ['src', 'public', 'server', 'scripts', 'tests'];
const includeFiles = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'vite.config.ts',
  'index.html',
  'INICIAR_WINDOWS.bat',
  'firebase.json',
  'Dockerfile',
  '.dockerignore',
  '.env.example',
  '.oxlintrc.json',
  'README.md',
  'ATUALIZAR_LAYOUT.md',
  'AUDITORIA_V0_3.md',
  'DEPLOY_PRODUCAO.md',
  'GUIA_EXECUCAO_WINDOWS.md',
  'GUIA_BACKUP_RESTAURACAO.md',
  'RELATORIO_HOMOLOGACAO.md'
];

// Copy include dirs
for (const dir of includeDirs) {
  const srcDir = path.join(projectRoot, dir);
  const destDir = path.join(tempStaging, dir);
  fs.cpSync(srcDir, destDir, { recursive: true });
}

// Copy include files
for (const file of includeFiles) {
  const srcFile = path.join(projectRoot, file);
  if (fs.existsSync(srcFile)) {
    fs.copyFileSync(srcFile, path.join(tempStaging, file));
  }
}

// Ensure src/data was properly included
const srcData = path.join(tempStaging, 'src', 'data');
if (!fs.existsSync(srcData)) {
  throw new Error('Falha crítica: pasta src/data ausente no pacote!');
}
console.log('✓ Pasta src/data conferida e incluída com sucesso.');

// Remove previous zip if exists
if (fs.existsSync(targetZip)) {
  fs.unlinkSync(targetZip);
}

// Use powershell Compress-Archive
console.log(`Compactando em ${targetZip}...`);
execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${tempStaging}/*' -DestinationPath '${targetZip}' -Force"`, { stdio: 'inherit' });

// Cleanup temp staging
fs.rmSync(tempStaging, { recursive: true, force: true });

console.log(`✓ Pacote criado com sucesso em: ${targetZip}`);
const stat = fs.statSync(targetZip);
console.log(`Tamanho do pacote: ${(stat.size / (1024 * 1024)).toFixed(2)} MB`);

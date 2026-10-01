import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'alfa-extract-test-'));
console.log('Extraindo para:', testDir);
execSync(`powershell -NoProfile -Command "Expand-Archive -Path 'ALFA_DELIVERY_V0_3_1_PRODUCAO.zip' -DestinationPath '${testDir}' -Force"`, { stdio: 'inherit' });

console.log('Verificando arquivos extraídos...');
const required = ['package.json', 'src/data', 'server/index.mjs', 'firebase.json', 'Dockerfile'];
for (const req of required) {
  if (!fs.existsSync(path.join(testDir, req))) throw new Error('Ausente: ' + req);
}
console.log('Todos os arquivos requeridos estão presentes!');

console.log('Executando npm ci...');
execSync('npm ci', { cwd: testDir, stdio: 'inherit' });

console.log('Executando npm run build...');
execSync('npm run build', { cwd: testDir, stdio: 'inherit' });

console.log('Executando testes automatizados...');
execSync('node --test tests/*.test.mjs', { cwd: testDir, stdio: 'inherit' });

console.log('✓ EXTRAÇÃO, INSTALAÇÃO, COMPILAÇÃO E TESTES 100% VALIDADOS NO PACOTE!');
try {
  fs.rmSync(testDir, { recursive: true, force: true });
} catch {
  // temp cleanup
}

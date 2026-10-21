import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { assertPortAvailable } from '../scripts/local-port.mjs';
import { operationalKeys, allowedPath, requiredFiles, validateReleaseTree, validateArchiveEntry } from '../scripts/release-utils.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));

test('ZIP do Windows aceita separadores .NET e mantém bloqueios de caminhos e dados operacionais', () => {
  const info = { folder: 'AlfaDeliveryPRO_0.6.4' };
  for (const separator of ['/', '\\']) {
    const entry = ['AlfaDeliveryPRO_0.6.4', 'alfadeliveryPRO', '.dockerignore'].join(separator);
    assert.equal(validateArchiveEntry(entry, info), 'AlfaDeliveryPRO_0.6.4/alfadeliveryPRO/.dockerignore');
    assert.equal(validateArchiveEntry(['AlfaDeliveryPRO_0.6.4', 'alfadeliveryPRO', 'src', 'data', 'initialData.ts'].join(separator), info), 'AlfaDeliveryPRO_0.6.4/alfadeliveryPRO/src/data/initialData.ts');
    for (const tail of [['..', 'escape.txt'], ['data', 'alfa.sqlite'], ['backups', 'file.sqlite'], ['node_modules', 'file.js'], ['dist', 'index.html'], ['.env']]) {
      assert.throws(() => validateArchiveEntry(['AlfaDeliveryPRO_0.6.4', 'alfadeliveryPRO', ...tail].join(separator), info));
    }
    assert.throws(() => validateArchiveEntry(['AlfaDeliveryPRO_0.6.4', '..', 'escape.txt'].join(separator), info));
    assert.throws(() => validateArchiveEntry(['AlfaDeliveryPRO_0.6.4', 'another-project', 'file.txt'].join(separator), info));
  }
  for (const entry of ['C:\\escape.txt', '\\AlfaDeliveryPRO_0.6.4\\alfadeliveryPRO\\file', '/AlfaDeliveryPRO_0.6.4/alfadeliveryPRO/file', 'AlfaDeliveryPRO_0.6.4/alfadeliveryPRO//file'])
    assert.throws(() => validateArchiveEntry(entry, info));
});

function temp(fn) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alfa-release-test-'));
  try { return fn(directory); } finally { fs.rmSync(directory, { recursive: true, force: true }); }
}

test('compilação dos seeds ignora banco local e não altera seus dados', () => temp(directory => {
  for (const dir of ['src/data', 'src/domain']) fs.cpSync(path.join(root, dir), path.join(directory, dir), { recursive: true });
  fs.mkdirSync(path.join(directory, 'data'));
  const file = path.join(directory, 'data/alfa.sqlite');
  const db = new DatabaseSync(file);
  db.exec('CREATE TABLE records(key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  const marker = 'PRIVATE_OPERATIONAL_DATA_NOT_FOR_RELEASE';
  for (const key of [...operationalKeys, 'alfa_settings']) db.prepare('INSERT INTO records VALUES(?,?)').run(key, JSON.stringify({ marker }));
  db.close();
  const before = fs.readFileSync(file);
  execFileSync(process.execPath, [path.join(root, 'scripts/prepare-server.mjs')], { cwd: directory });
  const seedText = fs.readFileSync(path.join(directory, 'server/seed.json'), 'utf8');
  assert.ok(!seedText.includes(marker));
  const seed = JSON.parse(seedText);
  for (const key of operationalKeys) assert.deepEqual(seed[key], []);
  assert.ok(seed.alfa_products.length > 0);
  assert.deepEqual(fs.readFileSync(file), before);
}));

test('validador exige seeds e cálculo de saldo e rejeita conteúdo operacional no pacote', () => temp(directory => {
  for (const file of requiredFiles) {
    const target = path.join(directory, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(path.join(root, file), target);
  }
  // Regenerate clean seed for this fixture independently of the developer's working database.
  fs.writeFileSync(path.join(directory, 'server/seed.json'), JSON.stringify(Object.fromEntries(operationalKeys.map(k => [k, []]))));
  assert.ok(validateReleaseTree(directory) > 0);
  for (const file of ['src/data/initialData.ts', 'src/data/bannerSeeds.ts', 'src/domain/receivables.ts', 'src/domain/adminInput.ts', 'src/domain/schedule.ts', 'src/components/admin/admin-usability.css', 'src/components/admin/admin-workspaces.css', 'src/components/admin/admin-campaigns.css']) {
    const saved = fs.readFileSync(path.join(directory, file)); fs.unlinkSync(path.join(directory, file));
    assert.throws(() => validateReleaseTree(directory), /Arquivo obrigatório ausente/);
    fs.writeFileSync(path.join(directory, file), saved);
  }
  for (const dir of ['data', 'backups', 'node_modules', 'dist']) {
    fs.mkdirSync(path.join(directory, dir)); assert.throws(() => validateReleaseTree(directory), /Conteúdo proibido/); fs.rmdirSync(path.join(directory, dir));
  }
  fs.writeFileSync(path.join(directory, '.env'), 'PRIVATE=fixture');
  assert.throws(() => validateReleaseTree(directory), /Conteúdo proibido/); fs.unlinkSync(path.join(directory, '.env'));
  fs.writeFileSync(path.join(directory, 'server/seed.json'), JSON.stringify({ ...Object.fromEntries(operationalKeys.map(k => [k, []])), alfa_sales: [{ id: 'private' }] }));
  assert.throws(() => validateReleaseTree(directory), /Dados operacionais/);
  assert.equal(allowedPath('src/data/initialData.ts'), true);
  assert.equal(allowedPath('.env.example'), true);
}));

test('porta ocupada gera erro claro e mantém o servidor existente ativo', async () => {
  const server = net.createServer(socket => socket.end('still running'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  try {
    await assert.rejects(assertPortAvailable(port, '127.0.0.1'), /já está em uso/);
    const reply = await new Promise((resolve, reject) => {
      const socket = net.connect(port, '127.0.0.1'); let text = '';
      socket.on('data', chunk => { text += chunk; }); socket.on('end', () => resolve(text)); socket.on('error', reject);
    });
    assert.equal(reply, 'still running');
  } finally { await new Promise(resolve => server.close(resolve)); }
  await assertPortAvailable(port, '127.0.0.1');
  await assert.rejects(assertPortAvailable(-1), /PORT/);
});

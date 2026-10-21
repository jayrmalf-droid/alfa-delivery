import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { DatabaseSync } from 'node:sqlite';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA = 'C:\\Users\\jayrm\\.gemini\\antigravity-ide\\brain\\9f969e5c-ea35-4423-8831-224810bc580c\\scratch\\chrome_profile_admin_print2';
const OUT_DIR = 'C:\\Users\\jayrm\\.gemini\\antigravity-ide\\brain\\9f969e5c-ea35-4423-8831-224810bc580c\\scratch';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// 1. Inserir sessão de admin válida no banco SQLite
const testToken = 'admin-print-test-' + Date.now();
const tokenHash = createHash('sha256').update(testToken).digest('hex');
const dbPath = path.resolve('./data/alfa.sqlite');
if (fs.existsSync(dbPath)) {
  const db = new DatabaseSync(dbPath);
  db.prepare('INSERT OR REPLACE INTO sessions (hash, expires) VALUES (?, ?)').run(tokenHash, Date.now() + 3600000 * 24);
  db.close();
  console.log('Inserted admin session token into sqlite db');
}

// 2. Iniciar Chrome Headless
const chromeProc = spawn(CHROME_PATH, [
  '--headless=new',
  '--remote-debugging-port=9233',
  '--user-data-dir=' + USER_DATA,
  '--disable-gpu',
  'about:blank'
]);

const sleep = ms => new Promise(r => setTimeout(r, ms));
await sleep(1500);

let wsUrl;
for (let i = 0; i < 20; i++) {
  try {
    const res = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9233/json', r => {
        let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });
    const p = res.find(x => x.type === 'page');
    if (p) { wsUrl = p.webSocketDebuggerUrl; break; }
  } catch { await sleep(200); }
}

const ws = new WebSocket(wsUrl);
await new Promise(r => ws.onopen = r);
let id = 1;
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const curId = id++;
  const handler = e => {
    const msg = JSON.parse(e.data);
    if (msg.id === curId) { ws.removeEventListener('message', handler); resolve(msg.result); }
  };
  ws.addEventListener('message', handler);
  ws.send(JSON.stringify({ id: curId, method, params }));
});

await send('Network.enable');
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });

// Configurar cookies de sessão de admin
await send('Network.setCookie', {
  name: 'alfa_session',
  value: testToken,
  domain: 'localhost',
  path: '/'
});
await send('Network.setCookie', {
  name: '__session',
  value: testToken,
  domain: 'localhost',
  path: '/'
});

await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Network.clearBrowserCache');
await send('Page.navigate', { url: 'http://localhost:3001/admin' });
await sleep(4000);

// Espera o carregamento sumir
await send('Runtime.evaluate', {
  expression: `new Promise(resolve => {
    const check = () => {
      const text = document.body.textContent || '';
      if (!text.includes('Carregando')) resolve();
      else setTimeout(check, 300);
    };
    check();
  })`,
  awaitPromise: true
});
await sleep(1000);

// Navegar para a aba "Produtos"
const navRes = await send('Runtime.evaluate', {
  expression: `(() => {
    const btns = Array.from(document.querySelectorAll('button, a, div, span'));
    const prodBtn = btns.find(b => b.textContent && b.textContent.trim() === 'Produtos');
    if (prodBtn) {
      prodBtn.click();
      return 'Navigated to Produtos';
    }
    return 'Produtos button not found. Available text: ' + btns.map(b => b.textContent?.trim()).filter(Boolean).slice(0, 15).join(' | ');
  })()`,
  returnByValue: true
});
console.log('Navigation:', navRes.result.value);
await sleep(1500);

// Captura 1: Tela de produtos com o botão Imprimir ao lado da busca
const shot1 = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(OUT_DIR, 'admin_products_print_button_verified.png'), Buffer.from(shot1.data, 'base64'));
console.log('Saved admin_products_print_button_verified.png');

// Clica no botão "Imprimir"
const clickRes = await send('Runtime.evaluate', {
  expression: `(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const printBtn = btns.find(b => b.textContent && b.textContent.includes('Imprimir'));
    if (printBtn) {
      printBtn.click();
      return 'Clicked: ' + printBtn.textContent.trim();
    }
    return 'Print button not found';
  })()`,
  returnByValue: true
});
console.log('Click print result:', clickRes.result.value);
await sleep(1500);

// Captura 2: Modal de Configuração de Impressão aberto
const shot2 = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(OUT_DIR, 'admin_print_modal_opened_verified.png'), Buffer.from(shot2.data, 'base64'));
console.log('Saved admin_print_modal_opened_verified.png');

ws.close();
chromeProc.kill();

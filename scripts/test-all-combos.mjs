import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA = 'C:\\Users\\jayrm\\.gemini\\antigravity-ide\\brain\\0a389411-8800-47c0-bc6e-48661413a696\\scratch\\chrome_profile_test4';
const OUT_DIR = 'C:\\Users\\jayrm\\.gemini\\antigravity-ide\\brain\\0a389411-8800-47c0-bc6e-48661413a696\\scratch';

const chromeProc = spawn(CHROME_PATH, [
  '--headless=new',
  '--remote-debugging-port=9226',
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
      http.get('http://127.0.0.1:9226/json', r => {
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

const exceptions = [];
ws.addEventListener('message', e => {
  const msg = JSON.parse(e.data);
  if (msg.method === 'Runtime.exceptionThrown') {
    exceptions.push(msg.params.exceptionDetails);
  }
});

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://localhost:3001' });
await sleep(2500);

const comboNames = [
  '150 Salgados',
  '50 Salgados',
  '20 Salgados',
  '30 Salgados',
  '200 Salgados'
];

for (const name of comboNames) {
  console.log(`\nTesting combo: ${name}`);
  // Open combo
  const openRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const cards = Array.from(document.querySelectorAll('.catalog-product-card, .product-card'));
      const target = cards.find(c => c.textContent.includes('${name}') && c.textContent.includes('Refrigerante'));
      if (!target) return 'Not found';
      const btn = target.querySelector('button') || target;
      btn.click();
      return 'Opened ' + target.textContent.slice(0, 30);
    })()`,
    returnByValue: true
  });
  console.log('Open:', openRes.result.value);
  await sleep(1000);

  // Scroll body down to reveal beverage
  await send('Runtime.evaluate', {
    expression: `(() => {
      const body = document.querySelector('.customizer-scrollable-body');
      if (body) body.scrollTop = body.scrollHeight;
    })()`
  });
  await sleep(500);

  // Click beverage option
  const clickBev = await send('Runtime.evaluate', {
    expression: `(() => {
      const rows = Array.from(document.querySelectorAll('.group-option-row'));
      const bev = rows.find(r => r.textContent.includes('Coca') || r.textContent.includes('Guaraná'));
      if (!bev) return 'No bev option found. Total rows: ' + rows.length;
      bev.click();
      return 'Clicked ' + bev.textContent.trim();
    })()`,
    returnByValue: true
  });
  console.log('Click bev:', clickBev.result.value);
  await sleep(1000);

  // Check if modal is still open and healthy
  const checkModal = await send('Runtime.evaluate', {
    expression: `(() => {
      const sheet = document.querySelector('.product-customizer-sheet');
      if (!sheet) return 'MODAL DISAPPEARED / CLOSED!';
      return 'Modal present, children count: ' + sheet.children.length + ', innerText length: ' + sheet.innerText.length;
    })()`,
    returnByValue: true
  });
  console.log('Status:', checkModal.result.value);

  // Close modal
  await send('Runtime.evaluate', {
    expression: `(() => {
      const closeBtn = document.querySelector('.customizer-close-btn');
      if (closeBtn) closeBtn.click();
    })()`
  });
  await sleep(1000);
}

console.log('\nTotal exceptions caught:', exceptions.length);
exceptions.forEach(e => console.log('EXCEPTION:', e.text, e.exception?.description));

ws.close();
chromeProc.kill();

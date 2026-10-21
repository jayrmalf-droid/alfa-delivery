import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA = 'C:\\Users\\jayrm\\.gemini\\antigravity-ide\\brain\\0a389411-8800-47c0-bc6e-48661413a696\\scratch\\chrome_profile';
const OUT_DIR = 'C:\\Users\\jayrm\\.gemini\\antigravity-ide\\brain\\0a389411-8800-47c0-bc6e-48661413a696\\scratch';

const chromeProc = spawn(CHROME_PATH, [
  '--headless=new',
  '--remote-debugging-port=9222',
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
      http.get('http://127.0.0.1:9222/json', r => {
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

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: 'http://localhost:3001' });
await sleep(2500);

// Open 100 salgados
await send('Runtime.evaluate', {
  expression: `(() => {
    const cards = Array.from(document.querySelectorAll('.catalog-product-card, .product-card'));
    const card = cards.find(c => c.textContent.includes('100 Salgados'));
    if (card) {
      const btn = card.querySelector('button') || card;
      btn.click();
    }
  })()`
});
await sleep(1500);

const shotMobile = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(OUT_DIR, 'modal_mobile_390x844.png'), Buffer.from(shotMobile.data, 'base64'));
console.log('Saved modal_mobile_390x844.png');

ws.close();
chromeProc.kill();

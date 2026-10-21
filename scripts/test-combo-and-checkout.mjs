import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA = 'C:\\Users\\jayrm\\.gemini\\antigravity-ide\\brain\\0a389411-8800-47c0-bc6e-48661413a696\\scratch\\chrome_profile_test';
const OUT_DIR = 'C:\\Users\\jayrm\\.gemini\\antigravity-ide\\brain\\0a389411-8800-47c0-bc6e-48661413a696\\scratch';

const chromeProc = spawn(CHROME_PATH, [
  '--headless=new',
  '--remote-debugging-port=9223',
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
      http.get('http://127.0.0.1:9223/json', r => {
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

const consoleMessages = [];
ws.addEventListener('message', e => {
  const msg = JSON.parse(e.data);
  if (msg.method === 'Runtime.consoleAPICalled') {
    consoleMessages.push(msg.params.args.map(a => a.value || a.description).join(' '));
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    consoleMessages.push('EXCEPTION: ' + JSON.stringify(msg.params.exceptionDetails));
  }
});

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://localhost:3001' });
await sleep(3000);

console.log('Navigated to localhost:3001');

// Find and click combo "150 Salgados + Refrigerante de 1 Litro"
const clickResult = await send('Runtime.evaluate', {
  expression: `(() => {
    const cards = Array.from(document.querySelectorAll('.catalog-product-card, .product-card'));
    const target = cards.find(c => c.textContent.includes('150 Salgados') || c.textContent.includes('Refrigerante'));
    if (!target) return 'Card not found';
    const btn = target.querySelector('button') || target;
    btn.click();
    return 'Clicked: ' + target.textContent.slice(0, 50);
  })()`,
  returnByValue: true
});
console.log('Click result:', clickResult.result.value);
await sleep(1500);

// Capture screenshot of opened modal
const shot1 = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(OUT_DIR, 'combo_modal_open.png'), Buffer.from(shot1.data, 'base64'));
console.log('Saved combo_modal_open.png');

// Inspect what groups and options are rendered inside the modal
const modalState = await send('Runtime.evaluate', {
  expression: `(() => {
    const modal = document.querySelector('.product-customizer-sheet, .modal');
    if (!modal) return { error: 'No modal found' };
    const groups = Array.from(modal.querySelectorAll('.customizer-group-card, section')).map(g => ({
      title: g.querySelector('h3, h4')?.textContent?.trim(),
      options: Array.from(g.querySelectorAll('.group-option-row, .option-row')).map(o => o.textContent?.trim().replace(/\\s+/g, ' '))
    }));
    return {
      modalClasses: modal.className,
      modalText: modal.textContent?.slice(0, 200),
      groups
    };
  })()`,
  returnByValue: true
});
console.log('Modal state:', JSON.stringify(modalState.result.value, null, 2));

// Now try clicking on a beverage option!
const clickBeverageResult = await send('Runtime.evaluate', {
  expression: `(() => {
    const modal = document.querySelector('.product-customizer-sheet, .modal');
    if (!modal) return 'No modal';
    const options = Array.from(modal.querySelectorAll('.group-option-row, .option-row'));
    const beverageOpt = options.find(o => o.textContent.includes('Coca') || o.textContent.includes('Guaraná'));
    if (!beverageOpt) return 'Beverage option not found. Available options: ' + options.map(o => o.textContent.trim()).join(' | ');
    beverageOpt.click();
    return 'Clicked beverage: ' + beverageOpt.textContent.trim();
  })()`,
  returnByValue: true
});
console.log('Click beverage result:', clickBeverageResult.result.value);
await sleep(1500);

// Screenshot after clicking beverage
const shot2 = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(OUT_DIR, 'combo_after_beverage.png'), Buffer.from(shot2.data, 'base64'));
console.log('Saved combo_after_beverage.png');

console.log('Captured Console Messages:');
consoleMessages.forEach(m => console.log('  [LOG]', m));

ws.close();
chromeProc.kill();

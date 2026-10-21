import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA = 'C:\\Users\\jayrm\\.gemini\\antigravity-ide\\brain\\0a389411-8800-47c0-bc6e-48661413a696\\scratch\\chrome_profile_test3';
const OUT_DIR = 'C:\\Users\\jayrm\\.gemini\\antigravity-ide\\brain\\0a389411-8800-47c0-bc6e-48661413a696\\scratch';

const chromeProc = spawn(CHROME_PATH, [
  '--headless=new',
  '--remote-debugging-port=9225',
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
      http.get('http://127.0.0.1:9225/json', r => {
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
await sleep(2500);

// Open combo 100 salgados
await send('Runtime.evaluate', {
  expression: `(() => {
    const cards = Array.from(document.querySelectorAll('.catalog-product-card, .product-card'));
    const target = cards.find(c => c.textContent.includes('100 Salgados') && c.textContent.includes('Refrigerante'));
    const btn = target.querySelector('button') || target;
    btn.click();
  })()`
});
await sleep(1500);

// Add 100 coxinhas
await send('Runtime.evaluate', {
  expression: `(() => {
    const coxinhaRow = Array.from(document.querySelectorAll('.group-option-row')).find(r => r.textContent.includes('Coxinha'));
    const plusBtn = coxinhaRow.querySelector('.counter-btn:last-child');
    for (let i = 0; i < 10; i++) plusBtn.click();
  })()`
});
await sleep(500);

// Select beverage
await send('Runtime.evaluate', {
  expression: `(() => {
    const beverageRow = Array.from(document.querySelectorAll('.group-option-row')).find(r => r.textContent.includes('Coca Cola'));
    beverageRow.click();
  })()`
});
await sleep(500);

// Click "Adicionar ao Carrinho"
await send('Runtime.evaluate', {
  expression: `(() => {
    const addBtn = document.querySelector('.footer-action-btn');
    if (addBtn) addBtn.click();
  })()`
});
await sleep(1500);

// Open checkout
await send('Runtime.evaluate', {
  expression: `(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Avançar para o Pedido') || b.textContent.includes('Finalizar'));
    if (btn) btn.click();
  })()`
});
await sleep(1500);

// Fill form and submit
const submitResult = await send('Runtime.evaluate', {
  expression: `(async () => {
    const nameInput = document.querySelector('input[placeholder*="nome" i]');
    if (nameInput) {
      nameInput.value = 'Cliente Teste';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const phoneInput = document.querySelector('input[placeholder*="9999" i]');
    if (phoneInput) {
      phoneInput.value = '(77) 98888-7777';
      phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
      phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Select Retirada no balcao to avoid address requirement
    const buttons = Array.from(document.querySelectorAll('button, [role="button"], label, div'));
    const pickupBtn = buttons.find(b => b.textContent.includes('Retirada no Balcão') && b.tagName === 'BUTTON');
    if (pickupBtn) pickupBtn.click();

    await new Promise(r => setTimeout(r, 500));

    // Submit form
    const form = document.querySelector('form');
    const submitBtn = Array.from(document.querySelectorAll('button[type="submit"], button')).find(b => b.textContent.includes('Confirmar Pedido') || b.textContent.includes('Enviar Pedido'));
    
    if (submitBtn) {
      submitBtn.click();
      return 'Clicked submit button: ' + submitBtn.textContent;
    } else if (form) {
      form.requestSubmit();
      return 'Dispatched form requestSubmit';
    }
    return 'Could not find submit button or form';
  })()`,
  awaitPromise: true,
  returnByValue: true
});
console.log('Submit result:', submitResult.result.value);
await sleep(2500);

const errorBanner = await send('Runtime.evaluate', {
  expression: `(() => {
    const err = document.querySelector('.form-error, [role="alert"], .alert-danger, .text-red-500');
    return err ? err.textContent : 'No error banner found';
  })()`,
  returnByValue: true
});
console.log('Error banner:', errorBanner.result.value);

const shotAfterSubmit = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(OUT_DIR, 'after_submit.png'), Buffer.from(shotAfterSubmit.data, 'base64'));

console.log('Console logs:');
consoleMessages.forEach(m => console.log('  [LOG]', m));

ws.close();
chromeProc.kill();

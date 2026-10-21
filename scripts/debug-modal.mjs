import { spawn } from 'child_process';
import http from 'http';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA = 'C:\\Users\\jayrm\\.gemini\\antigravity-ide\\brain\\0a389411-8800-47c0-bc6e-48661413a696\\scratch\\chrome_profile';

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
await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://localhost:3001' });
await sleep(2500);

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

const debugInfo = await send('Runtime.evaluate', {
  expression: `(() => {
    const sheet = document.querySelector('.product-customizer-sheet');
    const body = document.querySelector('.customizer-scrollable-body');
    const groupCard = document.querySelector('.customizer-group-card');
    const groupHeader = document.querySelector('.group-card-header');
    const optionsList = document.querySelector('.group-options-list');
    const options = Array.from(document.querySelectorAll('.group-option-row'));
    const footer = document.querySelector('.customizer-sticky-footer');

    const rect = el => el ? {
      top: Math.round(el.getBoundingClientRect().top),
      bottom: Math.round(el.getBoundingClientRect().bottom),
      height: Math.round(el.getBoundingClientRect().height),
      width: Math.round(el.getBoundingClientRect().width)
    } : null;

    try {
      const parent = document.querySelector('.customizer-scrollable-body');
      Array.from(parent.children).forEach(ch => ch.style.flexShrink = '0');
      
      const card = document.querySelector('.customizer-group-card');
      const optList = document.querySelector('.group-options-list');
      const options = Array.from(document.querySelectorAll('.group-option-row'));

      return {
        parentHeight: parent.offsetHeight,
        parentScrollHeight: parent.scrollHeight,
        parentClientHeight: parent.clientHeight,
        cardHeight: card.offsetHeight,
        optListHeight: optList ? optList.offsetHeight : 0,
        optionsCount: options.length,
        firstOptionRect: options[0] ? options[0].getBoundingClientRect() : null,
        lastOptionRect: options[options.length - 1] ? options[options.length - 1].getBoundingClientRect() : null
      };
    } catch (err) {
      return { error: err.message, stack: err.stack };
    }
  })()`,
  returnByValue: true
});

console.log('DOM INSPECT:', JSON.stringify(debugInfo.result.value, null, 2));

ws.close();
chromeProc.kill();

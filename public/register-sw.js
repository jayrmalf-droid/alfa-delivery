if ('serviceWorker' in navigator && !/^(localhost|127\.)/.test(location.hostname)) {
 window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
}

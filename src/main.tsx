import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { initialize } from './services/api';
const root = createRoot(document.getElementById('root')!);
root.render(<main className="connection-screen"><h1>Alfa Salgados</h1><p>Carregando o cardápio…</p></main>);
initialize().then(() => root.render(<React.StrictMode><App /></React.StrictMode>)).catch(() => root.render(
  <main className="connection-screen"><h1>Não foi possível abrir o cardápio</h1><p>Verifique sua conexão e tente novamente.</p><button className="btn btn-primary" onClick={() => location.reload()}>Tentar novamente</button></main>
));

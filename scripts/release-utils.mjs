import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const operationalKeys = ['alfa_orders', 'alfa_customers', 'alfa_sales', 'alfa_customer_profiles',
  'alfa_expenses', 'alfa_cash_closures', 'alfa_stock_movements', 'alfa_sales_goals', 'alfa_loyalty_points'];
export const requiredFiles = ['package.json', 'package-lock.json', 'index.html', 'vite.config.ts',
  'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'src/ledger-search.css', 'src/navigation-shortcuts.css', 'src/components/admin/AdminWorkspaceTools.tsx', 'src/components/admin/adminPages.ts', 'src/order-filter-chips.css', 'src/catalog-filter-tools.css', 'src/product-editor-usability.css', 'src/selection-guidance.css', 'src/domain/selectionGuidance.ts', 'src/product-availability.css', 'src/domain/productAvailability.ts', 'src/catalog-sorting.css', 'src/domain/catalogBrowse.ts', 'src/main.tsx', 'src/App.tsx',
  'src/data/initialData.ts', 'src/data/bannerSeeds.ts', 'src/components/admin/admin-layout.css', 'src/components/admin/adminPages.ts', 'src/domain/businessDates.ts', 'src/domain/receivables.ts', 'src/domain/adminInput.ts', 'src/domain/schedule.ts', 'src/components/admin/admin-usability.css', 'src/components/admin/admin-workspaces.css', 'src/components/admin/admin-campaigns.css', 'src/components/admin/admin-finance.css', 'src/components/admin/admin-settings.css', 'src/components/admin/admin-catalog-agenda.css', 'src/components/admin/admin-dashboard-overview.css', 'src/components/admin/admin-orders-workspace.css', 'src/system-usability.css', 'src/system-tracking.css', 'src/financial-inputs.css', 'src/system-feedback.css', 'src/components/common/Feedback.tsx', 'src/domain/orderTracking.ts', 'server/index.mjs', 'server/database.mjs',
  'server/seed.json', 'server/backups.mjs', 'scripts/backup.mjs', 'scripts/local-port.mjs',
  'scripts/start-local.mjs', 'INICIAR_WINDOWS.bat', '.env.example', '.oxlintrc.json'];

export function releaseInfo(projectRoot) {
  const { version } = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Versão inválida para distribuição.');
  const folder = `AlfaDeliveryPRO_${version}`;
  return { version, folder, relativeProject: `${folder}/alfadeliveryPRO`, filename: `${folder}_PREVIA.zip` };
}

export function allowedPath(relative) {
  const parts = relative.replaceAll('\\', '/').split('/');
  if (parts.some(p => ['node_modules', 'dist', 'dist-ssr', 'backups', '.git'].includes(p))) return false;
  if (parts.some((p, i) => p === 'data' && !(i === 1 && parts[0] === 'src'))) return false;
  return !parts.some(p => (p.startsWith('.env') && p !== '.env.example') || /\.sqlite(?:[.-].*)?$|\.zip$/i.test(p));
}

export function validateReleaseTree(projectRoot) {
  for (const file of requiredFiles) {
    const resolved = path.join(projectRoot, file);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) throw new Error(`Arquivo obrigatório ausente: ${file}`);
  }
  let count = 0;
  const walk = directory => {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, item.name);
      const relative = path.relative(projectRoot, file);
      if (!allowedPath(relative) || item.isSymbolicLink()) throw new Error(`Conteúdo proibido no pacote: ${relative}`);
      if (item.isDirectory()) walk(file);
      else if (item.isFile()) count++;
      else throw new Error(`Tipo de arquivo não permitido: ${relative}`);
    }
  };
  walk(projectRoot);
  const seed = JSON.parse(fs.readFileSync(path.join(projectRoot, 'server/seed.json'), 'utf8'));
  for (const key of operationalKeys) {
    if (!Array.isArray(seed[key]) || seed[key].length !== 0) throw new Error(`Dados operacionais no seed: ${key}`);
  }
  const { version } = releaseInfo(projectRoot);
  const lock = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package-lock.json'), 'utf8'));
  if (lock.version !== version || lock.packages?.['']?.version !== version) throw new Error('Versão divergente no package-lock.json.');
  return count;
}

function powershell(command, env) {
  return execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    "$ErrorActionPreference = 'Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; " + command],
    { env: { ...process.env, ...env }, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
}

export function archiveDirectory(staging, zipPath, folder) {
  if (process.platform === 'win32') {
    powershell('[System.IO.Compression.ZipFile]::CreateFromDirectory($env:ALFA_ZIP_SOURCE, $env:ALFA_ZIP_TARGET)',
      { ALFA_ZIP_SOURCE: staging, ALFA_ZIP_TARGET: zipPath });
  } else {
    execFileSync('zip', ['-q', '-r', zipPath, folder], { cwd: staging, stdio: 'inherit' });
  }
}

export function validateArchiveEntry(entry, info) {
  // .NET on Windows can produce backslashes in ZIP entry names.
  // Validate the canonical path with the same checks for both separators.
  const normalized = entry.replaceAll('\\', '/');
  const parts = normalized.split('/');
  if (parts.at(-1) === '') parts.pop();
  if (parts[0] !== info.folder || parts.some(p => !p || p === '.' || p === '..' || p.includes(':')))
    throw new Error(`Caminho inválido no ZIP: ${entry}`);
  if (parts.length >= 2 && parts[1] !== 'alfadeliveryPRO')
    throw new Error(`Conteúdo proibido no ZIP: ${entry}`);
  if (parts.length > 2 && !allowedPath(parts.slice(2).join('/')))
    throw new Error(`Conteúdo proibido no ZIP: ${entry}`);
  return normalized;
}

export function extractRelease(zipPath, destination, info) {
  const listing = process.platform === 'win32'
    ? powershell('$z = [System.IO.Compression.ZipFile]::OpenRead($env:ALFA_ZIP_SOURCE); try { $z.Entries | ForEach-Object { $_.FullName } } finally { $z.Dispose() }', { ALFA_ZIP_SOURCE: zipPath })
    : execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const entries = listing.trim().split(/\r?\n/).filter(Boolean);
  if (!entries.length) throw new Error('ZIP vazio.');
  for (const entry of entries) {
    validateArchiveEntry(entry, info);
  }
  if (process.platform === 'win32') {
    powershell('[System.IO.Compression.ZipFile]::ExtractToDirectory($env:ALFA_ZIP_SOURCE, $env:ALFA_ZIP_TARGET)',
      { ALFA_ZIP_SOURCE: zipPath, ALFA_ZIP_TARGET: destination });
  } else execFileSync('unzip', ['-q', zipPath, '-d', destination]);
  const project = path.join(destination, info.relativeProject);
  validateReleaseTree(project);
  if (releaseInfo(project).version !== info.version) throw new Error('Versão extraída não corresponde à solicitada.');
  return project;
}

export function runNpm(args, cwd) {
  if (process.platform === 'win32') {
    // Fixed internal arguments only. Paths are passed as cwd, never interpolated.
    if (args.some(arg => !/^[a-z0-9:-]+$/i.test(arg))) throw new Error('Argumento npm inválido.');
    execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `npm ${args.join(' ')}`], { cwd, stdio: 'inherit' });
  } else execFileSync('npm', args, { cwd, stdio: 'inherit' });
}

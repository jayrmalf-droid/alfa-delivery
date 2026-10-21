import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { releaseInfo, allowedPath, validateReleaseTree, archiveDirectory, extractRelease } from './release-utils.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const info = releaseInfo(projectRoot);
const target = path.resolve(process.argv[2] || path.join(projectRoot, info.filename));
const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'alfa-release-'));
try {
  // Regenerate from versioned initial data, never from the running installation.
  execFileSync(process.execPath, ['scripts/prepare-server.mjs'], { cwd: projectRoot, stdio: 'inherit' });
  const content = path.join(staging, 'content');
  const project = path.join(content, info.relativeProject);
  fs.mkdirSync(project, { recursive: true });
  for (const dir of ['src', 'public', 'server', 'scripts', 'tests']) {
    fs.cpSync(path.join(projectRoot, dir), path.join(project, dir), {
      recursive: true,
      filter: file => allowedPath(path.relative(projectRoot, file)) && !fs.lstatSync(file).isSymbolicLink()
    });
  }
  const files = ['package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json',
    'vite.config.ts', 'index.html', 'INICIAR_WINDOWS.bat', 'firebase.json', 'render.yaml', 'Dockerfile',
    '.dockerignore', '.gitignore', '.env.example', '.oxlintrc.json',
    ...fs.readdirSync(projectRoot).filter(name => name.endsWith('.md'))];
  for (const file of files) {
    if (fs.existsSync(path.join(projectRoot, file))) fs.copyFileSync(path.join(projectRoot, file), path.join(project, file));
  }
  const count = validateReleaseTree(project);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporaryZip = path.join(staging, 'release.zip');
  archiveDirectory(content, temporaryZip, info.folder);
  const checkDir = path.join(staging, 'check'); fs.mkdirSync(checkDir);
  extractRelease(temporaryZip, checkDir, info);
  fs.copyFileSync(temporaryZip, target);
  console.log(`PRÉVIA ${info.version}: ${target}\n${count} arquivos; arquivos obrigatórios, seed e exclusões conferidos após extração.`);
} finally { fs.rmSync(staging, { recursive: true, force: true }); }

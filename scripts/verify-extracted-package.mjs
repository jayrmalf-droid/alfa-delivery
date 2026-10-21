import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { releaseInfo, extractRelease, runNpm } from './release-utils.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const info = releaseInfo(projectRoot);
const zip = path.resolve(process.argv[2] || path.join(projectRoot, info.filename));
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alfa-extracted-'));
try {
  const project = extractRelease(zip, directory, info);
  for (const args of [['ci'], ['test'], ['run', 'build']]) runNpm(args, project);
  console.log(`PRÉVIA ${info.version}: extração, instalação, testes e compilação aprovados neste ambiente. Homologação Windows pendente.`);
} finally { fs.rmSync(directory, { recursive: true, force: true }); }

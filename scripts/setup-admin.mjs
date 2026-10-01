import readline from 'node:readline/promises';
import { randomBytes, scryptSync } from 'node:crypto';
import fs from 'node:fs';
const reader=readline.createInterface({input:process.stdin,output:process.stdout});
const email=(await reader.question('E-mail do administrador: ')).trim().toLowerCase();
reader.close();
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Informe um e-mail válido.');
if(!process.stdin.isTTY)throw Error('Execute npm run setup em um terminal interativo.');
process.stdout.write('Crie uma senha com pelo menos 12 caracteres (entrada oculta): ');
process.stdin.setRawMode(true);process.stdin.resume();
const password=await new Promise((resolve,reject)=>{
 let value='';const onData=chunk=>{for(const character of chunk.toString()){
  if(character==='\u0003'){process.stdin.off('data',onData);reject(Error('Cancelado.'));return;}
  if(character==='\r'||character==='\n'){process.stdin.off('data',onData);resolve(value);return;}
  if(character==='\u007f')value=value.slice(0,-1);else if(character>=' ')value+=character;
 }};process.stdin.on('data',onData);
}).finally(()=>{process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');});
if(password.length<12)throw Error('A senha precisa ter pelo menos 12 caracteres.');
const salt=randomBytes(16).toString('hex'),digest=scryptSync(password,salt,64).toString('hex');
const old=fs.existsSync('.env')?fs.readFileSync('.env','utf8'):'';
const retained=old.split('\n').filter(line=>!/^ADMIN_(EMAIL|PASSWORD_HASH)=/.test(line)).join('\n').trim();
fs.writeFileSync('.env',`${retained}\nADMIN_EMAIL=${email}\nADMIN_PASSWORD_HASH=${salt}:${digest}\n`,{mode:0o600});
console.log('Administrador configurado. A senha não foi salva em texto puro. Reinicie o servidor.');

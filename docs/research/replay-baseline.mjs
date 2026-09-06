import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'vite';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tapten-baseline-'));
let server;
try {
 execFileSync('tar',['-xf','-','-C',tmp],{input:execFileSync('git',['archive','6542a95'],{maxBuffer:512*1024*1024})});
 fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(tmp,'node_modules'),'dir');
 server=await createServer({root:tmp,configFile:false,server:{host:'127.0.0.1',port:5198,strictPort:true},logLevel:'error'});
 await server.listen();
 await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['docs/research/capture.mjs'],{stdio:'inherit',env:{...process.env,CAPTURE_URL:'http://127.0.0.1:5198',CAPTURE_REVISION:'6542a95'}});
  child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(`Capture exit ${code}`)));
 });
} finally {await server?.close();fs.rmSync(tmp,{recursive:true,force:true});}

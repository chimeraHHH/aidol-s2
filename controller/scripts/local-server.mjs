import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import handler from '../api/index.js';
if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local');
const root = path.resolve('public');
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.jpg':'image/jpeg', '.mp4':'video/mp4' };
http.createServer(async (req,res) => {
  const url = new URL(req.url,'http://localhost');
  if (url.pathname.startsWith('/api/')) return handler(req,res);
  let name = url.pathname === '/screen' ? '/screen.html' : ['/', '/remote'].includes(url.pathname) ? '/index.html' : decodeURIComponent(url.pathname);
  const file = path.resolve(root,'.'+name);
  if (!file.startsWith(root+path.sep)) {res.writeHead(403).end();return;}
  try {
    const stat = fs.statSync(file); if (!stat.isFile()) throw Error();
    const headers = {'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Accept-Ranges':'bytes'};
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),stat.size-1):stat.size-1;
      if(start>end || start>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end();return;}
      res.writeHead(206,{...headers,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${stat.size}`});fs.createReadStream(file,{start,end}).pipe(res);
    } else {res.writeHead(200,{...headers,'Content-Length':stat.size});fs.createReadStream(file).pipe(res);}
  } catch {res.writeHead(404).end('Not found');}
}).listen(Number(process.env.PORT || 4173),'0.0.0.0',()=>console.log(`Local: http://localhost:${process.env.PORT || 4173}`));

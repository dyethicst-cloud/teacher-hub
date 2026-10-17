const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.bcmap':'application/octet-stream','.pfb':'application/octet-stream','.ttf':'font/ttf'};
const {createStore}=require('./diary-store.cjs');
const store=createStore(path.join(__dirname,'data'));
const pdfRoot=path.join(__dirname,'pdf-counter');
const allowed = new Set(['index.html','styles.css','app.js','model.js']);
http.createServer(async (req,res) => {
 if(req.url.split('?')[0]==='/api/diary'){
 const send=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 if(!/^127\.0\.0\.1:\d+$/.test(req.headers.host||''))return send(403,{error:'로컬 주소로 접속해 주세요.'});
 if(req.method==='GET')return send(200,{entries:store.list()});
 if(!['PUT','DELETE'].includes(req.method))return send(405,{error:'지원하지 않는 요청'});
 if(req.headers.origin!=='http://'+req.headers.host||!req.headers['content-type']?.startsWith('application/json'))return send(403,{error:'앱에서 다시 요청해 주세요.'});
 try{let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>500000)return send(413,{error:'내용이 너무 커요.'});chunks.push(chunk);}const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 if(req.method==='PUT')return send(200,{entry:store.save(data)});
 if(typeof data.date!=='string'||!Number.isInteger(data.revision))return send(400,{error:'삭제할 기록을 확인해 주세요.'});
 store.remove(data.date,data.revision);return send(200,{ok:true});
 }catch(e){return send(e.status||(e instanceof SyntaxError?400:500),{error:e.status?e.message:'저장하지 못했어요. 서버와 데이터 폴더를 확인해 주세요.'});}
 }

  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
  let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';}catch{res.writeHead(400);return res.end();}
  if(name==='diary'||name==='diary/')name='diary/index.html';
  if(name==='pdf-counter'||name==='pdf-counter/')name='pdf-counter/index.html';
  const resolved=path.resolve(__dirname,name);
  const localPDF=resolved.startsWith(pdfRoot+path.sep)&&['.html','.css','.js','.mjs','.bcmap','.pfb','.ttf'].includes(path.extname(resolved));
  if (!allowed.has(name)&&!localPDF&&!['diary/index.html','diary/app.js','diary/styles.css'].includes(name)) {res.writeHead(404); return res.end('Not found');}
  fs.readFile(path.join(__dirname,name),(error,data) => {
    if(error){res.writeHead(500);return res.end('Unable to load file');}
    res.writeHead(200,{'Content-Type':types[path.extname(name)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; worker-src 'self'; form-action 'none'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(data);
  });
}).listen(Number(process.env.PORT)||4320,'127.0.0.1',function(){console.log('Local: http://127.0.0.1:'+this.address().port)});


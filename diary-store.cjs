const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs');
const path=require('node:path');
function createStore(folder){
 fs.mkdirSync(folder,{recursive:true});
 const db=new DatabaseSync(path.join(folder,'diary.sqlite'));
 db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS entries (date TEXT PRIMARY KEY,title TEXT NOT NULL,body TEXT NOT NULL,mood TEXT NOT NULL,revision INTEGER NOT NULL,updated TEXT NOT NULL)');
 return {list:()=>db.prepare('SELECT * FROM entries ORDER BY date DESC').all(),close:()=>db.close(),
 save(data){
 const {date,title,body,mood,revision}=data;
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||typeof title!=='string'||title.length>120||typeof body!=='string'||!body.trim()||body.length>100000||!['happy','calm','normal','sad','tired'].includes(mood)||!Number.isInteger(revision)||revision<0)throw Object.assign(new Error('날짜와 내용을 확인해 주세요. 제목은 120자, 내용은 100,000자까지 저장할 수 있어요.'),{status:400});
 const updated=new Date().toISOString();
 if(revision===0){const r=db.prepare('INSERT OR IGNORE INTO entries VALUES (?,?,?,?,1,?)').run(date,title.trim(),body,mood,updated);if(!r.changes)throw Object.assign(new Error('이 날짜의 일기가 이미 있어요. 목록을 새로고침해 주세요.'),{status:409});}
 else {const r=db.prepare('UPDATE entries SET title=?,body=?,mood=?,revision=revision+1,updated=? WHERE date=? AND revision=?').run(title.trim(),body,mood,updated,date,revision);if(!r.changes)throw Object.assign(new Error('다른 창에서 기록이 바뀌었어요. 새로고침 후 다시 열어주세요.'),{status:409});}
 return db.prepare('SELECT * FROM entries WHERE date=?').get(date);
 },remove(date,revision){const r=db.prepare('DELETE FROM entries WHERE date=? AND revision=?').run(date,revision);if(!r.changes)throw Object.assign(new Error('기록이 변경되었거나 이미 삭제되었어요. 새로고침해 주세요.'),{status:409});}};
}
module.exports={createStore};

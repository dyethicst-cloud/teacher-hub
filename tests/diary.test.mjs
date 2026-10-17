import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadApps} from '../model.js';
const {createStore}=createRequire(import.meta.url)('../diary-store.cjs');
test('로컬 파일 재연결 복원, 수정 충돌, 삭제, 날짜 검증',()=>{
 const folder=mkdtempSync(join(tmpdir(),'diary-test-'));let store=createStore(folder);
 try{const data={date:'2026-10-17',title:'오늘',body:'한글과 🌿 이야기',mood:'calm',revision:0};const saved=store.save(data);store.close();store=createStore(folder);assert.equal(store.list()[0].body,data.body);assert.throws(()=>store.save(data),e=>e.status===409);const edited=store.save({...saved,body:'수정'});assert.equal(edited.revision,2);assert.throws(()=>store.remove(saved.date,1),e=>e.status===409);assert.throws(()=>store.save({...data,date:'2026-02-30'}),e=>e.status===400);store.remove(edited.date,2);assert.equal(store.list().length,0);}finally{store.close();rmSync(folder,{recursive:true,force:true});}
});
test('기존 도구 목록에 일기장 연결을 추가하고 재로드 시 중복하지 않는다',()=>{
 const old={schemaVersion:1,apps:[]};const apps=loadApps({getItem:()=>JSON.stringify(old)});assert.equal(apps.find(a=>a.id==='diary').url,'/diary/');assert.equal(loadApps({getItem:()=>JSON.stringify({...old,apps})}).filter(a=>a.id==='diary').length,1);
});

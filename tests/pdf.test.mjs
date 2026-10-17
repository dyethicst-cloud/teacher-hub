import test from 'node:test';
import assert from 'node:assert/strict';
import {countText,pageText} from '../pdf-counter/count.js';
import {loadApps,HUB_KEY} from '../model.js';
import {getDocument} from '../pdf-counter/vendor/pdf.mjs';
test('한글·이모지·탭과 줄바꿈 집계 기준',()=>{
  assert.deepEqual(countText('가 나\n😀\tA\r\n'),{withSpaces:6,withoutSpaces:4});
  assert.equal(pageText([{str:'가 나',hasEOL:true},{type:'beginMarkedContent'},{str:'다'}]),'가 나\n다');
});
test('기존 허브 목록에 PDF 도구를 추가하고 로컬 주소 변조를 거부',()=>{
  const storage=apps=>({getItem:key=>key===HUB_KEY?JSON.stringify({schemaVersion:1,apps}):null});
  assert.equal(loadApps(storage([]))[0].url,'/pdf-counter/');
  assert.throws(()=>loadApps(storage([{id:'pdf-counter',name:'PDF',description:'',kind:'local',url:'https://example.com'}])));
});
function samplePDF(){
  const stream='BT /F1 12 Tf 50 700 Td (Hello PDF) Tj ET';
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let text='%PDF-1.4\n';const offsets=[0];objects.forEach((obj,i)=>{offsets.push(text.length);text+=`${i+1} 0 obj\n${obj}\nendobj\n`;});
  const xref=text.length;text+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('');
  return new TextEncoder().encode(text+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
}
test('실제 PDF.js로 PDF 바이트를 읽어 예상 글자 수 추출',async()=>{
  const task=getDocument({data:samplePDF(),isEvalSupported:false,disableFontFace:true,useWasm:false});
  try{const pdf=await task.promise;assert.equal(pdf.numPages,1);const page=await pdf.getPage(1);const text=pageText((await page.getTextContent()).items);assert.equal(text,'Hello PDF');assert.deepEqual(countText(text),{withSpaces:9,withoutSpaces:8});}finally{await task.destroy();}
});

import {getDocument, GlobalWorkerOptions} from './vendor/pdf.mjs';
import {countText, pageText} from './count.js';
GlobalWorkerOptions.workerSrc = './vendor/pdf.worker.mjs';
const $ = id => document.getElementById(id);
let generation = 0, task;
async function reset() {
  const token = ++generation;
  const old = task; task = null;
  $('file').value = ''; $('results').hidden = true; $('clear').hidden = true; $('progress').hidden = true;
  $('text').value = ''; $('rows').replaceChildren(); $('filename').textContent = '';
  for (const id of ['with','without','pages','notice']) $(id).textContent = '';
  $('status').textContent = '아직 선택한 파일이 없어요.';
  if (old) await old.destroy().catch(() => {});
  return token;
}
async function read(file) {
  const run = await reset();
  if (run !== generation) return;
  if (!file) return;
  try {
    if (!/\.pdf$/i.test(file.name)) throw new Error('PDF 파일을 선택해 주세요.');
    if (file.size > 100 * 1024 * 1024) throw new Error('100MB 이하의 PDF를 선택해 주세요.');
    $('clear').hidden = false; $('status').textContent = 'PDF를 읽고 있어요…';
    const data = new Uint8Array(await file.arrayBuffer());
    if (run !== generation) return;
    if (!new TextDecoder().decode(data.slice(0,1024)).includes('%PDF-')) throw new Error('올바른 PDF 파일이 아니에요.');
    const loading = task = getDocument({data, cMapUrl:'./vendor/cmaps/', cMapPacked:true, standardFontDataUrl:'./vendor/standard_fonts/', isEvalSupported:false, disableFontFace:true, useWasm:false, useWorkerFetch:true});
    const pdf = await loading.promise;
    if (run !== generation) return;
    $('progress').hidden = false; $('progress').max = pdf.numPages;
    const texts = [], results = []; let empty = 0;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      if (run !== generation) return;
      const text = pageText(content.items), counts = countText(text);
      texts.push(text); results.push(counts); if (!counts.withoutSpaces) empty++;
      page.cleanup(); $('progress').value = i;
      $('status').textContent = `${pdf.numPages}쪽 중 ${i}쪽 집계 중…`;
    }
    const totals = results.reduce((a,b)=>({withSpaces:a.withSpaces+b.withSpaces,withoutSpaces:a.withoutSpaces+b.withoutSpaces}),{withSpaces:0,withoutSpaces:0});
    $('filename').textContent = file.name;
    $('with').textContent = totals.withSpaces.toLocaleString('ko-KR');
    $('without').textContent = totals.withoutSpaces.toLocaleString('ko-KR');
    $('pages').textContent = pdf.numPages.toLocaleString('ko-KR');
    const fragment = document.createDocumentFragment();
    results.forEach((c,i)=>{const row=document.createElement('tr'); for(const value of [`${i+1}쪽`,c.withSpaces.toLocaleString('ko-KR'),c.withoutSpaces.toLocaleString('ko-KR')]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}fragment.append(row);});
    $('rows').replaceChildren(fragment); $('text').value = texts.join('\n\n');
    $('notice').textContent = empty ? `${empty}쪽에서 텍스트를 찾지 못했어요. 빈 페이지 또는 스캔 이미지일 수 있어요. 이미지 속 글자는 집계되지 않습니다.` : '추출한 텍스트 기준입니다. 아래에서 추출 결과를 확인하세요.';
    $('results').hidden = false; $('progress').hidden = true;
    $('status').textContent = '집계 완료 · 파일과 결과는 외부로 전송되지 않았어요.';
    await loading.destroy(); if (task === loading) task = null;
  } catch(error) {
    if (run !== generation) return;
    $('progress').hidden = true; $('results').hidden = true;
    $('status').textContent = error.name === 'PasswordException' ? '암호가 걸린 PDF예요. 컴퓨터에서 암호를 해제한 사본을 선택해 주세요.' : error.name === 'InvalidPDFException' ? '손상되었거나 지원하지 않는 PDF예요. 다른 파일을 선택해 주세요.' : `읽지 못했어요. ${error.message || '다른 PDF로 다시 시도해 주세요.'}`;
    const old=task;task=null;if(old)await old.destroy().catch(()=>{});
  }
}
$('file').addEventListener('change',event=>read(event.target.files[0]));
$('clear').addEventListener('click',reset);
for(const type of ['dragenter','dragover']) $('drop').addEventListener(type,event=>{event.preventDefault();$('drop').classList.add('over');});
for(const type of ['dragleave','drop']) $('drop').addEventListener(type,event=>{event.preventDefault();$('drop').classList.remove('over');});
$('drop').addEventListener('drop',event=>read(event.dataTransfer.files[0]));
window.addEventListener('dragover',event=>event.preventDefault());
window.addEventListener('drop',event=>event.preventDefault());

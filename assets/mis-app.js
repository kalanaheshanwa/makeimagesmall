// MakeImageSmall — shared compressor tool (extracted from the homepage).
// Used by the homepage and every landing page so the tool is identical everywhere.
// Requires heic2any and JSZip to be loaded before this file.

// ── TOOL ──
const dropZone=document.getElementById('dropZone'),fileInput=document.getElementById('fileInput');
const qualitySlider=document.getElementById('qualitySlider'),qualityNum=document.getElementById('qualityNum');
let results=[],totalBefore=0,totalAfter=0,doneCount=0,originalFiles=[],previewData={};

qualitySlider.addEventListener('input',()=>{
  qualityNum.textContent=qualitySlider.value;
  if(originalFiles.length){
    document.getElementById('recompressBtn').style.display='inline-flex';
    document.getElementById('ctrlDesc').textContent='Quality changed — click Recompress to apply.';
    document.getElementById('ctrlDesc').style.color='var(--warn)';
  }
});
function resetQualityDesc(){
  document.getElementById('recompressBtn').style.display='none';
  document.getElementById('ctrlDesc').textContent='Higher = better quality, larger file. 80–85 is the sweet spot.';
  document.getElementById('ctrlDesc').style.color='';
}
function recompressAll(){
  if(!originalFiles.length)return;
  results.forEach(f=>URL.revokeObjectURL(f.url));
  results=[];totalBefore=0;totalAfter=0;doneCount=0;previewData={};
  document.getElementById('fileList').innerHTML='';
  document.getElementById('summaryStrip').style.display='none';
  document.getElementById('resultsBar').style.display='none';
  resetQualityDesc();
  handleFiles(originalFiles);
}

dropZone.addEventListener('dragover',e=>{e.preventDefault();dropZone.classList.add('over')});
dropZone.addEventListener('dragleave',()=>dropZone.classList.remove('over'));
dropZone.addEventListener('drop',e=>{e.preventDefault();dropZone.classList.remove('over');const f=[...e.dataTransfer.files].filter(isImageFile);if(f.length)handleFiles(f)});
dropZone.addEventListener('click',e=>{if(!e.target.closest('button'))fileInput.click()});
fileInput.addEventListener('change',()=>{if(fileInput.files.length)handleFiles([...fileInput.files])});

function isImageFile(f){
  if((f.type||'').startsWith('image/'))return true;
  const ext=f.name.split('.').pop().toLowerCase();
  return['heic','heif','jpg','jpeg','png','gif','bmp','webp','avif','tiff','tif'].includes(ext);
}
function isHeic(f){
  const ext=f.name.split('.').pop().toLowerCase();
  const type=(f.type||'').toLowerCase();
  return type==='image/heic'||type==='image/heif'||ext==='heic'||ext==='heif';
}
function fmt(b){if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';return(b/1048576).toFixed(2)+' MB'}

async function fileToBlob(file){
  if(isHeic(file)){
    // Always wrap in a typed Blob — handles both .heic (may report image/heic)
    // and .HEIC (often reports empty string type on Windows/Android).
    // heic2any requires a valid MIME type to process the file correctly.
    const buf=await file.arrayBuffer();
    const blob=new Blob([buf],{type:'image/heic'});
    const c=await heic2any({blob,toType:'image/jpeg',quality:.95});
    return Array.isArray(c)?c[0]:c;
  }
  return file;
}

function showToast(msg, type='success', duration=2500){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.className='toast '+type;
  t.offsetHeight;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer=setTimeout(()=>t.classList.remove('show'),duration);
}

function handleFiles(files){
  originalFiles=[...originalFiles,...files].filter((f,i,a)=>a.findIndex(x=>x.name===f.name&&x.size===f.size)===i);
  resetQualityDesc();
  document.getElementById('heicNotice').style.display=files.some(isHeic)?'block':'none';
  const dzTitle=document.getElementById('dzTitle');
  if(dzTitle)dzTitle.textContent=`Compressing ${files.length} image${files.length!==1?'s':''}…`;
  showToast(`⚡ Compressing ${files.length} image${files.length!==1?'s':''}…`,'info',3000);

  const total=files.length;let done=0;
  document.getElementById('progressWrap').style.display='block';
  document.getElementById('progFill').style.width='0%';
  document.getElementById('progCount').textContent=`0 / ${total}`;
  document.getElementById('progText').textContent='Compressing…';
  document.getElementById('resultsBar').style.display='flex';
  document.getElementById('summaryStrip').style.display='flex';
  files.forEach(async file=>{
    const id='fc-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);
    document.getElementById('fileList').prepend(makeCard(file,id));
    try{
      const blob0=await fileToBlob(file);
      const bUrl=URL.createObjectURL(blob0);
      const img=new Image();
      await new Promise((r,j)=>{img.onload=r;img.onerror=j;img.src=bUrl});
      URL.revokeObjectURL(bUrl);
      const c=document.createElement('canvas');
      const M=16383;let w=img.naturalWidth,h=img.naturalHeight;
      if(w>M||h>M){const s=Math.min(M/w,M/h);w=Math.floor(w*s);h=Math.floor(h*s)}
      c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
      const blob=await new Promise(r=>c.toBlob(r,'image/webp',parseInt(qualitySlider.value)/100));
      if(!blob)throw new Error('Encoding failed');
      const useOrig=blob.size>=file.size;
      const final=useOrig?file:blob;
      const outName=useOrig?file.name:file.name.replace(/\.[^.]+$/,'')+'.webp';
      const url=URL.createObjectURL(final);
      results.push({name:outName,blob:final,url});
      totalBefore+=file.size;totalAfter+=final.size;doneCount++;done++;
      tick(done,total);cardDone(id,file,final,url,outName,useOrig);updateSummary();updateMeta();
    }catch(err){
      cardError(id,isHeic(file)&&err.message?.includes('heic2any')?'HEIC not supported on this browser':'Could not process image');
      done++;tick(done,total);
    }
  });
}

function tick(done,total){
  const p=Math.round(done/total*100);
  document.getElementById('progFill').style.width=p+'%';
  document.getElementById('progCount').textContent=`${done} / ${total}`;
  if(done===total){
    document.getElementById('progText').textContent='All done!';
    setTimeout(()=>document.getElementById('progressWrap').style.display='none',1800);
    const saved=totalBefore-totalAfter,pct=totalBefore>0?Math.round(saved/totalBefore*100):0;
    showToast(`✓ ${total} image${total!==1?'s':''} compressed — ${pct}% smaller`,'success',3500);
    const dzTitle=document.getElementById('dzTitle');
    if(dzTitle)dzTitle.textContent='Drop more images here';

    const banner=document.getElementById('doneBanner');
    banner.classList.add('show');
    document.getElementById('doneBannerTitle').textContent=`✓ ${total} image${total!==1?'s':''} compressed successfully`;
    document.getElementById('doneBannerSub').textContent=`${fmt(saved)} saved · ${pct}% smaller · Preview or download below`;
  }
}

function makeCard(file,id){
  const t=URL.createObjectURL(file);
  const d=document.createElement('div');d.className='fc';d.id=id;
  d.innerHTML=`<img class="fc-thumb" src="${t}" alt=""><div><div class="fc-name">${file.name}</div><div class="fc-meta"><span>${fmt(file.size)}</span><span style="color:var(--muted)">→</span><span style="color:var(--sub)">compressing…</span></div></div><div class="fc-actions"><div class="spin"></div></div>`;
  return d;
}

function cardDone(id,orig,blob,url,outName,keptOrig){
  const c=document.getElementById(id);if(!c)return;c.classList.add('done');
  const saved=Math.round((orig.size-blob.size)/orig.size*100),smaller=blob.size<orig.size;
  const canPrev=!isHeic(orig);
  const origUrl=canPrev?URL.createObjectURL(orig):null;
  previewData[id]={origUrl,compUrl:url,outName,origSize:orig.size,compSize:blob.size,saved,keptOrig,canPrev,origFile:orig,quality:parseInt(qualitySlider.value)};
  const badge=keptOrig?`<span class="save-pill" style="background:#fef9c3;color:#854d0e">kept original</span>`:`<span class="save-pill ${smaller?'':'up'}">${smaller?'-':'+'}${Math.abs(saved)}%</span>`;
  const heicNote=isHeic(orig)?`<div style="font-size:11px;color:var(--sub);margin-top:4px;display:flex;align-items:center;gap:4px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>HEIC original can't be previewed in browser — compressed WebP shown</div>`:'';
  const cardQ=previewData[id].quality||parseInt(qualitySlider.value);
  c.innerHTML=`<img class="fc-thumb" src="${url}" alt="" style="cursor:pointer" onclick="openPreview('${id}')"><div style="min-width:0"><div class="fc-name">${outName}</div><div class="fc-meta"><span>${fmt(orig.size)}</span><span style="color:var(--muted)">→</span><span class="sz-after" id="sz-${id}">${fmt(blob.size)}</span><span id="badge-${id}">${badge}</span></div>${heicNote}<div class="card-quality"><span class="card-quality-label">Quality</span><input type="range" class="card-q-slider" min="10" max="90" value="${cardQ}" step="1" oninput="cardQChange('${id}',this.value)"><span class="card-quality-num" id="cq-${id}">${cardQ}</span><button class="btn-card-recompress" id="cqbtn-${id}" onclick="recompressCard('${id}')">Apply</button></div></div><div class="fc-actions"><button class="btn-sm preview" onclick="openPreview('${id}')">Preview</button><button class="btn-sm" id="save-${id}" onclick="dl('${url}','${outName}')">Save</button><div class="check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div></div>`;
}

function cardError(id,msg){
  const c=document.getElementById(id);if(!c)return;c.classList.add('error');
  c.querySelector('.fc-meta').innerHTML=`<span style="color:#ef4444">${msg}</span>`;
  c.querySelector('.fc-actions').innerHTML=`<span style="color:#ef4444;font-size:18px">✕</span>`;
}

function updateSummary(){
  const saved=totalBefore-totalAfter,pct=totalBefore>0?Math.round(saved/totalBefore*100):0;
  document.getElementById('scFiles').textContent=doneCount;
  document.getElementById('scBefore').textContent=fmt(totalBefore);
  document.getElementById('scAfter').textContent=fmt(totalAfter);
  document.getElementById('scPct').textContent=pct+'%';
}
function updateMeta(){
  const saved=totalBefore-totalAfter,pct=totalBefore>0?Math.round(saved/totalBefore*100):0;
  document.getElementById('resultsMeta').textContent=`${doneCount} file${doneCount!==1?'s':''} · ${fmt(saved)} saved · ${pct}% smaller`;
}
function dl(url,name){const a=document.createElement('a');a.href=url;a.download=name;a.click()}
async function downloadAll(){
  if(!results.length)return;
  const btn=document.getElementById('dlAllBtn');btn.disabled=true;btn.textContent='Zipping…';
  if(results.length===1){dl(results[0].url,results[0].name);btn.disabled=false;resetDlBtn();return}
  const zip=new JSZip();
  for(const f of results){const ab=await f.blob.arrayBuffer();zip.file(f.name,ab)}
  const z=await zip.generateAsync({type:'blob'});dl(URL.createObjectURL(z),'compressed-images.zip');
  btn.disabled=false;resetDlBtn();
}
function resetDlBtn(){document.getElementById('dlAllBtn').innerHTML='<svg viewBox="0 0 24 24" width="14" height="14" stroke="white" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download all'}
function clearAll(){
  results.forEach(f=>URL.revokeObjectURL(f.url));
  Object.values(previewData).forEach(d=>{if(d.origUrl)URL.revokeObjectURL(d.origUrl)});
  results=[];originalFiles=[];totalBefore=0;totalAfter=0;doneCount=0;previewData={};
  document.getElementById('fileList').innerHTML='';
  document.getElementById('resultsBar').style.display='none';
  document.getElementById('summaryStrip').style.display='none';
  document.getElementById('progressWrap').style.display='none';
  document.getElementById('heicNotice').style.display='none';
  resetQualityDesc();fileInput.value='';const dzT=document.getElementById('dzTitle');if(dzT)dzT.textContent='Drop your images here';document.getElementById('doneBanner').classList.remove('show');
}

// ── PREVIEW MODAL ──
function openPreview(id){
  const d=previewData[id];if(!d)return;
  const wrap=document.getElementById('compareWrap');
  const ex=wrap.querySelector('.no-preview-msg');if(ex)ex.remove();
  document.getElementById('afterImg').src=d.compUrl;
  if(d.canPrev&&d.origUrl){
    document.getElementById('beforeImg').src=d.origUrl;
    document.getElementById('imgBefore').style.display='flex';
    document.getElementById('imgBefore').style.background='';
    document.getElementById('imgBefore').innerHTML=`<img id="beforeImg" src="${d.origUrl}" alt="Original">`;
  } else {
    const origExt=(d.origFile?.name||'').split('.').pop().toUpperCase()||'FILE';
    const isApple=['HEIC','HEIF'].includes(origExt);
    document.getElementById('imgBefore').style.display='flex';
    document.getElementById('imgBefore').style.background='var(--surface)';
    document.getElementById('imgBefore').innerHTML=`
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:24px;text-align:center;height:100%;width:100%">
        <div style="font-size:28px">${isApple?'📷':'🖼️'}</div>
        <div style="font-size:13px;font-weight:600;color:var(--text)">Original file — preview not available</div>
        <div style="font-size:12px;color:var(--sub);line-height:1.6;max-width:180px">${isApple?'This is an iPhone/Apple photo (HEIC). Your browser can\'t display it, but we\'ve compressed it successfully.':'Your browser can\'t display this file format.'}<br><span style="color:var(--brand);font-weight:500">Drag right to see your compressed result →</span></div>
        <div style="font-size:11px;background:var(--surface);color:var(--sub);padding:3px 10px;border-radius:100px;margin-top:4px">${fmt(d.origSize)} · Original size</div>
      </div>`;
  }
  document.getElementById('divider').style.display='block';
  document.getElementById('handle').style.display='flex';
  document.querySelector('.label-before').style.display='block';
  document.querySelector('.label-after').style.display='block';
  setDivider(50);
  document.getElementById('modalTitle').textContent=d.outName;
  const mq=d.quality||parseInt(qualitySlider.value);
  document.getElementById('modalQualitySlider').value=mq;
  document.getElementById('modalQualityNum').textContent=mq;
  document.getElementById('modalQualityInfo').textContent='Drag to adjust — click Recompress to apply';
  document.getElementById('modalRecompressBtn').disabled=false;
  document.getElementById('modalRecompressBtn').textContent='↺ Recompress';
  window._previewId=id;
  const pct=d.saved>0?`-${d.saved}%`:`+${Math.abs(d.saved)}%`;
  document.getElementById('modalMeta').innerHTML=`<span>${fmt(d.origSize)}</span><span>→</span><span style="color:var(--green);font-weight:500">${fmt(d.compSize)}</span><span style="background:var(--green-mid);color:var(--green);padding:2px 7px;border-radius:100px;font-weight:600">${pct}</span>`;
  document.getElementById('modalDlBtn').onclick=()=>dl(d.compUrl,d.outName);
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow='hidden';
}
function setDivider(pct){
  const x=Math.max(5,Math.min(95,pct));
  document.getElementById('divider').style.left=x+'%';
  document.getElementById('handle').style.left=x+'%';
  document.getElementById('imgBefore').style.clipPath=`inset(0 ${100-x}% 0 0)`;
}
document.getElementById('modalQualitySlider').addEventListener('input',function(){
  document.getElementById('modalQualityNum').textContent=this.value;
  document.getElementById('modalQualityInfo').textContent='Click Recompress to apply quality '+this.value;
});

async function recompressSingle(){
  const id=window._previewId;
  const d=previewData[id];
  if(!d||!d.origFile)return;
  const btn=document.getElementById('modalRecompressBtn');
  btn.disabled=true;btn.textContent='Processing…';
  const q=parseInt(document.getElementById('modalQualitySlider').value)/100;
  try{
    const processable=await fileToBlob(d.origFile);
    const bUrl=URL.createObjectURL(processable);
    const img=new Image();
    await new Promise((r,j)=>{img.onload=r;img.onerror=j;img.src=bUrl});
    URL.revokeObjectURL(bUrl);
    const canvas=document.createElement('canvas');
    const M=16383;let w=img.naturalWidth,h=img.naturalHeight;
    if(w>M||h>M){const s=Math.min(M/w,M/h);w=Math.floor(w*s);h=Math.floor(h*s)}
    canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(img,0,0,w,h);
    const blob=await new Promise(r=>canvas.toBlob(r,'image/webp',q));
    if(!blob)throw new Error('Failed');
    const useOrig=blob.size>=d.origFile.size;
    const final=useOrig?d.origFile:blob;
    const outName=useOrig?d.origFile.name:d.origFile.name.replace(/\.[^.]+$/,'')+'.webp';
    const url=URL.createObjectURL(final);
    totalAfter=totalAfter-d.compSize+final.size;
    URL.revokeObjectURL(d.compUrl);
    if(d.origUrl&&!d.canPrev){}
    const newSaved=Math.round((d.origFile.size-final.size)/d.origFile.size*100);
    previewData[id]={...d,compUrl:url,compSize:final.size,saved:newSaved,outName,quality:Math.round(q*100)};
    const ri=results.findIndex(r=>r.name===d.outName||r.url===d.compUrl);
    if(ri>-1){URL.revokeObjectURL(results[ri].url);results[ri]={name:outName,blob:final,url};}
    document.getElementById('afterImg').src=url;
    const pct=newSaved>0?`-${newSaved}%`:`+${Math.abs(newSaved)}%`;
    document.getElementById('modalMeta').innerHTML=`<span>${fmt(d.origFile.size)}</span><span>→</span><span style="color:var(--green);font-weight:500">${fmt(final.size)}</span><span style="background:var(--green-mid);color:var(--green);padding:2px 7px;border-radius:100px;font-weight:600">${pct}</span>`;
    document.getElementById('modalDlBtn').onclick=()=>dl(url,outName);
    const sz=document.getElementById('sz-'+id);
    const bdg=document.getElementById('badge-'+id);
    const sv=document.getElementById('save-'+id);
    const cq=document.getElementById('cq-'+id);
    const cqslider=document.querySelector(`#${id} .card-q-slider`);
    if(sz)sz.textContent=fmt(final.size);
    if(bdg){const smaller=final.size<d.origFile.size;bdg.innerHTML=`<span class="save-pill ${smaller?'':'up'}">${smaller?'-':'+'}${Math.abs(newSaved)}%</span>`;}
    if(sv)sv.onclick=()=>dl(url,outName);
    if(cq)cq.textContent=Math.round(q*100);
    if(cqslider)cqslider.value=Math.round(q*100);
    updateSummary();updateMeta();
    btn.textContent='✓ Done';
    setTimeout(()=>{btn.disabled=false;btn.textContent='↺ Recompress';},1500);
  }catch(e){btn.disabled=false;btn.textContent='↺ Recompress';console.error(e);}
}

function cardQChange(id,val){
  document.getElementById('cq-'+id).textContent=val;
}

async function recompressCard(id){
  const d=previewData[id];
  if(!d||!d.origFile)return;
  const btn=document.getElementById('cqbtn-'+id);
  const slider=document.querySelector(`#${id} .card-q-slider`);
  const q=parseInt(slider?.value||82)/100;
  if(btn){btn.disabled=true;btn.textContent='…';}
  previewData[id].quality=Math.round(q*100);
  document.getElementById('modalQualitySlider').value=Math.round(q*100);
  const prev=window._previewId;
  window._previewId=id;
  document.getElementById('modalQualitySlider').value=Math.round(q*100);
  await recompressSingle();
  window._previewId=prev;
  if(btn){btn.disabled=false;btn.textContent='Apply';}
}

function closeModalDirect(){document.getElementById('modalOverlay').classList.remove('open');document.body.style.overflow=''}
function closeModal(e){if(e.target===document.getElementById('modalOverlay'))closeModalDirect()}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModalDirect()});
let dragging=false;
document.getElementById('compareWrap').addEventListener('mousedown',e=>{dragging=true;e.preventDefault()});
document.addEventListener('mousemove',e=>{if(!dragging)return;const r=document.getElementById('compareWrap').getBoundingClientRect();setDivider((e.clientX-r.left)/r.width*100)});
document.addEventListener('mouseup',()=>dragging=false);
document.getElementById('compareWrap').addEventListener('touchmove',e=>{const r=document.getElementById('compareWrap').getBoundingClientRect();setDivider((e.touches[0].clientX-r.left)/r.width*100)},{passive:true});

// ── FAQ ACCORDION ──
document.querySelectorAll('.faq-item').forEach(item=>{
  item.addEventListener('click',()=>{
    const open=item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i=>i.classList.remove('open'));
    if(!open)item.classList.add('open');
  });
});
document.querySelector('.faq-item')?.classList.add('open');

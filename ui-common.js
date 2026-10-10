(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  function notice(text,error=false){const el=$('notice');el.textContent=text;el.classList.toggle('error',error);}
  async function data(){return chrome.storage.local.get(['defaults','sites','fonts']);}
  function fontList(select,fonts=[]) {
    select.replaceChildren();
    for(const f of [...FFCore.FONTS,...fonts]) {const option=document.createElement('option');option.value=f.id;option.textContent=f.name+(f.kind==='local'?' — نصب‌شده':'');select.append(option);}
  }
  function fill(config){for(const key of ['enabled','font','direction','scale','lineHeight','inputs','isolate','scope','exclusions']){const el=$(key);if(!el)continue;if(el.type==='checkbox')el.checked=config[key];else el.value=config[key];}preview();}
  function read(){const value={};for(const key of ['enabled','font','direction','scale','lineHeight','inputs','isolate','scope','exclusions']){const el=$(key);if(!el)continue;value[key]=el.type==='checkbox'?el.checked:['scale','lineHeight'].includes(key)?Number(el.value):el.value;}return value;}
  let previewFaces=[];
  async function preview() {
    if($('scaleValue'))$('scaleValue').textContent=$('scale').value+'%';
    const el=document.querySelector('.preview');if(!el)return;
    const config=read();el.style.fontSize=(16*(config.scale||100)/100)+'px';el.style.lineHeight=config.lineHeight||'';
    const id=config.font;const d=await data();const custom=d.fonts?.find(f=>f.id===id);const builtin=FFCore.FONTS.find(f=>f.id===id);
    try {
      for(const face of previewFaces)document.fonts.delete(face);previewFaces=[];
      let family='Vazirmatn';
      if(builtin?.files?.length){family='Preview_'+id;for(const [file,weight] of builtin.files){const face=new FontFace(family,`url("fonts/${file}")`,{weight,unicodeRange:FFCore.RANGE});await face.load();document.fonts.add(face);previewFaces.push(face);}}
      if(custom){family='PreviewCustom';const source=custom.kind==='local'?`local("${custom.family.replace(/["\\]/g,'')}")`:FFCore.decodeFont(custom.data);const face=new FontFace(family,source,{weight:custom.variable?'100 900':String(custom.weight||400),unicodeRange:FFCore.RANGE});await face.load();document.fonts.add(face);previewFaces.push(face);}
      el.style.fontFamily=id==='system'?'Arial,sans-serif':`"${family}",Arial,sans-serif`;
    }catch{notice('این فونت قابل بارگذاری نیست؛ وزیرمتن جایگزین خواهد شد.',true);}
  }
  async function reconcile(){const r=await chrome.runtime.sendMessage({type:'FF_RECONCILE'});if(!r?.ok)throw new Error(r?.error||'فعال‌سازی کامل نشد؛ دوباره تلاش کنید.');}
  function safe(fn){return async(...args)=>{try{await fn(...args);}catch(e){notice(e.message||'عملیات انجام نشد.',true);}};}
  globalThis.FFUI={$,notice,data,fontList,fill,read,preview,reconcile,safe};
})();

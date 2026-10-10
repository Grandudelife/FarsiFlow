(() => {
  'use strict';
  if(!['http:','https:'].includes(location.protocol))return;
  if(globalThis.__farsiFlow) {globalThis.__farsiFlow.refresh();return;}
  const C=globalThis.FFCore;
  // aria-hidden describes accessibility exposure, not visual visibility.
  // Visible message previews and presentation copies must still be styled.
  const SKIP='script,style,noscript,svg,canvas,math,pre,code,kbd,samp,.katex,.MathJax,[role="math"],[data-ff-ignore],.material-icons,.material-symbols-outlined';
  const BLOCK='p,h1,h2,h3,h4,h5,h6,li,td,th,dt,dd,figcaption,blockquote,div';
  const ROOTS='.markdown,.prose,.model-response-text,.markdown-main-panel,.message-content,.font-claude-response,.font-user-message,.standard-markdown,[data-message-author-role],message-content,user-query,.query-text,[data-testid="user-message"]';
  const EDIT='textarea,input,[contenteditable]:not([contenteditable="false"])';
  const touched=new Map(),loadedFonts=new Map();
  let cfg=C.DEFAULTS,data={},sheet=null,rules=null,observer=null,raf=0,pending=new Set(),active=false,generation=0,composing=false;
  let permissionTimer,state='starting',lastError='',stage='',stopped=false,permissionBusy=false;
  const css=`[data-ff-font]{font-family:var(--ff-family),var(--ff-original-font)!important}
    [data-ff-dir="rtl"]{direction:rtl!important;text-align:start!important;unicode-bidi:isolate!important}
    [data-ff-dir="ltr"]{direction:ltr!important;text-align:start!important;unicode-bidi:isolate!important}
    [data-ff-size]{font-size:var(--ff-size)!important}
    [data-ff-height]{line-height:var(--ff-height)!important}
    [data-ff-inline="ltr"]{direction:ltr!important;unicode-bidi:isolate!important}
    [data-ff-inline="rtl"]{direction:rtl!important;unicode-bidi:isolate!important}
    [data-ff-editor]{unicode-bidi:plaintext!important}
    [data-ff-code]{direction:ltr!important;text-align:left!important;unicode-bidi:isolate!important}`;
  function remember(el,key,isStyle=false) {
    let entry=touched.get(el); if(!entry){entry=new Map();touched.set(el,entry);}
    const id=(isStyle?'s:':'a:')+key;
    if(!entry.has(id)) entry.set(id,{value:isStyle?el.style.getPropertyValue(key):el.getAttribute(key),priority:isStyle?el.style.getPropertyPriority(key):'',last:null});
    return entry.get(id);
  }
  function attr(el,key,value) {const entry=remember(el,key);entry.last=value;if(el.getAttribute(key)!==value)el.setAttribute(key,value);}
  function variable(el,key,value,priority='') {const entry=remember(el,key,true);entry.last=value;entry.lastPriority=priority;if(el.style.getPropertyValue(key)!==value || el.style.getPropertyPriority(key)!==priority)el.style.setProperty(key,value,priority);}
  function restore(el) {
    const entry=touched.get(el);if(!entry)return;
    for(const [key,v] of entry) {
      const prop=key.slice(2),style=key.startsWith('s:');
      const current=style?el.style.getPropertyValue(prop):el.getAttribute(prop);
      // Do not overwrite a subsequent change made by the host application.
      if(current!==v.last || (style && el.style.getPropertyPriority(prop)!==v.lastPriority))continue;
      if(style) {if(v.value)el.style.setProperty(prop,v.value,v.priority);else el.style.removeProperty(prop);}
      else if(v.value===null)el.removeAttribute(prop);else el.setAttribute(prop,v.value);
    }
    touched.delete(el);
  }
  function cleanup() {observer?.disconnect();observer=null;cancelAnimationFrame(raf);raf=0;pending.clear();for(const el of [...touched.keys()])restore(el);if(rules)document.adoptedStyleSheets=document.adoptedStyleSheets.filter(s=>s!==rules);rules=null;sheet?.remove();sheet=null;active=false;}
  function familyName(id) {return 'FarsiFlow_'+id.replace(/-/g,'_');}
  async function loadFont(id) {
    if(id==='system')return null;
    if(loadedFonts.has(id))return loadedFonts.get(id);
    const family=familyName(id),builtin=C.FONTS.find(f=>f.id===id),custom=data.fonts?.find(f=>f.id===id);
    if(!builtin && !custom) return loadFont('vazirmatn');
    const faces=[];
    if(builtin) {
      for(const [file,weight] of builtin.files) {
        const response=await chrome.runtime.sendMessage({type:'FF_GET_BUNDLED_FONT',file});
        if(!response?.ok)throw new Error(response?.error||'bundled-font-unavailable');
        const bytes=C.decodeFont(response.data);C.validateFont(bytes);
        const face=new FontFace(family,bytes,{weight,unicodeRange:C.RANGE});
        await face.load();document.fonts.add(face);faces.push(face);
      }
    } else if(custom.kind==='local') {
      const escaped=custom.family.replace(/["\\]/g,'');
      const face=new FontFace(family,`local("${escaped}")`,{weight:'100 900',unicodeRange:C.RANGE});
      await face.load();document.fonts.add(face);faces.push(face);
    } else {
      const bytes=C.decodeFont(custom.data);C.validateFont(bytes);
      const face=new FontFace(family,bytes,{weight:custom.variable?'100 900':String(custom.weight||400),unicodeRange:C.RANGE});
      await face.load();document.fonts.add(face);faces.push(face);
    }
    loadedFonts.set(id,family);return family;
  }
  function plainText(el) {
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement?.closest(SKIP)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
    let text='',n;while((n=walker.nextNode()) && text.length<6000)text+=n.nodeValue+' ';return text;
  }
  function directText(el) {return [...el.childNodes].some(n=>n.nodeType===3 && n.nodeValue.trim());}
  function contentScope(el) {
    if(cfg.scope==='all')return true;
    if(cfg.scope==='content')return !!el.closest(ROOTS+',article,main');
    return !C.isAIHost(location.hostname) || !!el.closest(ROOTS);
  }
  function excluded(el) {if(!cfg.exclusions)return false;try{return !!el.closest(cfg.exclusions);}catch{return false;}}
  function font(el,text) {
    if(!/\p{Script=Arabic}/u.test(text) || cfg.font==='system')return;
    const style=getComputedStyle(el);
    // Emoji/symbol fallback fonts in an ordinary UI stack do not make prose an
    // icon. Only protect an icon font when it is the primary family.
    const primaryFamily=style.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g,'');
    if(/icon|awesome|symbol|icomoon|wingdings|webdings/i.test(primaryFamily))return;
    const old=touched.get(el)?.get('s:--ff-original-font')?.last;
    variable(el,'--ff-original-font',old || style.fontFamily);
    const family=loadedFonts.get(cfg.font)||loadedFonts.get('vazirmatn')||familyName('vazirmatn');
    variable(el,'--ff-family',family);
    // A leaf-level inline important declaration wins competing site selectors,
    // including message-specific important rules, while retaining Latin fallback.
    variable(el,'font-family',family+', '+(old || style.fontFamily),'important');
    attr(el,'data-ff-font','');
  }
  function process(el) {
    if(!el.isConnected)return;
    // processEditor handles these descendants; don't undo its work during scan.
    if(el.closest(EDIT))return;
    restore(el);
    if(el===sheet || el.closest(SKIP) || excluded(el))return;
    const direct=directText(el);
    const text=direct?plainText(el):'';
    if(direct)font(el,text);
    if(el.matches(BLOCK) && contentScope(el)) {
      const style=getComputedStyle(el);
      // Never flip flex/grid containers or list items with nested paragraphs.
      if(!['flex','inline-flex','grid','inline-grid','none'].includes(style.display) && (el.tagName!=='DIV' || direct) && !el.querySelector('p,div,h1,h2,h3,ul,ol,table')) {
        const blockText=plainText(el),dir=C.detectDirection(blockText,cfg.direction);
        if(dir && (C.isAIHost(location.hostname) || /\p{Script=Arabic}/u.test(blockText)))attr(el,'data-ff-dir',dir);
        if(/\p{Script=Arabic}/u.test(blockText)) {
          if(cfg.scale!==100) {variable(el,'--ff-size',(parseFloat(style.fontSize)*cfg.scale/100)+'px');attr(el,'data-ff-size','');}
          if(cfg.lineHeight) {variable(el,'--ff-height',String(cfg.lineHeight));attr(el,'data-ff-height','');}
        }
      }
    }
    if(cfg.isolate && contentScope(el) && el.matches('a,bdi,span,strong,em') && !el.querySelector(BLOCK) && el.textContent.trim()) {
      const t=el.textContent;
      if(!/\p{Script=Arabic}/u.test(t) && /[A-Za-z]/.test(t))attr(el,'data-ff-inline','ltr');
      else if(el.tagName==='BDI')attr(el,'data-ff-inline',C.detectDirection(t,'first')||'rtl');
    }
  }
  function processEditor(el) {
    if(!cfg.inputs || composing || el.closest('pre,code,[data-ff-ignore]') || excluded(el))return;
    if(el.tagName==='INPUT' && !['text','search',''].includes(el.type))return;
    restore(el);
    const text='value' in el?el.value:el.textContent;
    font(el,text);
    for(const child of el.querySelectorAll?.('*')||[]) {
      restore(child);
      if(!child.closest(SKIP) && !excluded(child) && directText(child))font(child,plainText(child));
    }
    if(cfg.direction!=='off') {attr(el,'dir','auto');attr(el,'data-ff-editor','');}
  }
  function scan(root) {
    if(!root.isConnected)return;
    const elements=[root,...root.querySelectorAll('*')];let index=0;const scanGeneration=generation;
    function chunk() {
      if(!active || scanGeneration!==generation)return;
      for(let end=Math.min(index+180,elements.length);index<end;index++) {
        const el=elements[index];
        if(excluded(el)){restore(el);continue;}
        if(el.matches(EDIT))processEditor(el);
        else if(cfg.isolate && contentScope(el) && el.matches('pre,code,kbd,samp,.katex,.MathJax,math,[role="math"]'))attr(el,'data-ff-code','');
        else process(el);
      }
      if(index<elements.length)requestAnimationFrame(chunk);
    }
    chunk();
  }
  function enqueue(root) {
    if(!active || !root?.isConnected)return;
    if(root.nodeType!==1)root=root.parentElement;
    if(!root || root===sheet)return;
    if(root.closest(EDIT))root=root.closest(EDIT);
    if(pending.size>150) {pending.clear();pending.add(document.body);}else pending.add(root);
    if(raf)return;
    raf=requestAnimationFrame(()=>{
      raf=0;const roots=[...pending];pending.clear();
      const top=roots.filter(el=>!roots.some(p=>p!==el && p.contains(el)));
      top.forEach(scan);
      for(const el of touched.keys())if(!el.isConnected)touched.delete(el);
    });
  }
  async function refresh() {
    if(stopped)return;
    const token=++generation;cleanup();state='starting';lastError='';stage='permission';
    try {
      const result=await chrome.runtime.sendMessage({type:'FF_HAS_PERMISSION'});
      if(token!==generation)return;
      if(!result?.allowed){state=result?.error?'error':'no-permission';lastError=result?.error||'';return;}
      stage='settings';
      data=await chrome.storage.local.get(['defaults','sites','fonts']);cfg=C.configFor(data,location.hostname);
      if(token!==generation)return;
      if(!cfg.enabled){state='disabled';return;}
      stage='font';
      try{await loadFont(cfg.font);}catch{cfg={...cfg,font:'vazirmatn'};await loadFont('vazirmatn');}
      if(token!==generation)return;
      stage='stylesheet';
      // Constructed stylesheets and byte-backed FontFace avoid the page's inline-style/font URL CSP.
      rules=new CSSStyleSheet();rules.replaceSync(css);document.adoptedStyleSheets=[...document.adoptedStyleSheets,rules];
      sheet=document.createElement('meta');sheet.id='farsiflow-styles';document.documentElement.append(sheet);
      active=true;state='active';stage='scan';
      observer=new MutationObserver(records=>{
        for(const record of records) {
          if(record.type==='childList') {
            for(const node of record.addedNodes)enqueue(node.nodeType===1?node:node.parentElement);
            // A streamed response should not rescan the entire conversation.
            if(record.target.nodeType===1 && record.target!==sheet){process(record.target);const block=record.target.closest(BLOCK);if(block && block!==record.target)process(block);}
          } else if(record.type==='attributes' && record.attributeName==='style') {
            const el=record.target,owned=touched.get(el)?.get('s:font-family');
            // Ignore our own style writes, but reapply if the host replaces the
            // owned font-family. This avoids a restore/reapply observer loop.
            if(owned && (el.style.getPropertyValue('font-family')!==owned.last || el.style.getPropertyPriority('font-family')!==owned.lastPriority))enqueue(el);
          } else enqueue(record.target.nodeType===3?record.target.parentElement:record.target);
        }
      });
      observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','lang','style']});
      enqueue(document.body);
    }catch(error){if(token!==generation)return;cleanup();state='error';lastError=stage+': '+(error?.message||String(error));}
  }
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local' && ['defaults','sites','fonts'].some(k=>k in changes))refresh();});
  chrome.runtime.onMessage.addListener((msg,_sender,reply)=>{
    if(msg?.type==='FF_CHECK_PERMISSION'){refresh();reply({ok:true});}
    if(msg?.type==='FF_STATUS')reply({active,state,error:lastError,font:cfg.font,fontLoaded:cfg.font==='system'||loadedFonts.has(cfg.font),fontElements:document.querySelectorAll('[data-ff-font]').length,host:location.hostname,adapter:C.isAIHost(location.hostname)?location.hostname:'generic',elements:touched.size});
  });
  const onInput=e=>enqueue(e.target),onCompositionStart=()=>{composing=true;},onCompositionEnd=e=>{composing=false;enqueue(e.target);};
  document.addEventListener('input',onInput,true);
  document.addEventListener('compositionstart',onCompositionStart,true);
  document.addEventListener('compositionend',onCompositionEnd,true);
  async function checkPermission() {
    if(!active || stopped || permissionBusy)return;
    permissionBusy=true;
    try {
      // sendMessage may throw synchronously after extension reload, before it
      // returns a Promise. The call itself must be inside try, not just .catch.
      const result=await chrome.runtime.sendMessage({type:'FF_HAS_PERMISSION'});
      if(!result?.allowed){generation++;cleanup();state='no-permission';}
    }catch {
      stopped=true;generation++;cleanup();state='invalidated';lastError='extension-context-invalidated';
      clearInterval(permissionTimer);
      document.removeEventListener?.('input',onInput,true);
      document.removeEventListener?.('compositionstart',onCompositionStart,true);
      document.removeEventListener?.('compositionend',onCompositionEnd,true);
    }finally{permissionBusy=false;}
  }
  // Polling permission is local-only; covers frames after browser-level revocation.
  permissionTimer=setInterval(checkPermission,30000);
  globalThis.__farsiFlow={refresh};refresh();
})();

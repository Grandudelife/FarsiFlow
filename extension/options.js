(() => {
  'use strict';
  const {$,notice,data,fontList,fill,read,reconcile,safe}=FFUI;
  let snapshot={},target='defaults';
  function button(text,fn,cls=''){const b=document.createElement('button');b.type='button';b.textContent=text;b.className=cls;b.addEventListener('click',safe(fn));return b;}
  async function grant(origins,hosts) {
    const allowed=await chrome.permissions.request({origins});if(!allowed){notice('دسترسی داده نشد.');return;}
    const d=await data(),sites={...d.sites};for(const host of hosts)sites[host]=FFCore.sanitizeSettings({...d.defaults,...sites[host],enabled:true});
    await chrome.storage.local.set({sites});await reconcile();await load();notice('فعال شد؛ تغییرات روی صفحه‌های باز هم اعمال شدند.');
  }
  async function load() {
    snapshot=await data();const permissions=await chrome.permissions.getAll();
    const sites=snapshot.sites||{};fontList($('font'),snapshot.fonts||[]);
    $('target').replaceChildren(new Option('پیش‌فرض سایت‌های مجاز','defaults'));
    for(const host of Object.keys(sites).sort())$('target').append(new Option(host,host));
    if(target!=='defaults' && !sites[target])target='defaults';$('target').value=target;
    fill(target==='defaults'?FFCore.sanitizeSettings(snapshot.defaults):FFCore.configFor(snapshot,target));
    $('aiSites').replaceChildren();
    for(const ai of FFCore.AI) {
      const row=document.createElement('div');row.className='site-item';
      const label=document.createElement('strong');label.className='latin';label.textContent=ai.name;row.append(label);
      const granted=ai.origins.every(x=>permissions.origins?.includes(x));
      row.append(button(granted?'فعال‌سازی دوباره':'فعال‌سازی',()=>grant(ai.origins,ai.origins.map(x=>new URL(x.replace('*','')).hostname)),granted?'':'primary'));$('aiSites').append(row);
    }
    $('siteList').replaceChildren();
    if(!Object.keys(sites).length){const p=document.createElement('p');p.className='help';p.textContent='هنوز سایتی اضافه نشده است.';$('siteList').append(p);}
    for(const host of Object.keys(sites).sort()) {
      const row=document.createElement('div');row.className='site-item';const label=document.createElement('span');label.className='host';label.textContent=host;
      const actions=document.createElement('div');actions.className='actions';
      const patterns=FFCore.originsFor(host),granted=patterns.some(x=>permissions.origins?.includes(x));
      actions.append(button(granted?'تنظیم':'مجوز',()=>{if(!granted)return grant(patterns,[host]);target=host;$('target').value=host;fill(FFCore.configFor(snapshot,host));$('settings').scrollIntoView({behavior:'smooth'});}));
      actions.append(button('حذف',async()=>{const d=await data();delete d.sites[host];await chrome.storage.local.set({sites:d.sites});await chrome.permissions.remove({origins:patterns});await load();notice('سایت حذف و دسترسی آن لغو شد.');},'danger'));row.append(label,actions);$('siteList').append(row);
    }
    $('fontList').replaceChildren();
    for(const font of snapshot.fonts||[]) {
      const row=document.createElement('div');row.className='font-item';const label=document.createElement('span');label.textContent=font.name+(font.kind==='local'?' · سیستم':' · فایل');
      row.append(label,button('حذف',async()=>{const d=await data();const fonts=d.fonts.filter(f=>f.id!==font.id);const defaults=FFCore.sanitizeSettings(d.defaults);if(defaults.font===font.id)defaults.font='vazirmatn';for(const cfg of Object.values(d.sites||{}))if(cfg.font===font.id)cfg.font='vazirmatn';await chrome.storage.local.set({fonts,defaults,sites:d.sites||{}});await load();notice('فونت حذف شد.');},'danger'));$('fontList').append(row);
    }
  }
  $('target').addEventListener('change',()=>{target=$('target').value;fill(target==='defaults'?FFCore.sanitizeSettings(snapshot.defaults):FFCore.configFor(snapshot,target));});
  $('settings').addEventListener('submit',safe(async e=>{e.preventDefault();const d=await data();const config=FFCore.sanitizeSettings(read());if(config.exclusions){try{document.querySelector(config.exclusions);}catch{throw new Error('انتخابگر CSS بخش استثناها معتبر نیست.');}}if(target==='defaults')await chrome.storage.local.set({defaults:config});else await chrome.storage.local.set({sites:{...d.sites,[target]:config}});await load();notice('تنظیمات ذخیره و اعمال شدند.');}));
  $('settings').addEventListener('change',()=>FFUI.preview());$('scale').addEventListener('input',()=>FFUI.preview());
  $('reset').addEventListener('click',safe(async()=>{const d=await data();if(target==='defaults')await chrome.storage.local.set({defaults:FFCore.DEFAULTS});else {d.sites[target]={};await chrome.storage.local.set({sites:d.sites});}await load();notice('تنظیمات بازنشانی شد.');}));
  $('addSite').addEventListener('submit',safe(async e=>{e.preventDefault();const host=FFCore.normalizeHost($('newHost').value.trim());await grant(FFCore.originsFor(host),[host]);$('newHost').value='';}));
  async function addFont(record){const d=await data();const fonts=d.fonts||[];if(fonts.length>=12)throw new Error('حداکثر ۱۲ فونت شخصی قابل افزودن است.');await chrome.storage.local.set({fonts:[...fonts,record]});await load();notice('فونت اضافه شد؛ اکنون از فهرست فونت انتخاب کنید.');}
  $('uploadFont').addEventListener('submit',safe(async e=>{
    e.preventDefault();const file=$('fontFile').files[0];if(!file)throw new Error('فایل را انتخاب کنید.');if(file.size>2*1024*1024)throw new Error('حجم هر فایل فونت باید حداکثر ۲ مگابایت باشد.');
    const bytes=await file.arrayBuffer();FFCore.validateFont(bytes);
    const d=await data();const total=(d.fonts||[]).reduce((n,f)=>n+(f.size||0),0)+bytes.byteLength;if(total>5*1024*1024)throw new Error('مجموع فونت‌ها بیشتر از ۵ مگابایت است.');
    const variable=$('fontVariable').checked,weight=Number($('fontWeight').value);
    const face=new FontFace('FFValidation',bytes,{weight:variable?'100 900':String(weight)});await face.load();
    let binary='';for(const b of new Uint8Array(bytes))binary+=String.fromCharCode(b);
    await addFont({id:'custom-'+crypto.randomUUID(),kind:'file',name:$('fontName').value.trim()||file.name,data:btoa(binary),size:bytes.byteLength,weight,variable});$('uploadFont').reset();
  }));
  $('localFont').addEventListener('submit',safe(async e=>{e.preventDefault();const family=$('localName').value.trim();if(!/^[\p{L}\p{N} _.-]{1,80}$/u.test(family))throw new Error('نام فونت معتبر نیست.');const face=new FontFace('FFLocalValidation',`local("${family}")`);await face.load();await addFont({id:'local-'+crypto.randomUUID(),kind:'local',name:family,family});$('localFont').reset();}));
  $('export').addEventListener('click',safe(async()=>{const d=await data();const blob=new Blob([JSON.stringify({schema:1,defaults:FFCore.sanitizeSettings(d.defaults),sites:d.sites||{}},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='FarsiFlow-settings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('پشتیبان تنظیمات دریافت شد.');}));
  $('importButton').addEventListener('click',()=>$('importFile').click());
  $('importFile').addEventListener('change',safe(async()=>{const file=$('importFile').files[0];if(!file)return;if(file.size>512*1024)throw new Error('فایل پشتیبان بیش از حد بزرگ است.');const parsed=FFCore.validateBackup(JSON.parse(await file.text()));await chrome.storage.local.set(parsed);await load();notice('تنظیمات وارد شدند؛ مجوز سایت‌های تازه را با دکمهٔ مجوز فعال کنید.');$('importFile').value='';}));
  $('revokeAll').addEventListener('click',safe(async()=>{const {origins=[]}=await chrome.permissions.getAll();if(origins.length)await chrome.permissions.remove({origins});await load();notice('تمام دسترسی‌های سایت لغو شدند؛ تنظیمات شما باقی مانده‌اند.');}));
  $('clearFonts').addEventListener('click',safe(async()=>{const d=await data();const defaults=FFCore.sanitizeSettings(d.defaults);if(!FFCore.FONTS.some(f=>f.id===defaults.font))defaults.font='vazirmatn';for(const cfg of Object.values(d.sites||{}))if(!FFCore.FONTS.some(f=>f.id===cfg.font))cfg.font='vazirmatn';await chrome.storage.local.set({fonts:[],defaults,sites:d.sites||{}});await load();notice('فونت‌های شخصی حذف شدند.');}));
  safe(load)();
})();

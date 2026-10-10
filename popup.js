(() => {
  'use strict';
  const {$,notice,data,fontList,fill,read,reconcile,safe}=FFUI;
  let host='',origins=[],site={},defaults={},tabId,statusToken=0;
  async function engineStatus() {
    const token=++statusToken,el=$('engineStatus');
    el.textContent='در حال بررسی اجرای فونت روی صفحه…';el.classList.remove('error');
    let injected=false;
    for(let attempt=0;attempt<12;attempt++) {
      let status;
      try {status=await chrome.tabs.sendMessage(tabId,{type:'FF_STATUS'},{frameId:0});}
      catch {
        if(!injected){injected=true;try{await reconcile();}catch{}await new Promise(r=>setTimeout(r,200));continue;}
        if(token!==statusToken)return;
        el.textContent='موتور افزونه روی صفحه پاسخ نمی‌دهد؛ صفحه را رفرش کنید یا «اعمال دوباره» را بزنید.';el.classList.add('error');return;
      }
      if(token!==statusToken)return;
      if(status?.state==='starting'){await new Promise(r=>setTimeout(r,200));continue;}
      if(status?.error){el.textContent='اعمال فونت ناموفق بود: '+status.error;el.classList.add('error');return;}
      if(!status?.active){el.textContent=status?.state==='disabled'?'افزونه برای این سایت خاموش است.':'موتور فعال نشده است؛ دسترسی سایت را بررسی کنید.';return;}
      if(status.font==='system'){el.textContent='موتور فعال است؛ «فونت فعلی سایت» انتخاب شده و فونت جایگزین اعمال نمی‌شود.';return;}
      el.textContent=status.fontLoaded && status.fontElements>0?'فونت بارگذاری شده و روی '+status.fontElements+' بخش دارای متن فارسی اعمال شده است.':'موتور فعال است؛ هنوز متن فارسی برای اعمال فونت پیدا نشده است.';
      return;
    }
    if(token===statusToken)el.textContent='بارگذاری طول کشیده است؛ چند لحظه بعد «اعمال دوباره» را بزنید.';
  }
  async function load() {
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab?.url || !/^https?:/.test(tab.url) || tab.url.startsWith('https://chromewebstore.google.com/')) {
      $('grant').hidden=true;notice('این صفحه اجازهٔ تغییر ندارد. یک سایت عادی را باز کنید.');return;
    }
    tabId=tab.id;host=new URL(tab.url).hostname;origins=FFCore.originsFor(host);$('host').textContent=host;
    $('adapter').textContent=FFCore.isAIHost(host)?'متن هوش مصنوعی':'سایت دلخواه';
    const d=await data();defaults=d.defaults||FFCore.DEFAULTS;site=d.sites?.[host]||{};fontList($('font'),d.fonts||[]);fill(FFCore.configFor(d,host));
    const granted=await chrome.permissions.contains({origins:[new URL(tab.url).protocol+'//'+host+'/*']});
    $('grant').hidden=granted;$('settings').hidden=!granted;
    $('retryApply').hidden=!granted;
    notice(granted?'تغییرات خودکار ذخیره و روی صفحه اعمال می‌شوند.':'دسترسی فقط به این دامنه درخواست می‌شود.');
    if(granted)await engineStatus();
  }
  $('grant').addEventListener('click',safe(async()=>{
    const allowed=await chrome.permissions.request({origins});if(!allowed){notice('دسترسی داده نشد.');return;}
    const d=await data();await chrome.storage.local.set({sites:{...d.sites,[host]:{...defaults,...site,enabled:true}}});await reconcile();await load();
  }));
  let saveWork=Promise.resolve();
  $('settings').addEventListener('change',()=>{
    const snapshot=read();saveWork=saveWork.catch(()=>{}).then(safe(async()=>{const d=await data();site=FFCore.sanitizeSettings({...defaults,...site,...snapshot});await chrome.storage.local.set({sites:{...d.sites,[host]:site}});FFUI.preview();notice(site.enabled?'تنظیمات ذخیره شد.':'برای این سایت خاموش شد.');await new Promise(r=>setTimeout(r,100));await engineStatus();}));
  });
  $('scale').addEventListener('input',()=>FFUI.preview());
  $('resetSite').addEventListener('click',safe(async()=>{const d=await data();d.sites[host]={};await chrome.storage.local.set({sites:d.sites});await load();notice('تنظیمات پیش‌فرض اعمال شد.');}));
  $('retryApply').addEventListener('click',safe(async()=>{await reconcile();await engineStatus();}));
  $('openOptions').addEventListener('click',()=>chrome.runtime.openOptionsPage());
  safe(load)();
})();

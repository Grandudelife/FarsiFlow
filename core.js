/* FarsiFlow, MIT. No text is sent outside this browser. */
(() => {
  'use strict';
  const DEFAULTS = Object.freeze({enabled:true, font:'vazirmatn', direction:'smart', scale:100, lineHeight:0, inputs:true, isolate:true, scope:'auto',exclusions:''});
  const FONTS = Object.freeze([
    {id:'vazirmatn', name:'وزیرمتن', files:[['Vazirmatn-Regular.woff2','400'],['Vazirmatn-Bold.woff2','700']]},
    {id:'shabnam', name:'شبنم', files:[['Shabnam.woff2','400'],['Shabnam-Bold.woff2','700']]},
    {id:'sahel', name:'ساحل', files:[['Sahel.woff2','400'],['Sahel-Bold.woff2','700']]},
    {id:'system', name:'فونت فعلی سایت', files:[]}
  ]);
  const AI = Object.freeze([
    {name:'ChatGPT', origins:['https://chatgpt.com/*','https://chat.openai.com/*']},
    {name:'Gemini', origins:['https://gemini.google.com/*']},
    {name:'Claude', origins:['https://claude.ai/*']}
  ]);
  const RANGE = 'U+0600-06FF,U+0750-077F,U+0870-089F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF,U+200C-200D';
  function normalizeHost(value) {
    if (typeof value !== 'string' || value.length > 2048) throw new Error('آدرس سایت معتبر نیست.');
    const url = new URL(value.includes('://') ? value : 'https://' + value);
    if (!['https:','http:'].includes(url.protocol) || url.username || url.password || !url.hostname || url.port) throw new Error('دامنهٔ بدون پورت وارد کنید؛ فقط http و https پشتیبانی می‌شوند.');
    return url.hostname.toLowerCase();
  }
  function originsFor(host) {const safe=normalizeHost(host); return ['https://' + safe + '/*','http://' + safe + '/*'];}
  function sanitizeSettings(value={}) {
    const v = value && typeof value === 'object' ? value : {};
    return {enabled:typeof v.enabled==='boolean'?v.enabled:DEFAULTS.enabled,
      font:typeof v.font==='string' && /^(vazirmatn|shabnam|sahel|system|custom-[a-z0-9-]+|local-[a-z0-9-]+)$/.test(v.font)?v.font:DEFAULTS.font,
      direction:['smart','first','rtl','off'].includes(v.direction)?v.direction:'smart',
      scale:Number.isFinite(v.scale)?Math.min(160,Math.max(80,v.scale)):100,
      lineHeight:Number.isFinite(v.lineHeight) && v.lineHeight!==0?Math.min(2.4,Math.max(1.2,v.lineHeight)):0,
      inputs:typeof v.inputs==='boolean'?v.inputs:true, isolate:typeof v.isolate==='boolean'?v.isolate:true,
      scope:['auto','all','content'].includes(v.scope)?v.scope:'auto',
      exclusions:typeof v.exclusions==='string'?v.exclusions.trim().slice(0,1024):''};
  }
  function configFor(data,host) {return sanitizeSettings({...data.defaults,...data.sites?.[host]});}
  function detectDirection(text, mode='smart') {
    if (mode==='off') return null;
    const letters = [...String(text).matchAll(/\p{L}/gu)].map(x=>x[0]);
    const arabic = letters.filter(x=>/\p{Script=Arabic}/u.test(x)).length;
    if (!letters.length) return null;
    if (!arabic) return 'ltr';
    if (mode==='rtl') return 'rtl';
    if (mode==='first') return /\p{Script=Arabic}/u.test(letters[0])?'rtl':'ltr';
    // Language balance, with a Persian-specific tie-breaker. Digits and punctuation never vote.
    const other = letters.length-arabic;
    if (arabic>=other || (/[پچژگکی]/u.test(text) && arabic>=8 && arabic>=other*0.6)) return 'rtl';
    return /\p{Script=Arabic}/u.test(letters[0]) && arabic>=3?'rtl':'ltr';
  }
  function isAIHost(host) {return ['chatgpt.com','chat.openai.com','gemini.google.com','claude.ai'].includes(host);}
  function decodeFont(data) {const raw=atob(data); return Uint8Array.from(raw,c=>c.charCodeAt(0)).buffer;}
  function validateFont(bytes) {
    const a=new Uint8Array(bytes);
    if(a.length<32 || a.length>2*1024*1024) throw new Error('حجم فونت باید بین ۳۲ بایت و ۲ مگابایت باشد.');
    const sig=String.fromCharCode(...a.slice(0,4));
    if(!['wOFF','wOF2','OTTO','true'].includes(sig) && !(a[0]===0 && a[1]===1 && a[2]===0 && a[3]===0)) throw new Error('ساختار فایل فونت معتبر نیست.');
    return true;
  }
  function validateBackup(data) {
    if(!data || data.schema!==1 || !data.sites || typeof data.sites!=='object' || Array.isArray(data.sites)) throw new Error('فایل پشتیبان معتبر نیست.');
    if(Object.keys(data.sites).length>200) throw new Error('حداکثر ۲۰۰ سایت قابل وارد کردن است.');
    const sites={};
    for(const [host,cfg] of Object.entries(data.sites)) sites[normalizeHost(host)]=sanitizeSettings({...data.defaults,...cfg});
    // Font binaries are intentionally excluded from backups and imports.
    return {defaults:sanitizeSettings(data.defaults),sites};
  }
  const api=Object.freeze({DEFAULTS,FONTS,AI,RANGE,normalizeHost,originsFor,sanitizeSettings,configFor,detectDirection,isAIHost,decodeFont,validateFont,validateBackup});
  globalThis.FFCore=api;
  if(typeof module!=='undefined') module.exports=api;
})();

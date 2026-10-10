importScripts('core.js');
'use strict';
let work=Promise.resolve();
const queue=()=>work=work.catch(()=>{}).then(reconcile);
async function hasPermission(sender) {
  let url;try{url=new URL(sender.url);}catch{return false;}
  if(!['http:','https:'].includes(url.protocol) || !url.hostname)return false;
  return chrome.permissions.contains({origins:[url.protocol+'//'+url.hostname+'/*']});
}
const bundledFontFiles=new Set(FFCore.FONTS.flatMap(font=>font.files.map(([file])=>file)));
async function bundledFont(file,sender) {
  if(!bundledFontFiles.has(file) || !await hasPermission(sender))return {ok:false,error:'font-access-denied'};
  const response=await fetch(chrome.runtime.getURL('fonts/'+file));
  if(!response.ok)throw new Error('bundled-font-unavailable');
  const bytes=new Uint8Array(await response.arrayBuffer());
  let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return {ok:true,data:btoa(binary)};
}
async function reconcile() {
  const {origins=[]}=await chrome.permissions.getAll();
  const matches=origins.filter(x=>/^https?:\/\//.test(x));
  const existing=await chrome.scripting.getRegisteredContentScripts();
  if(existing.some(x=>x.id==='farsiflow')) await chrome.scripting.unregisterContentScripts({ids:['farsiflow']});
  if(matches.length) {
    await chrome.scripting.registerContentScripts([{id:'farsiflow',matches,js:['core.js','content.js'],runAt:'document_idle',allFrames:true,persistAcrossSessions:true}]);
    const tabs=await chrome.tabs.query({});
    await Promise.allSettled(tabs.filter(t=>t.id && /^https?:/.test(t.url||'')).map(async t=>{
      const url=new URL(t.url),pattern=url.protocol+'//'+url.hostname+'/*';
      if(await chrome.permissions.contains({origins:[pattern]}))await chrome.scripting.executeScript({target:{tabId:t.id,frameIds:[0]},files:['core.js','content.js']});
    }));
  }
}
chrome.runtime.onInstalled.addListener(async details=>{
  const data=await chrome.storage.local.get('defaults');
  if(!data.defaults) await chrome.storage.local.set({defaults:FFCore.DEFAULTS,sites:{},fonts:[],schema:1});
  await queue();
  if(details.reason==='install') await chrome.runtime.openOptionsPage();
});
chrome.runtime.onStartup.addListener(queue);
chrome.permissions.onAdded.addListener(queue);
chrome.permissions.onRemoved.addListener(async ()=>{
  // Existing documents must stop immediately after permission revocation.
  const tabs=await chrome.tabs.query({});
  await Promise.allSettled(tabs.filter(t=>t.id).map(t=>chrome.tabs.sendMessage(t.id,{type:'FF_CHECK_PERMISSION'})));
  await queue();
});
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(message?.type==='FF_RECONCILE' && !sender.tab) {queue().then(()=>reply({ok:true})).catch(e=>reply({ok:false,error:e.message}));return true;}
  if(message?.type==='FF_HAS_PERMISSION' && sender.tab) {
    let url;try{url=new URL(sender.url);}catch{reply({allowed:false});return;}
    if(!['http:','https:'].includes(url.protocol) || !url.hostname){reply({allowed:false});return;}
    hasPermission(sender).then(allowed=>reply({allowed})).catch(()=>reply({allowed:false,error:'permission-check-failed'}));return true;
  }
  if(message?.type==='FF_GET_BUNDLED_FONT' && sender.tab) {
    bundledFont(message.file,sender).then(reply).catch(()=>reply({ok:false,error:'bundled-font-unavailable'}));return true;
  }
});

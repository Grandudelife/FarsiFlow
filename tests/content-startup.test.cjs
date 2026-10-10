const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const C=require('../extension/core.js');
async function boot({protocol='https:',allowed=true,fontFailure=false}={}) {
  let listener,timer,mutations,frameCount=0;const calls=[],faces=[],cleared=[];
  const bytes=fs.readFileSync(require.resolve('../extension/fonts/Vazirmatn-Regular.woff2')).toString('base64');
  const sandbox={FFCore:C,getComputedStyle:()=>({fontFamily:'Arial, sans-serif'}),location:{protocol,hostname:'www.linkedin.com'},
    chrome:{storage:{onChanged:{addListener(){}},local:{get:async()=>({defaults:C.DEFAULTS,sites:{},fonts:[]})}},runtime:{onMessage:{addListener:fn=>{listener=fn;}},sendMessage:async msg=>{
      calls.push(msg);return msg.type==='FF_HAS_PERMISSION'?{allowed}:fontFailure?{ok:false,error:'bundled-font-unavailable'}:{ok:true,data:bytes};
    }}},document:{addEventListener(){},querySelectorAll:()=>[],body:{isConnected:false},fonts:{add:face=>faces.push(face)},adoptedStyleSheets:[],documentElement:{append(){}},createElement:()=>({remove(){}})},
    FontFace:class{constructor(family,source,options){this.family=family;this.source=source;this.options=options;}async load(){return this;}},
    CSSStyleSheet:class{replaceSync(){}},MutationObserver:class{constructor(fn){mutations=fn;}observe(){}disconnect(){}},
    setInterval:fn=>{timer=fn;return 7;},clearInterval:id=>cleared.push(id),requestAnimationFrame(){frameCount++;return 1;},cancelAnimationFrame(){}};
  const source=fs.readFileSync(require.resolve('../extension/content.js'),'utf8').replace('globalThis.__farsiFlow={refresh};refresh();','globalThis.testFont=font;globalThis.__farsiFlow={refresh};refresh();');
  vm.runInNewContext(source,sandbox);
  await new Promise(resolve=>setImmediate(resolve));
  let status;listener?.({type:'FF_STATUS'},{},reply=>{status=reply;});
  return {calls,faces,status,sandbox,cleared,mutate:records=>mutations(records),getFrameCount:()=>frameCount,tick:()=>timer(),getStatus:()=>{let value;listener?.({type:'FF_STATUS'},{},reply=>{value=reply;});return value;}};
}
test('blank frames do not start an engine or send permission requests',async()=>{
  const r=await boot({protocol:'about:'});assert.equal(r.calls.length,0);assert.equal(r.status,undefined);
});
test('content engine starts with bundled bytes from background, without a page fetch',async()=>{
  const r=await boot();assert.equal(r.status.state,'active');assert.equal(r.status.fontLoaded,true);
  assert.equal(r.faces.length,2);assert.equal(r.calls.filter(c=>c.type==='FF_GET_BUNDLED_FONT').length,2);
  const expected=fs.readFileSync(require.resolve('../extension/fonts/Vazirmatn-Regular.woff2'));
  assert.deepEqual(Buffer.from(r.faces[0].source),expected);
});
test('font startup failure is visible in status with the failing stage',async()=>{
  const r=await boot({fontFailure:true});assert.equal(r.status.active,false);assert.equal(r.status.state,'error');
  assert.equal(r.status.error,'font: bundled-font-unavailable');
});
test('denied permission stops startup before any font data is requested',async()=>{
  const r=await boot({allowed:false});assert.equal(r.status.state,'no-permission');assert.equal(r.calls.length,1);
});
test('synchronous context invalidation stops the old timer without escaping an error',async()=>{
  const r=await boot();let attempts=0;
  r.sandbox.chrome.runtime.sendMessage=()=>{attempts++;throw new Error('Extension context invalidated.');};
  await assert.doesNotReject(async()=>r.tick());
  assert.equal(r.getStatus().active,false);assert.equal(r.cleared.includes(7),true);
  await r.tick();await r.sandbox.__farsiFlow.refresh();assert.equal(attempts,1);
});
test('rejected permission messages are handled and stop the old timer',async()=>{
  const r=await boot();r.sandbox.chrome.runtime.sendMessage=()=>Promise.reject(new Error('Extension context invalidated.'));
  await assert.doesNotReject(async()=>r.tick());assert.equal(r.getStatus().active,false);assert.equal(r.cleared.includes(7),true);
});
test('permission revocation cleans the page and updates reported state',async()=>{
  const r=await boot();r.sandbox.chrome.runtime.sendMessage=async()=>({allowed:false});
  await r.tick();assert.equal(r.getStatus().active,false);assert.equal(r.getStatus().state,'no-permission');
});
test('style observer ignores extension writes and schedules host font replacement once',async()=>{
  const r=await boot(),styles=new Map(),priorities=new Map(),attrs=new Map();
  const el={isConnected:true,nodeType:1,closest:()=>null,getAttribute:k=>attrs.get(k)??null,setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),
    style:{getPropertyValue:k=>styles.get(k)??'',getPropertyPriority:k=>priorities.get(k)??'',setProperty:(k,v,p='')=>{styles.set(k,v);priorities.set(k,p);},removeProperty:k=>styles.delete(k)}};
  r.sandbox.testFont(el,'سلام');
  const record={type:'attributes',attributeName:'style',target:el};
  for(let i=0;i<10;i++)r.mutate([record]);assert.equal(r.getFrameCount(),0);
  el.style.setProperty('font-family','Georgia, serif','important');
  r.mutate([record]);assert.equal(r.getFrameCount(),1);
});

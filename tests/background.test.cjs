const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function runtime(){
  const calls=[],listeners={},state={origins:['https://chatgpt.com/*'],registered:[],data:{}};
  const event=name=>({addListener:fn=>{listeners[name]=fn;}});
  const chrome={permissions:{getAll:async()=>({origins:state.origins}),contains:async({origins})=>{calls.push(['contains',origins]);if(state.permissionError)throw new Error('Permission API failed');for(const pattern of origins)if(!/^https?:\/\//.test(pattern))throw new Error('Invalid scheme');return origins.every(x=>state.origins.includes(x));},onAdded:event('added'),onRemoved:event('removed')},
    scripting:{getRegisteredContentScripts:async()=>state.registered,unregisterContentScripts:async()=>{state.registered=[];calls.push('unregister');},registerContentScripts:async scripts=>{state.registered=scripts;calls.push('register');},executeScript:async spec=>{calls.push(['inject',spec]);}},
    tabs:{query:async()=>[{id:1,url:'https://chatgpt.com/chat'},{id:2,url:'https://example.com/private'}],sendMessage:async(id,msg)=>calls.push(['message',id,msg])},
    storage:{local:{get:async key=>({[key]:state.data[key]}),set:async value=>Object.assign(state.data,value)}},
    runtime:{getURL:file=>'chrome-extension://test/'+file,onInstalled:event('installed'),onStartup:event('startup'),onMessage:event('message'),openOptionsPage:async()=>calls.push('options')}};
  const fetch=async url=>{calls.push(['fetch',url]);if(state.fontError)throw new Error('Read failed');const bytes=fs.readFileSync(path.join(__dirname,'../extension/fonts/Vazirmatn-Regular.woff2'));return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};};
  const context=vm.createContext({chrome,URL,Promise,fetch,btoa:binary=>Buffer.from(binary,'binary').toString('base64')});context.importScripts=()=>vm.runInContext(fs.readFileSync(path.join(__dirname,'../extension/core.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../extension/background.js'),'utf8'),context);return {context,calls,listeners,state};
}
test('registers only granted origins and injects only permitted open tabs',async()=>{const r=runtime();await vm.runInContext('queue()',r.context);assert.equal(r.state.registered[0].matches[0],'https://chatgpt.com/*');assert.equal(r.state.registered[0].allFrames,true);const inject=r.calls.filter(c=>Array.isArray(c)&&c[0]==='inject');assert.equal(inject.length,1);assert.equal(inject[0][1].target.tabId,1);});
test('revocation removes dynamic registration and notifies existing content scripts',async()=>{const r=runtime();await vm.runInContext('queue()',r.context);r.state.origins=[];await r.listeners.removed();assert.equal(r.state.registered.length,0);assert.equal(r.calls.filter(c=>Array.isArray(c)&&c[0]==='message').length,2);});
test('permission check uses actual sender frame URL rather than supplied message URL',async()=>{const r=runtime();const denied=await new Promise(resolve=>r.listeners.message({type:'FF_HAS_PERMISSION',url:'https://chatgpt.com/'},{tab:{id:2},url:'https://example.com/'},resolve));assert.equal(denied.allowed,false);const yes=await new Promise(resolve=>r.listeners.message({type:'FF_HAS_PERMISSION'},{tab:{id:1},url:'https://chatgpt.com/'},resolve));assert.equal(yes.allowed,true);});
test('install initializes local settings and opens onboarding',async()=>{const r=runtime();await r.listeners.installed({reason:'install'});assert.equal(r.state.data.defaults.font,'vazirmatn');assert.equal(r.state.data.fonts.length,0);assert.ok(r.calls.includes('options'));});
test('unsupported sender schemes are denied without calling the permission API',()=>{
  const r=runtime();
  for(const url of ['about:blank','about:srcdoc','data:text/html,test','blob:https://chatgpt.com/id','chrome://extensions','file:///tmp/test','not a url']){
    let result; r.listeners.message({type:'FF_HAS_PERMISSION'},{tab:{id:1},url},reply=>{result=reply;});
    assert.equal(result?.allowed,false,url);
  }
  assert.equal(r.calls.filter(c=>Array.isArray(c)&&c[0]==='contains').length,0);
});
test('permission API rejection produces a response instead of an unhandled rejection',async()=>{
  const r=runtime();r.state.permissionError=true;
  const response=await new Promise(resolve=>r.listeners.message({type:'FF_HAS_PERMISSION'},{tab:{id:1},url:'https://chatgpt.com/'},resolve));
  assert.equal(response.allowed,false);assert.equal(response.error,'permission-check-failed');
});
test('already-open pages inject the main frame independently of unsupported child frames',async()=>{
  const r=runtime();await vm.runInContext('queue()',r.context);
  const inject=r.calls.find(c=>Array.isArray(c)&&c[0]==='inject')[1];
  assert.equal(inject.target.allFrames,undefined);assert.equal(inject.target.frameIds.join(','),'0');
  assert.equal(r.state.registered[0].allFrames,true);
});
test('bundled font bytes are read inside the extension and returned unchanged',async()=>{
  const r=runtime(),response=await new Promise(resolve=>r.listeners.message({type:'FF_GET_BUNDLED_FONT',file:'Vazirmatn-Regular.woff2'},{tab:{id:1},url:'https://chatgpt.com/'},resolve));
  assert.equal(response.ok,true);assert.deepEqual(Buffer.from(response.data,'base64'),fs.readFileSync(path.join(__dirname,'../extension/fonts/Vazirmatn-Regular.woff2')));
});
test('font reader rejects arbitrary paths and unauthorized or blank frames',async()=>{
  const r=runtime();
  for(const [file,url] of [['../core.js','https://chatgpt.com/'],['Vazirmatn-Regular.woff2','https://example.com/'],['Vazirmatn-Regular.woff2','about:blank']]) {
    const response=await new Promise(resolve=>r.listeners.message({type:'FF_GET_BUNDLED_FONT',file},{tab:{id:1},url},resolve));assert.equal(response.ok,false);
  }
  assert.equal(r.calls.filter(c=>Array.isArray(c)&&c[0]==='fetch').length,0);
});
test('font file read failure is reported without an unhandled rejection',async()=>{
  const r=runtime();r.state.fontError=true;
  const response=await new Promise(resolve=>r.listeners.message({type:'FF_GET_BUNDLED_FONT',file:'Vazirmatn-Regular.woff2'},{tab:{id:1},url:'https://chatgpt.com/'},resolve));
  assert.equal(response.error,'bundled-font-unavailable');
});

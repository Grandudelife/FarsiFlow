const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const C=require('../extension/core.js');

// Exercise the shipping DOM mutation functions with a small element harness.
// This checks the regression without claiming browser font rendering coverage.
function engine() {
  const sandbox={FFCore:C,getComputedStyle:el=>({fontFamily:el.originalFont,display:'block',fontSize:'16px'}),NodeFilter:{SHOW_TEXT:4,FILTER_REJECT:2,FILTER_ACCEPT:1},
    chrome:{storage:{onChanged:{addListener(){}}},runtime:{onMessage:{addListener(){}}}},
    document:{addEventListener(){},createTreeWalker:el=>{let read=false;return {nextNode:()=>read?null:(read=true,{nodeValue:el.textContent})};}},setInterval(){},location:{hostname:'www.linkedin.com',protocol:'https:'}};
  const source=fs.readFileSync(require.resolve('../extension/content.js'),'utf8')
    .replace('globalThis.__farsiFlow={refresh};refresh();',
      'globalThis.testEngine={font,process,processEditor,restore,setConfig:v=>{cfg={...C.DEFAULTS,...v};}};');
  vm.runInNewContext(source,sandbox);
  return sandbox.testEngine;
}
function element(originalFont,tagName='SPAN') {
  const attrs=new Map(),styles=new Map(),priorities=new Map();
  return {originalFont,tagName,type:'text',textContent:'سلام، دربارهٔ API توضیح بده',
    isConnected:true,childNodes:[{nodeType:3,nodeValue:'سلام دربارهٔ API'}],querySelector:()=>null,matches:selector=>selector.includes(tagName.toLowerCase()),
    closest:()=>null,getAttribute:k=>attrs.get(k)??null,
    setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),
    style:{getPropertyValue:k=>styles.get(k)??'',getPropertyPriority:k=>priorities.get(k)??'',
      setProperty:(k,v,p='')=>{styles.set(k,v);priorities.set(k,p);},removeProperty:k=>{styles.delete(k);priorities.delete(k);}}};
}
const stack='system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';
test('normal text with symbol fallback receives selected Persian font',()=>{
  const api=engine(),el=element(stack);
  api.font(el,el.textContent);
  assert.equal(el.getAttribute('data-ff-font'),'');
  assert.equal(el.style.getPropertyValue('--ff-family'),'FarsiFlow_vazirmatn');
  assert.equal(el.style.getPropertyValue('--ff-original-font'),stack);
});
test('visible aria-hidden message and preview text are still processed',()=>{
  const api=engine();
  for(const tag of ['P','SPAN']){
    const el=element(stack,tag);el.setAttribute('aria-hidden','true');
    el.closest=selector=>selector.includes('[aria-hidden="true"]')?el:null;
    api.process(el);assert.equal(el.getAttribute('data-ff-font'),'');assert.equal(el.getAttribute('aria-hidden'),'true');
  }
});
test('font overrides competing host styles and restores original inline value and priority',()=>{
  const api=engine(),el=element(stack);el.style.setProperty('font-family','Georgia, serif','important');
  api.font(el,el.textContent);assert.match(el.style.getPropertyValue('font-family'),/^FarsiFlow_vazirmatn,/);
  assert.equal(el.style.getPropertyPriority('font-family'),'important');api.restore(el);
  assert.equal(el.style.getPropertyValue('font-family'),'Georgia, serif');assert.equal(el.style.getPropertyPriority('font-family'),'important');
});
test('nested editor paragraphs keep selected font when the normal scanner visits them',()=>{
  const api=engine(),editor=element(stack,'DIV'),child=element('Georgia, serif','P');
  editor.querySelectorAll=()=>[child];child.closest=selector=>selector.includes('contenteditable')?editor:null;
  api.processEditor(editor);assert.equal(child.getAttribute('data-ff-font'),'');
  api.process(child);assert.equal(child.getAttribute('data-ff-font'),'');
  api.restore(editor);api.restore(child);assert.equal(child.getAttribute('data-ff-font'),null);
});
test('icon fonts remain excluded when they are the primary family',()=>{
  const api=engine();
  for(const family of ['"Material Symbols Outlined", sans-serif','"Font Awesome 6 Free", Arial','icomoon, sans-serif']) {
    const el=element(family);api.font(el,el.textContent);
    assert.equal(el.getAttribute('data-ff-font'),null,family);
  }
});
test('English text and the original-site-font option keep the host font',()=>{
  const api=engine(),english=element(stack),original=element(stack);
  api.font(english,'Happy birthday');assert.equal(english.getAttribute('data-ff-font'),null);
  api.setConfig({font:'system'});api.font(original,original.textContent);
  assert.equal(original.getAttribute('data-ff-font'),null);
});
test('editor styling and restore preserve text and original direction',()=>{
  const api=engine(),el=element(stack,'DIV'),text=el.textContent;
  el.setAttribute('dir','ltr');api.processEditor(el);
  assert.equal(el.getAttribute('data-ff-font'),'');assert.equal(el.getAttribute('dir'),'auto');
  assert.equal(el.textContent,text);api.restore(el);
  assert.equal(el.getAttribute('dir'),'ltr');assert.equal(el.getAttribute('data-ff-font'),null);
  assert.equal(el.style.getPropertyValue('--ff-family'),'');assert.equal(el.textContent,text);
});

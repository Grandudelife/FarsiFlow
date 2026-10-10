const {test}=require('node:test');const assert=require('node:assert/strict');const C=require('../extension/core.js');
test('normalizes domains and rejects privileged URLs / CSS injection',()=>{
  assert.equal(C.normalizeHost('https://EXAMPLE.com/page'),'example.com');
  assert.equal(C.normalizeHost('مثال.ir'),'xn--mgbh0fb.ir');
  for(const host of ['file:///etc/passwd','chrome://settings','https://user:pass@example.com','https://example.com:8443','https://example.com/*\n{}']) {
    if(host.includes('\n'))continue;assert.throws(()=>C.normalizeHost(host));
  }
  assert.throws(()=>C.normalizeHost('example.com"}body{color:red}'));
});
test('Persian, English, mixed prose, English-leading Persian',()=>{
  for(const text of ['سلام؛ لطفاً به تنظیمات بروید.','برای کار با ChatGPT و Gemini گزینهٔ تنظیمات را انتخاب کنید.','ChatGPT برای مطالعهٔ متن‌های فارسی در کنار متن انگلیسی کاربرد دارد.','قیمت ۱۲۵٬۰۰۰ تومان؛ نسخهٔ v2.4'])assert.equal(C.detectDirection(text),'rtl',text);
  for(const text of ['English stays left to right.','This is an English paragraph with the name فارسی‌یار.','API'])assert.equal(C.detectDirection(text),'ltr',text);
  assert.equal(C.detectDirection('ChatGPT برای مطالعهٔ متن‌های فارسی کاربرد دارد.','first'),'ltr');
  assert.equal(C.detectDirection('123 + - ()'),null);
});
test('forced RTL applies only when an Arabic-script letter is present',()=>{assert.equal(C.detectDirection('hello','rtl'),'ltr');assert.equal(C.detectDirection('English سلام','rtl'),'rtl');assert.equal(C.detectDirection('سلام','off'),null);});
test('site overrides are independent and bounded',()=>{
  const d={defaults:{...C.DEFAULTS,scale:120},sites:{'a.com':{font:'sahel',scale:140}}};assert.equal(C.configFor(d,'a.com').font,'sahel');assert.equal(C.configFor(d,'b.com').scale,120);
  assert.equal(C.sanitizeSettings({scale:1e12}).scale,160);assert.equal(C.sanitizeSettings({scale:NaN}).scale,100);assert.equal(C.sanitizeSettings({font:'x";script'}).font,'vazirmatn');assert.equal(C.sanitizeSettings({lineHeight:-1}).lineHeight,1.2);
});
test('backup only imports display settings and safe domains',()=>{
  assert.throws(()=>C.validateBackup({schema:2,sites:{}}));assert.throws(()=>C.validateBackup({schema:1,sites:{'chrome://settings':{}}}));
  const result=C.validateBackup({schema:1,sites:{'EXAMPLE.com':{font:'sahel'}},fonts:[{data:'untrusted'}]});assert.equal(result.sites['example.com'].font,'sahel');assert.equal(result.fonts,undefined);
});
test('font signature rejects arbitrary code and corrupt small files',()=>{assert.throws(()=>C.validateFont(new TextEncoder().encode('alert(1)')));const woff=new Uint8Array(32);woff.set([119,79,70,50]);assert.equal(C.validateFont(woff.buffer),true);});

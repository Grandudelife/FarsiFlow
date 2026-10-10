(() => {
  'use strict';let enabled=false,timer;
  const samples=document.getElementById('samples');
  function apply(){
    for(const el of samples.querySelectorAll('p,li,td,th,blockquote')){
      if(enabled){el.style.direction=FFCore.detectDirection(el.textContent)||'ltr';el.style.textAlign='start';el.style.unicodeBidi='isolate';}
      else {el.style.removeProperty('direction');el.style.removeProperty('text-align');el.style.removeProperty('unicode-bidi');}
    }
    samples.style.fontFamily=enabled?'Vazirmatn,Arial,sans-serif':'Arial,sans-serif';
    for(const el of samples.querySelectorAll('code,pre,a,strong,em,.katex')){
      if(enabled){el.style.direction='ltr';el.style.unicodeBidi='isolate';}else{el.style.removeProperty('direction');el.style.removeProperty('unicode-bidi');}
    }
    document.getElementById('editor').setAttribute('dir',enabled?'auto':'ltr');
    document.getElementById('editor').style.unicodeBidi=enabled?'plaintext':'normal';
    document.getElementById('toggle').textContent=enabled?'نمایش اصلی':'نمایش اصلاح‌شده';document.getElementById('demoStatus').textContent=enabled?'نمایش اصلاح‌شده':'نمایش اصلی';
  }
  document.getElementById('toggle').addEventListener('click',()=>{enabled=!enabled;apply();});
  document.getElementById('stream').addEventListener('click',()=>{clearInterval(timer);const el=document.getElementById('streaming'),words='ChatGPT می‌تواند یک پاسخ فارسی را در حال تولید نمایش دهد و سپس یک عبارت English به آن اضافه کند.'.split(' ');el.textContent='';let i=0;timer=setInterval(()=>{el.append((i?' ':'')+words[i++]);apply();if(i===words.length)clearInterval(timer);},110);});
})();

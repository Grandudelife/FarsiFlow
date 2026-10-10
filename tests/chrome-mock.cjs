function mock({config,allowed=true,fonts=[]}) {
  const listeners=[],messages=[];const state={data:{defaults:config,sites:{},fonts},allowed,requests:[]};
  window.__mock=state;
  const changed=(patch)=>{const changes={};for(const [k,v] of Object.entries(patch)){changes[k]={oldValue:state.data[k],newValue:v};state.data[k]=v;}for(const fn of listeners)fn(changes,'local');};
  window.__set=changed;
  window.chrome={
    storage:{local:{get:async keys=>Object.fromEntries(keys.map(k=>[k,state.data[k]])),set:async patch=>changed(patch)},onChanged:{addListener:fn=>listeners.push(fn)}},
    runtime:{getURL:file=>location.origin+'/extension/'+file,onMessage:{addListener:fn=>messages.push(fn)},sendMessage:async msg=>{
      if(msg.type==='FF_HAS_PERMISSION')return {allowed:state.allowed};
      if(msg.type==='FF_GET_BUNDLED_FONT'){
        const response=await fetch(location.origin+'/extension/fonts/'+msg.file);
        const bytes=new Uint8Array(await response.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
        return {ok:true,data:btoa(binary)};
      }
      return {ok:true};
    },openOptionsPage:async()=>{}},
    tabs:{query:async()=>[{id:1,url:'https://chatgpt.com/fixture'}],sendMessage:async()=>({active:true,state:'active',font:'vazirmatn',fontLoaded:true,fontElements:5})},
    permissions:{getAll:async()=>({origins:state.allowed?['https://chatgpt.com/*']:[]}),contains:async()=>state.allowed,request:async value=>{state.requests.push({value,userGesture:navigator.userActivation.isActive});state.allowed=true;return true;},remove:async()=>{state.allowed=false;return true;}}
  };
}
module.exports=mock;

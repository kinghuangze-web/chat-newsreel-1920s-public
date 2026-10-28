// Real-browser checks; requires caller-supplied Lemo runtime, no online service.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const [runtime,evidence]=process.argv.slice(2);
if(!runtime||!evidence)throw Error('usage: check.mjs <lemo-root> <evidence-directory>');
const source=path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(evidence,{recursive:true});
const fixture=fs.mkdtempSync(path.join(path.resolve(evidence),'fixture-'));
fs.copyFileSync(path.join(source,'demo.html'),path.join(fixture,'index.html'));
fs.copyFileSync(path.join(source,'cameo-layer.mjs'),path.join(fixture,'cameo-layer.mjs'));
const {openDemo,closeServer}=await import(pathToFileURL(path.resolve(runtime,'core/render/page.mjs')).href);
let browser;
try{
 const opened=await openDemo(fixture,{w:1000,h:850});browser=opened.browser;
 const result=await opened.page.evaluate(()=>{
  const {createCameoLayer,cameoState,events,warp}=window.CAMEO,tests=[],diagnostics={};
  const test=(name,fn)=>{try{tests.push({name,pass:!!fn()});}catch(e){tests.push({name,pass:false,error:String(e)});}};
  const canvas=(w,h)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;return cv;};
  const src=canvas(128,128),sx=src.getContext('2d');sx.fillStyle='#fff';sx.fillRect(0,0,128,128);
  const out=canvas(180,180),ctx=out.getContext('2d');
  const host=createCameoLayer(src,{columns:8,rows:8,padding:12});
  const event={t0:1,t1:3,x:26,y:26,width:128,height:128,fadeIn:.4,fadeOut:.4};
  const clear=()=>ctx.clearRect(0,0,180,180);
  const alpha=()=>Array.from(ctx.getImageData(36,36,108,108).data).filter((_,i)=>i%4===3);
  const rejected=fn=>{try{fn();return false;}catch{return true;}};
  test('half-open appearance window and exact boundary opacity',()=>
   cameoState(.99,event)===null&&cameoState(3,event)===null&&cameoState(1,event).opacity===0&&cameoState(2,event).opacity===1);
  test('inactive draw produces no pixels',()=>{clear();return host.draw(ctx,0,event)===null&&ctx.getImageData(0,0,180,180).data.every(x=>x===0);});
  test('half fade is uniform across all mesh seams',()=>{clear();host.draw(ctx,1.2,event);const a=alpha();diagnostics.halfAlpha=[Math.min(...a),Math.max(...a)];return Math.min(...a)>=127&&Math.max(...a)<=128;});
  test('fully visible mesh has no interior alpha holes',()=>{clear();host.draw(ctx,2,event);const a=alpha();diagnostics.fullAlpha=[Math.min(...a),Math.max(...a)];return a.every(x=>x===255);});
  test('caller opacity and transform are preserved',()=>{
   clear();ctx.globalAlpha=.4;ctx.setTransform(1,0,0,1,2,3);const before=ctx.getTransform();
   host.draw(ctx,2,event);const after=ctx.getTransform();const pass=Math.abs(ctx.globalAlpha-.4)<1e-6&&before.e===after.e&&before.f===after.f&&alpha().every(x=>x===102);
   ctx.globalAlpha=1;ctx.resetTransform();return pass;
  });
  test('returned conservative bounds include padding',()=>{clear();const b=host.draw(ctx,2,event).bounds;return b.x0===14&&b.y0===14&&b.x1===166&&b.y1===166;});
  test('invalid duration dimensions fades and time are rejected',()=>
   rejected(()=>cameoState(2,{...event,t1:1}))&&rejected(()=>cameoState(2,{...event,width:0}))&&
   rejected(()=>cameoState(2,{...event,fadeIn:Infinity}))&&rejected(()=>cameoState(NaN,event)));
  test('invalid mesh and nonfinite warp are rejected',()=>
   rejected(()=>createCameoLayer(src,{columns:0}))&&rejected(()=>host.draw(ctx,2,event,()=>[NaN,0])));
  test('clipped and folded deformations fail instead of silently rendering',()=>
   rejected(()=>host.draw(ctx,2,event,({x,y})=>[x+100,y]))&&
   rejected(()=>host.draw(ctx,2,event,({x,y})=>[128-x,y])));
  const pixels=()=>Array.from(document.querySelector('canvas').getContext('2d').getImageData(0,0,960,540).data);
  test('seeking elsewhere and back produces identical pixels',()=>{
   window.render(2.8);const a=pixels();window.render(10.8);window.render(.1);window.render(2.8);
   const b=pixels();return a.every((v,i)=>v===b[i]);
  });
  test('all cameo frames at 24fps render without a folded mesh',()=>{
   const fixtureHost=createCameoLayer(src,{padding:18});
   for(const e of events)for(let t=e.t0;t<e.t1;t+=1/24){
    window.render(t);
    const r=fixtureHost.draw(ctx,t,{...e,width:80,height:80},warp);
    if(!r||r.opacity<0||r.opacity>1)return false;
   }return true;
  });
  return{pass:tests.every(x=>x.pass),tests,diagnostics,scope:'Browser component and fictional silent demo only; no episode, TTS identity or listening approval'};
 });
 fs.writeFileSync(path.join(evidence,'cameo-check.json'),JSON.stringify(result,null,2));
 for(const [name,t]of [['opener',1],['greeting',2.8],['bridge',6.5],['farewell',10.8]]){
  await opened.page.evaluate(t=>window.render(t),t);
  await opened.page.locator('canvas').screenshot({path:path.join(evidence,name+'.png')});
 }
 console.log(JSON.stringify(result));if(!result.pass)process.exitCode=1;
}finally{if(browser)await browser.close();closeServer();}

// node check_guards.mjs <lemo-root> <evidence-directory>
import fs from'node:fs';import path from'node:path';import{pathToFileURL,fileURLToPath}from'node:url';
const[lib,out]=process.argv.slice(2);if(!lib||!out)throw Error('usage: check_guards.mjs <lemo-root> <evidence-directory>');
fs.mkdirSync(out,{recursive:true});const temp=fs.mkdtempSync(path.join(path.resolve(out),'canvas-'));
const asset=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../assets/guards.mjs');fs.copyFileSync(asset,path.join(temp,'guards.mjs'));
fs.writeFileSync(path.join(temp,'index.html'),`<!doctype html><meta charset="utf-8"><canvas id="c" width="384" height="256"></canvas><script type="module">
import{irisMask,textBounds,textCoverage}from'./guards.mjs';window.G={irisMask,textBounds,textCoverage};window.DUR=1;window.render=()=>{};window.READY=true;
</script>`);
const{openDemo,closeServer}=await import(pathToFileURL(path.resolve(lib,'core/render/page.mjs')).href);
let browser;
try{
 const p=await openDemo(temp,{w:384,h:256});browser=p.browser;
 const result=await p.page.evaluate(()=>{
  const c=document.getElementById('c'),x=c.getContext('2d'),g={x:32,y:16,width:320,height:220},tests=[];
  const white=()=>{x.setTransform(1,0,0,1,0,0);x.fillStyle='#fff';x.fillRect(0,0,384,256)};
  const pixel=(a,b)=>[...x.getImageData(a,b,1,1).data].slice(0,3);
  white();G.irisMask(x,g,0);tests.push({name:'zero radius masks the full gate and preserves outside',pass:pixel(192,100).every(v=>v===0)&&pixel(34,18).every(v=>v===0)&&pixel(5,5).every(v=>v===255)});
  white();G.irisMask(x,g,60);tests.push({name:'positive aperture shows center, masks corner',pass:pixel(192,104).every(v=>v===255)&&pixel(34,18).every(v=>v===0)});
  white();G.irisMask(x,g,1000);tests.push({name:'fully open gate stays visible',pass:pixel(34,18).every(v=>v===255)&&pixel(349,234).every(v=>v===255)});
  x.clearRect(0,0,384,256);x.translate(115,90);x.rotate(.36);x.scale(1.45,1.45);x.font='24px sans-serif';x.fillStyle='#f00';const b=G.textBounds(x,'title','TEST 1920',0,0);x.fillText('TEST 1920',0,0);x.resetTransform();
  const data=x.getImageData(0,0,384,256).data;let count=0,inside=true;for(let j=0;j<256;j++)for(let i=0;i<384;i++){if(data[(j*384+i)*4+3]>30){count++;if(i<b.x0-1||i>b.x1+1||j<b.y0-1||j>b.y1+1)inside=false}}
  tests.push({name:'rotated scaled real text pixels fit registered bounds',pass:count>50&&inside});
  const safe={x0:0,y0:0,x1:384,y1:256};const coverage=G.textCoverage(['title','time'],[{t:0,boxes:[b]}],safe);tests.push({name:'missing expected text fails coverage',pass:!coverage.pass&&coverage.missing.includes('time')});
  const collision=G.textCoverage(['a','b'],[{t:1,boxes:[{id:'a',x0:20,y0:20,x1:80,y1:80},{id:'b',x0:50,y0:50,x1:100,y1:100}]}],safe);tests.push({name:'overlapping registered text fails geometry',pass:!collision.pass&&collision.collisions.length===1});
  return{pass:tests.every(t=>t.pass),tests,scope:'browser canvas invariants only; no episode visual/listening approval'};
 });
 fs.writeFileSync(path.join(out,'guards-check.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(!result.pass)process.exitCode=1;
}finally{if(browser)await browser.close();closeServer()}

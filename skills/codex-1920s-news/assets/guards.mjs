// Canvas safeguards distilled from newsreel revisions. Apply after sharp type.
export function irisMask(ctx,{x=0,y=0,width,height},radius,cx=x+width/2,cy=y+height*.4){
 if(!Number.isFinite(radius)||radius<0)throw Error('invalid iris radius');
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.beginPath();ctx.rect(x,y,width,height);ctx.clip();ctx.fillStyle='#000';ctx.beginPath();ctx.rect(x,y,width,height);
 if(radius>.001){ctx.moveTo(cx+radius,cy);ctx.arc(cx,cy,radius,0,Math.PI*2)}
 ctx.fill('evenodd');ctx.restore();
}
export function textBounds(ctx,id,text,x,y){
 const q=ctx.measureText(text),m=ctx.getTransform();
 const l=x-q.actualBoundingBoxLeft-3,r=x+q.actualBoundingBoxRight+3,u=y-q.actualBoundingBoxAscent-3,b=y+q.actualBoundingBoxDescent+3;
 const points=[[l,u],[r,u],[l,b],[r,b]];
 const p=points.map(([a,b])=>[m.a*a+m.c*b+m.e,m.b*a+m.d*b+m.f]);
 return{id,text,x0:Math.min(...p.map(p=>p[0])),x1:Math.max(...p.map(p=>p[0])),y0:Math.min(...p.map(p=>p[1])),y1:Math.max(...p.map(p=>p[1]))};
}
export function textCoverage(expected,samples,safe){
 const seen=new Set(),outside=[],collisions=[];
 for(const {t,boxes}of samples){
  for(const b of boxes){seen.add(b.id);if(b.x0<safe.x0||b.x1>safe.x1||b.y0<safe.y0||b.y1>safe.y1)outside.push({t,id:b.id})}
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];if(a.id!==b.id&&Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0)>3&&Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0)>3)collisions.push({t,ids:[a.id,b.id]})}
 }
 const missing=expected.filter(id=>!seen.has(id));
 return{pass:!missing.length&&!outside.length&&!collisions.length,missing,outside,collisions,seen:[...seen],scope:'registered text geometry only; not visual or editorial approval'};
}

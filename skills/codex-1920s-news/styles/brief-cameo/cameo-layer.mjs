// MIT; optional Canvas 2D helper. No character assets or audio are embedded.
const finite = (n, name) => {
  if (!Number.isFinite(n)) throw new TypeError(`${name} must be finite`);
  return n;
};
const smooth = x => { x = Math.max(0, Math.min(1, x)); return x*x*(3-2*x); };

export function cameoState(t, event) {
  finite(t, 'time');
  for (const key of ['t0','t1','x','y','width','height']) finite(event[key], key);
  if (event.t1 <= event.t0 || event.width <= 0 || event.height <= 0)
    throw new RangeError('positive duration and dimensions required');
  const fadeIn = event.fadeIn ?? .16, fadeOut = event.fadeOut ?? .18;
  if (!Number.isFinite(fadeIn) || !Number.isFinite(fadeOut) || fadeIn < 0 || fadeOut < 0)
    throw new RangeError('fades must be finite and nonnegative');
  if (t < event.t0 || t >= event.t1) return null;
  const duration = event.t1-event.t0;
  const a = Math.min(fadeIn, duration/2), b = Math.min(fadeOut, duration/2);
  return {
    u:(t-event.t0)/duration,
    opacity:Math.min(a ? smooth((t-event.t0)/a) : 1, b ? smooth((event.t1-t)/b) : 1)
  };
}

/**
 * source: decoded image/canvas in native pixel dimensions.
 * warp({x,y,width,height,u,action}) -> [deformedX,deformedY] in source pixels.
 * event.{x,y,width,height}: destination image box, in caller's canvas units.
 * Returned bounds include the full padded layer; the caller checks scene collisions.
 */
export function createCameoLayer(source, {columns=12, rows=16, padding=24, overlap=2}={}) {
  const width = source.naturalWidth || source.width;
  const height = source.naturalHeight || source.height;
  for (const [name,n] of Object.entries({width,height,columns,rows,padding,overlap})) finite(n,name);
  if (![width,height,columns,rows,padding].every(Number.isInteger) ||
      width <= 0 || height <= 0 || columns < 1 || rows < 1 || padding < 0 || overlap < 0)
    throw new RangeError('invalid image or mesh dimensions');
  const layer = document.createElement('canvas');
  layer.width = width+2*padding; layer.height = height+2*padding;
  const mesh = layer.getContext('2d');
  const vertices = [], triangles = [];
  for (let j=0; j<=rows; j++) for (let i=0; i<=columns; i++)
    vertices.push([i*width/columns,j*height/rows]);
  for (let j=0; j<rows; j++) for (let i=0; i<columns; i++) {
    const a=j*(columns+1)+i, b=a+1, c=a+columns+1, d=c+1;
    triangles.push([a,b,d],[a,d,c]);
  }
  function triangle(src,dst) {
    const [p,q,r]=src, [a,b,d]=dst;
    const det=(q[0]-p[0])*(r[1]-p[1])-(r[0]-p[0])*(q[1]-p[1]);
    const area=(b[0]-a[0])*(d[1]-a[1])-(d[0]-a[0])*(b[1]-a[1]);
    if (area <= 1e-8) throw new RangeError('warp folds or collapses a mesh triangle');
    const A=((b[0]-a[0])*(r[1]-p[1])-(d[0]-a[0])*(q[1]-p[1]))/det;
    const B=((b[1]-a[1])*(r[1]-p[1])-(d[1]-a[1])*(q[1]-p[1]))/det;
    const C=((d[0]-a[0])*(q[0]-p[0])-(b[0]-a[0])*(r[0]-p[0]))/det;
    const D=((d[1]-a[1])*(q[0]-p[0])-(b[1]-a[1])*(r[0]-p[0]))/det;
    const cx=(a[0]+b[0]+d[0])/3, cy=(a[1]+b[1]+d[1])/3;
    mesh.save();
    mesh.beginPath();
    for (let i=0;i<3;i++) {
      const v=dst[i], dx=v[0]-cx, dy=v[1]-cy, len=Math.hypot(dx,dy);
      const x=v[0]+padding+dx/len*overlap, y=v[1]+padding+dy/len*overlap;
      if (i) mesh.lineTo(x,y); else mesh.moveTo(x,y);
    }
    mesh.closePath(); mesh.clip();
    mesh.transform(A,B,C,D,a[0]+padding-A*p[0]-C*p[1],a[1]+padding-B*p[0]-D*p[1]);
    mesh.drawImage(source,0,0); mesh.restore();
  }
  return {
    draw(ctx,t,event,warp=({x,y})=>[x,y]) {
      const state=cameoState(t,event);
      if (!state) return null;
      const deformed=vertices.map(([x,y])=>{
        const v=warp({x,y,width,height,u:state.u,action:event.action});
        if (!Array.isArray(v) || v.length!==2 || !v.every(Number.isFinite))
          throw new TypeError('warp must return two finite coordinates');
        if (v[0]<-padding || v[0]>width+padding || v[1]<-padding || v[1]>height+padding)
          throw new RangeError('warp exceeds layer padding');
        return v;
      });
      mesh.clearRect(0,0,layer.width,layer.height);
      for (const ids of triangles) triangle(ids.map(i=>vertices[i]),ids.map(i=>deformed[i]));
      const sx=event.width/width, sy=event.height/height;
      const x=event.x-padding*sx, y=event.y-padding*sy;
      const w=layer.width*sx, h=layer.height*sy;
      ctx.save();
      try {
        // Apply opacity only once to the assembled mesh, preserving caller opacity.
        ctx.globalAlpha *= state.opacity;
        ctx.drawImage(layer,x,y,w,h);
      } finally { ctx.restore(); }
      return {...state,bounds:{x0:x,y0:y,x1:x+w,y1:y+h}};
    }
  };
}

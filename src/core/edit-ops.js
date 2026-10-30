import {lineLine} from '../survey/calculations.js';
export const movePts=(pts,de,dn)=>pts.map(p=>({e:p.e+de,n:p.n+dn}));
// Rotation angle is clockwise in degrees (azimuth sense), about centre c.
export const rotatePts=(pts,c,deg)=>{const t=deg*Math.PI/180,s=Math.sin(t),k=Math.cos(t);return pts.map(p=>{const x=p.e-c.e,y=p.n-c.n;return{e:c.e+x*k+y*s,n:c.n-x*s+y*k}})};
// Parallel offset with mitred corners. d > 0 = right of the drawing direction, d < 0 = left.
export function offsetPolyline(pts,d,closed=false){const n=pts.length,segs=[],m=closed?n:n-1;if(n<2||!d)return null;
 for(let i=0;i<m;i++){const a=pts[i],b=pts[(i+1)%n],L=Math.hypot(b.e-a.e,b.n-a.n);if(!L)continue;const nx=(b.n-a.n)/L*d,ny=-(b.e-a.e)/L*d;segs.push({a:{e:a.e+nx,n:a.n+ny},b:{e:b.e+nx,n:b.n+ny}})}
 if(!segs.length)return null;const out=[];if(!closed)out.push(segs[0].a);
 for(let k=0;k<segs.length-(closed?0:1);k++){const s=segs[k],t=segs[(k+1)%segs.length],X=lineLine(s.a,s.b,t.a,t.b);
  out.push(X&&Math.hypot(X.e-s.b.e,X.n-s.b.n)<=10*Math.abs(d)+1e-9?{e:X.e,n:X.n}:{e:(s.b.e+t.a.e)/2,n:(s.b.n+t.a.n)/2})}
 if(!closed)out.push(segs[segs.length-1].b);return out}

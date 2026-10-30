// Horizontal alignment from PIs (points of intersection) with circular fillet curves. No spirals, no vertical curves.
// Conventions: azimuth clockwise from grid North; offset positive = RIGHT of the direction of increasing chainage.
const D2R=Math.PI/180,n360=a=>((a%360)+360)%360,n180=a=>{a=n360(a);return a>180?a-360:a},azOf=(a,b)=>n360(Math.atan2(b.e-a.e,b.n-a.n)/D2R);
export function buildAlignment(pis,radii=[],start=0){const errors=[],warn=[];if(pis.length<2)return{errors:['At least 2 PIs are needed']};
 const legs=[];for(let i=0;i<pis.length-1;i++){const len=Math.hypot(pis[i+1].e-pis[i].e,pis[i+1].n-pis[i].n);if(!(len>1e-9))errors.push(`PI ${i+1} and PI ${i+2} coincide`);legs.push({len,az:azOf(pis[i],pis[i+1])})}
 if(errors.length)return{errors};const curves=[];
 for(let i=1;i<pis.length-1;i++){const R=radii[i]||0;if(!(R>0))continue;const dl=n180(legs[i].az-legs[i-1].az);
  if(Math.abs(dl)<1e-9){warn.push(`PI ${i+1}: straight through, radius ignored`);continue}if(Math.abs(Math.abs(dl)-180)<1e-6){errors.push(`PI ${i+1}: 180° reversal cannot be filleted`);continue}
  curves[i]={R,dl,T:R*Math.tan(Math.abs(dl)*D2R/2),L:R*Math.abs(dl)*D2R}}
 for(let k=0;k<legs.length;k++){const t0=curves[k]?curves[k].T:0,t1=curves[k+1]?curves[k+1].T:0;if(t0+t1>legs[k].len+1e-9)errors.push(`Leg PI ${k+1}-PI ${k+2} is ${legs[k].len.toFixed(3)} long but needs tangents ${t0.toFixed(3)} + ${t1.toFixed(3)}: reduce a radius`)}
 if(errors.length)return{errors,warn};
 const el=[];let ch=start,cur=pis[0];
 for(let k=0;k<legs.length;k++){const a=legs[k].az*D2R,T=curves[k+1]?curves[k+1].T:0,p1={e:pis[k+1].e-Math.sin(a)*T,n:pis[k+1].n-Math.cos(a)*T},len=Math.hypot(p1.e-cur.e,p1.n-cur.n);
  if(len>1e-9){el.push({type:'line',ch0:ch,ch1:ch+len,p0:cur,p1,az:legs[k].az});ch+=len}
  const c=curves[k+1];if(c){const d=c.dl>0?1:-1,az0=legs[k].az,az1=legs[k+1].az,cen={e:p1.e+c.R*Math.sin((az0+d*90)*D2R),n:p1.n+c.R*Math.cos((az0+d*90)*D2R)},ct={e:pis[k+1].e+Math.sin(az1*D2R)*c.T,n:pis[k+1].n+Math.cos(az1*D2R)*c.T};
   el.push({type:'arc',ch0:ch,ch1:ch+c.L,p0:p1,p1:ct,az0,az1,R:c.R,dir:d,center:cen,delta:Math.abs(c.dl),T:c.T,pi:pis[k+1]});ch+=c.L;cur=ct}else cur=pis[k+1]}
 return{elements:el,start,end:ch,length:ch-start,errors:[],warn,pis,curves,legs}}
// Position and tangent azimuth at chainage; null outside the alignment (no extrapolation).
export function pointAt(al,ch){const el=al.elements.find(x=>ch>=x.ch0-1e-9&&ch<=x.ch1+1e-9);if(!el)return null;const s=Math.max(0,Math.min(el.ch1-el.ch0,ch-el.ch0));
 if(el.type=='line'){const t=s/(el.ch1-el.ch0);return{e:el.p0.e+t*(el.p1.e-el.p0.e),n:el.p0.n+t*(el.p1.n-el.p0.n),az:el.az}}
 const sw=el.dir*s/el.R/D2R,ra=el.az0-el.dir*90+sw;return{e:el.center.e+el.R*Math.sin(ra*D2R),n:el.center.n+el.R*Math.cos(ra*D2R),az:n360(el.az0+sw)}}
export const offsetPoint=(p,off)=>({e:p.e+off*Math.cos(p.az*D2R),n:p.n-off*Math.sin(p.az*D2R)});
export function keyStations(al){const k=[{label:'START',ch:al.start}];al.elements.forEach(e=>{if(e.type=='arc'){k.push({label:'TC',ch:e.ch0});k.push({label:'CT',ch:e.ch1})}});k.push({label:'END',ch:al.end});return k}
// Nearest chainage/offset of a point. Arcs only count inside their sweep; line ends clamp (flagged "beyond").
export function stationOffset(al,p){let best=null;for(const el of al.elements){let c;
  if(el.type=='line'){const dx=el.p1.e-el.p0.e,dy=el.p1.n-el.p0.n,L2=dx*dx+dy*dy,t0=((p.e-el.p0.e)*dx+(p.n-el.p0.n)*dy)/L2,t=Math.max(0,Math.min(1,t0)),q={e:el.p0.e+t*dx,n:el.p0.n+t*dy},dist=Math.hypot(p.e-q.e,p.n-q.n),cr=dx*(p.n-el.p0.n)-dy*(p.e-el.p0.e);
   c={ch:el.ch0+t*Math.sqrt(L2),off:dist*(cr>0?-1:1),dist,clamped:t0<0||t0>1}}
  else{const ang=n360(Math.atan2(p.e-el.center.e,p.n-el.center.n)/D2R),rel=n360(el.dir*(ang-n360(el.az0-el.dir*90)));if(rel>el.delta+1e-9)continue;
   const d=Math.hypot(p.e-el.center.e,p.n-el.center.n),off=el.dir>0?el.R-d:d-el.R;c={ch:el.ch0+rel*D2R*el.R,off,dist:Math.abs(off),clamped:false}}
  if(!best||c.dist<best.dist)best=c}
 if(!best)return null;const f=pointAt(al,best.ch);return{...best,e:f.e,n:f.n,beyond:best.clamped&&(best.ch<=al.start+1e-9||best.ch>=al.end-1e-9)}}
// Polyline approximating the alignment: arcs subdivided so the chord sag is <= maxSag.
export function alignmentPolyline(al,maxSag=0.005){const out=[al.elements[0].p0];for(const el of al.elements){if(el.type=='line')out.push(el.p1);else{const dA=2*Math.acos(Math.max(0,1-maxSag/el.R)),n=Math.max(2,Math.ceil(el.delta*D2R/dA));
  for(let i=1;i<=n;i++){const p=pointAt(al,el.ch0+(el.ch1-el.ch0)*i/n);out.push({e:p.e,n:p.n})}}}return out}

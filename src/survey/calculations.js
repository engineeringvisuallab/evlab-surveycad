import {dist,azimuth,fromPolar,polyArea,perimeter} from '../core/geometry.js';
export {dist,azimuth,fromPolar,polyArea,perimeter};
export const toDMS=(d)=>{let s=Math.round(d*3600*100)/100;const D=Math.floor(s/3600);s-=D*3600;const M=Math.floor(s/60);s=s-M*60;return `${D}°${String(M).padStart(2,'0')}'${s.toFixed(0).padStart(2,'0')}"`};
// Quadrant (reduced) bearing from azimuth, e.g. 135° -> S 45°00'00" E
export function bearingText(az){const a=((az%360)+360)%360;let q,v;
 if(a<=90){q=['N','E'];v=a}else if(a<=180){q=['S','E'];v=180-a}else if(a<=270){q=['S','W'];v=a-180}else{q=['N','W'];v=360-a}
 return `${q[0]} ${toDMS(v)} ${q[1]}`}
export function inverse(a,b){const dE=b.e-a.e,dN=b.n-a.n,h=Math.hypot(dE,dN),dz=(a.z!=null&&b.z!=null)?b.z-a.z:null;
 return{dE,dN,dz,hd:h,az:h?azimuth(a,b):null,sd:dz===null?null:Math.hypot(h,dz),grad:dz!==null&&h?dz/h*100:null}}
// Intersections. t,u are parameters along each segment (0..1 inside the segment).
export function lineLine(p1,p2,p3,p4){const d1={e:p2.e-p1.e,n:p2.n-p1.n},d2={e:p4.e-p3.e,n:p4.n-p3.n},den=d1.e*d2.n-d1.n*d2.e;if(Math.abs(den)<1e-12*Math.max(1,Math.hypot(d1.e,d1.n)*Math.hypot(d2.e,d2.n)))return null;
 const w={e:p3.e-p1.e,n:p3.n-p1.n},t=(w.e*d2.n-w.n*d2.e)/den,u=(w.e*d1.n-w.n*d1.e)/den;return{e:p1.e+t*d1.e,n:p1.n+t*d1.n,t,u,onBoth:t>=0&&t<=1&&u>=0&&u<=1}}
export function lineCircle(p1,p2,c,r){const d={e:p2.e-p1.e,n:p2.n-p1.n},f={e:p1.e-c.e,n:p1.n-c.n},a=d.e*d.e+d.n*d.n,b=2*(f.e*d.e+f.n*d.n),cc=f.e*f.e+f.n*f.n-r*r,disc=b*b-4*a*cc;if(!(a>0)||disc<-1e-9*Math.max(1,b*b))return[];
 const s=Math.sqrt(Math.max(0,disc)),ts=s<1e-9*Math.max(1,Math.abs(b))?[-b/(2*a)]:[(-b-s)/(2*a),(-b+s)/(2*a)];return ts.map(t=>({e:p1.e+t*d.e,n:p1.n+t*d.n,t,onSegment:t>=0&&t<=1}))}

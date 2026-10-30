// Printable drawing sheet (SVG, millimetres). Paper position = model offset from drawing centre x (mm per unit / scale).
import {parseRules,DEFAULT_RULES,SHAPES,pointStyle} from '../survey/feature-codes.js';
export const SIZES={A4:[210,297],A3:[297,420],A2:[420,594],A1:[594,841]};
export const STD=[100,200,250,500,1000,2000,2500,5000,10000,20000,25000,50000];
export const pageSize=(s,o)=>{const[a,b]=SIZES[s]||SIZES.A3;return o=='portrait'?[a,b]:[b,a]};
export const niceNum=x=>{const p=Math.pow(10,Math.floor(Math.log10(x))),f=x/p;return(f<1.5?1:f<3.5?2:f<7.5?5:10)*p};
export function chooseScale(w,h,vw,vh,mmu){for(const N of STD){const k=mmu/N;if(w*k<=vw*.9&&h*k<=vh*.9)return N}return null}
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fit=(s,w,fs)=>{s=String(s??'');const m=Math.floor(w/(fs*.55));return s.length>m?s.slice(0,Math.max(1,m-3))+'...':s};
const f3=v=>+Number(v).toFixed(3);
export function buildSheet(P,o={}){
 const[W,H]=pageSize(o.size||'A3',o.orient||'landscape'),M=10,TB=30,RP=50,warn=[],fx=M,fy=M,fw=W-2*M,fh=H-2*M,vx=fx,vy=fy,vw=fw-RP,vh=fh-TB;
 const mmu=P.units=='ft'?304.8:1000,sz=P.symSize||1,ents=P.entities||[],R=parseRules(P.rules||DEFAULT_RULES).rules;
 const all=[...P.points,...ents.flatMap(e=>e.pts)];if(!all.length)return{err:'Nothing to draw: the project has no points or CAD objects.'};
 const E=all.map(p=>p.e),Nn=all.map(p=>p.n),x0=Math.min(...E),x1=Math.max(...E),y0=Math.min(...Nn),y1=Math.max(...Nn),w=x1-x0,h=y1-y0,cE=(x0+x1)/2,cN=(y0+y1)/2;
 let scale=Number(o.scale)||0;if(!scale){scale=chooseScale(w,h,vw,vh,mmu);if(!scale){scale=STD[STD.length-1];warn.push('Drawing is larger than the sheet even at 1:'+scale+'.')}}
 const k=mmu/scale;if(w*k>vw||h*k>vh)warn.push(`Drawing does not fit at 1:${scale}: it is clipped. Use a smaller scale, a larger sheet or another orientation.`);
 const X=e=>vx+vw/2+(e-cE)*k,Y=n=>vy+vh/2-(n-cN)*k;let b='';
 // coordinate grid ticks, crosses and labels
 const gi=niceNum(40/k),eL=cE-vw/2/k,eR=cE+vw/2/k,nB=cN-vh/2/k,nT=cN+vh/2/k,dec=gi<1?2:0;let g='';
 for(let i=Math.ceil(eL/gi);i<=Math.floor(eR/gi);i++){const e=i*gi,x=f3(X(e));g+=`<line x1="${x}" y1="${vy}" x2="${x}" y2="${vy+3}"/><line x1="${x}" y1="${vy+vh}" x2="${x}" y2="${vy+vh-3}"/><text x="${x}" y="${vy+6.5}" font-size="2.2" text-anchor="middle" stroke="none" fill="#444">E ${e.toFixed(dec)}</text>`;
  for(let j=Math.ceil(nB/gi);j<=Math.floor(nT/gi);j++){const y=f3(Y(j*gi));g+=`<path d="M${x-1.5} ${y}H${+x+1.5}M${x} ${y-1.5}V${+y+1.5}" stroke="#999" stroke-width=".15"/>`}}
 for(let j=Math.ceil(nB/gi);j<=Math.floor(nT/gi);j++){const n=j*gi,y=f3(Y(n));g+=`<line x1="${vx}" y1="${y}" x2="${vx+3}" y2="${y}"/><line x1="${vx+vw}" y1="${y}" x2="${vx+vw-3}" y2="${y}"/><text x="${vx+4}" y="${+y+.8}" font-size="2.2" stroke="none" fill="#444">N ${n.toFixed(dec)}</text>`}
 // drawing content (clipped to viewport)
 let c='';for(const e of ents){const a=e.pts,col=e.color||'#000';
  if(e.type=='text')c+=`<text x="${f3(X(a[0].e))}" y="${f3(Y(a[0].n))}" font-size="${f3(Math.max(1.8,e.h*k))}" fill="${col}" stroke="none">${esc(e.text)}</text>`;
  else{c+=`<${e.closed?'polygon':'polyline'} points="${a.map(p=>f3(X(p.e))+','+f3(Y(p.n))).join(' ')}" fill="none" stroke="${e.type=='dim'?'#2a9a3c':col}" stroke-width=".25"/>`;
   if(e.type=='dim')c+=`<text x="${f3(X((a[0].e+a[1].e)/2))}" y="${f3(Y((a[0].n+a[1].n)/2))}" font-size="${f3(Math.max(1.8,e.h*k))}" fill="#2a9a3c" stroke="none">${Math.hypot(a[1].e-a[0].e,a[1].n-a[0].n).toFixed(3)}</text>`}}
 const usedSym=new Map();
 for(const p of P.points){const st=pointStyle(R,p),px=X(p.e),py=Y(p.n),r=Math.max(1.2,sz*k),sh=SHAPES[st.shape]||SHAPES.dot;if(st.shape!='dot'||R.has((p.code||'').toUpperCase()))usedSym.set(st.shape+st.color+p.code,{st,code:p.code});
  c+=`<g stroke="${st.color}" stroke-width=".25" fill="none">`+sh.c.map(([x,y,q])=>`<circle cx="${f3(px+x*r)}" cy="${f3(py-y*r)}" r="${f3(q*r)}"/>`).join('')+sh.l.map(([a,b2,d,e2])=>`<line x1="${f3(px+a*r)}" y1="${f3(py-b2*r)}" x2="${f3(px+d*r)}" y2="${f3(py-e2*r)}"/>`).join('')+'</g>';
  if(o.labels!='none'){c+=`<text x="${f3(px+r+.6)}" y="${f3(py-r*.4)}" font-size="2.2" fill="#000" stroke="none">${esc(p.id)}</text>`;if(o.labels=='idrl'&&p.z!=null)c+=`<text x="${f3(px+r+.6)}" y="${f3(py+r+1.2)}" font-size="1.8" fill="#555" stroke="none">${p.z.toFixed(2)}</text>`}}
 b+=`<defs><clipPath id="vp"><rect x="${vx}" y="${vy}" width="${vw}" height="${vh}"/></clipPath></defs><g clip-path="url(#vp)">${c}</g><g stroke="#000" stroke-width=".2">${g}</g>`;
 // frame, viewport border, title block
 b+=`<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="none" stroke="#000" stroke-width=".7"/><rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="none" stroke="#000" stroke-width=".35"/>`;
 const ty=vy+vh,rh=TB/2,cells=[[[fx,ty,fw*.6,rh,'TITLE',o.title||P.name||'Untitled',5],[fx+fw*.6,ty,fw*.2,rh,'DRAWING NO.',o.drawingNo||'',4],[fx+fw*.8,ty,fw*.2,rh,'REVISION',o.revision||'',4]],
  [[fx,ty+rh,fw*.4,rh,'PROJECT',P.name||'',3.5],[fx+fw*.4,ty+rh,fw*.15,rh,'SCALE','1:'+scale,3.5],[fx+fw*.55,ty+rh,fw*.15,rh,'DATE',o.date||new Date().toISOString().slice(0,10),3.5],[fx+fw*.7,ty+rh,fw*.3,rh,'UNITS / CRS',`${P.units||'m'} / ${P.crs||'local (undefined)'}`,3.5]]];
 for(const row of cells)for(const[x,y,cw,ch,l,v,fs]of row)b+=`<rect x="${f3(x)}" y="${f3(y)}" width="${f3(cw)}" height="${ch}" fill="none" stroke="#000" stroke-width=".35"/><text x="${f3(x+1.5)}" y="${f3(y+3)}" font-size="1.8" fill="#666">${l}</text><text x="${f3(x+1.5)}" y="${f3(y+ch-3.5)}" font-size="${fs}" font-weight="bold">${esc(fit(v,cw-3,fs))}</text>`;
 // right panel: north arrow, scale bar, legend
 const px0=vx+vw,pc=px0+RP/2;
 b+=`<polygon points="${pc},${fy+10} ${pc-5},${fy+32} ${pc},${fy+27}" fill="#000"/><polygon points="${pc},${fy+10} ${pc+5},${fy+32} ${pc},${fy+27}" fill="#fff" stroke="#000" stroke-width=".3"/><text x="${pc}" y="${fy+8}" font-size="4" font-weight="bold" text-anchor="middle">N</text><text x="${pc}" y="${fy+37}" font-size="2.2" text-anchor="middle">Grid North</text>`;
 const L=niceNum(25/k),Lp=L*k,bx=pc-Lp/2,by=fy+50;
 for(let i=0;i<4;i++)b+=`<rect x="${f3(bx+i*Lp/4)}" y="${by}" width="${f3(Lp/4)}" height="1.6" fill="${i%2?'#fff':'#000'}" stroke="#000" stroke-width=".25"/>`;
 [0,.5,1].forEach(t=>b+=`<text x="${f3(bx+t*Lp)}" y="${by+5}" font-size="2.2" text-anchor="middle">${f3(L*t)}${t==1?' '+(P.units||'m'):''}</text>`);b+=`<text x="${pc}" y="${by-2}" font-size="2.2" text-anchor="middle">Scale 1:${scale}</text>`;
 const items=[];const seen=new Set();let ch=false;for(const e of ents){const l=e.layer||'CAD';if(l.endsWith('-CH')){ch=true;continue}if(!seen.has(l)&&e.type!='text'){seen.add(l);items.push({k:'line',col:e.color||'#000',t:l})}}
 if(ch)items.push({k:'line',col:'#555',t:'Chainage (km+m)'});const ss=new Set();for(const{st,code}of usedSym.values()){if(!ss.has(code)){ss.add(code);items.push({k:'sym',st,t:code})}}
 const ly=by+14,maxRows=Math.floor((vy+vh-12-ly-6)/5);let lg=`<text x="${px0+3}" y="${ly}" font-size="2.8" font-weight="bold">LEGEND</text>`;
 if(items.length>maxRows)warn.push(`Legend truncated: ${items.length-maxRows} item(s) did not fit.`);
 items.slice(0,Math.max(0,maxRows)).forEach((it,i)=>{const y=ly+6+i*5;if(it.k=='line')lg+=`<line x1="${px0+3}" y1="${y-1}" x2="${px0+13}" y2="${y-1}" stroke="${it.col}" stroke-width=".4"/>`;
  else{const sh=SHAPES[it.st.shape]||SHAPES.dot,r=1.6,cx=px0+8,cy=y-1;lg+=`<g stroke="${it.st.color}" stroke-width=".25" fill="none">`+sh.c.map(([x,yy,q])=>`<circle cx="${cx+x*r}" cy="${cy-yy*r}" r="${q*r}"/>`).join('')+sh.l.map(([a,b2,d,e2])=>`<line x1="${cx+a*r}" y1="${cy-b2*r}" x2="${cx+d*r}" y2="${cy-e2*r}"/>`).join('')+'</g>'}
  lg+=`<text x="${px0+15}" y="${y}" font-size="2.2">${esc(fit(it.t,RP-17,2.2))}</text>`});
 b+=lg+`<text x="${px0+3}" y="${vy+vh-7}" font-size="1.7" fill="#444">Prepared with EVLab SurveyCAD.</text><text x="${px0+3}" y="${vy+vh-4.5}" font-size="1.7" fill="#444">Engineering aid; not legally verified.</text><text x="${px0+3}" y="${vy+vh-2}" font-size="1.7" fill="#444">Verify against survey control.</text>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}" font-family="Arial, Helvetica, sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>${b}</svg>`;
 return{svg,scale,k,warn,W,H,vp:{vx,vy,vw,vh},X,Y,gi}}

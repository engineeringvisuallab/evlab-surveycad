import {SHAPES} from '../survey/feature-codes.js';
// Model (E,N real-world floats) -> screen: sx=(e-cx)*s+w/2 ; sy=h/2-(n-cy)*s. View changes never alter model data.
const segD=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l)):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)};
export class Engine{
 constructor(cv,cb){this.cv=cv;this.c=cv.getContext('2d');this.cb=cb;this.v={cx:0,cy:0,s:1};this.pts=[];this.ents=[];this.sel=null;this.selEnt=null;this.hidden=new Set();this.hiddenL=new Set();
  this.tool='select';this.draft=[];this.snapPt=null;this.mouse=null;
  new ResizeObserver(()=>this.draw()).observe(cv);let drag=null;
  cv.onmousedown=e=>{drag={x:e.offsetX,y:e.offsetY,m:false};if(this.tool=='window'&&!e.shiftKey)this.win={x0:e.offsetX,y0:e.offsetY,x1:e.offsetX,y1:e.offsetY}};
  cv.onmousemove=e=>{let m=this.toModel(e.offsetX,e.offsetY);
   if(this.tool!='select'){this.snapPt=this.snap(e.offsetX,e.offsetY);if(this.snapPt)m=this.snapPt}else this.snapPt=null;this.mouse=m;cb.cursor(m);
   if(this.win&&e.buttons){this.win.x1=e.offsetX;this.win.y1=e.offsetY;this.draw();return}if(drag&&e.buttons){const dx=e.offsetX-drag.x,dy=e.offsetY-drag.y;if(Math.abs(dx)+Math.abs(dy)>3)drag.m=true;
    if(drag.m){this.v.cx-=dx/this.v.s;this.v.cy+=dy/this.v.s;drag.x=e.offsetX;drag.y=e.offsetY}}
   if(drag?.m||this.draft.length||this.tool!='select')this.draw()};
  cv.onmouseup=e=>{if(this.win){this.finishWindow(e.offsetX,e.offsetY);drag=null;return}if(drag&&!drag.m)this.click(e.offsetX,e.offsetY);drag=null};
  cv.ondblclick=()=>this.finish();
  cv.onwheel=e=>{e.preventDefault();const m=this.toModel(e.offsetX,e.offsetY),f=e.deltaY<0?1.2:1/1.2;this.v.s*=f;
   this.v.cx=m.e-(e.offsetX-this.W/2)/this.v.s;this.v.cy=m.n+(e.offsetY-this.H/2)/this.v.s;this.draw()}}
 get W(){return this.cv.clientWidth}get H(){return this.cv.clientHeight}
 toModel(x,y){return{e:(x-this.W/2)/this.v.s+this.v.cx,n:(this.H/2-y)/this.v.s+this.v.cy}}
 toScreen(p){return{x:(p.e-this.v.cx)*this.v.s+this.W/2,y:this.H/2-(p.n-this.v.cy)*this.v.s}}
 visible(){return this.pts.filter(p=>!this.hidden.has(p.code))}
 setTool(t){this.tool=t;this.win=null;this.draft=[];this.snapPt=null;this.cv.style.cursor=t=='select'?'default':'crosshair';this.draw()}
 // Snap to survey points, entity vertices (endpoint) and segment midpoints within 10 px. Returns exact model coords.
 snap(x,y){const cand=[];for(const p of this.visible())cand.push({e:p.e,n:p.n,k:'point'});
  for(const en of this.ents){if(en.type=='fill')continue;en.pts.forEach((p,i)=>{cand.push({e:p.e,n:p.n,k:'endpoint'});const q=en.pts[i+1];if(q&&en.type!='text')cand.push({e:(p.e+q.e)/2,n:(p.n+q.n)/2,k:'midpoint'})})}
  let b=null,bd=10;for(const c of cand){const s=this.toScreen(c),d=Math.hypot(s.x-x,s.y-y);if(d<bd){bd=d;b=c}}return b}
 click(x,y){if(this.tool=='select'||this.tool=='window')return this.pick(x,y);const m=this.snap(x,y)||this.toModel(x,y),p={e:m.e,n:m.n};
  if(this.tool=='text'){const t=prompt('Text:');if(t)this.cb.addEntity({type:'text',pts:[p],text:t,h:12/this.v.s});return this.draw()}
  this.draft.push(p);if((this.tool=='line'||this.tool=='dim')&&this.draft.length==2)this.finish();else this.draw()}
 finish(){const t=this.tool,d=this.draft;this.draft=[];
  if(t=='pline'&&d.length>=2)this.cb.addEntity({type:'pline',pts:d});
  else if(t=='line'&&d.length==2)this.cb.addEntity({type:'line',pts:d});
  else if(t=='dim'&&d.length==2)this.cb.addEntity({type:'dim',pts:d,h:11/this.v.s});this.draw()}
 cancel(){this.draft=[];this.win=null;this.draw()}
 isSel(en){return en===this.selEnt||!!this.multi?.ents.has(en)}
 selList(){return this.multi?[...this.multi.ents]:(this.selEnt?[this.selEnt]:[])}
 finishWindow(x,y){const w=this.win;this.win=null;if(Math.abs(w.x1-w.x0)<5&&Math.abs(w.y1-w.y0)<5)return this.pick(x,y);
  const x0=Math.min(w.x0,w.x1),x1=Math.max(w.x0,w.x1),y0=Math.min(w.y0,w.y1),y1=Math.max(w.y0,w.y1);
  const list=this.ents.filter(en=>en.type!='fill'&&!this.hiddenL?.has(en.layer)&&en.pts.every(p=>{const s=this.toScreen(p);return s.x>=x0&&s.x<=x1&&s.y>=y0&&s.y<=y1}));
  this.sel=null;this.selEnt=null;this.multi=list.length?{ents:new Set(list)}:null;this.cb.windowSelected(list.length);this.draw()}
 fit(){const a=[...this.visible(),...this.ents.flatMap(e=>e.pts)];if(!a.length)return this.draw();const E=a.map(p=>p.e),N=a.map(p=>p.n);
  const x0=Math.min(...E),x1=Math.max(...E),y0=Math.min(...N),y1=Math.max(...N);
  this.v.cx=(x0+x1)/2;this.v.cy=(y0+y1)/2;this.v.s=Math.min(this.W/((x1-x0)||1),this.H/((y1-y0)||1))*0.85;this.draw()}
 pick(x,y){let b=null,bd=10;for(const p of this.visible()){const s=this.toScreen(p),d=Math.hypot(s.x-x,s.y-y);if(d<bd){bd=d;b=p}}
  let be=null;if(!b){bd=7;for(const en of this.ents){if(en.type=='fill')continue;const sp=en.pts.map(p=>this.toScreen(p));
   const d=en.type=='text'?Math.hypot(sp[0].x+20-x,sp[0].y-5-y):Math.min(...sp.slice(1).map((s,i)=>segD({x,y},sp[i],s)));if(d<bd){bd=d;be=en}}}
  this.multi=null;this.sel=b;this.selEnt=be;if(be)this.cb.selectEnt(be);else this.cb.select(b);this.draw()}
 draw(){const r=devicePixelRatio||1,c=this.c;this.cv.width=this.W*r;this.cv.height=this.H*r;c.setTransform(r,0,0,r,0,0);
  const fg=getComputedStyle(document.body).color;c.font='11px sans-serif';this.cb.scale(this.v.s);
  const path=(a,close)=>{c.beginPath();a.forEach((p,i)=>{const s=this.toScreen(p);i?c.lineTo(s.x,s.y):c.moveTo(s.x,s.y)});if(close)c.closePath()};
  const label=(t,p,h,col)=>{const s=this.toScreen(p);c.fillStyle=col;c.font=Math.max(6,h*this.v.s)+'px sans-serif';c.fillText(t,s.x,s.y);c.font='11px sans-serif'};
  for(const en of this.ents){if(en.type=='fill'&&!this.hiddenL?.has(en.layer)){path(en.pts,true);c.fillStyle=en.color;c.globalAlpha=.55;c.fill();c.globalAlpha=1}}
  for(const en of this.ents){if(en.type=='fill'||this.hiddenL?.has(en.layer))continue;const on=this.isSel(en),col=on?'#e33':en.color||(en.type=='dim'?'#2a9a3c':fg);c.strokeStyle=col;c.lineWidth=on?2.5:1.2;
   if(en.type=='text')label(en.text,en.pts[0],en.h,col);else{path(en.pts,en.closed);c.stroke();
    if(en.type=='dim'){const[a,b]=en.pts;label(Math.hypot(b.e-a.e,b.n-a.n).toFixed(3),{e:(a.e+b.e)/2,n:(a.n+b.n)/2},en.h,col)}}}
  for(const p of this.visible()){const s=this.toScreen(p),on=p===this.sel;if(s.x<-20||s.y<-20||s.x>this.W+20||s.y>this.H+20)continue;
   const st=this.symOf?this.symOf(p):{shape:'dot',color:'#2a7de1'},R=Math.max(on?6:4,(this.symSize||1)*this.v.s),sh=SHAPES[st.shape]||SHAPES.dot;c.strokeStyle=on?'#e33':st.color;c.lineWidth=on?2.5:1.4;c.beginPath();for(const[x,y,r]of sh.c){c.moveTo(s.x+(x+r)*R,s.y-y*R);c.arc(s.x+x*R,s.y-y*R,r*R,0,7)}for(const[a,b,d,e2]of sh.l){c.moveTo(s.x+a*R,s.y-b*R);c.lineTo(s.x+d*R,s.y-e2*R)}c.stroke();
   c.fillStyle=fg;c.fillText(p.id,s.x+7,s.y-6)}
  if(this.win){const w=this.win;c.strokeStyle='#08c';c.setLineDash([4,3]);c.lineWidth=1;c.strokeRect(w.x0,w.y0,w.x1-w.x0,w.y1-w.y0);c.setLineDash([])}
  if(this.draft.length&&this.mouse){c.strokeStyle='#e80';c.setLineDash([5,4]);c.lineWidth=1;path([...this.draft,this.mouse]);c.stroke();c.setLineDash([])}
  if(this.snapPt){const s=this.toScreen(this.snapPt);c.strokeStyle='#e80';c.lineWidth=2;c.strokeRect(s.x-5,s.y-5,10,10);c.fillStyle='#e80';c.fillText(this.snapPt.k,s.x+8,s.y+14)}}
}

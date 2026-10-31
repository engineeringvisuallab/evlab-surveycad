// DXF (ASCII) import for a defined subset: POINT, LINE, LWPOLYLINE (bulges expanded), POLYLINE/VERTEX, TEXT, MTEXT (formatting stripped), CIRCLE, ARC.
// Everything else is counted in `unsupported` and reported, never silently dropped. Arcs and circles become polylines (sag <= 0.005 units).
const D2R=Math.PI/180,ACI={1:'#d00000',2:'#c8a000',3:'#00a000',4:'#00a0a0',5:'#0000d0',6:'#b000b0',7:'#000000',8:'#808080',9:'#b0b0b0'};
export function arcPoints(cx,cy,r,a0deg,sweepDeg,sag=0.005){const dA=Math.max(0.5*D2R,Math.min(10*D2R,2*Math.acos(Math.max(0,1-sag/Math.max(r,1e-9))))),n=Math.min(720,Math.max(2,Math.ceil(Math.abs(sweepDeg)*D2R/dA))),out=[];
 for(let i=0;i<=n;i++){const a=(a0deg+sweepDeg*i/n)*D2R;out.push({e:cx+r*Math.cos(a),n:cy+r*Math.sin(a)})}return out}
function bulgeArc(p,q,b){const th=4*Math.atan(b),c=Math.hypot(q.e-p.e,q.n-p.n);if(!c||!b)return[];const dx=(q.e-p.e)/c,dy=(q.n-p.n)/c,h=(c/2)/Math.tan(th/2),cx=(p.e+q.e)/2-dy*h,cy=(p.n+q.n)/2+dx*h,r=Math.hypot(p.e-cx,p.n-cy);
 return arcPoints(cx,cy,r,Math.atan2(p.n-cy,p.e-cx)/D2R,th/D2R).slice(1,-1)}
export function parseDXF(text){const R={ents:[],points:[],supported:{},unsupported:{},layers:{},warnings:[],errors:[],units:null};
 if(/^\s*AutoCAD Binary DXF/.test(text)){R.errors.push('Binary DXF is not supported: save the drawing as ASCII DXF');return R}
 if(/^AC10\d\d/.test(text)){R.errors.push('This is a DWG file, not DXF. Save or convert it as ASCII DXF first');return R}
 const L=text.split(/\r?\n/),pr=[];for(let i=0;i+1<L.length;i+=2){const c=parseInt(L[i].trim(),10);if(Number.isNaN(c)){R.errors.push(`Line ${i+1}: expected a numeric group code, found "${L[i].trim().slice(0,20)}". Is this an ASCII DXF file?`);return R}pr.push([c,L[i+1].trim()])}
 if(!pr.some(x=>x[0]==0&&x[1]=='SECTION')){R.errors.push('No SECTION found: this is not an ASCII DXF file');return R}
 let sec='',lcol={},items=[],cur=null;
 for(let i=0;i<pr.length;i++){const[c,v]=pr[i];
  if(c==0&&v=='SECTION'){sec=pr[i+1]?.[1]||'';continue}if(c==0&&v=='ENDSEC'){sec='';cur=null;continue}
  if(sec=='HEADER'&&c==9&&v=='$INSUNITS'&&pr[i+1])R.units=Number(pr[i+1][1]);
  if(sec=='TABLES'){if(c==0){cur=v=='LAYER'?{n:'',col:7}:null;if(cur)items.push(cur)}else if(cur){if(c==2)cur.n=v;if(c==62)cur.col=Number(v)}}
  if(sec=='ENTITIES'){if(c==0){cur={t:v,g:[]};R.ents.push(cur)}else if(cur)cur.g.push([c,v])}}
 for(const l of items)if(l.n)lcol[l.n]=ACI[Math.abs(l.col)]||'#444444';
 const get=(g,c)=>g.find(x=>x[0]==c)?.[1],num=(g,c,d=0)=>{const v=get(g,c);return v===undefined?d:Number(v)},out=[];let rotText=0;
 const add=(t,e)=>{R.supported[t]=(R.supported[t]||0)+1;const ly=e.layer||'0';R.layers[ly]=(R.layers[ly]||0)+1;out.push({...e,layer:ly,color:lcol[ly]||'#000000',src:'dxf'})};
 const list=R.ents;R.ents=out;
 for(let i=0;i<list.length;i++){const{t,g}=list[i],layer=get(g,8);
  if(t=='LINE')add(t,{type:'line',layer,pts:[{e:num(g,10),n:num(g,20)},{e:num(g,11),n:num(g,21)}]});
  else if(t=='LWPOLYLINE'){const vs=[];for(const[c,v]of g){if(c==10)vs.push({e:Number(v),n:0,b:0});else if(c==20&&vs.length)vs[vs.length-1].n=Number(v);else if(c==42&&vs.length)vs[vs.length-1].b=Number(v)}
   const closed=(num(g,70)&1)==1,pts=[];vs.forEach((p,k)=>{pts.push({e:p.e,n:p.n});const q=vs[k+1]||(closed?vs[0]:null);if(p.b&&q)pts.push(...bulgeArc(p,q,p.b))});
   if(vs.some(p=>p.b))R.warnings.push('LWPOLYLINE arcs (bulges) were converted to short straight segments');if(vs.length<2)R.warnings.push('LWPOLYLINE with fewer than 2 vertices skipped');else add(t,{type:'pline',layer,closed,pts})}
  else if(t=='POLYLINE'){const vs=[],flags=num(g,70);let j=i+1;while(j<list.length&&list[j].t=='VERTEX'){vs.push({e:num(list[j].g,10),n:num(list[j].g,20)});j++}if(j<list.length&&list[j].t=='SEQEND')j++;
   if(flags&(16|32|64))R.unsupported['POLYLINE (mesh)']=(R.unsupported['POLYLINE (mesh)']||0)+1;else if(vs.length<2)R.warnings.push('POLYLINE with fewer than 2 vertices skipped');else{if(flags&8)R.warnings.push('3D POLYLINE imported in plan (RL ignored)');add(t,{type:'pline',layer,closed:(flags&1)==1,pts:vs})}i=j-1}
  else if(t=='VERTEX'||t=='SEQEND')continue;
  else if(t=='POINT'){const z=get(g,30);R.points.push({e:num(g,10),n:num(g,20),z:z===undefined?null:Number(z),layer:layer||'0'});R.supported[t]=(R.supported[t]||0)+1}
  else if(t=='TEXT'||t=='MTEXT'){let s=t=='TEXT'?(get(g,1)||''):g.filter(x=>x[0]==3||x[0]==1).map(x=>x[1]).join('');if(t=='MTEXT')s=s.replace(/\\P/g,' ').replace(/\\[A-Za-z][^;]*;/g,'').replace(/[{}]/g,'');
   if(num(g,50)||0)rotText++;if(s.trim())add(t,{type:'text',layer,text:s,h:num(g,40,1)||1,pts:[{e:num(g,10),n:num(g,20)}]})}
  else if(t=='CIRCLE'){const r=num(g,40);if(r>0)add(t,{type:'pline',layer,closed:true,pts:arcPoints(num(g,10),num(g,20),r,0,360).slice(0,-1)});else R.warnings.push('CIRCLE with radius 0 skipped')}
  else if(t=='ARC'){const r=num(g,40),a0=num(g,50),a1=num(g,51);let sw=a1-a0;if(sw<=0)sw+=360;if(r>0)add(t,{type:'pline',layer,closed:false,pts:arcPoints(num(g,10),num(g,20),r,a0,sw)});else R.warnings.push('ARC with radius 0 skipped')}
  else R.unsupported[t]=(R.unsupported[t]||0)+1}
 if(rotText)R.warnings.push(`${rotText} text object(s) are rotated in the DXF: rotation is ignored`);
 R.warnings.push(R.units?`DXF header units code is ${R.units} (1 = inches, 2 = feet, 4 = mm, 6 = metres): coordinates are imported as they are, with NO unit conversion`:'DXF has no unit code: coordinates are imported as they are, with NO unit conversion');
 return R}

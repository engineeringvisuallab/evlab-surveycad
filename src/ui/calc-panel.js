import {inverse,bearingText,toDMS,polyArea,perimeter,fromPolar,dist,lineLine,lineCircle} from '../survey/calculations.js';
import {reduce} from '../survey/leveling.js';
import {bowditch} from '../survey/traverse.js';
import {table,page} from '../reports/report.js';
const $=id=>document.getElementById(id);const f=(v,n=3)=>v==null?'–':Number(v).toFixed(n);
const lines=t=>t.split(/\r?\n/).map(l=>l.trim()).filter(l=>l&&!l.startsWith('#')).map(l=>l.split(/[,\t;]+/).map(x=>x.trim()));
const N=s=>s===undefined||s===''?null:(isFinite(Number(s))?Number(s):NaN);
export function initCalc({P,log}){let mode='inv',last='';
 const byId=id=>P().points.find(p=>p.id===id);
 const M={
  inv:{h:'Inverse: one pair per line: IDfrom,IDto. Uses project points. Azimuth is clockwise from grid North.',s:'1,2\n2,3',run(t){const R=[];for(const[a,b]of lines(t)){const A=byId(a),B=byId(b);if(!A||!B){R.push([a,b,'point not found']);continue}
    const i=inverse(A,B);R.push([a,b,f(i.dE),f(i.dN),f(i.hd),i.az==null?'coincident':f(i.az,5)+'° / '+bearingText(i.az),f(i.dz),f(i.sd),f(i.grad,2)])}
    return{title:'Inverse (join) report',html:table(['From','To','dE','dN','Horiz dist','Azimuth / Bearing','dZ','Slope dist','Gradient %'],R),note:'Formulas: HD=√(dE²+dN²); Az=atan2(dE,dN) mod 360; SD=√(HD²+dZ²). Slope distance/gradient only if both RLs exist.'}}},
  fwd:{h:'Forward (polar): IDfrom,azimuthDeg,distance. Results are shown, not added to the project.',s:'1,90,50\n1,45,100',run(t){const R=[];for(const[a,az,d]of lines(t)){const A=byId(a),z=N(az),D=N(d);
    if(!A||!(D>0)||!isFinite(z)){R.push([a,az,d,'invalid input','']);continue}const q=fromPolar(A,z,D);R.push([a,f(z,5),f(D),q.e.toFixed(3),q.n.toFixed(3)])}
    return{title:'Forward (polar) report',html:table(['From','Azimuth°','Distance','Easting','Northing'],R),note:'E2=E1+D·sin(Az); N2=N1+D·cos(Az).'}}},
  area:{h:'Boundary: ordered point IDs on one line (comma separated), ring not repeated.',s:'9,10,6,5',run(t){const ids=lines(t)[0]||[];const pts=ids.map(byId);const bad=ids.filter((_,i)=>!pts[i]);
    if(bad.length||ids.length<3)return{err:bad.length?'Point(s) not found: '+bad.join(', '):'At least 3 points required'};
    const R=pts.map((p,i)=>{const q=pts[(i+1)%pts.length];const a=inverse(p,q);return[p.id,q.id,f(a.hd),f(a.az,5),bearingText(a.az)]});
    return{title:'Boundary report',html:table(['From','To','Distance','Azimuth°','Bearing'],R)+`<p>Area: ${f(polyArea(pts),3)} (units²) &nbsp; Perimeter: ${f(perimeter(pts),3)}</p>`,note:'Shoelace formula on grid coordinates. Not legally verified; check self-intersection visually.'}}},
  lev:{h:'First line: start RL[,closing BM RL]. Then station,BS,IS,FS per line (leave blank). Change point = FS line then BS line, same station name.',s:'100,100.4\nA,1.5,,\nB,,1.2,\nC,,,2.0\nC,1.8,,\nD,,,0.9',run(t){const L=lines(t);const hd=L.shift()||[];const rows=L.map(r=>({st:r[0],bs:N(r[1]),is:N(r[2]),fs:N(r[3])}));
    const R=reduce(rows,N(hd[0]),N(hd[1]));if(R.err&&R.err.length&&!R.out)return{err:R.err.join('; ')};
    const body=table(['Station','BS','IS','FS','Rise','Fall','HI','RL'],R.out.map(o=>[o.st,f(o.bs),f(o.is),f(o.fs),f(o.rise),f(o.fall),f(o.hi),f(o.rl)]))+
     `<p>ΣBS−ΣFS = ${f(R.sBS-R.sFS)} ; ΣRise−ΣFall = ${f(R.sR-R.sF)} ; Last RL − First RL = ${f(R.last-N(hd[0]))} → arithmetic check ${R.ok?'OK':'FAILED'}</p>`+
     (R.closing==null?'<p>No closing benchmark supplied: closing error not computed.</p>':`<p>Closing error = computed − known = ${f(R.closing)} (not adjusted)</p>`)+(R.err.length?`<p style="color:#c00">${R.err.join('<br>')}</p>`:'');
    return{title:'Leveling field book',html:body,note:'HI method: RL=HI−reading; Rise&Fall: Δ=previous reading−reading. Closing error is reported only; no leveling adjustment is performed yet.'}}},
  trv:{h:'Line 1: start E,N and end control E,N (same as start for a loop). Then one leg per line: distance,azimuthDeg.',s:'1000,1000,1000,1000\n100,90\n100,180\n100,270\n100.4,0',run(t){const L=lines(t);const h=(L.shift()||[]).map(N);
    const R=bowditch(isFinite(h[0]+h[1])?{e:h[0],n:h[1]}:null,L.map(l=>({d:N(l[0]),az:N(l[1])})),isFinite(h[2]+h[3])?{e:h[2],n:h[3]}:null);
    if(R.err.length)return{err:R.err.join('; ')};
    const rows=R.adj.map((p,i)=>[i,f(R.raw[i].e),f(R.raw[i].n),f(p.e),f(p.n),i?f(R.res[i-1].cE,4):'',i?f(R.res[i-1].cN,4):'']);
    return{title:'Traverse closure and Bowditch adjustment',html:table(['Stn','Raw E','Raw N','Adj E','Adj N','Corr E (per leg)','Corr N (per leg)'],rows)+
     `<p>Misclosure dE=${f(R.mE,4)} dN=${f(R.mN,4)}; linear misclosure=${f(R.lin,4)}; perimeter=${f(R.perim)}; relative precision = 1 : ${isFinite(R.rel)?Math.round(R.rel):'∞'}</p><p style="color:#a60">${R.w.join('<br>')}</p>`,note:'Compass rule: Ccorr = −misclosure × leg length / total length. Transit rule and angular adjustment not implemented.'}}}};
M.int={h:'Line-line intersection: idA,idB,idC,idD (line A-B and line C-D, infinite lines). Parallel lines have no intersection.',s:'1,3,2,4',run(t){const R=[];for(const[a,b,c,d]of lines(t)){const[A,B,C,D]=[a,b,c,d].map(byId);if(!A||!B||!C||!D){R.push([a,b,c,d,'point not found','','','']);continue}
   const X=lineLine(A,B,C,D);R.push(X?[a,b,c,d,X.e.toFixed(3),X.n.toFixed(3),X.onBoth?'inside both segments':'on the extensions',f(X.t,4)+' / '+f(X.u,4)]:[a,b,c,d,'parallel: none','','',''])}
   return{title:'Line-line intersection',html:table(['A','B','C','D','Easting','Northing','Position','t / u'],R),note:'Solved from the cross-product of the two direction vectors; t,u are fractions along A-B and C-D.'}}};
 M.lc={h:'Line-circle intersection: idA,idB,idCentre,radius. Line A-B is treated as infinite; the table says whether each point lies inside the segment.',s:'1,3,2,25',run(t){const R=[];for(const[a,b,c,r]of lines(t)){const A=byId(a),B=byId(b),C=byId(c),rr=N(r);if(!A||!B||!C||!(rr>0)){R.push([a,b,c,r,'invalid input','','']);continue}
   const X=lineCircle(A,B,C,rr);if(!X.length)R.push([a,b,c,r,'no intersection','','']);X.forEach((p,i)=>R.push([a,b,c,r,p.e.toFixed(3),p.n.toFixed(3),p.onSegment?'inside segment':'on the extension']))}
   return{title:'Line-circle intersection',html:table(['A','B','Centre','Radius','Easting','Northing','Position'],R),note:'Quadratic in the line parameter; a tangent line returns one point.'}}};
 const out=()=>$('cOut'),sel=$('cMode');
 const setMode=m=>{mode=m;$('cHelp').textContent=M[m].h;$('cIn').value=M[m].s;out().innerHTML='';$('cNote').textContent='';last=''};
 sel.onchange=()=>setMode(sel.value);
 $('bCalc').onclick=()=>{setMode(sel.value);$('cdlg').showModal()};
 $('cClose').onclick=()=>$('cdlg').close();
 $('cRun').onclick=()=>{try{const r=M[mode].run($('cIn').value);if(r.err){out().innerHTML=`<p class="e">${r.err}</p>`;log('Calc error: '+r.err,'e');last='';return}
  out().innerHTML=r.html;$('cNote').textContent=r.note;const P0=P();last=page(r.title,r.html+`<p><small>${r.note}</small></p>`,`${P0.name} | units ${P0.units} | CRS ${P0.crs||'local/undefined'} | ${new Date().toISOString().slice(0,10)}`);log(r.title+' computed','o')}
  catch(e){out().innerHTML=`<p class="e">${e.message}</p>`;log('Calc failed: '+e.message,'e')}};
 $('cDl').onclick=()=>{if(!last)return log('Run a calculation first','w');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([last],{type:'text/html'}));a.download='evlab-report-'+mode+'.html';a.click()};
 $('cPr').onclick=()=>{if(!last)return log('Run a calculation first','w');const w=window.open('');w.document.write(last);w.document.close();w.print()};
}

import {buildAlignment,pointAt,offsetPoint,keyStations,stationOffset,alignmentPolyline} from '../survey/alignment.js';
import {stationText} from '../survey/feature-codes.js';
import {bearingText} from '../survey/calculations.js';
import {table,page} from '../reports/report.js';
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
export function initAlignment({P,log,snap,refresh,dirty}){let AL=null,csv='',html='',name='setting-out';
 const show=(h,c,n)=>{$('aOut').innerHTML=h;html=h;if(c!==undefined){csv=c;name=n}};
 const parse=()=>{const pis=[],radii=[],errs=[];$('aPis').value.split(/\r?\n/).forEach((l,i)=>{l=l.trim();if(!l||l[0]=='#')return;const[e,n,r]=l.split(/[,\t;\s]+/).map(x=>x===''||x===undefined?0:Number(x));
   if(!isFinite(e)||!isFinite(n)||!isFinite(r||0))errs.push(`Line ${i+1}: need numeric E,N[,R]`);else{pis.push({e,n});radii.push(r||0)}});
  if(errs.length)return{errs};const al=buildAlignment(pis,radii,Number($('aStart').value)||0);return al.errors.length?{errs:al.errors}:{al}};
 const build=()=>{const r=parse();if(r.errs){AL=null;show('<p class="e">'+r.errs.map(esc).join('<br>')+'</p>');log('Alignment error: '+r.errs[0],'e');return null}
  P().align={pis:$('aPis').value,start:$('aStart').value,step:$('aStep').value,offs:$('aOffs').value};dirty();AL=r.al;return AL};
 $('bAlign').onclick=()=>{const a=P().align;if(a){$('aPis').value=a.pis;$('aStart').value=a.start;$('aStep').value=a.step;$('aOffs').value=a.offs}$('adlg').showModal()};$('aClose').onclick=()=>$('adlg').close();
 const f=(x,n=3)=>x==null?'':Number(x).toFixed(n);
 $('aCalc').onclick=()=>{const al=build();if(!al)return;const step=Number($('aStep').value);if(!(step>0))return show('<p class="e">Interval must be greater than 0.</p>');
  const offs=$('aOffs').value.split(/[,\s]+/).filter(Boolean).map(Number).filter(isFinite),keys=keyStations(al),rows=[];
  for(let c=al.start;c<al.end-1e-9;c+=step)rows.push({ch:c,label:''});rows.push({ch:al.end,label:'END'});
  for(const k of keys){const i=rows.findIndex(r=>Math.abs(r.ch-k.ch)<1e-6);if(i>=0)rows[i].label=k.label;else rows.push({ch:k.ch,label:k.label})}
  rows.sort((a,b)=>a.ch-b.ch);if(rows[0])rows[0].label='START';
  const hd=['Point','Chainage','E','N','Tangent azimuth','Bearing',...offs.flatMap(o=>['E @'+o,'N @'+o])],data=rows.map(r=>{const p=pointAt(al,r.ch);return[r.label||'',stationText(r.ch),f(p.e),f(p.n),f(p.az,5)+'°',bearingText(p.az),...offs.flatMap(o=>{const q=offsetPoint(p,o);return[f(q.e),f(q.n)]})]});
  const cd=al.curves.map((c,i)=>c?[i+1,al.pis[i].e,al.pis[i].n,f(Math.abs(c.dl),4)+'° '+(c.dl>0?'right':'left'),c.R,f(c.T),f(c.L)]:null).filter(Boolean);
  const h=(cd.length?'<h4>Curve data</h4>'+table(['PI','E','N','Deflection','Radius','Tangent T','Arc length L'],cd):'')+'<h4>Setting-out table</h4>'+table(hd,data)+
   `<p>Total length ${f(al.length)} ; start chainage ${stationText(al.start)} ; end chainage ${stationText(al.end)}</p>`+al.warn.map(w=>`<p class="w">${esc(w)}</p>`).join('')+
   '<p class="w">Chainage is along the horizontal alignment. Offset: positive = right, negative = left of the direction of chainage. T = R·tan(Δ/2), L = R·Δ. No spirals or vertical curves. Coordinates must be checked against field control before staking.</p>';
  show(h,hd.join(',')+'\n'+data.map(r=>r.join(',')).join('\n')+'\n','setting-out');log(`Alignment: ${al.elements.length} elements, length ${f(al.length)}`,al.warn.length?'w':'o')};
 $('aDraw').onclick=()=>{const al=build();if(!al)return;snap();const sz=P().symSize||1,step=Number($('aStep').value)||20,E=[],pl=alignmentPolyline(al,0.005);
  E.push({type:'pline',pts:pl.map(p=>({e:p.e,n:p.n})),layer:'ALIGNMENT',color:'#d00000',aci:1,gen:'alignment',src:'ALIGNMENT'});
  if($('aCh').checked){const L=sz*1.5,add=(ch,label)=>{const p=pointAt(al,ch),a=p.az*Math.PI/180,dx=Math.sin(a),dy=Math.cos(a);
    E.push({type:'pline',pts:[{e:p.e-dy*L,n:p.n+dx*L},{e:p.e+dy*L,n:p.n-dx*L}],layer:'ALIGN-CH',color:'#d00000',aci:1,gen:'alignment'});
    E.push({type:'text',pts:[{e:p.e+dy*L*1.2,n:p.n-dx*L*1.2}],text:label,h:sz*1.2,layer:'ALIGN-CH',color:'#d00000',gen:'alignment'})};
   for(let c=al.start;c<al.end-1e-9;c+=step)add(c,stationText(c));add(al.end,'END '+stationText(al.end));for(const k of keyStations(al))if(k.label=='TC'||k.label=='CT')add(k.ch,k.label+' '+stationText(k.ch))}
  P().entities=P().entities.filter(e=>e.gen!=='alignment').concat(E);refresh(true);dirty();show('<p class="o">Alignment drawn on layers ALIGNMENT and ALIGN-CH. It can be chosen as the profile alignment. Arcs are drawn and exported as polylines (sag ≤ 0.005).</p>');log('Alignment drawn (Ctrl+Z to undo)','o')};
 $('aLoc').onclick=()=>{const al=build();if(!al)return;const R=[];for(const l of $('aPts').value.split(/\r?\n/)){const s=l.trim();if(!s)continue;const x=s.split(/[,\t;\s]+/);let p=null;
   if(x.length>=2&&isFinite(Number(x[0]))&&isFinite(Number(x[1])))p={e:Number(x[0]),n:Number(x[1])};else{const q=P().points.find(q=>q.id===x[0]);if(q)p={e:q.e,n:q.n}}
   if(!p){R.push([s,'not found','','','','']);continue}const r=stationOffset(al,p);R.push([s,stationText(r.ch),f(Math.abs(r.off))+(r.off>=0?' R':' L'),f(r.e),f(r.n),r.beyond?'beyond alignment end':'ok'])}
  show(table(['Input','Chainage','Offset','Foot E','Foot N','Note'],R)+'<p class="w">Offset is the shortest distance to the alignment; R = right, L = left of the chainage direction.</p>','Input,Chainage,Offset,FootE,FootN,Note\n'+R.map(r=>r.join(',')).join('\n')+'\n','chainage-offsets')};
 const dl=(n,t,m)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:m}));a.download=n;a.click()};
 $('aCsv').onclick=()=>csv?dl('evlab-'+name+'.csv',csv,'text/csv'):log('Compute a table first','w');
 $('aRep').onclick=()=>html?dl('evlab-'+name+'-report.html',page('Alignment / '+name,html,`${P().name} | units ${P().units} | CRS ${P().crs||'local/undefined'}`),'text/html'):log('Nothing to report yet','w');
}

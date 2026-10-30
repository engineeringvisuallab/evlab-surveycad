import {buildTIN} from '../surface/tin.js';
import {contours} from '../surface/contours.js';
import {profile,crossSections} from '../surface/profiles.js';
import {parseDesign,designAt,volumes} from '../surface/volumes.js';
import {parseCode,stationText} from '../survey/feature-codes.js';
import {profileSVG,sectionSVG,profileCSV,sectionsCSV} from '../reports/profile-report.js';
import {table,page} from '../reports/report.js';
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),num=id=>Number($(id).value);
export function initSurface({P,log,snap,refresh,dirty}){let TIN=null,lastCsv='',lastName='',lastHtml='';
 const len=l=>l.pts.slice(1).reduce((s,p,i)=>s+Math.hypot(p.e-l.pts[i].e,p.n-l.pts[i].n),0);
 const ents=(closed)=>P().entities.filter(e=>e.type=='pline'&&(!e.gen||e.gen=='alignment')&&!!e.closed==closed);
 const fill=()=>{$('uBnd').innerHTML='<option value="-1">None</option>'+ents(true).map((e,i)=>`<option value="${P().entities.indexOf(e)}">${esc(e.src||e.layer||'closed polyline')} (${e.pts.length} vtx)</option>`).join('');
  $('uAln').innerHTML=ents(false).map(e=>`<option value="${P().entities.indexOf(e)}">${esc(e.src||e.layer||'polyline')} (${len(e).toFixed(1)} ${P().units}, ${e.pts.length} vtx)</option>`).join('')||'<option value="-1">No open polylines: run Auto features or draw one</option>'};
 $('bSurf').onclick=()=>{fill();$('udlg').showModal()};$('uClose').onclick=()=>$('udlg').close();
 const show=(html,csv,name)=>{$('uOut').innerHTML=html;lastCsv=csv||'';lastName=name||'';lastHtml=html};
 $('uGen').onclick=()=>{const ex=new Set($('uEx').value.toUpperCase().split(/[\s,]+/).filter(Boolean)),all=P().points;
  const src=all.filter(p=>{const c=parseCode(p.code);return !(c&&ex.has(c.base))}),bi=Number($('uBnd').value),bnd=bi>=0?P().entities[bi]?.pts:null;
  const bl=$('uBrk').value.toUpperCase().split(/[\s,]+/).filter(Boolean),brk=P().entities.filter(e=>e.type=='pline'&&!e.gen&&bl.includes((e.layer||'').toUpperCase())).map(e=>e.pts);
  const tin=buildTIN(src,{maxEdge:num('uMax')||0,boundary:bnd,breaklines:brk});if(tin.errors.length){TIN=null;show('<p class="e">'+tin.errors.map(esc).join('<br>')+'</p>');return log('Surface not built: '+tin.errors[0],'e')}
  const C=contours(tin,num('uInt'),num('uMaj')||5);if(C.errors.length){show('<p class="e">'+C.errors[0]+'</p>');return log(C.errors[0],'e')}
  TIN=tin;snap();const sz=P().symSize||1,E=[];
  if($('uTin').checked){const seen=new Set();for(const t of tin.tris)for(const[a,b]of[[0,1],[1,2],[2,0]]){const i=t[a],j=t[b],k=i<j?i+'_'+j:j+'_'+i;if(seen.has(k))continue;seen.add(k);
   E.push({type:'pline',pts:[{e:tin.pts[i].e,n:tin.pts[i].n},{e:tin.pts[j].e,n:tin.pts[j].n}],layer:'TIN',color:'#9aa5b1',aci:8,gen:'surface'})}}
  let bands='';if($('uCol').checked){const RAMP=['#2e7d32','#7cb342','#cddc39','#ffeb3b','#ffb300','#fb8c00','#e64a19','#8d6e63'],nc=Math.max(2,Math.min(12,Math.round(num('uCls'))||8)),span=(tin.zmax-tin.zmin)||1,col=k=>RAMP[Math.round(k/(nc-1)*(RAMP.length-1))];
   for(const t of tin.tris){const z=(tin.pts[t[0]].z+tin.pts[t[1]].z+tin.pts[t[2]].z)/3,k=Math.min(nc-1,Math.floor((z-tin.zmin)/span*nc));E.push({type:'fill',pts:t.map(i=>({e:tin.pts[i].e,n:tin.pts[i].n})),color:col(k),layer:'TIN-COLOUR',aci:3,gen:'surface'})}
   bands=table(['Class','From RL','To RL'],Array.from({length:nc},(_,k)=>[k+1,(tin.zmin+span*k/nc).toFixed(2),(tin.zmin+span*(k+1)/nc).toFixed(2)]))}
  for(const l of C.lines){const lay=l.major?'CONTOUR-MAJOR':'CONTOUR-MINOR';E.push({type:'pline',pts:l.pts,closed:l.closed,layer:lay,color:l.major?'#8a4b00':'#c49a6c',aci:l.major?30:40,gen:'surface'});
   if(l.major&&$('uLab').checked&&l.pts.length>2&&len(l)>20*sz){const m=l.pts[Math.floor(l.pts.length/2)];E.push({type:'text',pts:[{e:m.e,n:m.n}],text:String(+l.level.toFixed(3)),h:sz*1.1,layer:lay,color:'#8a4b00',gen:'surface'})}}
  if($('uSpot').checked)for(const p of tin.pts)E.push({type:'text',pts:[{e:p.e+sz*.6,n:p.n-sz*1.4}],text:p.z.toFixed(2),h:sz*.9,layer:'SPOT-LEVEL',color:'#444',gen:'surface'});
  P().entities=P().entities.filter(e=>e.gen!=='surface').concat(E);refresh();dirty();
  const html=table(['Item','Value'],[['Points used',tin.pts.length+' of '+all.length+' (excluded codes: '+(ex.size?[...ex].join(', '):'none')+')'],['Triangles',tin.tris.length],['Breaklines enforced',tin.enforced+' segment(s)'],['Surface area (plan)',tin.area.toFixed(3)+' '+P().units+'²'],['RL range',tin.zmin.toFixed(3)+' to '+tin.zmax.toFixed(3)],['Contours',C.lines.length+' lines at '+num('uInt')+' '+P().units+' interval']])+bands+tin.warnings.map(w=>`<p class="w">${esc(w)}</p>`).join('')+'<p class="w">Linear-interpolation TIN of surveyed points only: accuracy depends on point density and coding. Breaklines are enforced only where an entity on a listed layer joins surface points. Nothing is extrapolated beyond the triangles.</p>';
  show(html);log(`Surface: ${tin.pts.length} points, ${tin.tris.length} triangles, ${C.lines.length} contours (Ctrl+Z to undo)`,tin.warnings.length>1?'w':'o');tin.warnings.forEach(w=>log(w,'w'))};
 $('uClr').onclick=()=>{snap();P().entities=P().entities.filter(e=>e.gen!=='surface');TIN=null;refresh();dirty();log('Surface objects removed')};
 const aln=()=>{if(!TIN){show('<p class="e">Generate the surface first.</p>');return null}const e=P().entities[Number($('uAln').value)];if(!e){show('<p class="e">Select an alignment polyline.</p>');return null}return e.pts};
 const run=(sections)=>{const line=aln();if(!line)return;const p=profile(TIN,line,num('uStep'),num('uStart')||0);if(p.errors.length)return show('<p class="e">'+p.errors[0]+'</p>');
  const ds=$('uDes').value.trim()?parseDesign($('uDes').value):null;if(ds&&(ds.errors.length||ds.rows.length<2))return show('<p class="e">'+(ds.errors.length?ds.errors.map(esc).join('<br>'):'At least 2 design levels are needed')+'</p>');
  if(ds)p.rows.forEach(r=>{r.d=designAt(ds.rows,r.ch);r.cf=r.z!=null&&r.d!=null?r.z-r.d:null});
  const o={hs:num('uHs')||500,vs:num('uVs')||100,units:P().units},note=`<p class="w">Existing levels are interpolated from the TIN, none are measured. ${p.outside?p.outside+' station(s) fall outside the TIN and have no level (not extrapolated).':''} ${ds?'Design levels are your input, linear between the given chainages; "Ground - design": positive = cut, negative = fill.':'No design levels entered.'}</p>`;
  if(!sections){const hd=['Chainage','E','N','RL','Δ RL','Gradient %',...(ds?['Design RL','Ground − design']:[]),'Type'];
   show(profileSVG(p.rows,o)+table(hd,p.rows.map(r=>[stationText(r.ch),r.e.toFixed(3),r.n.toFixed(3),r.z==null?'–':r.z.toFixed(3),r.dz==null?'':r.dz.toFixed(3),r.grad==null?'':r.grad.toFixed(2),...(ds?[r.d==null?'–':r.d.toFixed(3),r.cf==null?'':r.cf.toFixed(3)]:[]),r.z==null?'outside TIN':'interpolated']))+note,profileCSV(p.rows),'profile');return log('Profile computed: '+p.rows.length+' stations','o')}
  const c=crossSections(TIN,p.rows,num('uL'),num('uR'),num('uOff'));if(c.errors.length)return show('<p class="e">'+c.errors[0]+'</p>');
  show(c.sections.slice(0,40).map(s=>sectionSVG(s,o)).join('<br>')+(c.sections.length>40?`<p class="w">Showing 40 of ${c.sections.length} sections: all are in the CSV/report.</p>`:'')+note,sectionsCSV(c.sections),'sections');log('Cross-sections computed: '+c.sections.length,'o')};
 $('uVol').onclick=()=>{const line=aln();if(!line)return;const ds=parseDesign($('uDes').value);if(ds.errors.length||ds.rows.length<2)return show('<p class="e">'+(ds.errors.length?ds.errors.map(esc).join('<br>'):'Enter at least 2 design levels (chainage,RL).')+'</p>');
  const tpl={W:num('uW'),cutH:num('uCH'),fillH:num('uFH')};if(!(tpl.W>0&&tpl.cutH>0&&tpl.fillH>0))return show('<p class="e">Formation width and both slopes must be greater than 0.</p>');
  const p=profile(TIN,line,num('uStep'),num('uStart')||0),v=volumes(TIN,p.rows,ds.rows,tpl,num('uSt')||0.5,num('uMo')||40),f2=x=>x==null?'':x.toFixed(3);
  const rows=v.sec.map((s,i)=>[stationText(s.ch),f2(s.D),s.ok?f2(s.cut):'–',s.ok?f2(s.fill):'–',v.segs[i]?f2(v.segs[i].c):'',v.segs[i]?f2(v.segs[i].f):'',s.ok?'ok':s.reason]);
  const html=table(['Chainage','Design RL','Cut area','Fill area','Cut vol (from previous)','Fill vol (from previous)','Status'],rows)+`<p><b>Total cut ${v.totalCut.toFixed(3)} | total fill ${v.totalFill.toFixed(3)} (cubic ${P().units}, ${v.used} segment(s) used, ${v.skipped} skipped)</b></p>`+
   `<p class="w">Method: average end area between sections; template = flat formation ${tpl.W} wide at design level with side slopes ${tpl.cutH}:1 (cut) and ${tpl.fillH}:1 (fill) running to daylight; existing ground from the TIN. No crossfall, superelevation, pavement layers, topsoil or shrink/swell. Segments with a section outside the TIN, no daylight or no design level are skipped, not estimated.</p>`;
  show(html,'Chainage,DesignRL,CutArea,FillArea,CutVolume,FillVolume,Status\n'+rows.map(r=>r.join(',')).join('\n')+'\n','volumes');log(`Volumes: cut ${v.totalCut.toFixed(1)}, fill ${v.totalFill.toFixed(1)}, ${v.skipped} segment(s) skipped`,v.skipped?'w':'o')};
 $('uProf').onclick=()=>run(false);$('uSec').onclick=()=>run(true);
 const dl=(n,t,m)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:m}));a.download=n;a.click()};
 $('uCsv').onclick=()=>lastCsv?dl('evlab-'+lastName+'.csv',lastCsv,'text/csv'):log('Run a profile or sections first','w');
 $('uRep').onclick=()=>lastHtml?dl('evlab-'+(lastName||'surface')+'-report.html',page('Surface / '+(lastName||'summary'),lastHtml,`${P().name} | units ${P().units} | CRS ${P().crs||'local/undefined'}`),'text/html'):log('Nothing to report yet','w');
}

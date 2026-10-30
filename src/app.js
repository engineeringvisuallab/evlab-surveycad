import {Engine} from './cad/drawing-engine.js';
import {detectDelimiter,parseDelimited,buildPoints} from './io/csv.js';
import {History} from './core/history.js';
import {toCSV,toGeoJSON,toDXF,toSVG} from './io/exporters.js';
import {parseRules,processFeatures,pointStyle,DEFAULT_RULES} from './survey/feature-codes.js';
import {table as rtable} from './reports/report.js';
import {initAlignment} from './ui/alignment-panel.js';
import {movePts,rotatePts,offsetPolyline} from './core/edit-ops.js';
import {initSurface} from './ui/surface-panel.js';
import {initSheet} from './ui/sheet-panel.js';
import {initCalc} from './ui/calc-panel.js';
import {saveLocal,loadLocal,newProject,validateProject} from './state/project-store.js';
const $=id=>document.getElementById(id);let P=newProject(),sort={k:'id',d:1},pending=null;
const log=(m,c='')=>{const d=document.createElement('div');d.className=c;d.textContent=new Date().toLocaleTimeString()+'  '+m;$('log').prepend(d)};
const eng=new Engine($('cv'),{cursor:m=>$('sCur').textContent=`E ${m.e.toFixed(3)}  N ${m.n.toFixed(3)}`,
 select:p=>{sel(p,false)},selectEnt:e=>entProps(e),windowSelected:n=>log(n?n+' object(s) selected: Move, Copy, Rotate, Offset and Delete now apply to them':'Nothing fully inside the window','w'),addEntity:e=>addEnt(e),scale:s=>$('sScale').textContent=`${s.toFixed(3)} px/${P.units}`});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function dupIds(){const c={};P.points.forEach(p=>c[p.id]=(c[p.id]||0)+1);return new Set(Object.keys(c).filter(k=>c[k]>1))}
function refresh(fit){eng.pts=P.points;eng.ents=P.entities;applyRules();$('empty').hidden=P.points.length>0;table();layers();status();if(fit)eng.fit();else eng.draw()}
function status(){$('sUnits').textContent='Units: '+P.units;$('sCrs').textContent='CRS: '+(P.crs||'Local/undefined');$('sCount').textContent=P.points.length+' points';
 $('pName').value=P.name;$('pUnits').value=P.units;$('pCrs').value=P.crs;$('pNotes').value=P.notes}
function table(){const q=$('search').value.toLowerCase(),dup=dupIds();
 const rows=P.points.filter(p=>!q||[p.id,p.code,p.desc].join(' ').toLowerCase().includes(q))
  .sort((a,b)=>{const x=a[sort.k],y=b[sort.k];return (typeof x=='number'&&typeof y=='number'?x-y:String(x).localeCompare(String(y),undefined,{numeric:true}))*sort.d});
 $('tbl').innerHTML='<tr>'+[['id','ID'],['e','E'],['n','N'],['z','RL'],['code','Code']].map(([k,l])=>`<th data-k="${k}">${l}</th>`).join('')+'</tr>'+
  rows.map(p=>`<tr data-i="${P.points.indexOf(p)}" class="${p===eng.sel?'sel':''} ${dup.has(p.id)?'dup':''}"><td>${esc(p.id)}</td><td>${p.e.toFixed(3)}</td><td>${p.n.toFixed(3)}</td><td>${p.z===null?'':p.z.toFixed(3)}</td><td>${esc(p.code)}</td></tr>`).join('')}
$('tbl').onclick=e=>{const th=e.target.closest('th');if(th){sort={k:th.dataset.k,d:sort.k==th.dataset.k?-sort.d:1};return table()}
 const tr=e.target.closest('tr[data-i]');if(tr)sel(P.points[tr.dataset.i],true)};
$('search').oninput=table;
function sel(p,center){eng.sel=p;if(p&&center){eng.v.cx=p.e;eng.v.cy=p.n}eng.draw();table();
 $('props').innerHTML=p?`<label>ID <input value="${esc(p.id)}" disabled></label><label>Easting <input value="${p.e}" disabled></label><label>Northing <input value="${p.n}" disabled></label><label>RL <input value="${p.z??''}" disabled></label><label>Code <input value="${esc(p.code)}" disabled></label><label>Description <input id="pd" value="${esc(p.desc)}"></label><label>Quality note <input id="pq" value="${esc(p.note)}"></label><small>Coordinates are read-only in Milestone 1.</small>`:'Select a point.';
 if(p){$('pd').onchange=e=>{p.desc=e.target.value;dirty()};$('pq').onchange=e=>{p.note=e.target.value;dirty()}}}
function layers(){const codes=[...new Set(P.points.map(p=>p.code))].sort(),ls=[...new Set(P.entities.map(e=>e.layer||'CAD'))].sort();
 $('tlay').innerHTML=(codes.length?'<b>Point codes</b>':'')+codes.map(c=>`<label style="display:block"><input type="checkbox" data-c="${esc(c)}" ${eng.hidden.has(c)?'':'checked'}> ${esc(c)} (${P.points.filter(p=>p.code===c).length})</label>`).join('')+(ls.length?'<b>Drawing layers</b>':'')+ls.map(l=>`<label style="display:block"><input type="checkbox" data-l="${esc(l)}" ${eng.hiddenL.has(l)?'':'checked'}> ${esc(l)} (${P.entities.filter(e=>(e.layer||'CAD')==l).length})</label>`).join('')||'No layers yet.'}
$('tlay').onchange=e=>{const c=e.target.dataset.c,l=e.target.dataset.l;if(c!==undefined)e.target.checked?eng.hidden.delete(c):eng.hidden.add(c);else e.target.checked?eng.hiddenL.delete(l):eng.hiddenL.add(l);eng.draw()};
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x==b));$('tpts').hidden=b.dataset.t!='pts';$('tlay').hidden=b.dataset.t!='lay'});
let t;function dirty(){clearTimeout(t);t=setTimeout(()=>save(true),1500)}
async function save(auto){try{await saveLocal(P);log((auto?'Autosaved':'Saved')+' locally ('+P.points.length+' points)','o')}catch(e){log('Save failed: '+e.message,'e')}}
['pName','pCrs','pNotes'].forEach(id=>$(id).onchange=()=>{P.name=$('pName').value;P.crs=$('pCrs').value;P.notes=$('pNotes').value;status();dirty()});
$('pUnits').onchange=()=>{P.units=$('pUnits').value;status();dirty();log('Units label changed to '+P.units+'. Values are NOT converted.','w')};
// import
function openImport(text,name){const d=detectDelimiter(text);pending={text,name,d};renderDlg()}
function renderDlg(){const{text,name,d}=pending;const rows=parseDelimited(text,d);const hdr=$('dBody').querySelector('#hh')?$('dBody').querySelector('#hh').checked:isNaN(Number(rows[0]?.[1]));
 const head=hdr?rows[0]:rows[0].map((_,i)=>'Col '+(i+1)),data=hdr?rows.slice(1):rows;
 const guess=(re,i)=>{const k=head.findIndex(h=>re.test(h));return k>=0?k:i<head.length?i:-1};
 const g=pending.map||{id:guess(/id|point|no/i,0),e:guess(/^e|east|x/i,1),n:guess(/^n|north|y/i,2),z:guess(/rl|z|elev|height/i,3),code:guess(/code/i,4),desc:guess(/desc|note/i,5)};
 const sel=(k,opt)=>`<label>${k.toUpperCase()} <select data-k="${k}">${opt?'<option value="-1">(none)</option>':''}${head.map((h,i)=>`<option value="${i}" ${g[k]==i?'selected':''}>${esc(h)}</option>`).join('')}</select></label>`;
 const dl=`<label>Delimiter <select id="dd">${[[',','comma'],['\t','tab'],[';','semicolon'],[' ','space']].map(([v,l])=>`<option value="${v}" ${v==d?'selected':''}>${l}</option>`).join('')}</select></label><label>Column order <select id="dpre"><option value="">auto-detect</option><option value="pnezd" ${pending.pre=='pnezd'?'selected':''}>P,N,E,Z,D (total station / GNSS export)</option><option value="penzd" ${pending.pre=='penzd'?'selected':''}>P,E,N,Z,D</option></select></label><label><input type="checkbox" id="hh" ${hdr?'checked':''}> header row</label>`;
 const r=buildPoints(data,Object.fromEntries(Object.keys(g).map(k=>[k,+g[k]])),name);pending.res=r;pending.map=g;
 $('dBody').innerHTML=`<p><b>${esc(name)}</b></p><p>${dl}</p><p>${sel('id')}${sel('e')}${sel('n')}${sel('z',1)}${sel('code',1)}${sel('desc',1)}</p>
 <p class="o">${r.pts.length} valid</p><p class="${r.rej.length?'e':''}">${r.rej.length} rejected${r.rej.slice(0,5).map(x=>`<br>row ${x.row}: ${esc(x.why)}`).join('')}</p><p class="${r.warn.length?'w':''}">${r.warn.length} warnings${r.warn.slice(0,5).map(w=>'<br>'+esc(w)).join('')}</p>
 <div class="tw" style="max-height:140px"><table>${data.slice(0,6).map(x=>'<tr>'+x.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')}</table></div>`;
 $('dBody').querySelectorAll('select[data-k]').forEach(s=>s.onchange=()=>{pending.map[s.dataset.k]=+s.value;renderDlg()});
 $('dd').onchange=e=>{pending.d=e.target.value;pending.map=null;renderDlg()};$('hh').onchange=()=>{pending.map=null;renderDlg()};$('dpre').onchange=e=>{const v=e.target.value;pending.pre=v;pending.map=v=='pnezd'?{id:0,n:1,e:2,z:3,code:4,desc:5}:v=='penzd'?{id:0,e:1,n:2,z:3,code:4,desc:5}:null;renderDlg()};
 $('dOk').disabled=!r.pts.length;if(!$('dlg').open)$('dlg').showModal()}
$('dCancel').onclick=()=>{$('dlg').close();pending=null;log('Import cancelled')};
$('dOk').onclick=()=>{const r=pending.res;snap();P.points.push(...r.pts);$('dlg').close();log(`Imported ${r.pts.length} points, ${r.rej.length} rejected, ${r.warn.length} warnings from ${pending.name}`,r.rej.length||r.warn.length?'w':'o');
 r.rej.forEach(x=>log(`Rejected row ${x.row}: ${x.why}`,'e'));r.warn.forEach(w=>log(w,'w'));pending=null;refresh(true);dirty()};
$('bImport').onclick=()=>$('fCsv').click();
$('fCsv').onchange=async e=>{const f=e.target.files[0];if(f)openImport(await f.text(),f.name);e.target.value=''};
$('bSample').onclick=async()=>{try{const r=await fetch('samples/sample-points.csv');if(!r.ok)throw new Error('HTTP '+r.status);openImport(await r.text(),'sample-points.csv')}catch(e){log('Could not load sample: '+e.message+' (open the app via GitHub Pages or a web server, not file://)','e')}};
$('bNew').onclick=()=>{if(P.points.length&&!confirm('Discard current project? Unsaved changes are lost.'))return;P=newProject();H.reset();eng.sel=null;eng.hidden.clear();refresh();sel(null);log('New project')};
$('bSave').onclick=()=>save(false);
$('bRecover').onclick=async()=>{try{const p=await loadLocal();if(!p)return log('No locally saved project found','w');if(P.points.length&&!confirm('Replace current project with last local save?'))return;H.reset();P=validateProject(p);refresh(true);log('Recovered last local project','o')}catch(e){log('Recover failed: '+e.message,'e')}};
$('bExport').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(P,null,1)],{type:'application/json'}));a.download=(P.name||'project').replace(/\W+/g,'_')+'.evlab.json';a.click();log('Exported JSON project','o')};
$('bOpen').onclick=()=>$('fJson').click();
$('fJson').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{H.reset();P=validateProject(JSON.parse(await f.text()));refresh(true);log('Opened '+f.name,'o')}catch(x){log('Open failed: '+x.message,'e')}};
$('bFit').onclick=()=>eng.fit();
$('bTheme').onclick=()=>{const d=document.documentElement;d.dataset.theme=d.dataset.theme=='dark'?'':'dark';localStorage.setItem('evlab-theme',d.dataset.theme||'');eng.draw()};
document.documentElement.dataset.theme=localStorage.getItem('evlab-theme')||'';
addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key=='s'){e.preventDefault();save(false)}if(e.key=='f'&&e.target.tagName!='INPUT')eng.fit()});

const H=new History(),state=()=>JSON.stringify({points:P.points,entities:P.entities});
function snap(){H.push(state())}
function restore(s){const o=JSON.parse(s);P.points=o.points;P.entities=o.entities;eng.sel=eng.selEnt=null;refresh();sel(null);dirty()}
function addEnt(e){snap();e.layer=e.type=='dim'?'DIM':'CAD';P.entities.push(e);eng.selEnt=e;refresh();dirty();log('Added '+e.type)}
function entProps(e){eng.sel=null;table();const L=e.type=='text'?'':e.pts.slice(1).reduce((s,p,i)=>s+Math.hypot(p.e-e.pts[i].e,p.n-e.pts[i].n),0);
 $('props').innerHTML=`<b>${e.type.toUpperCase()}</b> on layer ${e.layer||'CAD'}<br>Vertices: ${e.pts.length}<br>${e.type=='text'?'Text: '+esc(e.text):'Length: '+L.toFixed(3)+' '+P.units}<br><small>Press Delete to remove.</small>`}
function delEnt(){const L=eng.selList();if(!L.length)return log('Select CAD objects first (Select or Window tool)','w');snap();const S=new Set(L);P.entities=P.entities.filter(x=>!S.has(x));eng.selEnt=null;eng.multi=null;refresh();sel(null);dirty();log('Deleted '+L.length+' object(s) (Ctrl+Z to undo)')}
function undo(){const s=H.undo(state());s?restore(s):log('Nothing to undo','w')}
function redo(){const s=H.redo(state());s?restore(s):log('Nothing to redo','w')}
function setTool(t){eng.setTool(t);$('sTool').textContent='Tool: '+t;document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('on',b.dataset.tool==t))}
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
$('bUndo').onclick=undo;$('bRedo').onclick=redo;$('bDel').onclick=delEnt;
function dl(name,txt,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type}));a.download=name;a.click()}
document.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{const k=b.dataset.x,n=(P.name||'project').replace(/\W+/g,'_');
 if(!P.points.length&&!P.entities.length)return log('Nothing to export','w');
 if(k=='csv')dl(n+'.csv',toCSV(P),'text/csv');if(k=='geojson'){dl(n+'.geojson',toGeoJSON(P),'application/geo+json');log('GeoJSON holds grid E/N, not lon/lat (see evlab_note in file)','w')}
 if(k=='dxf'){dl(n+'.dxf',toDXF(P),'application/dxf');log('DXF exported (POINT, LINE, LWPOLYLINE, TEXT; dimensions as LINE+TEXT)','o')}if(k=='svg')dl(n+'.svg',toSVG(P),'image/svg+xml');log('Exported '+k.toUpperCase(),'o')});
addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;const k=e.key.toLowerCase();
 if((e.ctrlKey||e.metaKey)&&k=='z'){e.preventDefault();undo()}else if((e.ctrlKey||e.metaKey)&&k=='y'){e.preventDefault();redo()}
 else if(k=='delete')delEnt();else if(k=='enter')eng.finish();else if(k=='escape'){eng.cancel();setTool('select')}});
let RULES=new Map();
function applyRules(){RULES=parseRules(P.rules||DEFAULT_RULES).rules;eng.symOf=p=>pointStyle(RULES,p);eng.symSize=P.symSize||1}
$('bFeat').onclick=()=>{$('fRules').value=P.rules||DEFAULT_RULES;$('fSz').value=P.symSize||1;$('fOut').innerHTML='';$('fdlg').showModal()};
$('fClose').onclick=()=>$('fdlg').close();
$('fRst').onclick=()=>{$('fRules').value=DEFAULT_RULES};
$('fRun').onclick=()=>{const pr=parseRules($('fRules').value);if(pr.errors.length){$('fOut').innerHTML='<p class="e">'+pr.errors.map(esc).join('<br>')+'</p>';return log('Rule errors: nothing changed','e')}
 if(!P.points.length){$('fOut').innerHTML='<p class="e">No points loaded.</p>';return}
 const sz=Number($('fSz').value)||1;snap();P.rules=$('fRules').value;P.symSize=sz;P.entities=P.entities.filter(e=>!e.auto);
 const r=processFeatures(P.points,pr.rules,{chInterval:Number($('fCh').value)||0,chStart:Number($('fCs').value)||0,symSize:sz});P.entities.push(...r.ents);eng.selEnt=null;refresh(true);dirty();
 $('fOut').innerHTML=(r.rep.strings.length?rtable(['String','Layer','Points','Length','Closed'],r.rep.strings.map(s=>[s.name,s.layer,s.n,s.len.toFixed(3),s.closed?'yes':'no'])):'<p class="w">No strings were created.</p>')+`<p>${r.rep.plain} point(s) shown as blocks/plain points.</p>`+r.rep.warnings.map(w=>`<p class="w">${esc(w)}</p>`).join('');
 log(`Auto features: ${r.rep.strings.length} strings, ${r.ents.length} drawing objects, ${r.rep.warnings.length} warnings (Ctrl+Z to undo)`,r.rep.warnings.length?'w':'o');r.rep.warnings.forEach(w=>log(w,'w'))};
initCalc({P:()=>P,log});initSheet({P:()=>P,log,dirty});initSurface({P:()=>P,log,snap,refresh,dirty});initAlignment({P:()=>P,log,snap,refresh,dirty});
function editable(){const all=eng.selList();if(!all.length){log('Select CAD objects first (Select or Window tool)','w');return null}const ed=all.filter(e=>!e.auto&&!e.gen&&e.type!='fill');
 if(!ed.length){log('Selected objects are auto-generated (features, surface, alignment): regenerate them instead of editing','w');return null}if(ed.length<all.length)log((all.length-ed.length)+' auto-generated object(s) skipped','w');return ed}
const nums=(s,k)=>{if(s===null)return null;const v=s.split(/[,\s]+/).filter(Boolean).map(Number);return v.length>=k&&v.every(isFinite)?v:undefined};
const centre=ed=>{const p=ed.flatMap(e=>e.pts),E=p.map(q=>q.e),N=p.map(q=>q.n);return{e:(Math.min(...E)+Math.max(...E))/2,n:(Math.min(...N)+Math.max(...N))/2}};
const doMove=copy=>{const ed=editable();if(!ed)return;const v=nums(prompt((copy?'Copy':'Move')+' by dE,dN ('+P.units+'):','10,0'),2);if(v===null)return;if(!v)return log('Enter two numbers: dE,dN','e');snap();
 if(copy){const cp=ed.map(e=>({...JSON.parse(JSON.stringify(e)),pts:movePts(e.pts,v[0],v[1])}));P.entities.push(...cp);eng.multi={ents:new Set(cp)};eng.selEnt=null}else ed.forEach(e=>e.pts=movePts(e.pts,v[0],v[1]));
 refresh();dirty();log((copy?'Copied ':'Moved ')+ed.length+' object(s) by '+v[0]+', '+v[1]+' (Ctrl+Z to undo)','o')};
$('bMove').onclick=()=>doMove(false);$('bCopy').onclick=()=>doMove(true);
$('bRot').onclick=()=>{const ed=editable();if(!ed)return;const v=nums(prompt('Rotate: angle in degrees clockwise [, centre E, centre N]. Blank centre = middle of the selection.','90'),1);if(v===null)return;if(!v)return log('Enter an angle, optionally with centre E,N','e');
 const c=v.length>=3?{e:v[1],n:v[2]}:centre(ed);snap();ed.forEach(e=>e.pts=rotatePts(e.pts,c,v[0]));refresh();dirty();log(`Rotated ${ed.length} object(s) by ${v[0]}° about ${c.e.toFixed(3)}, ${c.n.toFixed(3)} (Ctrl+Z to undo)`,'o')};
$('bOffs').onclick=()=>{const ed=editable();if(!ed)return;const v=nums(prompt('Offset distance ('+P.units+'): positive = right of the drawing direction, negative = left.','5'),1);if(v===null)return;if(!v||!v[0])return log('Enter a non-zero distance','e');
 const src=ed.filter(e=>e.type=='line'||e.type=='pline');if(!src.length)return log('Offset works on lines and polylines only','w');snap();const out=[];
 for(const e of src){const o=offsetPolyline(e.pts,v[0],!!e.closed);if(o)out.push({type:'pline',pts:o,closed:!!e.closed,layer:e.layer||'CAD',color:e.color})}
 P.entities.push(...out);eng.multi={ents:new Set(out)};eng.selEnt=null;refresh();dirty();log(`Offset ${out.length} object(s) by ${v[0]} (Ctrl+Z to undo)`,'o')};
refresh();log('EVLab SurveyCAD Milestone 6 (alignment, setting-out, edit tools) ready. Axes: X=Easting, Y=Northing. Use Load sample to test.');

import {parseDXF} from '../io/dxf-import.js';
import {parseGSI,parseJobXML,parseLandXML} from '../io/survey-files.js';
import {table} from '../reports/report.js';
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// Returns xImport(kind,name,text): shows a preview dialog; nothing is added until Accept is pressed.
export function initImport({P,log,snap,refresh,dirty}){let cur=null;
 $('xCancel').onclick=()=>{$('xdlg').close();cur=null;log('Import cancelled')};
 $('xOk').onclick=()=>{if(!cur)return;snap();cur();$('xdlg').close();cur=null};
 const warns=w=>w.map(x=>`<p class="w">${esc(x)}</p>`).join(''),open=(html,apply,dxf)=>{$('xBody').innerHTML=html;$('xPtsL').style.display=dxf?'':'none';$('xOk').disabled=!apply;cur=apply;if(!$('xdlg').open)$('xdlg').showModal()};
 const uniq=(base,used)=>{let i=1,id;do{id=base+i++}while(used.has(id));used.add(id);return id};
 function dxf(name,text){const r=parseDXF(text);if(r.errors.length)return open(`<p><b>${esc(name)}</b></p><p class="e">${r.errors.map(esc).join('<br>')}</p>`,null,false);
  const sup=Object.entries(r.supported),uns=Object.entries(r.unsupported),n=r.ents.length;
  const html=`<p><b>${esc(name)}</b></p>`+(sup.length?'<p>Will be imported:</p>'+table(['DXF entity','Count'],sup):'<p class="w">No supported entities found.</p>')+
   (uns.length?'<p class="w">NOT imported (unsupported):</p>'+table(['DXF entity','Count'],uns):'<p class="o">No unsupported entities.</p>')+
   `<p>Layers: ${esc(Object.entries(r.layers).map(([k,v])=>k+' ('+v+')').join(', ')||'none')}</p>`+warns(r.warnings);
  open(html,(n||r.points.length)?()=>{const used=new Set(P().points.map(p=>p.id));let np=0;
   P().entities.push(...r.ents);if($('xPts').checked){for(const p of r.points){P().points.push({id:uniq('D',used),e:p.e,n:p.n,z:p.z,code:p.layer,desc:'',source:name,note:''});np++}}
   refresh(true);dirty();log(`DXF import: ${n} drawing object(s), ${np} point(s); ${uns.length?'unsupported: '+uns.map(([k,v])=>k+' x'+v).join(', '):'nothing unsupported'} (Ctrl+Z to undo)`,uns.length?'w':'o')}:null,true)}
 function pts(name,r){if(r.errors.length)return open(`<p><b>${esc(name)}</b></p><p class="e">${r.errors.map(esc).join('<br>')}</p>`+warns(r.warnings),null,false);
  const seen=new Set(P().points.map(p=>p.id)),dup=[],ok=r.pts.filter(p=>isFinite(p.e)&&isFinite(p.n));r.pts.forEach(p=>{if(seen.has(p.id))dup.push(p.id)});
  const html=`<p><b>${esc(name)}</b>: ${ok.length} point(s) read</p>`+table(['ID','E','N','RL','Code'],ok.slice(0,8).map(p=>[p.id,p.e,p.n,p.z??'',p.code]))+(ok.length>8?`<p>... and ${ok.length-8} more</p>`:'')+
   (dup.length?`<p class="w">${dup.length} Point ID(s) already exist in the project (e.g. ${esc(dup.slice(0,3).join(', '))}): they will be added as duplicates and flagged in red</p>`:'')+warns(r.warnings)+'<p><small>Check these values against your instrument before accepting.</small></p>';
  open(html,()=>{P().points.push(...ok.map(p=>({id:p.id,e:p.e,n:p.n,z:p.z,code:p.code||'NOCODE',desc:p.desc||'',source:name,note:''})));refresh(true);dirty();log(`Imported ${ok.length} point(s) from ${name}`+(r.warnings.length?`, ${r.warnings.length} warning(s)`:''),r.warnings.length?'w':'o');r.warnings.forEach(w=>log(w,'w'))},false)}
 return(kind,name,text)=>{if(kind=='dxf')return dxf(name,text);if(kind=='gsi')return pts(name,parseGSI(text));
  if(/<LandXML/i.test(text))return pts(name,parseLandXML(text));if(/<JOBFile/i.test(text))return pts(name,parseJobXML(text));
  open(`<p><b>${esc(name)}</b></p><p class="e">XML file type not recognised. Supported: Trimble JobXML (JOBFile) and LandXML (LandXML with CgPoint).</p>`,null,false)}}

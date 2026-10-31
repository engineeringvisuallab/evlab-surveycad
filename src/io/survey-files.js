// Point readers for instrument/exchange files. Written from the published structure of each format; NOT yet verified against real files from
// every instrument. The import preview always shows what was read before anything is accepted.
// ---- Leica GSI (GSI8 and GSI16). Word = 2-digit word index + 4 info chars + sign + data. Info's last char selects unit/decimals.
const DEC={'0':3,'1':3,'6':4,'7':4,'8':5},FEET=new Set(['1','7']);
export function parseGSI(text){const R={pts:[],warnings:[],errors:[],skipped:{stations:0,observations:0}},unk=new Set();let feet=false;
 text.split(/\r?\n/).forEach((raw,li)=>{const line=raw.trim().replace(/^\*/,'');if(!line)return;const w={};
  for(const tok of line.split(/\s+/)){const m=tok.match(/^(\d{2})(.{4})([+-])(.+)$/);if(!m){R.warnings.push(`Line ${li+1}: word "${tok.slice(0,18)}" not understood, ignored`);continue}
   const[,wi,info,sg,data]=m,u=info[3];let v;
   if(['81','82','83','84','85','86','31','32','33'].includes(wi)){if(!(u in DEC)&&!unk.has(u)){unk.add(u);R.warnings.push(`Unit/decimals code "${u}" is not known: 3 decimals assumed. Check the preview against your instrument display`)}
    if(FEET.has(u))feet=true;v=Number(data)/Math.pow(10,DEC[u]??3)*(sg=='-'?-1:1)}else v=sg=='-'?'-'+data:data;w[wi]=v}
  if(w['84']!==undefined||w['85']!==undefined){R.skipped.stations++;return}
  if(w['81']===undefined&&w['82']===undefined){if(w['11']!==undefined)R.skipped.observations++;return}
  if(w['81']===undefined||w['82']===undefined){R.warnings.push(`Line ${li+1}: only one of E/N present, skipped`);return}
  const strip=s=>{s=String(s).replace(/^[+-]/,'').replace(/^0+(?=.)/,'');return s};
  R.pts.push({id:w['11']!==undefined?strip(w['11']):'GSI'+(R.pts.length+1),e:w['81'],n:w['82'],z:w['83']===undefined?null:w['83'],code:w['71']!==undefined?strip(w['71']):'',desc:w['72']!==undefined?strip(w['72']):''})});
 if(feet)R.warnings.push('Values are marked as feet: set the project units to ft');
 if(R.skipped.stations)R.warnings.push(`${R.skipped.stations} station/setup record(s) ignored`);
 if(R.skipped.observations)R.warnings.push(`${R.skipped.observations} record(s) hold angles/distances only (no coordinates): not converted yet`);
 if(!R.pts.length)R.errors.push('No coordinate records (word indexes 81/82) found in this GSI file');return R}
// ---- XML helpers (no DOM needed, so the same code runs in tests)
const tag=(s,t)=>{const m=s.match(new RegExp('<'+t+'(?:\\s[^>]*)?>\\s*([^<]*?)\\s*</'+t+'>','i'));return m?m[1]:null},attr=(s,a)=>{const m=s.match(new RegExp('\\b'+a+'="([^"]*)"','i'));return m?m[1]:''};
const dec=s=>String(s).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
// ---- Trimble JobXML: points from <Reductions>/<Point> (preferred) or <PointRecord>; Grid North/East/Elevation. Later records of the same Name replace earlier ones.
export function parseJobXML(text){const R={pts:[],warnings:[],errors:[]};if(!/<JOBFile/i.test(text)){R.errors.push('Not a Trimble JobXML file (no JOBFile element)');return R}
 const red=text.match(/<Reductions[\s\S]*?<\/Reductions>/i),scope=red?red[0]:text,map=new Map();let repl=0,del=0,nogrid=0;
 for(const m of scope.matchAll(/<(Point|PointRecord)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)){const b=m[2],name=tag(b,'Name');if(name===null)continue;
  if(/<Deleted>\s*true\s*<\/Deleted>/i.test(b)){map.delete(dec(name));del++;continue}
  const g=b.match(/<Grid[\s\S]*?<\/Grid>/i);if(!g){nogrid++;continue}const N=Number(tag(g[0],'North')),E=Number(tag(g[0],'East')),Z=tag(g[0],'Elevation');
  if(!isFinite(N)||!isFinite(E)){nogrid++;continue}if(map.has(dec(name)))repl++;map.set(dec(name),{id:dec(name),e:E,n:N,z:Z===null||Z===''||!isFinite(Number(Z))?null:Number(Z),code:dec(tag(b,'Code')||''),desc:''})}
 R.pts=[...map.values()];if(repl)R.warnings.push(`${repl} point(s) appear more than once: the last record was used`);if(del)R.warnings.push(`${del} deleted point record(s) ignored`);
 if(nogrid)R.warnings.push(`${nogrid} point record(s) have no grid coordinates (e.g. observations only): skipped`);
 if(/<DistanceUnits>\s*(International)?\s*Feet|US\s*Survey\s*Feet/i.test(text))R.warnings.push('The job uses feet: set the project units to ft');
 if(!R.pts.length)R.errors.push('No points with grid coordinates found');return R}
// ---- LandXML: <CgPoint name= code= desc=>Northing Easting Elevation</CgPoint>
export function parseLandXML(text){const R={pts:[],warnings:[],errors:[]};if(!/<LandXML/i.test(text)){R.errors.push('Not a LandXML file (no LandXML element)');return R}let bad=0;
 for(const m of text.matchAll(/<CgPoint\b([^>]*)>\s*([^<]*?)\s*<\/CgPoint>/gi)){const v=m[2].split(/\s+/).map(Number);if(v.length<2||!isFinite(v[0])||!isFinite(v[1])){bad++;continue}
  R.pts.push({id:dec(attr(m[1],'name')||attr(m[1],'oID')||'LX'+(R.pts.length+1)),n:v[0],e:v[1],z:v.length>2&&isFinite(v[2])?v[2]:null,code:dec(attr(m[1],'code')),desc:dec(attr(m[1],'desc'))})}
 if(bad)R.warnings.push(`${bad} CgPoint(s) without numeric coordinates skipped`);if(/<Imperial\b/i.test(text))R.warnings.push('LandXML declares imperial units: set the project units to ft');
 R.warnings.push('LandXML order is Northing, Easting, Elevation: converted to E,N,RL');if(!R.pts.length)R.errors.push('No CgPoint records found');return R}

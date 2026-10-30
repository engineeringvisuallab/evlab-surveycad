import {buildSheet,SIZES} from '../reports/drawing-sheets.js';
const $=id=>document.getElementById(id);
export function initSheet({P,log,dirty}){let cur=null;
 const opts=()=>({size:$('sSize').value,orient:$('sOri').value,scale:$('sScale2').value,labels:$('sLab').value,title:$('sTitle').value,drawingNo:$('sNo').value,revision:$('sRev').value,date:$('sDate').value});
 const load=()=>{const s=P().sheet||{};$('sSize').value=s.size||'A3';$('sOri').value=s.orient||'landscape';$('sScale2').value=s.scale||'';$('sLab').value=s.labels||'id';
  $('sTitle').value=s.title||P().name||'';$('sNo').value=s.drawingNo||'';$('sRev').value=s.revision||'A';$('sDate').value=s.date||new Date().toISOString().slice(0,10)};
 const render=()=>{const o=opts();P().sheet=o;const r=buildSheet(P(),o);if(r.err){cur=null;$('sPrev').innerHTML='<p class="e">'+r.err+'</p>';$('sWarn').textContent='';return log(r.err,'w')}
  cur=r;$('sPrev').innerHTML=r.svg.replace(/width="[\d.]+mm" height="[\d.]+mm"/,'style="width:100%;height:auto;border:1px solid #888;background:#fff"');
  $('sWarn').innerHTML=r.warn.map(w=>'<span class="w">'+w+'</span>').join('<br>')||'<span class="o">Sheet fits at 1:'+r.scale+'</span>';dirty()};
 const dl=(name,blob)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click()};
 const nm=()=>(P().name||'sheet').replace(/\W+/g,'_');
 $('bSheet').onclick=()=>{load();$('sdlg').showModal();render()};$('sClose').onclick=()=>$('sdlg').close();$('sUpd').onclick=render;
 ['sSize','sOri','sScale2','sLab'].forEach(i=>$(i).onchange=render);
 $('sSvg').onclick=()=>{render();if(cur)dl(nm()+'-sheet.svg',new Blob([cur.svg],{type:'image/svg+xml'}))};
 $('sPrint').onclick=()=>{render();if(!cur)return;const w=window.open('');if(!w)return log('Pop-up blocked: allow pop-ups for this site to print','e');
  w.document.write(`<!DOCTYPE html><title>${nm()}</title><style>@page{size:${cur.W}mm ${cur.H}mm;margin:0}html,body{margin:0}svg{display:block}</style>`+cur.svg);w.document.close();setTimeout(()=>w.print(),300);log('Print dialog opened: choose "Save as PDF" for a PDF file','o')};
 $('sPng').onclick=()=>{render();if(!cur)return;let dpi=Number($('sDpi').value)||150;const cap=8000/(Math.max(cur.W,cur.H)/25.4);if(dpi>cap){dpi=Math.floor(cap);log('PNG resolution reduced to '+dpi+' dpi to stay within browser canvas limits','w')}
  const cw=Math.round(cur.W/25.4*dpi),ch=Math.round(cur.H/25.4*dpi),img=new Image(),url=URL.createObjectURL(new Blob([cur.svg],{type:'image/svg+xml'}));
  img.onload=()=>{const c=document.createElement('canvas');c.width=cw;c.height=ch;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,cw,ch);x.drawImage(img,0,0,cw,ch);URL.revokeObjectURL(url);
   c.toBlob(b=>{if(!b)return log('PNG export failed (canvas too large)','e');dl(nm()+'-sheet.png',b);log(`PNG exported (${cw}x${ch}px, ${dpi} dpi)`,'o')})};
  img.onerror=()=>log('PNG export failed: browser could not render the sheet','e');img.src=url};
}

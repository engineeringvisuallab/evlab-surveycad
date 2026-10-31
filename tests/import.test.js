import {parseDXF} from '../src/io/dxf-import.js';
import {parseGSI,parseJobXML,parseLandXML} from '../src/io/survey-files.js';
import {toDXF} from '../src/io/exporters.js';
let f=0;const t=(n,c)=>{if(!c){f++;console.log('FAIL',n)}else console.log('ok  ',n)};const near=(a,b,e=1e-9)=>Math.abs(a-b)<=e;
const D=(...ents)=>'0\nSECTION\n2\nENTITIES\n'+ents.map(e=>e.map(([c,v])=>c+'\n'+v).join('\n')).join('\n')+'\n0\nENDSEC\n0\nEOF\n';
let r=parseDXF(D([[0,'LINE'],[8,'ROAD'],[10,0],[20,0],[11,3],[21,4]]));t('LINE read with layer',r.ents.length==1&&r.ents[0].type=='line'&&r.ents[0].layer=='ROAD'&&near(r.ents[0].pts[1].n,4));
r=parseDXF(D([[0,'LWPOLYLINE'],[8,'X'],[90,4],[70,1],[10,0],[20,0],[10,10],[20,0],[10,10],[20,10],[10,0],[20,10]]));t('closed LWPOLYLINE, 4 vertices',r.ents[0].closed&&r.ents[0].pts.length==4);
r=parseDXF(D([[0,'LWPOLYLINE'],[90,2],[70,0],[10,0],[20,0],[42,1],[10,10],[20,0]]));const bp=r.ents[0].pts;
t('bulge=1 is a semicircle: ends kept, all points 5 from (5,0), bulges below the chord',near(bp[0].e,0)&&near(bp[bp.length-1].e,10)&&bp.every(p=>near(Math.hypot(p.e-5,p.n),5,1e-6))&&Math.min(...bp.map(p=>p.n))<-4.9&&r.warnings.some(w=>w.includes('bulges')));
r=parseDXF(D([[0,'ARC'],[10,0],[20,0],[40,10],[50,0],[51,90]]));const ap=r.ents[0].pts;t('ARC 0-90 deg: (10,0) to (0,10), radius 10',near(ap[0].e,10)&&near(ap[0].n,0)&&near(ap[ap.length-1].e,0,1e-9)&&near(ap[ap.length-1].n,10)&&ap.every(p=>near(Math.hypot(p.e,p.n),10,1e-9)));
r=parseDXF(D([[0,'ARC'],[10,0],[20,0],[40,10],[50,270],[51,90]]));t('ARC 270 to 90 goes counter-clockwise through (10,0)',r.ents[0].pts.some(p=>near(p.e,10,1e-6)&&near(p.n,0,1e-6)));
r=parseDXF(D([[0,'CIRCLE'],[10,1],[20,2],[40,5]]));t('CIRCLE -> closed polyline, radius 5, starts (6,2)',r.ents[0].closed&&near(r.ents[0].pts[0].e,6)&&r.ents[0].pts.every(p=>near(Math.hypot(p.e-1,p.n-2),5,1e-9)));
r=parseDXF(D([[0,'TEXT'],[8,'T'],[10,1],[20,2],[40,2.5],[50,30],[1,'Hello']],[[0,'MTEXT'],[10,0],[20,0],[1,'{\\fArial;Hello}\\Pworld']]));
t('TEXT height, MTEXT formatting stripped, rotation warned',r.ents[0].h==2.5&&r.ents[1].text=='Hello world'&&r.warnings.some(w=>w.includes('rotation is ignored')));
r=parseDXF(D([[0,'POINT'],[8,'P'],[10,1],[20,2],[30,3.5]],[[0,'POINT'],[10,4],[20,5]]));t('POINT with and without RL',r.points.length==2&&r.points[0].z==3.5&&r.points[1].z===null);
r=parseDXF(D([[0,'POLYLINE'],[8,'OLD'],[70,1]],[[0,'VERTEX'],[10,0],[20,0]],[[0,'VERTEX'],[10,5],[20,0]],[[0,'VERTEX'],[10,5],[20,5]],[[0,'SEQEND']]));t('old POLYLINE/VERTEX closed, 3 points',r.ents.length==1&&r.ents[0].closed&&r.ents[0].pts.length==3);
r=parseDXF(D([[0,'HATCH']],[[0,'INSERT']],[[0,'INSERT']],[[0,'SPLINE']],[[0,'LINE'],[10,0],[20,0],[11,1],[21,1]]));
t('unsupported entities counted, not dropped silently',r.unsupported.HATCH==1&&r.unsupported.INSERT==2&&r.unsupported.SPLINE==1&&r.supported.LINE==1);
t('binary DXF rejected',parseDXF('AutoCAD Binary DXF\r\n\x1a').errors.length==1);t('DWG rejected with advice',parseDXF('AC1027\0\0').errors[0].includes('DWG'));t('non-DXF rejected',parseDXF('hello world\nthis is not dxf').errors.length==1&&parseDXF('hello').errors.length==1&&parseDXF('').errors.length==1);
t('CRLF line endings work',parseDXF(D([[0,'LINE'],[10,0],[20,0],[11,1],[21,1]]).replace(/\n/g,'\r\n')).ents.length==1);
t('unit warning always present',parseDXF(D([[0,'LINE'],[10,0],[20,0],[11,1],[21,1]])).warnings.some(w=>w.includes('NO unit conversion')));
const P={crs:'',points:[{id:'1',e:500000.123,n:2500000.5,z:10.25,code:'BM'},{id:'2',e:5,n:6,z:null,code:'TREE'}],entities:[{type:'line',pts:[{e:0,n:0},{e:3,n:4}]},{type:'pline',closed:true,pts:[{e:0,n:0},{e:10,n:0},{e:10,n:10}]},{type:'text',pts:[{e:1,n:1}],text:'Hi',h:2}]};
r=parseDXF(toDXF(P));t('round trip own DXF: 2 POINT, 1 LINE, 1 closed LWPOLYLINE, text "Hi"',r.supported.POINT==2&&r.supported.LINE==1&&r.ents.some(e=>e.type=='pline'&&e.closed&&e.pts.length==3)&&r.ents.some(e=>e.text=='Hi'));
t('round trip exact coordinates; symbol INSERTs reported as unsupported',near(r.points[0].e,500000.123)&&near(r.points[0].n,2500000.5)&&r.points[0].z==10.25&&r.unsupported.INSERT==2);
// ---- GSI
let g=parseGSI('*110001+00000001 81..00+00001234 82..00+00005678 83..00-00000250 71....+00000CL1\n');t('GSI8 point: id 1, E 1.234, N 5.678, RL -0.250, code CL1',g.pts.length==1&&g.pts[0].id=='1'&&near(g.pts[0].e,1.234)&&near(g.pts[0].n,5.678)&&near(g.pts[0].z,-0.25)&&g.pts[0].code=='CL1');
g=parseGSI('*110002+0000000000000002 81..00+0000000500010000 82..00+0000002500000000 83..00+0000000000010250\n');t('GSI16 large coordinates 500010.000 / 2500000.000 / 10.250',near(g.pts[0].e,500010)&&near(g.pts[0].n,2500000)&&near(g.pts[0].z,10.25));
g=parseGSI('110003+00000003 81..06+0000000500010123 82..06+0000002500000456\n');t('unit digit 6 = 4 decimals, no RL -> null',near(g.pts[0].e,50001.0123)&&g.pts[0].z===null);
g=parseGSI('410001+00000001 84..00+00001000 85..00+00002000\n110005+00000005 21.022+00001234 22.022+00009000 31..00+00012345\n110006+00000006 81..00+00000100 82..00+00000200\n');
t('station and observation-only records skipped and reported',g.pts.length==1&&g.skipped.stations==1&&g.skipped.observations==1&&g.warnings.some(w=>w.includes('angles/distances')));
t('GSI with no coordinates -> error',parseGSI('110005+00000005 21.022+00001234\n').errors.length==1);t('unknown unit digit warned',parseGSI('110001+00000001 81..09+00001234 82..09+00005678\n').warnings.some(w=>w.includes('not known')));
t('feet digit warned',parseGSI('110001+00000001 81..01+00001234 82..01+00005678\n').warnings.some(w=>w.includes('feet')));
// ---- JobXML
const J='<JOBFile version="5.6"><FieldBook><Units><DistanceUnits>Metres</DistanceUnits></Units></FieldBook><Reductions>'+
 '<Point><Name>1</Name><Code>CL1</Code><Grid><North>2500000.000</North><East>500000.000</East><Elevation>10.250</Elevation></Grid></Point>'+
 '<Point><Name>2</Name><Code>TREE</Code><Grid><North>2500010.5</North><East>500020.25</East></Grid></Point>'+
 '<Point><Name>1</Name><Code>CL1 END</Code><Grid><North>2500001</North><East>500001</East><Elevation>10.3</Elevation></Grid></Point>'+
 '<Point><Name>3</Name><Code>X</Code></Point></Reductions></JOBFile>';
const j=parseJobXML(J);t('JobXML: 2 points, later record of point 1 wins',j.pts.length==2&&near(j.pts.find(p=>p.id=='1').n,2500001)&&j.pts.find(p=>p.id=='1').code=='CL1 END');
t('JobXML: point without elevation -> RL null; N/E not swapped',j.pts.find(p=>p.id=='2').z===null&&near(j.pts.find(p=>p.id=='2').e,500020.25)&&near(j.pts.find(p=>p.id=='2').n,2500010.5));
t('JobXML: replaced and gridless records reported',j.warnings.some(w=>w.includes('more than once'))&&j.warnings.some(w=>w.includes('no grid')));
t('JobXML feet warned',parseJobXML(J.replace('Metres','InternationalFeet')).warnings.some(w=>w.includes('feet')));t('non-JobXML rejected',parseJobXML('<x/>').errors.length==1);
t('JobXML deleted record removes the point',parseJobXML(J.replace('</Reductions>','<Point><Name>2</Name><Deleted>true</Deleted></Point></Reductions>')).pts.length==1);
// ---- LandXML
const lx=parseLandXML('<LandXML><Units><Metric linearUnit="meter"/></Units><CgPoints><CgPoint name="1" code="CL">2500000.000 500000.000 10.250</CgPoint><CgPoint name="2">2500010 500020</CgPoint><CgPoint name="3">abc</CgPoint></CgPoints></LandXML>');
t('LandXML: order N E Z converted to E,N,RL',lx.pts.length==2&&near(lx.pts[0].e,500000)&&near(lx.pts[0].n,2500000)&&near(lx.pts[0].z,10.25)&&lx.pts[0].code=='CL'&&lx.pts[1].z===null);
t('LandXML bad point reported, order noted',lx.warnings.some(w=>w.includes('skipped'))&&lx.warnings.some(w=>w.includes('Northing, Easting')));
process.exit(f?1:0);

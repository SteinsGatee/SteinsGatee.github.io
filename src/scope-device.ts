import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * FG-204 世界线示波器：程序生成的复古 CRT 示波器 3D 模型。
 * 屏幕是一块每帧重绘的 Canvas 纹理（余辉 + 刻度 + 读数），Bloom 让荧光真的发光。
 * 四个旋钮：MODE / TIME / AMPL / PHASE；按键：PWR / D-MAIL。
 */
export interface ScopeDevice {burst(to:string):void;screenPoint():{x:number;y:number};setReading(value:string,attractor:string,delay?:number):void;setAttractor(text:string):void}
interface Options {reduced:boolean;series:number[];reading:()=>string;attractor:()=>string;onDMail:()=>void}

const css=(name:string)=>getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const MODES=['WORLD LINE','SINE','LISSAJOUS','DIVERGENCE'] as const;
const W=4.2,H=2.7,DP=2.4,FRONT=DP/2;
const SCR={x:-.74,y:.1,w:1.9,h:1.5};

function roundedRect(w:number,h:number,r:number):THREE.Shape{
 const s=new THREE.Shape(),x=-w/2,y=-h/2;
 s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
 s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
}

export function mountScopeDevice(host:HTMLElement,o:Options):ScopeDevice{
 const mobile=matchMedia('(max-width: 720px)').matches;
 const renderer=new THREE.WebGLRenderer({antialias:!mobile,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(mobile?1.5:1.75,devicePixelRatio||1));
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 host.append(renderer.domElement);
 const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');

 const scene=new THREE.Scene();
 const pmrem=new THREE.PMREMGenerator(renderer);
 scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.4;
 const camera=new THREE.PerspectiveCamera(26,1,.1,100);

 let glow=new THREE.Color(),hot='#ffc670',rgb='255,138,40';
 const keyLight=new THREE.DirectionalLight('#ffe6c8',1.6);keyLight.position.set(-4,5,6);
 const rim=new THREE.DirectionalLight('#ff9a3c',1.1);rim.position.set(5,2,-4);
 const fill=new THREE.PointLight('#ff9a3c',1.6,5,2);fill.position.set(SCR.x,SCR.y,FRONT+1.2);
 scene.add(keyLight,rim,fill,new THREE.AmbientLight('#ffffff',.12));

 const rig=new THREE.Group();scene.add(rig);
 const mat={
  body:new THREE.MeshStandardMaterial({color:'#1d1e21',metalness:.8,roughness:.36}),
  panel:new THREE.MeshStandardMaterial({color:'#2e3035',metalness:.6,roughness:.48}),
  rubber:new THREE.MeshStandardMaterial({color:'#0a0a0b',metalness:.05,roughness:.85}),
  knob:new THREE.MeshStandardMaterial({color:'#111113',metalness:.35,roughness:.32}),
  silver:new THREE.MeshStandardMaterial({color:'#bdb9b2',metalness:1,roughness:.3}),
  brass:new THREE.MeshStandardMaterial({color:'#a8854d',metalness:1,roughness:.42}),
  dark:new THREE.MeshStandardMaterial({color:'#060607',metalness:.2,roughness:.6}),
 };

 // ---------- 机身 ----------
 rig.add(new THREE.Mesh(new RoundedBoxGeometry(W,H,DP,6,.16),mat.body));
 const panel=new THREE.Mesh(new RoundedBoxGeometry(W-.18,H-.18,.08,4,.03),mat.panel);panel.position.z=FRONT;rig.add(panel);
 // 散热槽
 for(let i=0;i<9;i++){const v=new THREE.Mesh(new THREE.BoxGeometry(2.6,.012,.06),mat.dark);v.position.set(.2,H/2+.002,-.8+i*.16);rig.add(v)}
 // 脚垫
 for(const x of [-1.7,1.7])for(const z of [-.9,.9]){const f=new THREE.Mesh(new THREE.CylinderGeometry(.14,.16,.1,24),mat.rubber);f.position.set(x,-H/2-.04,z);rig.add(f)}

 // ---------- 世界线变动率探测仪：装在示波器顶部的真空管阵列 ----------
 const MY=H/2,BASE=MY+.26,TZ=.18;
 const plinth=new THREE.Mesh(new RoundedBoxGeometry(3.78,.26,1.0,4,.06),mat.body);plinth.position.set(0,MY+.13,TZ);rig.add(plinth);
 for(const y of [MY+.235,MY+.025]){const trim=new THREE.Mesh(new THREE.BoxGeometry(3.66,.022,.02),mat.brass);trim.position.set(0,y,TZ+.505);rig.add(trim)}
 const glassMat=new THREE.MeshPhysicalMaterial({color:'#c9d2d8',metalness:0,roughness:.03,transparent:true,opacity:.07,envMapIntensity:1.1,clearcoat:1,clearcoatRoughness:.04,side:THREE.DoubleSide,depthWrite:false});
 const anodeMat=new THREE.LineBasicMaterial({color:'#4a4744',transparent:true,opacity:.5});
 const profile=[new THREE.Vector2(.205,0),new THREE.Vector2(.205,.56),...Array.from({length:9},(_,i)=>{const a=(i+1)/9*Math.PI/2;return new THREE.Vector2(.205*Math.cos(a),.56+.2*Math.sin(a))})];
 const tubeGeo=new THREE.LatheGeometry(profile,40),anodeGeo=new THREE.WireframeGeometry(new THREE.CylinderGeometry(.165,.165,.5,12,8,true));
 const DX=[-1.56,...Array.from({length:6},(_,i)=>-.86+i*.49)];
 const TW=192,TH=320;
 const tubes=DX.map(x=>{
  const g=new THREE.Group();g.position.set(x,BASE,TZ);rig.add(g);
  const socket=new THREE.Mesh(new THREE.CylinderGeometry(.22,.25,.1,32),mat.knob);socket.position.y=.05;g.add(socket);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.215,.014,8,40),mat.brass);ring.rotation.x=Math.PI/2;ring.position.y=.1;g.add(ring);
  const anode=new THREE.LineSegments(anodeGeo,anodeMat);anode.position.y=.4;g.add(anode);
  const c=document.createElement('canvas');c.width=TW;c.height=TH;const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const dmat=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});dmat.color.setScalar(1.35);
  const digit=new THREE.Mesh(new THREE.PlaneGeometry(.27,.45),dmat);digit.position.y=.4;g.add(digit);
  const shell=new THREE.Mesh(tubeGeo,glassMat);shell.position.y=.1;shell.renderOrder=2;g.add(shell);
  return{c,ctx:c.getContext('2d')!,tex,shown:'',target:'0',settle:0};
 });
 const dot=new THREE.Mesh(new THREE.SphereGeometry(.045,16,16),new THREE.MeshBasicMaterial({color:'#ffc670',toneMapped:false}));dot.position.set(-1.21,BASE+.16,TZ);rig.add(dot);
 function paintTube(t:typeof tubes[0],ch:string):void{
  if(t.shown===ch)return;t.shown=ch;const x=t.ctx;x.clearRect(0,0,TW,TH);x.textAlign='center';x.textBaseline='middle';x.font=`300 ${TH*.82}px "Share Tech Mono",monospace`;
  x.lineWidth=2;x.strokeStyle='rgba(210,170,120,.09)';for(const n of '0123456789')x.strokeText(n,TW/2,TH*.54);
  x.shadowColor=`rgb(${rgb})`;x.shadowBlur=34;x.lineWidth=11;x.strokeStyle=hot;x.strokeText(ch,TW/2,TH*.54);
  x.shadowBlur=10;x.lineWidth=3;x.strokeStyle="#ffe2b0";x.strokeText(ch,TW/2,TH*.54);x.shadowBlur=0;
  t.tex.needsUpdate=true;
 }
 // 底座丝印：名称 + 吸引场读数
 const PW=1536,PH=96,pc=document.createElement('canvas');pc.width=PW;pc.height=PH;const ptex=new THREE.CanvasTexture(pc);ptex.colorSpace=THREE.SRGBColorSpace;ptex.anisotropy=8;
 let attractorText='ATTRACTOR FIELD · β';
 function paintPlinth():void{const x=pc.getContext('2d')!;x.clearRect(0,0,PW,PH);x.textBaseline='middle';x.font='30px "Share Tech Mono",monospace';
  x.fillStyle=hot;x.textAlign='left';x.fillText('DIVERGENCE METER',24,PH/2);x.fillStyle='rgba(232,224,210,.7)';x.textAlign='center';x.fillText('世界線変動率',PW/2,PH/2);
  x.fillStyle=hot;x.textAlign='right';x.fillText(attractorText,PW-24,PH/2);ptex.needsUpdate=true}
 const plate=new THREE.Mesh(new THREE.PlaneGeometry(3.6,.225),new THREE.MeshBasicMaterial({map:ptex,transparent:true,depthWrite:false}));plate.position.set(0,MY+.13,TZ+.502);rig.add(plate);
 function setReading(value:string,attractor:string,delay=300):void{
  attractorText=attractor;paintPlinth();
  const digits=value.replace('.','').padEnd(7,'0').slice(0,7),now=performance.now();
  tubes.forEach((t,i)=>{t.target=digits[i];t.settle=o.reduced?0:now+delay+i*110});kick();
 }
 const shuffling=()=>tubes.some(t=>t.settle>performance.now());
 function updateTubes(now:number):void{for(const t of tubes)paintTube(t,now<t.settle?String(Math.floor(Math.random()*10)):t.target)}

 // ---------- 屏幕 ----------
 const bezelShape=roundedRect(SCR.w+.36,SCR.h+.36,.14);bezelShape.holes.push(roundedRect(SCR.w,SCR.h,.1) as unknown as THREE.Path);
 const bezel=new THREE.Mesh(new THREE.ExtrudeGeometry(bezelShape,{depth:.1,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:3}),mat.rubber);
 bezel.position.set(SCR.x,SCR.y,FRONT+.02);rig.add(bezel);
 const CW=mobile?768:1024,CH=Math.round(CW*SCR.h/SCR.w);
 const screen=document.createElement('canvas');screen.width=CW;screen.height=CH;const sx=screen.getContext('2d')!;
 const persist=document.createElement('canvas');persist.width=CW;persist.height=CH;const px=persist.getContext('2d')!;
 const tex=new THREE.CanvasTexture(screen);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
 const curve=(g:THREE.PlaneGeometry,amt:number)=>{const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i)/(SCR.w/2),y=p.getY(i)/(SCR.h/2);p.setZ(i,amt*(1-x*x*.6)*(1-y*y*.6))}g.computeVertexNormals();return g};
 const screenMat=new THREE.MeshBasicMaterial({map:tex,toneMapped:false});screenMat.color.setScalar(1.25);
 const scr=new THREE.Mesh(curve(new THREE.PlaneGeometry(SCR.w,SCR.h,24,24),.07),screenMat);scr.position.set(SCR.x,SCR.y,FRONT+.03);rig.add(scr);
 const glass=new THREE.Mesh(curve(new THREE.PlaneGeometry(SCR.w,SCR.h,24,24),.08),new THREE.MeshStandardMaterial({color:'#0b0b0c',metalness:0,roughness:.04,transparent:true,opacity:.22,depthWrite:false,envMapIntensity:2}));
 glass.position.set(SCR.x,SCR.y,FRONT+.045);rig.add(glass);

 // ---------- 旋钮与按键 ----------
 type Knob={id:'mode'|'time'|'ampl'|'phase';group:THREE.Group;value:number;steps?:number};
 const knobs:Knob[]=[];const pickables:THREE.Object3D[]=[];
 const knobAt=(id:Knob['id'],x:number,y:number,value:number,steps?:number)=>{
  const g=new THREE.Group();g.position.set(x,y,FRONT+.04);
  const skirt=new THREE.Mesh(new THREE.CylinderGeometry(.27,.29,.04,48),mat.silver);skirt.rotation.x=Math.PI/2;g.add(skirt);
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.2,.22,.2,48),mat.knob);body.rotation.x=Math.PI/2;body.position.z=.11;g.add(body);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.02,48),id==='mode'?mat.brass:mat.silver);cap.rotation.x=Math.PI/2;cap.position.z=.215;g.add(cap);
  const mark=new THREE.Mesh(new THREE.BoxGeometry(.03,.13,.012),new THREE.MeshBasicMaterial({color:'#fff3e0'}));mark.position.set(0,.08,.23);g.add(mark);
  g.userData={kind:'knob',id};rig.add(g);pickables.push(g);const k={id,group:g,value,steps};knobs.push(k);return k;
 };
 knobAt('mode',.95,.62,0,MODES.length);knobAt('time',1.62,.62,.45);knobAt('ampl',.95,-.18,.6);knobAt('phase',1.62,-.18,.3);
 const button=(id:string,x:number,y:number,color:string)=>{
  const g=new THREE.Group();g.position.set(x,y,FRONT+.04);
  const base=new THREE.Mesh(new RoundedBoxGeometry(.36,.2,.06,3,.02),mat.dark);g.add(base);
  const top=new THREE.Mesh(new RoundedBoxGeometry(.3,.15,.08,3,.025),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.6,metalness:.1,roughness:.4}));top.position.z=.05;g.add(top);
  g.userData={kind:'button',id,top};rig.add(g);pickables.push(g);return top;
 };
 const pwrTop=button('pwr',.95,-.86,'#ff3b30'),dmTop=button('dmail',1.62,-.86,'#ff9a3c');
 // BNC 接口
 for(const x of [-1.42,-.98]){const b=new THREE.Mesh(new THREE.CylinderGeometry(.09,.1,.16,24),mat.silver);b.rotation.x=Math.PI/2;b.position.set(x,-1.0,FRONT+.08);rig.add(b);
  const pin=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.18,12),mat.brass);pin.rotation.x=Math.PI/2;pin.position.set(x,-1.0,FRONT+.1);rig.add(pin)}
 // 指示灯
 const led=new THREE.Mesh(new THREE.SphereGeometry(.035,16,16),new THREE.MeshBasicMaterial({color:'#ff3b30',toneMapped:false}));led.position.set(-.3,-1.0,FRONT+.06);rig.add(led);

 // ---------- 丝印 ----------
 const DW=2048,DH=Math.round(DW*(H-.18)/(W-.18)),decal=document.createElement('canvas');decal.width=DW;decal.height=DH;
 const dtex=new THREE.CanvasTexture(decal);dtex.colorSpace=THREE.SRGBColorSpace;dtex.anisotropy=8;
 const toPx=(x:number,y:number):[number,number]=>[(x+(W-.18)/2)/(W-.18)*DW,((H-.18)/2-y)/(H-.18)*DH];
 function paintDecal():void{
  const d=decal.getContext('2d')!;d.clearRect(0,0,DW,DH);d.textAlign='center';d.textBaseline='middle';
  const ink='rgba(232,224,210,.82)',amber=hot;
  const label=(text:string,x:number,y:number,size:number,color=ink,font='"Share Tech Mono",monospace')=>{const [a,b]=toPx(x,y);d.font=`${size}px ${font}`;d.fillStyle=color;d.fillText(text,a,b)};
  label('FG-204',1.28,1.1,58,amber,'"Chakra Petch",sans-serif');label('WORLD LINE OSCILLOSCOPE',1.28,.96,26);
  for(const k of knobs){
   const [a,b]=toPx(k.group.position.x,k.group.position.y),r=.36/(W-.18)*DW;
   d.strokeStyle=ink;d.lineWidth=2;
   const n=k.steps??11;for(let i=0;i<n;i++){const ang=-Math.PI*.75+i/(n-1)*Math.PI*1.5-Math.PI/2;d.beginPath();d.moveTo(a+Math.cos(ang)*r,b+Math.sin(ang)*r);d.lineTo(a+Math.cos(ang)*(r+(i%5===0||k.steps?14:8)),b+Math.sin(ang)*(r+(i%5===0||k.steps?14:8)));d.stroke()}
   label({mode:'MODE',time:'TIME / DIV',ampl:'AMPL',phase:'PHASE'}[k.id],k.group.position.x,k.group.position.y-.41,30);
  }
  label('PWR',.95,-1.05,28);label('D-MAIL',1.62,-1.05,28,amber);
  label('CH1',-1.42,-1.17,26);label('CH2',-.98,-1.17,26);label('POWER',-.3,-1.15,22);
  label('FUTURE GADGET LAB · No.204',-.74,1.155,24,'rgba(232,224,210,.6)');
  dtex.needsUpdate=true;
 }
 const decalMesh=new THREE.Mesh(new THREE.PlaneGeometry(W-.18,H-.18),new THREE.MeshBasicMaterial({map:dtex,transparent:true,depthWrite:false}));decalMesh.position.z=FRONT+.041;rig.add(decalMesh);

 // 地面：接触阴影 + 屏幕光晕
 const floorCanvas=document.createElement('canvas');floorCanvas.width=floorCanvas.height=256;
 const floorTex=new THREE.CanvasTexture(floorCanvas);
 const paintFloor=()=>{const f=floorCanvas.getContext('2d')!,g=f.createRadialGradient(128,128,0,128,128,128);g.addColorStop(0,`rgba(${rgb},.35)`);g.addColorStop(.35,`rgba(${rgb},.08)`);g.addColorStop(1,'rgba(0,0,0,0)');f.clearRect(0,0,256,256);f.fillStyle=g;f.fillRect(0,0,256,256);f.fillStyle='rgba(0,0,0,.6)';f.beginPath();f.ellipse(128,128,70,40,0,0,7);f.filter='blur(12px)';f.fill();f.filter='none';floorTex.needsUpdate=true};
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(9,6),new THREE.MeshBasicMaterial({map:floorTex,transparent:true,depthWrite:false}));floor.rotation.x=-Math.PI/2;floor.position.y=-H/2-.09;floor.position.z=.2;rig.add(floor);

 // ---------- 后期 ----------
 const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
 const bloom=new UnrealBloomPass(new THREE.Vector2(256,256),.7,.5,.9);composer.addPass(bloom);composer.addPass(new OutputPass());

 function recolor():void{
  hot=css('--l4')||hot;rgb=css('--glow')||rgb;glow.set(`rgb(${rgb})`);
  scene.background=new THREE.Color(css('--bg')||'#050505');
  rim.color.copy(glow);fill.color.copy(glow);dmTop.material.color.copy(glow);dmTop.material.emissive.copy(glow);
  paintDecal();paintFloor();(dot.material as THREE.MeshBasicMaterial).color.set(hot);tubes.forEach(t=>t.shown='');paintPlinth();
 }

 // ---------- 屏幕内容 ----------
 let on=true,powerT=-10,mail:{to:string;t0:number}|null=null;
 const val=(id:Knob['id'])=>knobs.find(k=>k.id===id)!.value;
 const modeIndex=()=>Math.round(val('mode')*(MODES.length-1));
 const series=o.series.length?o.series:[0];
 const maxS=Math.max(1,...series);
 function beam(points:[number,number][],width=3.2):void{
  px.globalCompositeOperation='lighter';px.lineJoin='round';px.lineCap='round';
  const path=()=>{px.beginPath();points.forEach(([x,y],i)=>i?px.lineTo(x,y):px.moveTo(x,y))};
  path();px.strokeStyle=`rgba(${rgb},.25)`;px.lineWidth=width*4;px.stroke();
  path();px.strokeStyle=hot;px.lineWidth=width;px.stroke();
  path();px.strokeStyle='rgba(255,250,235,.8)';px.lineWidth=width*.35;px.stroke();
  px.globalCompositeOperation='source-over';
 }
 function drawScreen(t:number):void{
  const time=val('time'),amp=.25+val('ampl')*.75,phase=val('phase')*Math.PI*2,mode=MODES[modeIndex()];
  px.fillStyle=`rgba(1,2,1,${.2+(1-time)*.12})`;px.fillRect(0,0,CW,CH);
  const mid=CH/2,pts:[number,number][]=[];
  const mailAge=mail?t-mail.t0:-1;
  if(on){
   if(mail&&mailAge<1.8){
    // D-Mail：突发信号 + 干扰
    const k=Math.min(1,mailAge/.4);
    for(let x=0;x<=CW;x+=4){const u=x/CW;pts.push([x,mid+Math.sin(u*90+t*40)*CH*.32*k*Math.exp(-((u-mailAge/1.6)**2)*30)+(Math.random()-.5)*CH*.08*k])}
    beam(pts,3.6);
   }else if(mode==='WORLD LINE'){
    const speed=.5+time*4,off=t*speed;
    for(let x=0;x<=CW;x+=3){const u=x/CW*24+off,i=Math.floor(u),fr=u-i,a=series[((i%series.length)+series.length)%series.length]/maxS,b=series[(((i+1)%series.length)+series.length)%series.length]/maxS,v=a+(b-a)*(.5-Math.cos(fr*Math.PI)/2);
     pts.push([x,CH*.78-v*CH*.6*amp+Math.sin(x*.09+t*9+phase)*2.2])}
    beam(pts);
   }else if(mode==='SINE'){
    const cyc=1.5+time*6;
    for(let x=0;x<=CW;x+=3){const u=x/CW;pts.push([x,mid-Math.sin(u*cyc*Math.PI*2-t*4+phase)*CH*.36*amp-Math.sin(u*cyc*6*Math.PI-t*7)*CH*.03*amp])}
    beam(pts);
   }else if(mode==='LISSAJOUS'){
    const a=1+Math.round(time*4),b=a+1,d=t*.5+phase;
    for(let i=0;i<=720;i++){const th=i/720*Math.PI*2;pts.push([CW/2+Math.sin(a*th+d)*CW*.36*amp,mid+Math.sin(b*th)*CH*.38*amp])}
    beam(pts,2.6);
   }else{
    // DIVERGENCE：读数 + 随机微小漂移的轨迹
    for(let x=0;x<=CW;x+=4){const u=x/CW;pts.push([x,CH*.72+Math.sin(u*14+t*2+phase)*14*amp+Math.sin(u*41-t*5)*6])}
    beam(pts,2.4);
   }
  }
  // 合成：底色 → 余辉层 → 刻度 → 读数 → 暗角与扫描线
  sx.fillStyle='#020302';sx.fillRect(0,0,CW,CH);
  // CRT 开关机：压成一条线再到一个点
  const pAge=t-powerT,crt=on?Math.min(1,pAge/.45):Math.max(0,1-pAge/.35);
  sx.save();
  if(crt<1){const sy=Math.max(.004,crt<.5?crt*2*.02:.02+(crt-.5)*2*.98),sxx=crt<.5?Math.max(.02,crt*2):1;sx.translate(CW/2,CH/2);sx.scale(sxx,sy);sx.translate(-CW/2,-CH/2)}
  if(crt>0){
   sx.drawImage(persist,0,0);
   sx.strokeStyle=`rgba(${rgb},.16)`;sx.lineWidth=1.2;sx.beginPath();
   for(let i=1;i<10;i++){const x=i*CW/10;sx.moveTo(x,0);sx.lineTo(x,CH)}for(let i=1;i<8;i++){const y=i*CH/8;sx.moveTo(0,y);sx.lineTo(CW,y)}sx.stroke();
   sx.strokeStyle=`rgba(${rgb},.3)`;sx.beginPath();for(let i=0;i<=50;i++){const x=i*CW/50;sx.moveTo(x,CH/2-5);sx.lineTo(x,CH/2+5)}for(let i=0;i<=40;i++){const y=i*CH/40;sx.moveTo(CW/2-5,y);sx.lineTo(CW/2+5,y)}sx.stroke();
   sx.font=`${Math.round(CW/38)}px "Share Tech Mono",monospace`;sx.fillStyle=hot;sx.textBaseline='top';sx.textAlign='left';
   sx.fillText(`CH1  ${mode}`,CW*.03,CH*.035);sx.textAlign='right';sx.fillText(`${(.2+val('time')*4.8).toFixed(1)} ms/DIV`,CW*.97,CH*.035);
   sx.textBaseline='bottom';sx.textAlign='left';sx.fillText(`AMPL ${(amp*100|0)}%   φ ${(val('phase')*360|0)}°`,CW*.03,CH*.965);
   sx.textAlign='right';sx.fillText(mail&&mailAge<3.5?`D-MAIL → ${mail.to.replace(/-/g,'.')}`:o.reading(),CW*.97,CH*.965);
   if(mode==='DIVERGENCE'&&!(mail&&mailAge<1.8)){sx.textAlign='center';sx.textBaseline='middle';sx.font=`${Math.round(CW/7.5)}px "Share Tech Mono",monospace`;sx.shadowColor=hot;sx.shadowBlur=24;sx.fillText(o.reading(),CW/2,CH*.4);sx.shadowBlur=0}
   if(mail&&mailAge<3.5&&mailAge>1.8){sx.textAlign='center';sx.textBaseline='middle';sx.font=`${Math.round(CW/16)}px "Share Tech Mono",monospace`;sx.fillText('D-MAIL SENT',CW/2,CH*.42)}
  }
  sx.restore();
  // 暗角 + 扫描线
  const v=sx.createRadialGradient(CW/2,CH/2,CH*.3,CW/2,CH/2,CW*.65);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.75)');sx.fillStyle=v;sx.fillRect(0,0,CW,CH);
  sx.fillStyle='rgba(0,0,0,.18)';for(let y=0;y<CH;y+=3)sx.fillRect(0,y,CW,1);
  tex.needsUpdate=true;
  if(mail&&mailAge>4)mail=null;
 }

 // ---------- 布局与相机 ----------
 function resize():void{
  const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
  renderer.setSize(w,h,false);composer.setSize(w,h);bloom.resolution.set(w/2,h/2);
  camera.aspect=w/h;const t=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  camera.position.set(0,1.05,Math.max((4.1*1.18/2)/t,(W*1.16/2)/(t*camera.aspect)));camera.lookAt(0,.5,0);camera.updateProjectionMatrix();
 }

 // ---------- 交互 ----------
 const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
 let yaw=-.38,pitch=.12,tYaw=-.38,tPitch=.12,lastInput=-1e9,hoverObj:THREE.Object3D|null=null;
 let drag:{x:number;y:number;yaw:number;pitch:number;moved:boolean;knob?:Knob;start?:number;btn?:string}|null=null;
 const pick=(e:PointerEvent|WheelEvent):THREE.Object3D|null=>{
  const b=canvas.getBoundingClientRect();ndc.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);ray.setFromCamera(ndc,camera);
  const hit=ray.intersectObjects(pickables,true)[0];let obj:THREE.Object3D|null=hit?.object??null;while(obj&&!obj.userData.kind)obj=obj.parent;return obj;
 };
 const setKnob=(k:Knob,v:number)=>{k.value=Math.max(0,Math.min(1,k.steps?Math.round(v*(k.steps-1))/(k.steps-1):v));kick()};
 const press=(id:string)=>{
  const top=id==='pwr'?pwrTop:dmTop;top.position.z=.015;setTimeout(()=>{top.position.z=.05;kick()},140);
  if(id==='pwr'){on=!on;powerT=performance.now()/1000;(led.material as THREE.MeshBasicMaterial).color.set(on?'#ff3b30':'#2a0b09');pwrTop.material.emissiveIntensity=on?.6:.05}
  else o.onDMail();
  kick();
 };
 canvas.addEventListener('pointerdown',e=>{
  const obj=pick(e);lastInput=performance.now();
  drag={x:e.clientX,y:e.clientY,yaw:tYaw,pitch:tPitch,moved:false};
  if(obj?.userData.kind==='knob'){drag.knob=knobs.find(k=>k.id===obj.userData.id);drag.start=drag.knob!.value}
  else if(obj?.userData.kind==='button')drag.btn=obj.userData.id;
  canvas.setPointerCapture(e.pointerId);
 });
 canvas.addEventListener('pointermove',e=>{
  lastInput=performance.now();
  if(drag){
   const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;
   if(drag.knob){if(!drag.knob.steps||drag.moved)setKnob(drag.knob,drag.start!+(dx-dy)/180)}
   else if(!drag.btn){tYaw=Math.max(-1,Math.min(1,drag.yaw+dx*.005));if(e.pointerType==='mouse')tPitch=Math.max(-.15,Math.min(.45,drag.pitch+dy*.003))}
   kick();return;
  }
  const obj=pick(e);if(obj!==hoverObj){hoverObj=obj;canvas.style.cursor=obj?'pointer':'grab'}
 });
 canvas.addEventListener('pointerup',()=>{
  if(drag&&!drag.moved){if(drag.btn)press(drag.btn);else if(drag.knob?.steps){const k=drag.knob,next=Math.round(k.value*(k.steps!-1))+1;setKnob(k,next>=k.steps!?0:next/(k.steps!-1))}}
  drag=null;
 });
 canvas.addEventListener('wheel',e=>{const obj=pick(e);if(obj?.userData.kind!=='knob')return;e.preventDefault();const k=knobs.find(x=>x.id===obj.userData.id)!;setKnob(k,k.value+(e.deltaY<0?1:-1)*(k.steps?1/(k.steps-1):.04))},{passive:false});

 // ---------- 渲染循环 ----------
 let raf=0,visible=true,needs=true;
 function frame(now:number):void{
  const t=now/1000;
  if(!o.reduced&&now-lastInput>3000){tYaw=-.38+.22*Math.sin(t*.22);tPitch=.12+.05*Math.sin(t*.31)}
  yaw+=(tYaw-yaw)*.07;pitch+=(tPitch-pitch)*.07;
  rig.rotation.set(pitch,yaw,0);rig.position.y=o.reduced?0:Math.sin(t*.8)*.03;
  for(const k of knobs){const target=(.75-k.value*1.5)*Math.PI;k.group.rotation.z+=(target-k.group.rotation.z)*.25}
  drawScreen(t);updateTubes(now);composer.render();needs=shuffling();
  raf=visible&&!document.hidden&&(!o.reduced||needs)?requestAnimationFrame(frame):0;
 }
 const kick=()=>{needs=true;if(!raf)raf=requestAnimationFrame(frame)};
 recolor();resize();
 new ResizeObserver(()=>{resize();kick()}).observe(host);
 new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible)kick()}).observe(host);
 document.addEventListener('visibilitychange',kick);
 document.addEventListener('palette',()=>{recolor();kick()});
 document.fonts?.ready.then(()=>{paintDecal();paintPlinth();tubes.forEach(t=>t.shown='');kick()});
 setReading(o.reading(),o.attractor(),900);
 kick();
 if(o.reduced)setTimeout(kick,300);

 return{
  burst(to){mail={to,t0:performance.now()/1000};if(!on){on=true;powerT=mail.t0}lastInput=performance.now();tYaw=-.15;tPitch=.08;kick()},
  setReading,
  setAttractor(text){attractorText=text;paintPlinth();kick()},
  screenPoint(){const v=new THREE.Vector3(SCR.x,SCR.y,FRONT+.1);rig.localToWorld(v);v.project(camera);const b=canvas.getBoundingClientRect();return{x:b.left+(v.x+1)/2*b.width,y:b.top+(1-v.y)/2*b.height}},
 };
}

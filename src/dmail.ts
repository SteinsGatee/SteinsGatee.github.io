/**
 * D-Mail 发送动画（约 2.6s）：
 *   ① COMPOSE  复古手机屏逐字打出 D-Mail（≤36 字节，致敬原作）
 *   ② DISCHARGE 屏幕坍缩成光点，电弧劈向示波器上的目标日，时钟刻度环在目标处旋转
 *   ③ LEAP     白闪 + 色差，回到页面
 * 只用 transform / opacity 和一块全屏 canvas，保证顺滑。
 */
interface Options {to:string;text:string;target:()=>{x:number;y:number}|null;onLeap:()=>void}

const css=(name:string)=>getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const ease=(t:number)=>1-(1-t)**3;
const bytes=(s:string)=>new TextEncoder().encode(s).length;
function clip36(s:string):string{let out='';for(const ch of s){if(bytes(out+ch)>36)break;out+=ch}return out}

export function playDMail(o:Options):Promise<void>{
 const glow=css('--glow');let done=false;
 const root=document.createElement('div');root.className='dm';root.setAttribute('aria-hidden','true');
 const msg=clip36(o.text||'El Psy Kongroo');
 root.innerHTML=`<canvas class="dm-canvas"></canvas><div class="dm-phone"><div class="dm-top"><span>D-MAIL</span><span>▮▮▮ 36 BYTES</span></div><p class="dm-to">TO <b>${o.to.replace(/-/g,'.')}</b></p><p class="dm-body"><span></span><i>▌</i></p><div class="dm-bar"><span></span></div><p class="dm-state">COMPOSING…</p></div>`;
 document.body.append(root);
 const canvas=root.querySelector('canvas')!,ctx=canvas.getContext('2d')!,phone=root.querySelector<HTMLElement>('.dm-phone')!,body=root.querySelector<HTMLElement>('.dm-body span')!,bar=root.querySelector<HTMLElement>('.dm-bar span')!,state=root.querySelector<HTMLElement>('.dm-state')!;
 const dpr=Math.min(2,devicePixelRatio||1),W=innerWidth,H=innerHeight;canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
 requestAnimationFrame(()=>root.classList.add('in'));

 const T1=.75,T2=1.75,T3=2.6;let leapt=false,typed=0;
 // 电弧：中点位移法生成折线，每帧重算
 function bolt(x0:number,y0:number,x1:number,y1:number,rough:number,depth:number):[number,number][]{
  if(depth===0)return[[x0,y0],[x1,y1]];
  const mx=(x0+x1)/2+(Math.random()-.5)*rough,my=(y0+y1)/2+(Math.random()-.5)*rough;
  return[...bolt(x0,y0,mx,my,rough/2,depth-1),...bolt(mx,my,x1,y1,rough/2,depth-1).slice(1)];
 }
 const stroke=(pts:[number,number][],width:number,alpha:number)=>{ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.lineWidth=width;ctx.strokeStyle=`rgba(${glow},${alpha})`;ctx.stroke()};
 function rings(x:number,y:number,p:number,t:number){
  for(const [r,n,dir] of [[46,60,1],[74,36,-1],[104,12,1]] as const){
   const rad=r*(.6+.4*ease(Math.min(1,p*2)));ctx.save();ctx.translate(x,y);ctx.rotate(t*dir*1.6);
   ctx.strokeStyle=`rgba(${glow},${.55*(1-p*.6)})`;ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,rad,0,Math.PI*2);ctx.stroke();
   ctx.beginPath();for(let i=0;i<n;i++){const a=i/n*Math.PI*2,l=i%5?4:9;ctx.moveTo(Math.cos(a)*rad,Math.sin(a)*rad);ctx.lineTo(Math.cos(a)*(rad-l),Math.sin(a)*(rad-l))}ctx.stroke();ctx.restore();
  }
 }

 return new Promise(resolve=>{
  const t0=performance.now();
  function frame(now:number){
   if(done)return;const t=(now-t0)/1000;ctx.clearRect(0,0,W,H);
   if(t<T1){
    // ① 逐字输入
    const n=Math.floor([...msg].length*Math.min(1,t/(T1*.8)));
    if(n!==typed){typed=n;body.textContent=[...msg].slice(0,n).join('')}
    bar.style.transform=`scaleX(${Math.min(1,t/T1)})`;
   }else if(t<T2){
    if(!root.classList.contains('fire')){root.classList.add('fire');state.textContent='TRANSMITTING → WORLD LINE';body.textContent=msg}
    // ② 放电：从手机屏中心到目标日
    const p=(t-T1)/(T2-T1),tg=o.target()??{x:W/2,y:H*.6};
    const b=phone.getBoundingClientRect(),ox=b.left+b.width/2,oy=b.top+b.height/2;
    const head={x:ox+(tg.x-ox)*ease(Math.min(1,p*1.6)),y:oy+(tg.y-oy)*ease(Math.min(1,p*1.6))};
    ctx.globalCompositeOperation='lighter';
    const rough=Math.hypot(head.x-ox,head.y-oy)*.28;
    for(let k=0;k<3;k++){const pts=bolt(ox,oy,head.x,head.y,rough,6);stroke(pts,6,.08);stroke(pts,2,.35);stroke(pts,.8,.95)}
    // 分叉
    if(Math.random()<.7){const pts=bolt(ox,oy,head.x,head.y,rough,5),i=Math.floor(pts.length*(.3+Math.random()*.5)),[bx,by]=pts[i];stroke(bolt(bx,by,bx+(Math.random()-.5)*160,by+(Math.random()-.2)*120,50,4),1,.5)}
    const g=ctx.createRadialGradient(head.x,head.y,0,head.x,head.y,40);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(.25,`rgba(${glow},.7)`);g.addColorStop(1,`rgba(${glow},0)`);
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(head.x,head.y,40,0,7);ctx.fill();
    rings(tg.x,tg.y,p,t);
    ctx.globalCompositeOperation='source-over';
   }else{
    // ③ 时间跳跃
    if(!leapt){leapt=true;root.classList.add('leap');o.onLeap()}
    const p=(t-T2)/(T3-T2),tg=o.target();
    if(tg){ctx.globalCompositeOperation='lighter';rings(tg.x,tg.y,.5+p/2,t);ctx.globalCompositeOperation='source-over'}
    ctx.fillStyle=`rgba(255,255,255,${Math.max(0,.5-p*1.2)})`;ctx.fillRect(0,0,W,H);
   }
   if(t<T3)requestAnimationFrame(frame);
   else{done=true;root.classList.add('out');setTimeout(()=>{root.remove();resolve()},350)}
  }
  requestAnimationFrame(frame);
  root.addEventListener('click',()=>{done=true;if(!leapt){leapt=true;o.onLeap()}root.remove();resolve()},{once:true});
 });
}

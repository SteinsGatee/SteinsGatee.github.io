/** 全屏粒子层：缓慢漂浮的光尘 + 点击时迸发的火花。pointer-events:none，不挡交互。 */
interface Spark {x:number;y:number;vx:number;vy:number;life:number;max:number;size:number;hot:boolean}

export function createFx(reduced:boolean):{burst:(x:number,y:number,power?:number)=>void;recolor:()=>void}{
 const canvas=document.createElement('canvas');canvas.className='fx';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);
 const ctx=canvas.getContext('2d')!;
 let w=0,h=0,dpr=1,color='255,170,60',hot='255,240,210',raf=0;
 const motes:Spark[]=[],sparks:Spark[]=[];
 const resize=()=>{dpr=Math.min(2,devicePixelRatio||1);w=innerWidth;h=innerHeight;canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)};
 const recolor=()=>{const s=getComputedStyle(document.documentElement);color=s.getPropertyValue('--spark').trim()||color;hot=s.getPropertyValue('--spark-hot').trim()||hot};
 resize();recolor();addEventListener('resize',resize);
 if(!reduced)for(let i=0;i<Math.min(70,Math.round(w*h/22000));i++)motes.push({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.15,vy:-.05-Math.random()*.25,life:Math.random()*600,max:600,size:.6+Math.random()*1.6,hot:false});

 function frame(){
  ctx.clearRect(0,0,w,h);ctx.globalCompositeOperation='lighter';
  for(const m of motes){
   m.x+=m.vx;m.y+=m.vy;m.life++;
   if(m.y<-10||m.life>m.max){m.x=Math.random()*w;m.y=h+10;m.life=0}
   const a=Math.sin(m.life/m.max*Math.PI)*.35;
   ctx.fillStyle=`rgba(${color},${a})`;ctx.beginPath();ctx.arc(m.x,m.y,m.size,0,7);ctx.fill();
  }
  for(let i=sparks.length-1;i>=0;i--){
   const s=sparks[i];s.x+=s.vx;s.y+=s.vy;s.vx*=.965;s.vy=s.vy*.965+.06;s.life++;
   if(s.life>s.max){sparks.splice(i,1);continue}
   const t=1-s.life/s.max;
   ctx.strokeStyle=`rgba(${s.hot?hot:color},${t})`;ctx.lineWidth=s.size*t+.3;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x-s.vx*3,s.y-s.vy*3);ctx.stroke();
  }
  ctx.globalCompositeOperation='source-over';
  raf=document.hidden?0:requestAnimationFrame(frame);
 }
 const start=()=>{if(!raf&&!reduced)raf=requestAnimationFrame(frame)};
 document.addEventListener('visibilitychange',start);start();

 return{
  recolor,
  burst(x,y,power=1){
   if(reduced)return;
   const n=Math.round(26*power);
   for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=(1.5+Math.random()*4.5)*power;sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-1.5,life:0,max:35+Math.random()*35,size:1+Math.random()*1.8,hot:Math.random()<.35})}
   start();
  },
 };
}

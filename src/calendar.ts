import type {Entry} from './journal';
import {dateKey,parseKey,addDays,escape,plain} from './util';
import {createFx} from './fx';
import type {ScopeDevice} from './scope-device';
import {playDMail} from './dmail';

type View='year'|'month';
type Range={kind:'rolling'}|{kind:'year';year:number};
const WEEK=['一','二','三','四','五','六','日'];
const wd=(d:Date):number=>(d.getDay()+6)%7;
const diff=(a:Date,b:Date):number=>Math.round((b.getTime()-a.getTime())/864e5);
const human=(d:Date):string=>`${d.getMonth()+1}月${d.getDate()}日 周${WEEK[wd(d)]}`;

export function mountCalendar(root:HTMLElement,entries:Map<string,Entry>):void{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const fx=createFx(reduced);
 document.addEventListener('palette',()=>fx.recolor());
 document.addEventListener('burst',e=>{const {x,y}=(e as CustomEvent<{x:number;y:number}>).detail;fx.burst(x,y,1.3)});
 const $=<T extends HTMLElement>(sel:string)=>root.querySelector<T>(sel)!;
 const board=$('#board'),stage=$('.stage'),controls=$('#controls'),panel=$('#day'),recent=$('#recent'),nixie=$('#nixie'),stats=$('#stats');
 const tip=document.createElement('div');tip.className='tip';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.append(tip);

 const today=new Date();const todayKey=dateKey(today);
 const keys=[...entries.keys()].sort();
 let view:View='year',range:Range={kind:'rolling'},month=new Date(today.getFullYear(),today.getMonth(),1),selected=todayKey;

 // ---------- 统计 + 辉光管 ----------
 function streaks():{current:number;longest:number}{
  let longest=0,run=0,prev:Date|null=null;
  for(const k of keys){const d=parseKey(k);run=prev&&diff(prev,d)===1?run+1:1;longest=Math.max(longest,run);prev=d}
  let current=0,d=entries.has(todayKey)?today:addDays(today,-1);
  while(entries.has(dateKey(d))){current++;d=addDays(d,-1)}
  return{current,longest};
 }
 const {current,longest}=streaks();
 const items=[...entries.values()].reduce((n,e)=>n+e.weight,0);
 const thisYear=keys.filter(k=>k.startsWith(String(today.getFullYear()))).length;
 stats.innerHTML=[[keys.length,'点亮的日子'],[current,'当前连续'],[longest,'最长连续'],[items,'条记录'],[thisYear,`${today.getFullYear()} 年`]]
  .map(([n,label])=>`<div class="stat"><b data-count="${n}">0</b><span>${label}</span></div>`).join('');
 stats.querySelectorAll<HTMLElement>('[data-count]').forEach((el,i)=>{
  const target=+el.dataset.count!;if(reduced){el.textContent=String(target);return}
  const t0=performance.now()+i*120;const tick=(t:number)=>{const p=Math.min(1,Math.max(0,(t-t0)/1100));el.textContent=String(Math.round(target*(1-(1-p)**4)));if(p<1)requestAnimationFrame(tick)};requestAnimationFrame(tick);
 });

 // 辉光管：每位数字随机跳动，再从左到右依次定格
 const shuffles=new WeakMap<HTMLElement,number>();
 function tubes(el:HTMLElement,text:string,delay=250,step=70):void{
  // 每根管：叠放的 0–9 阴极（暗）+ 点亮的那一位
  const ghost=`<i aria-hidden="true">${[...'0123456789'].map(n=>`<s>${n}</s>`).join('')}</i>`;
  if(el.childElementCount!==text.length)el.innerHTML=[...text].map(c=>c==='.'?'<span class="dot"><b>.</b></span>':`<span class="tube">${ghost}<b>0</b></span>`).join('');
  el.setAttribute('aria-label',text);
  const cells=[...el.querySelectorAll<HTMLElement>(':scope>span')],lit=cells.map(c=>c.querySelector('b')!);
  cancelAnimationFrame(shuffles.get(el)??0);
  if(reduced){lit.forEach((t,i)=>t.textContent=text[i]);return}
  const t0=performance.now();
  const frame=(t:number)=>{let done=true;cells.forEach((tube,i)=>{if(text[i]==='.')return;if(t<t0+delay+i*step){done=false;lit[i].textContent=String(Math.floor(Math.random()*10));tube.classList.add('flick')}else{lit[i].textContent=text[i];tube.classList.remove('flick')}});if(!done)shuffles.set(el,requestAnimationFrame(frame))};
  shuffles.set(el,requestAnimationFrame(frame));
 }
 const showNixie=(key:string)=>tubes(nixie,key.replace(/-/g,'.'),150,45);

 // 世界线变动率：每一天对应一条世界线。有记录的日子落在 β 吸引场（1.xxxxxx），空白的日子落在 α（0.xxxxxx）
 const meter=document.querySelector<HTMLElement>('#divergence'),attractor=document.querySelector<HTMLElement>('#attractor'),status=document.querySelector<HTMLElement>('#dmail-status');
 const divergence=(k:string)=>{let hsh=2166136261;for(const c of k)hsh=Math.imul(hsh^c.charCodeAt(0),16777619);const e=entries.get(k);return(e?1:0)+((hsh>>>0)%1000000+(e?.weight??0)*7919)%1000000/1e6};
 let reading=divergence(todayKey);
 let attractorLabel='ATTRACTOR FIELD · β',device:ScopeDevice|null=null;
 const showMeter=(v:number,delay=500)=>{if(meter)tubes(meter,v.toFixed(6),delay,110);device?.setReading(v.toFixed(6),attractorLabel,delay)};
 const showAttractor=(v:number,delta?:number)=>{attractorLabel=`ATTRACTOR FIELD · ${v>=1?'β':'α'}${delta===undefined?'':`  Δ${delta>=0?'+':''}${delta.toFixed(6)}`}`;if(attractor)attractor.textContent=attractorLabel;device?.setAttractor(attractorLabel)};
 showMeter(reading,900);showAttractor(reading);
 // D-Mail：随机选一个有记录的过去日子，示波器把信号送到那一天，世界线随之变动
 let sending=false;
 const dmailBtn=document.querySelector<HTMLButtonElement>('#dmail');
 async function sendDMail():Promise<void>{
  const past=keys.filter(k=>k<=todayKey&&k!==selected);if(sending||!past.length)return;sending=true;
  const k=past[Math.floor(Math.random()*past.length)];if(dmailBtn)dmailBtn.disabled=true;
  if(status)status.textContent=`D-MAIL 发送中 → ${k.replace(/-/g,'.')}`;
  const e2=entries.get(k),summary=e2?.title||plain(e2?.html??'');
  const next=divergence(k),delta=next-reading;
  const leap=()=>{reading=next;showMeter(next,120);showAttractor(next,delta);if(!reduced){document.documentElement.classList.remove('timeleap');void document.documentElement.offsetWidth;document.documentElement.classList.add('timeleap');setTimeout(()=>document.documentElement.classList.remove('timeleap'),900)}};
  device?.burst(k);
  if(reduced)leap();
  else await playDMail({to:k,text:`回到这一天：${summary}`,target:()=>device?.screenPoint()??null,onLeap:leap});
  select(k,{ripple:true});
  if(status)status.innerHTML=`D-MAIL 已送达 <b>${k.replace(/-/g,'.')}</b> · ${escape(summary.slice(0,40)||'那一天')}`;
  if(dmailBtn)dmailBtn.disabled=false;sending=false;
 }
 dmailBtn?.addEventListener('click',()=>void sendDMail());

 meter?.addEventListener('click',()=>showMeter(reading,300));
 nixie.addEventListener('click',()=>showNixie(selected));

 // ---------- 控制条 ----------
 const years=[...new Set([today.getFullYear(),...keys.map(k=>+k.slice(0,4))])].sort((a,b)=>b-a);
 function renderControls():void{
  const rangeChips=[`<button type="button" data-range="rolling" aria-pressed="${range.kind==='rolling'}">过去一年</button>`,...years.map(y=>`<button type="button" data-range="${y}" aria-pressed="${range.kind==='year'&&range.year===y}">${y}</button>`)].join('');
  const monthNav=`<button type="button" class="arrow" data-month="-1" aria-label="上个月">‹</button><strong>${month.getFullYear()} 年 ${month.getMonth()+1} 月</strong><button type="button" class="arrow" data-month="1" aria-label="下个月">›</button>`;
  controls.innerHTML=`<div class="seg" role="group" aria-label="视图"><button type="button" data-view="year" aria-pressed="${view==='year'}">热力图</button><button type="button" data-view="month" aria-pressed="${view==='month'}">月历</button></div><div class="ranges">${view==='year'?rangeChips:monthNav}</div><div class="legend" aria-hidden="true">少${[0,1,2,3,4].map(l=>`<i data-l="${l}"></i>`).join('')}多</div>`;
 }
 controls.addEventListener('click',e=>{
  const b=(e.target as HTMLElement).closest('button');if(!b)return;
  if(b.dataset.view){view=b.dataset.view as View;month=new Date(parseKey(selected).getFullYear(),parseKey(selected).getMonth(),1);draw(true)}
  else if(b.dataset.range){range=b.dataset.range==='rolling'?{kind:'rolling'}:{kind:'year',year:+b.dataset.range};draw(true)}
  else if(b.dataset.month){month=new Date(month.getFullYear(),month.getMonth()+ +b.dataset.month,1);draw(true)}
 });

 // ---------- 热力图 / 月历 ----------
 function bounds():{start:Date;end:Date}{
  if(range.kind==='rolling')return{start:addDays(today,-364),end:today};
  return{start:new Date(range.year,0,1),end:new Date(range.year,11,31)};
 }
 const cellLabel=(d:Date,e?:Entry)=>`${human(d)}，${e?`${e.weight} 条记录`:'没有记录'}`;
 function renderYear():string{
  const {start,end}=bounds();const first=addDays(start,-wd(start));const cols=Math.ceil((diff(first,end)+1)/7);
  const out:string[]=[];
  WEEK.forEach((w,r)=>{if(r%2===0)out.push(`<span class="wlabel" style="grid-area:${r+2}/1">${w}</span>`)});
  for(let c=0;c<cols;c++){
   const firstOfMonth=[...Array(7)].map((_,r)=>addDays(first,c*7+r)).find(d=>d.getDate()===1&&d>=start&&d<=end);
   const d0=addDays(first,c*7);
   if(firstOfMonth||(c===0&&d0.getDate()<22))out.push(`<span class="mlabel" style="grid-area:1/${c+2}/2/span 4">${(firstOfMonth??addDays(first,6)).getMonth()+1}月</span>`);
   for(let r=0;r<7;r++){
    const d=addDays(first,c*7+r);const area=`grid-area:${r+2}/${c+2}`;
    if(d<start||d>end){out.push(`<span class="cell out" style="${area}"></span>`);continue}
    const k=dateKey(d),e=entries.get(k);
    out.push(`<button type="button" class="cell${k===todayKey?' today':''}${d>today?' future':''}" data-date="${k}" data-l="${e?.level??0}" data-c="${c}" data-r="${r}" tabindex="-1" style="${area};--i:${c+r}" aria-label="${cellLabel(d,e)}"></button>`);
   }
  }
  board.style.setProperty('--cols',String(cols));
  return out.join('');
 }
 function renderMonth():string{
  const first=month,lead=wd(first),days=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();
  const out=WEEK.map(w=>`<span class="mhead">${w}</span>`);
  for(let i=0;i<lead;i++)out.push('<span class="mcell out"></span>');
  for(let n=1;n<=days;n++){
   const d=new Date(first.getFullYear(),first.getMonth(),n),k=dateKey(d),e=entries.get(k),slot=lead+n-1;
   const preview=e?escape(e.title||plain(e.html)).slice(0,40):'';
   out.push(`<button type="button" class="mcell cell${k===todayKey?' today':''}${d>today?' future':''}" data-date="${k}" data-l="${e?.level??0}" data-c="${slot%7}" data-r="${Math.floor(slot/7)}" style="--i:${slot%7+Math.floor(slot/7)}" aria-label="${cellLabel(d,e)}"><b>${n}</b>${e?.mood?`<em>${e.mood}</em>`:''}<small>${preview}</small></button>`);
  }
  return out.join('');
 }
 function draw(animate:boolean):void{
  renderControls();
  board.className=`board ${view}${animate&&!reduced?' enter':''}`;
  board.innerHTML=view==='year'?renderYear():renderMonth();
  if(animate&&!reduced)setTimeout(()=>board.classList.remove('enter'),1600);
  tip.hidden=true;mark();reveal();
 }
 // 窄屏时热力图横向滚动：让选中的那天（默认今天）出现在可视区域
 function reveal():void{
  const scroller=board.parentElement!,c=cellOf(selected);if(!c||scroller.scrollWidth<=scroller.clientWidth)return;
  scroller.scrollLeft=c.offsetLeft-scroller.clientWidth/2;
 }
 const cells=()=>[...board.querySelectorAll<HTMLElement>('.cell[data-date]')];
 const cellOf=(k:string)=>board.querySelector<HTMLElement>(`.cell[data-date="${k}"]`);
 function mark():void{
  board.querySelector('.sel')?.classList.remove('sel');
  cells().forEach(c=>c.tabIndex=-1);
  const c=cellOf(selected)??cellOf(todayKey)??cells()[0];
  if(c){c.tabIndex=0;if(c.dataset.date===selected)c.classList.add('sel')}
  rects=null;
 }
 function ensureVisible(k:string):boolean{
  const d=parseKey(k);
  if(view==='month'){if(d.getFullYear()!==month.getFullYear()||d.getMonth()!==month.getMonth()){month=new Date(d.getFullYear(),d.getMonth(),1);return true}return false}
  const {start,end}=bounds();if(d>=start&&d<=end)return false;
  range=diff(d,today)<=364&&d<=today?{kind:'rolling'}:{kind:'year',year:d.getFullYear()};return true;
 }

 // ---------- 选中一天 ----------
 const neighbour=(k:string,dir:1|-1)=>dir>0?keys.find(x=>x>k):[...keys].reverse().find(x=>x<k);
 function renderPanel():void{
  const d=parseKey(selected),e=entries.get(selected);
  const empty=selected>todayKey?'这一天还没有到来。世界线尚未收束。':selected===todayKey?'今天还是空白的一页，去做点什么吧。':'这一天没有留下记录 —— 也许只是安静地过去了。';
  const prev=neighbour(selected,-1),next=neighbour(selected,1);
  panel.innerHTML=`<header class="day-head"><p class="eyebrow">D-MAIL · ${d.getFullYear()}</p><h2>${human(d)}${e?.mood?` <span class="mood">${e.mood}</span>`:''}</h2>${e?.tags.length?`<div class="tags">${e.tags.map(t=>`<span>#${escape(t)}</span>`).join('')}</div>`:''}</header><div class="day-body prose">${e?e.html:`<p class="empty-day">${empty}</p>`}</div><nav class="day-nav" aria-label="切换记录日"><button type="button" data-go="${prev??''}" ${prev?'':'disabled'}>← 上一个记录日</button>${selected!==todayKey?`<button type="button" data-go="${todayKey}">回到今天</button>`:''}<button type="button" data-go="${next??''}" ${next?'':'disabled'}>下一个记录日 →</button></nav>`;
  if(!reduced){panel.classList.remove('switch');void panel.offsetWidth;panel.classList.add('switch')}
 }
 panel.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button[data-go]');if(b?.dataset.go)select(b.dataset.go,{ripple:true,focus:false})});

 function select(k:string,{ripple:wave=false,focus=false}={}):void{
  selected=k;
  if(ensureVisible(k))draw(false);else{mark();reveal()}
  const c=cellOf(k);
  if(c&&wave){waveFrom(c);const r=c.getBoundingClientRect();fx.burst(r.left+r.width/2,r.top+r.height/2,entries.has(k)?1:.45)}
  if(c&&focus)c.focus({preventScroll:true});
  renderPanel();showNixie(k);renderRecent();
  history.replaceState(null,'',`#${k}`);
 }

 // 涟漪：以被点击的格子为圆心，按距离延迟依次点亮
 let waveTimer=0;
 function waveFrom(origin:HTMLElement):void{
  if(reduced)return;
  const oc=+origin.dataset.c!,or=+origin.dataset.r!;let max=0;
  for(const c of cells()){const d=Math.hypot(+c.dataset.c!-oc,+c.dataset.r!-or);max=Math.max(max,d);c.style.setProperty('--d',d.toFixed(2))}
  board.classList.remove('wave');void board.offsetWidth;board.classList.add('wave');
  clearTimeout(waveTimer);waveTimer=window.setTimeout(()=>board.classList.remove('wave'),max*24+900);
 }

 board.addEventListener('click',e=>{const c=(e.target as HTMLElement).closest<HTMLElement>('.cell[data-date]');if(c)select(c.dataset.date!,{ripple:true})});
 board.addEventListener('keydown',e=>{
  const c=(e.target as HTMLElement).closest<HTMLElement>('.cell[data-date]');if(!c)return;
  const step=view==='year'?{ArrowUp:-1,ArrowDown:1,ArrowLeft:-7,ArrowRight:7}:{ArrowUp:-7,ArrowDown:7,ArrowLeft:-1,ArrowRight:1};
  const n=step[e.key as keyof typeof step];if(n===undefined)return;
  e.preventDefault();const k=dateKey(addDays(parseKey(c.dataset.date!),n));
  const next=cellOf(k);if(next){c.tabIndex=-1;next.tabIndex=0;next.focus()}
 });

 // ---------- 悬浮提示 ----------
 function showTip(c:HTMLElement):void{
  const k=c.dataset.date!,e=entries.get(k);
  tip.innerHTML=`<b>${human(parseKey(k))}${e?.mood?` ${e.mood}`:''}</b><span>${e?`${e.weight} 条记录${e.title?` · ${escape(e.title)}`:''}`:k>todayKey?'未来':'没有记录'}</span>`;
  tip.hidden=false;
  const r=c.getBoundingClientRect(),tw=tip.offsetWidth;
  tip.style.left=`${Math.max(8,Math.min(innerWidth-tw-8,r.left+r.width/2-tw/2))}px`;tip.style.top=`${r.top-tip.offsetHeight-10}px`;
 }
 board.addEventListener('pointerover',e=>{const c=(e.target as HTMLElement).closest<HTMLElement>('.cell[data-date]');if(c)showTip(c)});
 board.addEventListener('focusin',e=>{const c=(e.target as HTMLElement).closest<HTMLElement>('.cell[data-date]');if(c)showTip(c)});
 board.addEventListener('focusout',()=>tip.hidden=true);

 // ---------- 透镜 + 3D 倾斜 ----------
 let rects:{el:HTMLElement;x:number;y:number}[]|null=null,px=0,py=0,lensRaf=0;
 const lens=()=>{
  lensRaf=0;if(view!=='year')return;
  rects??=cells().map(el=>{el.style.scale='';const r=el.getBoundingClientRect();return{el,x:r.left+r.width/2,y:r.top+r.height/2}});
  const R=Math.max(70,board.clientWidth/12);
  for(const {el,x,y} of rects){const f=Math.max(0,1-Math.hypot(x-px,y-py)/R);el.style.scale=f>0?String(1+f*f*.75):''}
  const b=stage.getBoundingClientRect();
  stage.style.setProperty('--rx',`${((py-b.top)/b.height-.5)*-7}deg`);stage.style.setProperty('--ry',`${((px-b.left)/b.width-.5)*9}deg`);
  stage.style.setProperty('--mx',`${px-b.left}px`);stage.style.setProperty('--my',`${py-b.top}px`);
 };
 if(!reduced&&matchMedia('(hover: hover)').matches){
  stage.addEventListener('pointermove',e=>{px=e.clientX;py=e.clientY;lensRaf||=requestAnimationFrame(lens)});
  stage.addEventListener('pointerleave',()=>{tip.hidden=true;cancelAnimationFrame(lensRaf);lensRaf=0;rects?.forEach(r=>r.el.style.scale='');stage.style.setProperty('--rx','0deg');stage.style.setProperty('--ry','0deg')});
  addEventListener('scroll',()=>rects=null,{passive:true});addEventListener('resize',()=>rects=null);
 }else board.addEventListener('pointerleave',()=>tip.hidden=true);

 // ---------- 最近记录 ----------
 function renderRecent():void{
  const list=[...keys].reverse().slice(0,8);
  recent.innerHTML=`<p class="hud-label"><span>RECENT D-MAIL</span><span>最近的记录</span></p>${list.length?`<ol>${list.map(k=>{const e=entries.get(k)!;return`<li><button type="button" data-go="${k}" ${k===selected?'aria-current="true"':''}><i data-l="${e.level}"></i><time datetime="${k}">${k.slice(5).replace('-','.')}</time><span>${e.mood?`${e.mood} `:''}${escape(e.title||plain(e.html)).slice(0,36)}</span></button></li>`}).join('')}</ol>`:'<p class="empty-day">还没有任何记录。</p>'}`;
 }
 recent.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button[data-go]');if(b)select(b.dataset.go!,{ripple:true})});

 // ---------- 3D 示波器（three.js 懒加载） ----------
 const deviceHost=document.querySelector<HTMLElement>('#scope3d');
 if(deviceHost){
  const series=Array.from({length:120},(_,i)=>entries.get(dateKey(addDays(today,i-119)))?.weight??0);
  import('./scope-device').then(({mountScopeDevice})=>{
   try{device=mountScopeDevice(deviceHost,{reduced,series,reading:()=>reading.toFixed(6),attractor:()=>attractorLabel,onDMail:()=>void sendDMail()});deviceHost.classList.add('ready');deviceHost.closest('.hero')?.classList.add('has-3d')}
   catch(err){deviceHost.classList.add('failed');console.warn('scope',err)}
  });
 }

 // ---------- 启动 ----------
 const hash=decodeURIComponent(location.hash.slice(1));
 if(/^\d{4}-\d{2}-\d{2}$/.test(hash))selected=hash;
 ensureVisible(selected);draw(true);renderPanel();renderRecent();showNixie(selected);
 if(hash){const c=cellOf(selected);if(c)setTimeout(()=>waveFrom(c),900)}
}

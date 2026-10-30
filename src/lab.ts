/** 页面增强：时钟指针、Mermaid 流程图与预览器、代码复制、阅读进度/目录、报告筛选、开机序列。 */
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

export function enhance():void{
 clockHands();diagrams();copyButtons();readingProgress();filters();
}

// ---------- 页头时钟 ----------
function clockHands():void{
 const el=document.querySelector<HTMLElement>('#clock');if(!el)return;
 const pad=(n:number)=>String(n).padStart(2,'0');
 const tick=()=>{const d=new Date();el.textContent=`${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`};
 tick();setInterval(tick,1000);
}

// ---------- Mermaid ----------
type MermaidAPI=typeof import('mermaid').default;
let mermaidLoad:Promise<MermaidAPI>|null=null;
const css=(name:string)=>getComputedStyle(document.documentElement).getPropertyValue(name).trim();
async function drawDiagrams(figures:HTMLElement[]):Promise<void>{
 const mermaid=await(mermaidLoad??=import('mermaid').then(m=>m.default));
 mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'base',fontFamily:css('--mono'),themeVariables:{
  darkMode:true,background:'transparent',fontSize:'14px',
  primaryColor:css('--panel-2'),primaryTextColor:css('--ink'),primaryBorderColor:css('--accent'),
  secondaryColor:css('--l1'),tertiaryColor:css('--panel'),lineColor:css('--accent'),textColor:css('--ink'),
  mainBkg:css('--panel-2'),nodeBorder:css('--accent'),clusterBkg:'rgba(255,255,255,0.02)',clusterBorder:css('--line'),
  edgeLabelBackground:css('--panel'),actorBkg:css('--panel-2'),actorBorder:css('--accent'),actorTextColor:css('--ink'),signalColor:css('--ink'),signalTextColor:css('--ink'),
  labelBoxBkgColor:css('--panel-2'),labelBoxBorderColor:css('--accent'),noteBkgColor:css('--l1'),noteTextColor:css('--ink'),noteBorderColor:css('--accent'),
  activationBkgColor:css('--l1'),activationBorderColor:css('--accent'),sequenceNumberColor:'#000',
 }});
 for(const [i,figure] of figures.entries()){
  const source=figure.dataset.source??=figure.querySelector('pre')!.textContent!;
  try{const {svg}=await mermaid.render(`mmd-${i}-${Date.now()}`,source);figure.querySelector('.diagram-view')?.remove();figure.querySelector('pre')!.hidden=true;figure.insertAdjacentHTML('afterbegin',`<div class="diagram-view">${svg}</div>`);figure.classList.add('ready')}
  catch(err){figure.classList.add('failed');console.warn('mermaid',err)}
 }
}
function diagrams():void{
 const figures=[...document.querySelectorAll<HTMLElement>('[data-diagram]')];if(!figures.length)return;
 void drawDiagrams(figures);
 document.addEventListener('palette',()=>void drawDiagrams(figures));
 document.addEventListener('click',e=>{
  const target=e.target as HTMLElement;
  const figure=target.closest<HTMLElement>('[data-diagram]');
  if(figure&&(target.closest('.diagram-open')||target.closest('.diagram-view')))openViewer(figure);
 });
}

// 预览器：滚轮缩放、拖拽平移、源码切换、Esc 关闭
function openViewer(figure:HTMLElement):void{
 const svg=figure.querySelector('.diagram-view svg');if(!svg)return;
 const back=document.activeElement as HTMLElement|null;
 const box=document.createElement('div');box.className='viewer';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','流程图预览');
 box.innerHTML=`<div class="viewer-bar"><span class="hud-label"><span>FIG · PREVIEW</span><span>滚轮缩放 · 拖拽移动</span></span><div><button type="button" data-z="1.25" aria-label="放大">＋</button><button type="button" data-z="0.8" aria-label="缩小">－</button><button type="button" data-z="0">重置</button><button type="button" data-src>源码</button><button type="button" data-close aria-label="关闭">✕</button></div></div><div class="viewer-canvas"><div class="viewer-inner"></div></div><pre class="viewer-source" hidden></pre>`;
 const inner=box.querySelector<HTMLElement>('.viewer-inner')!,canvas=box.querySelector<HTMLElement>('.viewer-canvas')!,source=box.querySelector<HTMLElement>('.viewer-source')!;
 const clone=svg.cloneNode(true) as SVGSVGElement;clone.removeAttribute('style');clone.setAttribute('width','100%');clone.removeAttribute('height');inner.append(clone);
 source.textContent=figure.dataset.source??'';
 let k=1,x=0,y=0;const apply=()=>inner.style.transform=`translate(${x}px,${y}px) scale(${k})`;
 const zoom=(f:number)=>{k=f?Math.min(6,Math.max(.4,k*f)):1;if(!f){x=0;y=0}apply()};
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?1.12:.89)},{passive:false});
 let drag:{x:number;y:number}|null=null;
 canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX-x,y:e.clientY-y};canvas.setPointerCapture(e.pointerId)});
 canvas.addEventListener('pointermove',e=>{if(drag){x=e.clientX-drag.x;y=e.clientY-drag.y;apply()}});
 canvas.addEventListener('pointerup',()=>drag=null);
 const close=()=>{box.remove();document.removeEventListener('keydown',key);document.body.style.overflow='';back?.focus()};
 const key=(e:KeyboardEvent)=>{if(e.key==='Escape')close();if(e.key==='+'||e.key==='=')zoom(1.25);if(e.key==='-')zoom(.8)};
 box.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!b){if(e.target===box)close();return}
  if('close' in b.dataset)close();else if('src' in b.dataset){source.hidden=!source.hidden;canvas.hidden=!source.hidden;b.textContent=source.hidden?'源码':'图表'}else zoom(+b.dataset.z!)});
 document.addEventListener('keydown',key);document.body.style.overflow='hidden';document.body.append(box);
 box.querySelector<HTMLButtonElement>('[data-close]')!.focus();
}

// ---------- 代码复制 ----------
function copyButtons():void{
 document.addEventListener('click',async e=>{
  const b=(e.target as HTMLElement).closest<HTMLButtonElement>('.copy');if(!b)return;
  const code=b.closest('figure')!.querySelector('code')!.textContent!;
  try{await navigator.clipboard.writeText(code);b.textContent='已复制 ✓'}catch{b.textContent='复制失败'}
  setTimeout(()=>b.textContent='复制',1600);
 });
}

// ---------- 阅读进度 + 目录高亮 ----------
function readingProgress():void{
 const bar=document.querySelector<HTMLElement>('.progress span'),body=document.querySelector<HTMLElement>('.report-body');if(!bar||!body)return;
 const links=[...document.querySelectorAll<HTMLAnchorElement>('.toc a')];
 const heads=links.map(a=>document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter((h):h is HTMLElement=>!!h);
 const update=()=>{
  const r=body.getBoundingClientRect();bar.style.transform=`scaleX(${Math.min(1,Math.max(0,-r.top/(r.height-innerHeight)))})`;
  let current=0;heads.forEach((h,i)=>{if(h.getBoundingClientRect().top<140)current=i});
  links.forEach((a,i)=>a.toggleAttribute('aria-current',i===current));
 };
 addEventListener('scroll',update,{passive:true});update();
}

// ---------- 报告筛选 ----------
function filters():void{
 const search=document.querySelector<HTMLInputElement>('#search');if(!search)return;
 const chips=[...document.querySelectorAll<HTMLButtonElement>('.chip')],cards=[...document.querySelectorAll<HTMLElement>('.dossier .report')];
 let tag=new URLSearchParams(location.search).get('tag')??'';
 const apply=()=>{
  const q=search.value.trim().toLowerCase();let n=0;
  for(const c of cards){const hide=!(c.dataset.search!.includes(q)&&(!tag||c.dataset.tags!.split(',').includes(tag)));c.parentElement!.hidden=hide;if(!hide)n++}
  chips.forEach(c=>c.setAttribute('aria-pressed',String(c.dataset.tag===tag)));
  document.querySelector<HTMLElement>('.empty')!.hidden=n>0;
 };
 search.addEventListener('input',apply);
 chips.forEach(c=>c.addEventListener('click',()=>{tag=c.dataset.tag!;history.replaceState(null,'',tag?`?tag=${encodeURIComponent(tag)}`:location.pathname);apply()}));
 apply();
}

// ---------- 开机序列：每个会话只播放一次 ----------
export function bootSequence(count:number):void{
 try{if(sessionStorage.getItem('akuya-boot'))return;sessionStorage.setItem('akuya-boot','1')}catch{return}
 if(reduced())return;
 const lines=['FUTURE GADGET LAB · OBSERVATION TERMINAL v2.0.10','> 连接世界线 ……………………… OK',`> 读取 D-Mail 记录 × ${count} ……… OK`,'> 校准世界线变动率探测仪 ……… OK','> El Psy Kongroo.'];
 const box=document.createElement('div');box.className='boot';box.setAttribute('aria-hidden','true');box.innerHTML='<pre></pre><span class="boot-skip">点击跳过</span>';
 document.body.append(box);const pre=box.querySelector('pre')!;
 let i=0,j=0,timer=0;
 const done=()=>{clearTimeout(timer);box.classList.add('out');setTimeout(()=>box.remove(),500)};
 const type=()=>{
  if(i>=lines.length){timer=window.setTimeout(done,380);return}
  j+=3;pre.textContent=lines.slice(0,i).join('\n')+(i?'\n':'')+lines[i].slice(0,j)+'▌';
  if(j>=lines[i].length){i++;j=0;timer=window.setTimeout(type,110)}else timer=window.setTimeout(type,12);
 };
 box.addEventListener('click',done);addEventListener('keydown',done,{once:true});type();
}

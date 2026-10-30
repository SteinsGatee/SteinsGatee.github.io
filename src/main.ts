import '@fontsource/share-tech-mono/400.css';
import '@fontsource/chakra-petch/500.css';
import '@fontsource/chakra-petch/700.css';
import './style.css';
const palettes=[['amber','琥珀'],['matrix','矩阵'],['neon','霓虹'],['ice','极光']] as const;

async function boot():Promise<void>{
 const root=document.querySelector<HTMLDivElement>('#app')!;
 // 生产环境每个页面都已预渲染；只有开发服务器才在浏览器里渲染
 if(!root.hasChildNodes()){const {render,layout,SITE}=await import('./render');const page=render(location.pathname);root.innerHTML=layout(page,location.pathname);document.title=`${page.title} | ${SITE}`}
 const button=document.querySelector<HTMLButtonElement>('.palette')!;
 const set=(name:string)=>{const [id,label]=palettes.find(p=>p[0]===name)??palettes[0];document.documentElement.dataset.palette=id;button.querySelector('span')!.textContent=label;button.setAttribute('aria-label',`配色：${label}，点击切换`);document.dispatchEvent(new Event('palette'))};
 let saved:string|null=null;try{saved=localStorage.getItem('akuya-palette')}catch{}
 set(saved??'amber');
 button.addEventListener('click',()=>{const i=palettes.findIndex(p=>p[0]===document.documentElement.dataset.palette);const next=palettes[(i+1)%palettes.length][0];set(next);try{localStorage.setItem('akuya-palette',next)}catch{}});
 const lab=await import('./lab');lab.enhance();
 const call=document.querySelector<HTMLElement>('#mission');
 if(call)void import('./mission').then(m=>m.mountMission(call,matchMedia('(prefers-reduced-motion: reduce)').matches));
 if(document.querySelector('#calendar')){
  const [{mountCalendar},{loadEntries}]=await Promise.all([import('./calendar'),import('./journal-data')]);
  const entries=loadEntries(new URLSearchParams(location.search).has('demo'));
  lab.bootSequence(entries.size);
  mountCalendar(document.querySelector('main')!,entries);
 }
}
void boot();

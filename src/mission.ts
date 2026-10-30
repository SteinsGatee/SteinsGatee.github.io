import {members,pick,avatar,slotOf,slotName,skyName,type Context,type Member,type Mission} from './members';
import {getWeather,useMyLocation,resetLocation,usingCustomLocation,type Weather} from './weather';
import {aiConfig,chat,saveKey,hasProxy,type ChatMessage} from './ai';
import {escape,dateKey} from './util';

/**
 * 今日任务：按此刻的时段与天气，研究所的一位成员“来电”并发布一个与写日记相关的任务。
 * 可以接受 / 完成 / 换一位，也可以和 TA 对话（DeepSeek；未配置时使用离线台词）。
 */
const SKY_ICON={clear:'☀️',cloudy:'☁️',fog:'🌫️',rain:'🌧️',snow:'❄️',storm:'⛈️'} as const;
type State={member:string;code:string;status:'accepted'|'done'};
const stateKey=()=>`akuya-mission-${dateKey(new Date())}`;
const load=():State|null=>{try{return JSON.parse(localStorage.getItem(stateKey())??'null')}catch{return null}};
const store=(s:State|null)=>{try{s?localStorage.setItem(stateKey(),JSON.stringify(s)):localStorage.removeItem(stateKey())}catch{}};

/**
 * 台词语音：
 *  1. public/voices/manifest.json 里登记了该成员的音频（自有或已获授权的素材）→ 播放音频
 *  2. 否则用浏览器语音合成，优先挑选系统里质量更好的神经网络语音
 */
let manifest:Record<string,string>|null=null;
const manifestReady=fetch('/voices/manifest.json').then(r=>r.ok?r.json():{}).then(j=>{manifest=j}).catch(()=>{manifest={}});
const PREFERRED:Record<string,RegExp>={
 'ja-JP':/Nanami|Keita|Aoi|Kyoko|O-Ren|Otoya|Hattori|Google 日本語/i,
 'zh-CN':/Xiaoxiao|Xiaoyi|Yunxi|Yunjian|Tingting|Meijia|Lili|Google 普通话|Google 國語/i,
};
function bestVoice(lang:string):SpeechSynthesisVoice|undefined{
 const all=speechSynthesis.getVoices().filter(v=>v.lang.replace('_','-').startsWith(lang));
 return all.find(v=>/Natural|Neural|Online|Premium|Enhanced/i.test(v.name)&&PREFERRED[lang]?.test(v.name))??all.find(v=>/Natural|Neural|Online|Premium|Enhanced/i.test(v.name))??all.find(v=>PREFERRED[lang]?.test(v.name))??all[0];
}
if('speechSynthesis' in window)speechSynthesis.getVoices();
let audio:HTMLAudioElement|null=null;
async function speak(m:Member,text?:string):Promise<void>{
 await manifestReady;
 const file=!text?(m.voice??manifest?.[m.id]):undefined;
 if(file){audio?.pause();audio=new Audio(file);void audio.play().catch(()=>{});return}
 if(!('speechSynthesis' in window))return;
 const lang=text?'zh-CN':m.quote.lang,u=new SpeechSynthesisUtterance(text??m.quote.say);
 u.lang=lang;u.pitch=m.quote.pitch;u.rate=m.quote.rate;const v=bestVoice(lang);if(v)u.voice=v;
 speechSynthesis.cancel();speechSynthesis.speak(u);
}

export async function mountMission(host:HTMLElement,reduced:boolean):Promise<void>{
 let shift=0,weather:Weather={sky:'clear',temp:null,place:'秋叶原',live:false},member!:Member,mission!:Mission;
 let history:ChatMessage[]=[],abort:AbortController|null=null,voiceOn=false;
 const now=()=>new Date();
 const ctx=():Context=>{const d=now();return{slot:slotOf(d.getHours()),hour:d.getHours(),sky:weather.sky,temp:weather.temp,weekend:d.getDay()===0||d.getDay()===6}};

 // 自有立绘：public/characters/manifest.json 登记后替换剪影
 try{const r=await fetch('/characters/manifest.json');if(r.ok){const map=await r.json() as Record<string,string>;for(const m of members)if(map[m.id])m.image=map[m.id]}}catch{}
 host.innerHTML=`<div class="call-ring" aria-hidden="true"><span></span><span></span><span></span><b>INCOMING · 研究所来电</b></div>`;
 weather=await getWeather();

 function choose():void{
  const saved=load(),c=ctx();
  ({member,mission}=pick(c,shift));
  // 已接受的任务当天保持不变
  if(saved&&shift===0){const m=pick(c,0);const fromSaved=[...Array(8)].map((_,i)=>pick(c,i)).find(x=>x.member.id===saved.member);if(fromSaved){member=fromSaved.member;mission=fromSaved.member.missions(c).find(x=>x.code===saved.code)??fromSaved.mission}else{member=m.member;mission=m.mission}}
  history=[];
 }
 const system=():ChatMessage=>{const c=ctx(),d=now();return{role:'system',content:
  `你在扮演《命运石之门》中的${member.name}（${member.alias}），未来道具研究所 LAB MEM ${member.no}。\n人设：${member.persona}\n`+
  `当前情境：${slotName(c.slot)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}，${weather.place}天气${skyName(c.sky)}${c.temp!==null?` ${Math.round(c.temp)}°C`:''}。`+
  `你刚给用户（研究所的新成员）发布了任务「${mission.code}：${mission.title}」——${mission.brief}\n`+
  `规则：始终使用简体中文并保持角色口吻；每次回复不超过 90 字；可以偶尔使用角色标志性的口头禅，但不要大段复述原作台词或剧情；不要编造现实中的个人信息；用户聊别的也可以陪聊，再自然地引导 TA 完成任务、写下今天的记录。`}};

 function render():void{
  const c=ctx(),saved=load(),status=saved&&saved.member===member.id&&saved.code===mission.code?saved.status:null;
  const cfg=aiConfig(),d=now();
  host.style.setProperty('--mc',member.color);
  host.innerHTML=`
<div class="call-grid">
 <div class="call-who">
  <div class="call-avatar">${avatar(member,132)}<i aria-hidden="true"></i></div>
  <p class="call-no">LAB MEM ${member.no}</p>
  <h3 class="call-name">${member.name}<small>${member.alias}</small></h3>
  <button type="button" class="call-quote" data-act="voice" aria-label="播放台词：${escape(member.quote.text)}"><span aria-hidden="true">🔊</span>「${escape(member.quote.text)}」</button>
 </div>
 <div class="call-main">
  <div class="call-ctx">
   <span>🕐 ${slotName(c.slot)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}</span>
   <span>${SKY_ICON[c.sky]} ${escape(weather.place)} ${skyName(c.sky)}${c.temp!==null?` ${Math.round(c.temp)}°C`:''}${weather.live?'':' · 离线'}</span>
   <button type="button" data-act="geo">${usingCustomLocation()?'↺ 改回秋叶原':'📍 用我的位置'}</button>
  </div>
  <p class="call-code">${escape(mission.code)}${status?` · <b>${status==='done'?'MISSION COMPLETE':'ACCEPTED'}</b>`:''}</p>
  <h3 class="call-title">${escape(mission.title)}</h3>
  <p class="call-brief"></p>
  <div class="call-actions">
   ${status==='done'?`<button type="button" class="btn" disabled>✓ 已完成</button>`:status==='accepted'?`<button type="button" class="btn primary" data-act="done">✓ 完成任务</button>`:`<button type="button" class="btn primary" data-act="accept">接受任务</button>`}
   <button type="button" class="btn" data-act="talk" aria-expanded="false">💬 和${member.name.slice(-2)}对话</button>
   <button type="button" class="btn ghost" data-act="next">换一位 ↻</button>
  </div>
 </div>
</div>
<div class="chat" hidden>
 <div class="chat-log" aria-live="polite"></div>
 <form class="chat-form"><input name="q" autocomplete="off" maxlength="200" placeholder="回复 ${escape(member.name)}…" aria-label="输入消息"><button type="submit" class="btn primary">发送</button></form>
 <div class="chat-cfg">
  <span>${cfg?`AI · DeepSeek ${cfg.mode==='proxy'?'已通过代理连接':'使用你的 Key'}`:'AI 未连接 · 当前为离线台词'}</span>
  <label class="chat-voice"><input type="checkbox" data-act="tts" ${voiceOn?'checked':''}> 朗读回复</label>
  ${hasProxy()?'':`<button type="button" data-act="cfg">${cfg?'更换 / 清除 Key':'配置 DeepSeek Key'}</button>`}
 </div>
 <form class="key-form" hidden><input name="key" type="password" autocomplete="off" placeholder="sk-…（只保存在本浏览器）" aria-label="DeepSeek API Key"><button type="submit" class="btn small">保存</button><button type="button" class="btn small ghost" data-act="clear">清除</button><p>Key 只存放在你的浏览器 localStorage，并由浏览器直接请求 DeepSeek。公开部署请改用仓库里的代理（worker/deepseek-proxy.js）。</p></form>
</div>`;
  type(host.querySelector<HTMLElement>('.call-brief')!,mission.brief);
  if(!reduced){host.classList.remove('enter');void host.offsetWidth;host.classList.add('enter')}
 }
 function type(el:HTMLElement,text:string):void{
  if(reduced){el.textContent=text;return}
  const chars=[...text];let i=0;const step=()=>{i+=2;el.textContent=chars.slice(0,i).join('');if(i<chars.length)setTimeout(step,16)};setTimeout(step,260);
 }

 // ---------- 对话 ----------
 const log=()=>host.querySelector<HTMLElement>('.chat-log')!;
 function bubble(role:'me'|'them',text:string):HTMLElement{
  const el=document.createElement('div');el.className=`msg ${role}`;
  el.innerHTML=role==='them'?`<span class="msg-av">${avatar(member,30)}</span><p></p>`:'<p></p>';
  el.querySelector('p')!.textContent=text;log().append(el);log().scrollTop=log().scrollHeight;return el.querySelector('p')!;
 }
 async function reply(q:string):Promise<void>{
  const cfg=aiConfig(),out=bubble('them','');out.classList.add('typing');
  history.push({role:'user',content:q});
  let text='';
  try{
   if(!cfg)throw new Error('offline');
   abort?.abort();abort=new AbortController();
   for await(const piece of chat(cfg,[system(),...history.slice(-12)],abort.signal)){text+=piece;out.textContent=text;log().scrollTop=log().scrollHeight}
  }catch(e){
   const offline=(e as Error).message==='offline';
   text=member.offline[Math.floor(Math.random()*member.offline.length)];
   if(!offline)text+=`\n\n（AI 连接失败：${(e as Error).message}，已切换为离线台词）`;
   await new Promise(r=>setTimeout(r,500));out.textContent=text;
  }
  out.classList.remove('typing');history.push({role:'assistant',content:text});
  if(voiceOn)void speak(member,text.split('\n')[0]);
 }

 host.addEventListener('click',async e=>{
  const b=(e.target as HTMLElement).closest<HTMLElement>('[data-act]');if(!b)return;
  const act=b.dataset.act;
  if(act==='voice')void speak(member);
  else if(act==='accept'){store({member:member.id,code:mission.code,status:'accepted'});void speak(member);render()}
  else if(act==='done'){store({member:member.id,code:mission.code,status:'done'});render();const r=host.getBoundingClientRect();document.dispatchEvent(new CustomEvent('burst',{detail:{x:r.left+r.width*.2,y:r.top+r.height*.4}}))}
  else if(act==='next'){shift++;store(null);choose();render()}
  else if(act==='geo'){try{if(usingCustomLocation())resetLocation();else await useMyLocation();weather=await getWeather();shift=0;choose();render()}catch(err){b.textContent=(err as Error).message}}
  else if(act==='talk'){
   const box=host.querySelector<HTMLElement>('.chat')!,open=box.hidden;box.hidden=!open;b.setAttribute('aria-expanded',String(open));
   if(open&&!log().childElementCount){const opener=bubble('them','');type(opener,`${member.quote.text} ${mission.title}——${mission.brief.slice(0,40)}…有什么想问的吗？`);history.push({role:'assistant',content:`${member.quote.text} 关于任务「${mission.title}」，有什么想问的吗？`})}
   if(open)host.querySelector<HTMLInputElement>('.chat-form input')!.focus();
  }
  else if(act==='cfg'){const f=host.querySelector<HTMLElement>('.key-form')!;f.hidden=!f.hidden}
  else if(act==='clear'){saveKey('');render()}
 });
 host.addEventListener('change',e=>{const t=e.target as HTMLInputElement;if(t.dataset.act==='tts')voiceOn=t.checked});
 host.addEventListener('submit',e=>{
  e.preventDefault();const form=e.target as HTMLFormElement;
  if(form.classList.contains('key-form')){saveKey((form.elements.namedItem('key') as HTMLInputElement).value);const open=true;render();if(open){host.querySelector<HTMLElement>('.chat')!.hidden=false}return}
  const input=form.elements.namedItem('q') as HTMLInputElement,q=input.value.trim();if(!q)return;
  input.value='';bubble('me',q);void reply(q);
 });

 choose();render();
}

import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import {posts,tags,type Post} from './posts';
import {render as markdown} from './markdown';
import {escape} from './util';

for(const [name,lang] of Object.entries({typescript,javascript,python,bash,json,yaml}))hljs.registerLanguage(name,lang);
hljs.registerAliases(['ts'],{languageName:'typescript'});hljs.registerAliases(['js'],{languageName:'javascript'});hljs.registerAliases(['sh','shell'],{languageName:'bash'});hljs.registerAliases(['py'],{languageName:'python'});
const highlight=(code:string,lang:string)=>hljs.getLanguage(lang)?hljs.highlight(code,{language:lang}).value:null;

export interface Page {title:string;description:string;html:string;type?:'article'|'website'}
export const SITE='Akuya の 世界线';
export const paths=():string[]=>['/','/posts/',...posts.map(p=>p.url),'/404.html'];

const tagList=(list:string[])=>list.map(t=>`<span class="tag">#${escape(t)}</span>`).join('');
const card=(p:Post)=>`<li><a class="report" href="${p.url}" data-tags="${escape(p.tags.join(','))}" data-search="${escape(`${p.title} ${p.summary} ${p.tags.join(' ')}`.toLowerCase())}"><span class="d-no" aria-hidden="true">${p.no}</span><span class="d-main"><span class="d-meta"><span>LAB REPORT #${p.no}</span><time datetime="${p.date}">${p.date.replace(/-/g,'.')}</time><span>${p.minutes} MIN</span>${p.diagrams?`<span class="fig">◇ ${p.diagrams} FIG</span>`:''}</span><span class="d-title">${escape(p.title)}</span><span class="d-sum">${escape(p.summary)}</span></span><span class="d-tags">${tagList(p.tags.slice(0,3))}</span><span class="d-go" aria-hidden="true">→</span></a></li>`;
const heading=(eyebrow:string,title:string,extra='')=>`<div class="section-head"><p class="eyebrow">${eyebrow}</p><h2>${title}</h2>${extra}</div>`;

function home():Page{
 return{title:'观测站',description:'Akuya 的世界线观测站：每日 D-Mail 记录，以及关于 Agent 开发的实验报告。',html:`
<section class="hero">
 <div class="hero-top">
  <p class="kicker"><span>世界線変動率</span><i></i><span>DIVERGENCE METER</span><i></i><span id="attractor">ATTRACTOR FIELD · β</span></p>
  <div class="rig"><div class="nixie big" id="divergence" role="img" aria-label="世界线变动率"></div><div class="rig-base" aria-hidden="true"></div></div>
 </div>
 <div class="scope3d" id="scope3d">
  <div class="scope-hud" aria-hidden="true"><span>FG-204 · WORLD LINE OSCILLOSCOPE</span><span>拖动旋转 · 转动旋钮切换波形 · 按下 D-MAIL</span></div>
  <p class="scope-fallback">示波器需要 WebGL 支持。</p>
 </div>
 <div class="hero-copy">
  <div><h1>每一天，都是世界线上的<span class="glitch" data-text="一个点">一个点</span>。</h1><p class="lede">每天发出一封 D-Mail，记下当天做了什么。发送 D-Mail，信号会被送回过去的某一天——看看那条世界线上发生过什么。</p></div>
  <div class="hero-actions"><button type="button" class="btn primary" id="dmail">⚡ 发送 D-Mail</button><a class="btn" href="#calendar">开始观测 ↓</a><a class="btn ghost" href="/posts/">实验报告 →</a><p class="dmail-status" id="dmail-status" aria-live="polite">D-MAIL 待命 · 随机送达一个有记录的过去日子</p></div>
 </div>
</section>
<section class="chapter" id="lab-call">
 ${heading('01 · LAB MEM CALL','今日任务','<p class="section-note">根据此刻的时间与天气，研究所的一位成员给你发来了任务。接受它，或者和 TA 聊聊。</p>')}
 <div class="call hud" id="mission"><noscript><p>任务需要启用 JavaScript。</p></noscript></div>
</section>
<section class="chapter deck" id="calendar">
 ${heading('02 · ATTRACTOR FIELD','每日 D-Mail','<p class="section-note">每一格是一天，越亮代表那天做的事越多。</p>')}
 <div class="stats" id="stats"></div>
 <div class="stage hud"><div class="spot" aria-hidden="true"></div><div class="controls" id="controls"></div><div class="board-scroll"><div class="board" id="board"><noscript><p>日历需要启用 JavaScript。</p></noscript></div></div></div>
 <div class="below"><article class="day-panel hud"><div class="nixie small" id="nixie" role="img"></div><div id="day" aria-live="polite"></div></article><aside class="recent hud" id="recent"></aside></div>
</section>
<section class="chapter">
 ${heading('03 · LAB REPORTS','最新实验报告',`<a class="text-link" href="/posts/">全部 ${posts.length} 篇 →</a>`)}
 <ol class="dossier">${posts.slice(0,6).map(card).join('')}</ol>
</section>`};
}

function archive():Page{
 return{title:'实验报告',description:`${posts.length} 篇关于 Agent 开发的实验报告。`,html:`
<section class="listing-heading"><p class="eyebrow">FUTURE GADGET LAB · ARCHIVE</p><h1>实验报告<small>LAB REPORTS</small></h1><p>${posts.length} 篇关于 Agent 开发的记录：循环、工具、记忆、规划、评测与安全。</p></section>
<div class="filters"><label class="search-label" for="search">检索</label><input class="search" id="search" type="search" placeholder="> 输入关键词，例如 MCP、记忆、评测" autocomplete="off"><div class="chips" role="group" aria-label="按标签筛选"><button type="button" class="chip" data-tag="" aria-pressed="true">全部</button>${tags.map(t=>`<button type="button" class="chip" data-tag="${escape(t)}" aria-pressed="false">#${escape(t)}</button>`).join('')}</div></div>
<ol class="dossier">${posts.map(card).join('')}</ol>
<p class="empty" role="status" hidden>没有观测到匹配的世界线，换个关键词试试。</p>`};
}

function article(p:Post):Page{
 const {html,headings}=markdown(p.source,highlight);
 const i=posts.indexOf(p),newer=posts[i-1],older=posts[i+1];
 const toc=headings.filter(h=>h.depth>=2);
 return{title:p.title,description:p.summary,type:'article',html:`
<div class="progress" aria-hidden="true"><span></span></div>
<article class="report-page">
 <header class="report-head"><a class="text-link" href="/posts/">← 返回档案</a>
  <div class="report-id"><span class="big-no">#${p.no}</span><div class="stamp" aria-hidden="true">LAB MEM<b>001</b>APPROVED</div></div>
  <h1>${escape(p.title)}</h1><p class="lede">${escape(p.summary)}</p>
  <dl class="spec"><div><dt>REPORT</dt><dd>LAB REPORT #${p.no}</dd></div><div><dt>DATE</dt><dd>${p.date.replace(/-/g,'.')}</dd></div><div><dt>READ</dt><dd>${p.minutes} MIN</dd></div><div><dt>FIGURES</dt><dd>${p.diagrams}</dd></div><div class="wide"><dt>TAGS</dt><dd>${tagList(p.tags)}</dd></div></dl>
 </header>
 <div class="report-layout">
  <div class="prose report-body">${html}<p class="signoff">El Psy Kongroo.</p></div>
  ${toc.length?`<aside class="toc" aria-label="目录"><p class="hud-label"><span>INDEX</span><span>目录</span></p><ol>${toc.map(h=>`<li class="d${h.depth}"><a href="#${h.id}">${h.text}</a></li>`).join('')}</ol></aside>`:''}
 </div>
 <nav class="report-nav" aria-label="相邻报告">${older?`<a href="${older.url}"><span>← 上一份 #${older.no}</span>${escape(older.title)}</a>`:'<span></span>'}${newer?`<a class="next" href="${newer.url}"><span>下一份 #${newer.no} →</span>${escape(newer.title)}</a>`:''}</nav>
</article>`};
}

export function render(path:string):Page{
 path=decodeURI(path).replace(/index\.html$/,'');if(!path.endsWith('/')&&!path.endsWith('.html'))path+='/';
 if(path==='/')return home();
 if(path==='/posts/')return archive();
 const post=posts.find(p=>p.url===path);if(post)return article(post);
 return{title:'世界线分歧',description:'这一页不存在于当前世界线。',html:`<section class="listing-heading not-found"><p class="eyebrow">404 · WORLD LINE NOT FOUND</p><h1>这一页，<br>不存在于当前世界线。</h1><p>也许它在 α 世界线上。</p><a class="btn primary" href="/">回到观测站 →</a></section>`};
}

export function layout(page:Page,path:string):string{
 const ticker=[`WORLD LINE OBSERVATION`,...posts.slice(0,5).map(p=>`#${p.no} ${escape(p.title)}`),'EL PSY KONGROO'].map(t=>`<span>${t}</span>`).join('<i>◆</i>');
 const nav=[['/','01','观测站'],['/posts/','02','实验报告']].map(([url,no,name])=>`<a href="${url}" ${(url==='/'?path==='/':path.startsWith(url))?'aria-current="page"':''}><small>${no}</small>${name}</a>`).join('');
 return `<a class="skip" href="#main">跳至内容</a><div class="crt" aria-hidden="true"></div><header class="site-header"><div class="bar"><a class="wordmark" href="/" aria-label="${SITE} 首页"><img src="/img/1.jpg" alt="" width="30" height="30"><span class="wm"><b>AKUYA</b><small>世界線観測ログ</small></span></a><nav aria-label="主导航">${nav}</nav><div class="bar-end"><time class="clock" id="clock" aria-hidden="true">--:--:--</time><button class="palette" type="button" aria-label="切换配色"><i></i><span>琥珀</span></button></div></div><div class="ticker" aria-hidden="true"><div class="ticker-track">${ticker}<i>◆</i>${ticker}<i>◆</i></div></div></header><div class="site"><main id="main">${page.html}</main><footer class="site-footer"><a class="footer-brand" href="/">AKUYA <small>世界線観測ログ</small></a><p>这一切都是命运石之门的选择。El Psy Kongroo.</p><span>© 2021–2026 Akuya · <a href="https://github.com/SteinsGatee" target="_blank" rel="noopener noreferrer">GitHub</a> · <a href="/index.xml">RSS</a></span></footer></div>`;
}

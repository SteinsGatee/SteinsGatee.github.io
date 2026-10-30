/// <reference types="vite/client" />
import {parseEntry,levelOf,type Entry} from './journal';
import {isDateKey,dateKey,addDays,escape} from './util';
import {posts} from './posts';

const files=import.meta.glob<string>('/journal/*.md',{query:'?raw',import:'default',eager:true});

export function loadEntries(demo=false):Map<string,Entry>{
 const map=new Map<string,Entry>();
 for(const [path,raw] of Object.entries(files)){const key=path.split('/').pop()!.replace(/\.md$/,'');if(isDateKey(key))map.set(key,parseEntry(key,raw))}
 // 发布实验报告的那天也会被点亮
 for(const post of [...posts].reverse()){
  const key=post.date;if(!isDateKey(key))continue;
  const line=`<p class="post-link"><a href="${post.url}">📄 发布 Lab Report #${post.no}《${escape(post.title)}》</a></p>`;
  const prev=map.get(key);
  if(prev){prev.html+=line;prev.weight++;prev.level=Math.max(prev.level,levelOf(prev.weight));prev.posts.push({slug:post.slug,title:post.title})}
  else map.set(key,{date:key,title:post.title,mood:'🧪',tags:post.tags.slice(0,2),html:line,weight:2,level:2,posts:[{slug:post.slug,title:post.title}]});
 }
 if(demo)fill(map);
 return map;
}

/** ?demo：用固定种子随机填满过去一年，只用于预览，不写入任何数据。 */
function fill(map:Map<string,Entry>):void{
 const words=['写代码','跑步 5km','读了一章书','做饭','整理房间','看电影','学日语','画画','散步','修了个 bug','听播客','早睡'];
 const today=new Date();let seed=7;const rand=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(let i=0;i<400;i++){
  const key=dateKey(addDays(today,-i));if(map.has(key)||rand()<.32)continue;
  const n=1+Math.floor(rand()**1.6*8);const items=Array.from({length:n},()=>words[Math.floor(rand()*words.length)]);
  map.set(key,{date:key,title:'',mood:['😄','😴','🔥','🌧️','🍜',''][Math.floor(rand()*6)],tags:['demo'],html:`<ul>${items.map(t=>`<li>${t}</li>`).join('')}</ul>`,weight:n,level:levelOf(n),posts:[]});
 }
}

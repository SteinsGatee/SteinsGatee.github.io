/// <reference types="vite/client" />
import {frontmatter,list,plain} from './util';

export interface Post {slug:string;url:string;no:string;title:string;date:string;tags:string[];summary:string;source:string;minutes:number;diagrams:number}

const files=import.meta.glob<string>('/posts/*.md',{query:'?raw',import:'default',eager:true});

/** posts/YYYY-MM-DD-slug.md → /posts/slug/，按日期编号为 Lab Report #001… */
export const posts:Post[]=Object.entries(files).map(([path,raw])=>{
 const name=path.split('/').pop()!.replace(/\.md$/,'');
 const m=name.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);if(!m)return null;
 const {meta,body}=frontmatter(raw);
 const text=plain(body.replace(/```[\s\S]*?```/g,''));
 return{slug:m[2],url:`/posts/${m[2]}/`,no:'',title:meta.title||m[2],date:meta.date||m[1],tags:list(meta.tags),summary:meta.summary||text.slice(0,90),source:body,
  minutes:Math.max(1,Math.round(body.length/500)),diagrams:(body.match(/```mermaid/g)||[]).length};
}).filter((p):p is Post=>p!==null).sort((a,b)=>a.date.localeCompare(b.date)).map((p,i)=>({...p,no:String(i+1).padStart(3,'0')})).reverse();

export const tags=[...new Set(posts.flatMap(p=>p.tags))].sort((a,b)=>posts.filter(p=>p.tags.includes(b)).length-posts.filter(p=>p.tags.includes(a)).length);

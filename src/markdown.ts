import {Marked,type Tokens} from 'marked';
import {escape} from './util';

export type Highlighter=(code:string,lang:string)=>string|null;
export interface Heading {id:string;text:string;depth:number}

/** GFM Markdown：```mermaid 输出为待渲染的图表，其它代码块交给可选的高亮器，表格包一层可横向滚动的容器。 */
export function render(source:string,highlight?:Highlighter):{html:string;headings:Heading[]}{
 const headings:Heading[]=[];const used=new Map<string,number>();
 const marked=new Marked({gfm:true,renderer:{
  code({text,lang}:Tokens.Code){
   const language=(lang||'').split(/\s/)[0];
   if(language==='mermaid')return`<figure class="diagram" data-diagram><pre class="mermaid">${escape(text)}</pre><figcaption><span>FIG · 流程图</span><button type="button" class="diagram-open">⤢ 预览</button></figcaption></figure>`;
   const body=highlight?.(text,language)??escape(text);
   return`<figure class="code"><figcaption><span>${escape(language||'text')}</span><button type="button" class="copy">复制</button></figcaption><pre><code class="hljs language-${escape(language||'text')}">${body}</code></pre></figure>`;
  },
  heading({tokens,depth}:Tokens.Heading){
   const inner=this.parser.parseInline(tokens);const text=inner.replace(/<[^>]*>/g,'');
   let id=text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'')||'section';
   const n=used.get(id)??0;used.set(id,n+1);if(n)id+=`-${n}`;
   if(depth<=3)headings.push({id,text,depth});
   return`<h${depth} id="${id}">${inner}</h${depth}>`;
  },
  table(token:Tokens.Table){
   const head=token.header.map(c=>`<th${c.align?` style="text-align:${c.align}"`:''}>${this.parser.parseInline(c.tokens)}</th>`).join('');
   const rows=token.rows.map(r=>`<tr>${r.map(c=>`<td${c.align?` style="text-align:${c.align}"`:''}>${this.parser.parseInline(c.tokens)}</td>`).join('')}</tr>`).join('');
   return`<div class="table"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  },
 }});
 return{html:marked.parse(source,{async:false}),headings};
}

/** 记录的“条目数”：列表项 + 段落（标题不计），决定热力图亮度 */
export function weightOf(source:string):number{
 let n=0;const walk=(tokens:Tokens.Generic[])=>{for(const t of tokens){if(t.type==='list')n+=(t as Tokens.List).items.length;else if(t.type==='paragraph'||t.type==='blockquote'||t.type==='code')n++}};
 walk(new Marked().lexer(source) as Tokens.Generic[]);return n;
}

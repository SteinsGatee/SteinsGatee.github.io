export const escape=(text:string):string=>text.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const DATE=/^(\d{4})-(\d{2})-(\d{2})$/;
export const isDateKey=(key:string):boolean=>DATE.test(key);
export const dateKey=(d:Date):string=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const parseKey=(key:string):Date=>{const [,y,m,d]=key.match(DATE)!;return new Date(+y,+m-1,+d)};
export const addDays=(d:Date,n:number):Date=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);
export const plain=(html:string):string=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();

/** 解析 `---\nkey: value\n---` frontmatter，支持行尾 # 注释 */
export function frontmatter(raw:string):{meta:Record<string,string>;body:string}{
 const meta:Record<string,string>={};let body=raw.replace(/\r/g,'');
 const fm=body.match(/^---\n([\s\S]*?)\n---\n?/);
 if(fm){body=body.slice(fm[0].length);for(const line of fm[1].split('\n')){const m=line.match(/^(\w+):\s*(.*?)\s*(?:\s#.*)?$/);if(m)meta[m[1]]=m[2].replace(/^["']|["']$/g,'')}}
 return{meta,body};
}
export const list=(value='')=>value.replace(/^\[|\]$/g,'').split(/[,，]/).map(s=>s.trim()).filter(Boolean);

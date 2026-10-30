import {frontmatter,list} from './util';
import {render,weightOf} from './markdown';

export interface Entry {date:string;title:string;mood:string;tags:string[];html:string;weight:number;level:number;posts:{slug:string;title:string}[]}
export const levelOf=(weight:number):number=>weight<=0?0:weight>=6?4:weight>=4?3:weight>=2?2:1;

export function parseEntry(date:string,raw:string):Entry{
 const {meta,body}=frontmatter(raw);
 const heading=body.match(/^#\s+(.+)$/m);
 const weight=weightOf(body);
 const level=meta.level?Math.max(1,Math.min(4,parseInt(meta.level)||1)):levelOf(weight);
 return{date,title:meta.title||heading?.[1]||'',mood:meta.mood||'',tags:list(meta.tags),html:render(body).html,weight,level,posts:[]};
}

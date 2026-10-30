// npm run log -- "今天做的事"         → 追加到今天的 journal/YYYY-MM-DD.md
// npm run log -- --date 2026-10-01 "补记"
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dateKey} from '../src/util';
const args=process.argv.slice(2);let date=dateKey(new Date());
const at=args.indexOf('--date');if(at>=0){date=args[at+1];args.splice(at,2)}
if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){console.error(`日期格式应为 YYYY-MM-DD：${date}`);process.exit(1)}
const text=args.join(' ').trim();
const file=`journal/${date}.md`;
let body='';try{body=await readFile(file,'utf8')}catch{body='---\nmood: \ntags: \n---\n'}
if(text)body=body.replace(/\n*$/,'\n')+`- ${text}\n`;
await mkdir('journal',{recursive:true});await writeFile(file,body);
console.log(text?`✓ ${file} 追加：${text}`:`✓ 已准备 ${file}，打开它开始写吧`);

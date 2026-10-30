// 用 Vite SSR 加载渲染模块（支持 import.meta.glob），为每条路径输出静态 HTML、RSS 与 sitemap。
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createServer} from 'vite';
const vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error'});
const {render,layout,paths,SITE}=await vite.ssrLoadModule('/src/render.ts') as typeof import('../src/render');
const {posts}=await vite.ssrLoadModule('/src/posts.ts') as typeof import('../src/posts');
const {escape}=await vite.ssrLoadModule('/src/util.ts') as typeof import('../src/util');
const template=await readFile('dist/index.html','utf8');
const base='https://steinsgatee.github.io';
const routes=paths();
for(const path of routes){
 const page=render(path);
 const head=`<meta name="description" content="${escape(page.description)}"><link rel="canonical" href="${base}${path}"><meta property="og:title" content="${escape(page.title)} | ${SITE}"><meta property="og:description" content="${escape(page.description)}"><meta property="og:type" content="${page.type??'website'}"><meta property="og:url" content="${base}${path}"><meta property="og:image" content="${base}/img/1.jpg"><link rel="alternate" type="application/rss+xml" href="/index.xml" title="${SITE}">`;
 const html=template.replace(/<title>.*?<\/title>/,`<title>${escape(page.title)} | ${SITE}</title>${head}`).replace('<div id="app"></div>',`<div id="app">${layout(page,path)}</div>`);
 const file=resolve('dist','.'+path+(path.endsWith('/')?'index.html':''));await mkdir(dirname(file),{recursive:true});await writeFile(file,html);
}
const xml=(text:string)=>text.replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char]!));
await writeFile('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.filter(p=>p!=='/404.html').map(p=>`<url><loc>${xml(base+p)}</loc></url>`).join('')}</urlset>`);
await writeFile('dist/index.xml',`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${SITE}</title><link>${base}</link><description>Akuya 的世界线观测站</description>${posts.map(p=>`<item><title>${xml(p.title)}</title><link>${base}${p.url}</link><guid>${base}${p.url}</guid><pubDate>${new Date(p.date+'T12:00:00+08:00').toUTCString()}</pubDate><description>${xml(p.summary)}</description></item>`).join('')}</channel></rss>`);
await vite.close();
console.log(`Prerendered ${routes.length} routes; generated RSS and sitemap.`);

/**
 * 未来道具研究所的成员：致敬《命运石之门》的同人设定。
 * 头像是原创的徽章式图形（不使用官方立绘）；如有可合法使用的图片，可填写 image 字段替换。
 * 台词与任务均为原创文本。
 */
export type Slot='late'|'morning'|'day'|'dusk'|'night';
export type Sky='clear'|'cloudy'|'fog'|'rain'|'snow'|'storm';
export interface Context {slot:Slot;hour:number;sky:Sky;temp:number|null;weekend:boolean}
export interface Mission {code:string;title:string;brief:string}
export interface Member {
 id:string;no:string;name:string;alias:string;glyph:string;emblem:string;color:string;image?:string;
 tagline:string;persona:string;
 /** 经典口头禅（短句）与语音：默认用浏览器语音合成；voice 填写 public/voices/ 下自有的音频可替换 */
 quote:{text:string;say:string;lang:'ja-JP'|'zh-CN';pitch:number;rate:number};voice?:string;
 /** 出场权重：返回 0 表示不出场 */
 weight:(c:Context)=>number;
 missions:(c:Context)=>Mission[];
 offline:string[];
}

const SLOT_NAME:Record<Slot,string>={late:'深夜',morning:'清晨',day:'白天',dusk:'黄昏',night:'夜晚'};
const SKY_NAME:Record<Sky,string>={clear:'晴',cloudy:'多云',fog:'雾',rain:'雨',snow:'雪',storm:'雷雨'};
export const slotName=(s:Slot)=>SLOT_NAME[s];
export const skyName=(s:Sky)=>SKY_NAME[s];
export const slotOf=(h:number):Slot=>h<5?'late':h<10?'morning':h<17?'day':h<20?'dusk':'night';
const wet=(c:Context)=>c.sky==='rain'||c.sky==='storm';

export const members:Member[]=[
 {id:'okabe',quote:{text:'El Psy Kongroo.',say:'エル・プサイ・コングルゥ',lang:'ja-JP',pitch:.8,rate:.9},no:'001',name:'冈部伦太郎',alias:'凤凰院凶真',glyph:'凶',emblem:'🥼',color:'#ff9a3c',
  tagline:'这一切，都是命运石之门的选择。',
  persona:'自称“狂气的疯狂科学家凤凰院凶真”，说话夸张、爱用中二腔调和宏大的阴谋论比喻（“机关”“世界线”“作战”），常对着手机自言自语；内心其实非常在乎同伴，关键时刻温柔可靠。',
  weight:c=>(c.slot==='day'&&!wet(c)?4:0)+(c.slot==='night'?3:0)+1,
  missions:c=>[
   {code:'OPERATION VERDANDI',title:'记录今天的“实验成果”',brief:`${slotName(c.slot)}的研究所里，没有什么比一份实验记录更重要。写下今天完成的一件事，哪怕很小，也是改变世界线的第一步。`},
   {code:'OPERATION SKULD',title:'定一个明天的作战目标',brief:'疯狂科学家从不漫无目的地行动。为明天定一个具体、能完成的目标，写进今天的 D-Mail。'},
  ],
  offline:['哼……你终于也注意到了吗，助手。这个任务关系到世界线的走向。','很好！这就是我的部下应有的觉悟。去吧，把它写下来！','……别误会，我只是觉得你今天做得不错而已。El Psy Kongroo。']},
 {id:'kurisu',quote:{text:'我才不是助手！',say:'我才不是助手！',lang:'zh-CN',pitch:1.15,rate:1.05},no:'004',name:'牧濑红莉栖',alias:'天才少女',glyph:'紅',emblem:'🧠',color:'#e2475a',
  tagline:'用逻辑说话，好吗？',
  persona:'18 岁的天才脑科学研究者，理性、毒舌、好强，喜欢用科学术语吐槽别人，被叫外号会生气；深夜常常还在研究，私下是个网络论坛重度用户；嘴硬心软，会认真给出靠谱的建议。',
  weight:c=>(c.slot==='late'?6:0)+(c.slot==='night'?3:0)+(c.sky==='clear'&&c.slot==='day'?1:0)+.5,
  missions:c=>[
   {code:'HYPOTHESIS 01',title:'复盘一个今天的判断',brief:`${c.slot==='late'?'都这个点了还没睡？':''}把今天做过的一个决定写下来：当时的依据是什么？结果如何？下次会怎么改？`},
   {code:'HYPOTHESIS 02',title:'用三句话解释一件新学到的事',brief:'能用简单的话讲清楚，才算真的理解。挑一件今天学到的东西，写成三句话。'},
  ],
  offline:['……所以你是想让我帮你？好吧，先把问题描述清楚。','从数据上看，你今天的状态还行。别得意，继续。','我才没有在等你回消息！只是刚好在看论文而已。']},
 {id:'mayuri',quote:{text:'嘟嘟噜♪',say:'トゥットゥルー',lang:'ja-JP',pitch:1.6,rate:.85},no:'002',name:'椎名真由理',alias:'真由喜',glyph:'真',emblem:'🍌',color:'#ffd36b',
  tagline:'今天也要元气满满哦～',
  persona:'温柔天然、说话慢悠悠、带着可爱语气词，喜欢做 cosplay 服装、喜欢香蕉和看星星，总是关心大家有没有好好吃饭睡觉；是研究所里最治愈的存在。',
  weight:c=>(c.slot==='morning'?5:0)+(c.slot==='dusk'?3:0)+(c.sky==='snow'?4:0)+1,
  missions:c=>[
   {code:'MAYUSHII ★',title:'写下今天让你开心的一件小事',brief:`${c.sky==='snow'?'下雪啦～':c.slot==='morning'?'早上好～':'今天辛苦啦～'}不管多小的事都可以哦，比如好吃的早餐、窗外的天空。`},
   {code:'STAR WATCH',title:'今晚抬头看一次天空',brief:'真由喜最喜欢看星星了。今天找个时间抬头看看天空，然后把看到的写下来吧～'},
  ],
  offline:['嘿嘿，真由喜觉得这个任务超棒的哦～','要记得好好吃饭哦，不然冈伦会担心的～','哇～你好厉害！真由喜给你一根香蕉作为奖励～🍌']},
 {id:'daru',quote:{text:'我说你啊……',say:'我说你啊，这种程度小意思啦。',lang:'zh-CN',pitch:.7,rate:1.1},no:'003',name:'桥田至',alias:'超级黑客',glyph:'至',emblem:'💻',color:'#7fd1d8',
  tagline:'这种程度的防火墙，五分钟搞定。',
  persona:'研究所的超级黑客，网络用语和宅梗满嘴、爱吐槽，说话随性，常说“我说你啊”；技术极强、讲义气；喜欢冷气房和零食，天气热就不想出门。',
  weight:c=>(c.slot==='late'?4:0)+(c.temp!==null&&c.temp>=29?5:0)+(c.sky==='cloudy'?2:0)+1,
  missions:c=>[
   {code:'HACK://DAILY',title:'修掉一个拖了很久的小 bug',brief:`${c.temp!==null&&c.temp>=29?`外面 ${Math.round(c.temp)}°C，还是待在冷气房里干活吧。`:''}挑一个拖了很久的小问题，今天就把它解决掉，然后记下来。`},
   {code:'HACK://CLEAN',title:'清理一个文件夹或收件箱',brief:'数字垃圾也会拖慢 CPU（你的大脑）。花十分钟清理一处，然后汇报战果。'},
  ],
  offline:['我说你啊，这种任务对我来说就是小菜一碟。','Done。下次记得请我喝能量饮料。','这代码……还行吧，至少能跑。']},
 {id:'ruka',quote:{text:'凶真大人……',say:'凶真大人，我会努力的。',lang:'zh-CN',pitch:1.25,rate:.9},no:'006',name:'漆原琉华',alias:'柳林神社',glyph:'琉',emblem:'⛩️',color:'#b48ce8',
  tagline:'凶真大人……我会努力的。',
  persona:'在神社帮忙的温柔、腼腆、说话很有礼貌的少年，容易害羞，尊称对方；勤奋地练习剑术；性格安静，喜欢雨天在神社屋檐下静静待着。',
  weight:c=>(wet(c)?7:0)+(c.sky==='fog'?3:0)+.5,
  missions:c=>[
   {code:'雨宿 · AMAYADORI',title:'在雨声里写下一件安心的事',brief:`${wet(c)?'外面在下雨呢……':''}请找个安静的地方，写下今天让您觉得安心的一件事。`},
   {code:'素振 · SUBURI',title:'坚持一件小小的练习',brief:'每天一点点就好。今天做一次你在坚持的练习（运动、乐器、语言……），然后记下来。'},
  ],
  offline:['那、那个……我觉得您一定可以做到的。','谢谢您……能和您说话，我很开心。','雨停之前，我会在这里陪着您的。']},
 {id:'faris',quote:{text:'欢迎回来喵，主人～',say:'お帰りなさいませ、ご主人様ニャン',lang:'ja-JP',pitch:1.5,rate:1.05},no:'007',name:'菲利斯',alias:'喵喵',glyph:'菲',emblem:'🐱',color:'#ff8fc8',
  tagline:'欢迎回来喵，主人～',
  persona:'女仆咖啡店的人气女仆，句尾常加“喵”，活泼俏皮，喜欢用夸张的“设定”讲故事、和人斗嘴；其实很聪明、观察力强，会不动声色地关心人。',
  weight:c=>(c.weekend&&c.slot==='day'?6:0)+(c.temp!==null&&c.temp>=29?2:0)+(c.slot==='dusk'?1:0)+.5,
  missions:c=>[
   {code:'NYAN MISSION',title:'给自己点一份奖励',brief:`${c.weekend?'周末就该放松一下喵～':''}今天奖励自己一件小事：一杯好喝的饮料、一段喜欢的音乐，然后汇报给菲利斯喵！`},
   {code:'RAI-NET',title:'和一个人好好聊十分钟',brief:'不许只发表情包喵！今天和朋友或家人认真聊十分钟，记下聊了什么。'},
  ],
  offline:['喵～主人今天也很努力呢！','菲利斯的猫耳已经接收到你的电波了喵！','哼哼，这个任务的难度只有 E 级喵～']},
 {id:'suzuha',quote:{text:'任务开始，战士！',say:'任务开始，出发！',lang:'zh-CN',pitch:1.2,rate:1.15},no:'008',name:'阿万音铃羽',alias:'打工战士',glyph:'鈴',emblem:'🚲',color:'#5fd38a',
  tagline:'任务目标确认，出发！',
  persona:'在楼下显像管工房打工的元气少女，说话干脆利落、像在执行任务，喜欢骑自行车和锻炼，对“战士”“任务”这类词很有反应；直率、爽朗、有点神秘。',
  weight:c=>(c.slot==='dusk'&&!wet(c)?6:0)+(c.slot==='morning'&&c.sky==='clear'?4:0)+.5,
  missions:c=>[
   {code:'MISSION 1975',title:'出门活动三十分钟',brief:`${c.sky==='clear'?'天气不错，正适合出发！':''}散步、骑车、跑步都行。完成后记录下距离或感受。`},
   {code:'MISSION RECON',title:'探索一条没走过的路',brief:'战士要熟悉地形。今天换一条路线回家或散步，记下你发现了什么。'},
  ],
  offline:['了解！任务目标已确认！','嗯，不错的执行力。我认可你了，战士。','别磨蹭了，出发！时间可不会等人。']},
 {id:'moeka',quote:{text:'……（新短信）',say:'新しいメール、です',lang:'ja-JP',pitch:1.1,rate:.8},no:'005',name:'桐生萌郁',alias:'闪光的指压师',glyph:'萌',emblem:'📱',color:'#9aa7b8',
  tagline:'……（新短信）',
  persona:'寡言内向，当面几乎不说话，却能用手机短信飞快地打很多字，短信里语气反而很活泼、会用颜文字；神秘，喜欢拍照，常在雨天或阴天出现。回复要像发短信：简短、分段、可带颜文字。',
  weight:c=>(c.sky==='cloudy'?4:0)+(wet(c)?3:0)+(c.sky==='fog'?4:0)+(c.slot==='night'?1:0)+.3,
  missions:c=>[
   {code:'MAIL 01',title:'拍一张今天的照片',brief:`……（短信）${c.sky==='cloudy'||c.sky==='fog'?'今天的天空灰灰的，很适合拍照(・ω・)':'今天的光线很好看哦'}。拍一张，然后写一句话配上它。`},
   {code:'MAIL 02',title:'给未来的自己写一句话',brief:'……（短信）写一句话给一个月后的自己吧。不用很长。'},
  ],
  offline:['……（短信）收到了(^_^)','……（短信）我觉得，这样很好。','……（短信）要继续加油哦☆']},
];

/** 按时间与天气给每位成员打分；同一天同一时段结果稳定，可用 shift 换一位 */
export function pick(c:Context,shift=0):{member:Member;mission:Mission}{
 const pool=members.map(m=>({m,w:m.weight(c)})).filter(x=>x.w>0).sort((a,b)=>b.w-a.w);
 const d=new Date();let seed=(d.getFullYear()*372+d.getMonth()*31+d.getDate())*7+['late','morning','day','dusk','night'].indexOf(c.slot);
 const rand=()=>((seed=(seed*16807+11)%2147483647)/2147483647);
 const total=pool.reduce((n,x)=>n+x.w,0);let r=rand()*total,i=0;
 while(i<pool.length-1&&(r-=pool[i].w)>0)i++;
 const member=pool[(i+shift)%pool.length].m,list=member.missions(c);
 return{member,mission:list[Math.floor(rand()*list.length+shift)%list.length]};
}

/** 原创逆光剪影头像：每位成员由发型 / 服饰 / 标志物区分，边缘用代表色勾出轮廓光 */
type Look={hair:'messy'|'long'|'bob'|'wavy'|'short';hat?:'round'|'cap';ears?:boolean;braids?:boolean;glasses?:boolean;wear:'coat'|'robe'|'maid'|'jacket'|'tee'|'top';round?:boolean};
const LOOKS:Record<string,Look>={
 okabe:{hair:'messy',wear:'coat'},kurisu:{hair:'long',wear:'coat'},mayuri:{hair:'bob',hat:'round',wear:'top'},daru:{hair:'short',hat:'cap',wear:'tee',round:true},
 ruka:{hair:'long',wear:'robe'},faris:{hair:'wavy',ears:true,wear:'maid'},suzuha:{hair:'short',braids:true,wear:'jacket'},moeka:{hair:'long',glasses:true,wear:'top'},
};
function figure(m:Member):string{
 const L=LOOKS[m.id]??{hair:'short',wear:'top'},c=m.color,rim=`stroke="${c}" stroke-width="1.1" stroke-linejoin="round"`,sil='fill="url(#sil)"';
 const hw=L.round?16:13.5;
 const body=`<path ${sil} ${rim} d="M10 104 C12 80 28 69 50 67 C72 69 88 80 90 104 Z"/>`;
 const neck=`<path ${sil} d="M44.5 52 L55.5 52 L56.5 69 L43.5 69 Z"/>`;
 const head=`<ellipse ${sil} ${rim} cx="50" cy="42" rx="${hw}" ry="15.5"/>`;
 const back={
  long:`<path ${sil} ${rim} d="M33 44 C31 22 69 22 67 44 L70 76 L59 72 L62 47 L38 47 L41 72 L30 76 Z"/>`,
  wavy:`<path ${sil} ${rim} d="M32 44 C30 21 70 21 68 44 C72 54 66 60 71 70 C66 74 62 70 60 74 L61 47 L39 47 L40 74 C38 70 34 74 29 70 C34 60 28 54 32 44 Z"/>`,
  bob:`<path ${sil} ${rim} d="M34 46 C32 24 68 24 66 46 L67 58 L60 57 L61 46 L39 46 L40 57 L33 58 Z"/>`,
 } as Record<string,string>;
 const front={
  messy:`<path ${sil} ${rim} d="M35.5 44 C33 28 42 22 51 23 C61 22 68 29 64.5 44 L62 35 L58 39 L55 31 L50 37 L46 30 L42 38 L38 34 Z"/>`,
  short:`<path ${sil} ${rim} d="M${50-hw} 41 C${50-hw-1} 24 ${50+hw+1} 24 ${50+hw} 41 C${50+hw-4} 33 ${50-hw+4} 33 ${50-hw} 41 Z"/>`,
  long:`<path ${sil} ${rim} d="M36 42 C35 27 65 27 64 42 C58 33 50 36 47 31 C44 36 40 36 36 42 Z"/>`,
  wavy:`<path ${sil} ${rim} d="M36 42 C35 27 65 27 64 42 C60 35 55 37 50 31 C46 37 40 35 36 42 Z"/>`,
  bob:`<path ${sil} ${rim} d="M36 44 C35 28 65 28 64 44 C60 37 40 37 36 44 Z"/>`,
 } as Record<string,string>;
 const hat=L.hat==='round'?`<ellipse ${sil} ${rim} cx="50" cy="28.5" rx="17" ry="3.6"/><path ${sil} ${rim} d="M39 28 C39 17 61 17 61 28 Z"/>`
  :L.hat==='cap'?`<path ${sil} ${rim} d="M${50-hw-1} 36 C${50-hw-1} 22 ${50+hw+1} 22 ${50+hw+1} 36 Z"/><path ${sil} ${rim} d="M${50+hw-2} 34 L${50+hw+11} 36 L${50+hw-2} 38 Z"/>`:'';
 const ears=L.ears?`<path ${sil} ${rim} d="M37 31 L35 17 L45 26 Z"/><path ${sil} ${rim} d="M63 31 L65 17 L55 26 Z"/><path fill="${c}" fill-opacity=".35" d="M38 28 L37 20 L42 25 Z M62 28 L63 20 L58 25 Z"/>`:'';
 const braids=L.braids?[36,64].map(x=>[0,1,2,3].map(i=>`<ellipse ${sil} ${rim} cx="${x+(x<50?-2:2)}" cy="${55+i*6}" rx="3.2" ry="3.8"/>`).join('')).join('')+`<path fill="none" stroke="${c}" stroke-width="1.4" d="M37 36 C44 31 56 31 63 36"/>`:'';
 const glasses=L.glasses?`<g fill="none" stroke="${c}" stroke-width="1.2" opacity=".9"><rect x="40" y="40" width="8" height="5.5" rx="1.5"/><rect x="52" y="40" width="8" height="5.5" rx="1.5"/><path d="M48 42.5 L52 42.5"/></g>`:'';
 const white='fill="#e9e4da" fill-opacity=".88"';
 const wear={
  coat:`<path ${white} d="M43.5 68 L50 84 L41 104 L31 104 L37 73 Z"/><path ${white} d="M56.5 68 L50 84 L59 104 L69 104 L63 73 Z"/><path fill="${c}" fill-opacity=".5" d="M46 69 L50 80 L54 69 Z"/>`,
  robe:`<path fill="none" stroke="#e9e4da" stroke-opacity=".85" stroke-width="2.4" d="M41 69 L50 88 L59 69"/>`,
  maid:`<path ${white} d="M41 68 C45 74 55 74 59 68 L57 72 C54 76 46 76 43 72 Z"/><path fill="none" stroke="#e9e4da" stroke-width="2" stroke-opacity=".9" d="M36 30 C42 25 58 25 64 30"/>`,
  jacket:`<path fill="none" stroke="${c}" stroke-opacity=".8" stroke-width="1.2" d="M50 69 L50 104 M43 69 L40 78 M57 69 L60 78"/>`,
  tee:`<path fill="none" stroke="${c}" stroke-opacity=".6" stroke-width="1.2" d="M42 68 C46 72 54 72 58 68"/>`,
  top:`<path fill="none" stroke="${c}" stroke-opacity=".6" stroke-width="1.2" d="M43 68 C46 71 54 71 57 68"/>`,
 }[L.wear];
 return (back[L.hair]??'')+body+neck+head+wear+(front[L.hair]??'')+hat+ears+braids+glasses;
}
function portrait(m:Member):string{
 return`<defs><radialGradient id="bg-${m.id}" cx="50%" cy="38%" r="62%"><stop offset="0" stop-color="${m.color}" stop-opacity=".55"/><stop offset=".55" stop-color="${m.color}" stop-opacity=".12"/><stop offset="1" stop-color="#050505"/></radialGradient>
<linearGradient id="sil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#17161b"/><stop offset="1" stop-color="#070708"/></linearGradient>
<clipPath id="clip-${m.id}"><circle cx="50" cy="50" r="47"/></clipPath></defs>
<circle cx="50" cy="50" r="47" fill="url(#bg-${m.id})"/>
<text x="50" y="47" text-anchor="middle" dominant-baseline="middle" font-size="64" font-weight="700" fill="${m.color}" fill-opacity=".1">${m.glyph}</text>
<g clip-path="url(#clip-${m.id})" style="filter:drop-shadow(0 0 2.5px ${m.color})">${figure(m)}</g>
<circle cx="50" cy="50" r="47" fill="none" stroke="${m.color}" stroke-opacity=".85" stroke-width="1.5"/>
<g class="av-ring"><circle cx="50" cy="50" r="42" fill="none" stroke="${m.color}" stroke-opacity=".35" stroke-width=".8" stroke-dasharray="2 5"/></g>
<text x="80" y="82" text-anchor="middle" dominant-baseline="middle" font-size="14">${m.emblem}</text>`;
}
export function avatar(m:Member,size=88):string{
 if(m.image)return`<img class="avatar-img" src="${m.image}" alt="${m.name}" width="${size}" height="${size}">`;
 return`<svg class="avatar" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${m.name}" style="--mc:${m.color}">${portrait(m)}</svg>`;
}

import type {Sky} from './members';

/** Open-Meteo 实时天气（免费、无需 key、支持跨域）。默认观测点：秋叶原。 */
export interface Weather {sky:Sky;temp:number|null;place:string;live:boolean}
interface Spot {lat:number;lon:number;place:string}

const AKIBA:Spot={lat:35.6984,lon:139.7731,place:'秋叶原'};
const GEO_KEY='akuya-geo',CACHE_KEY='akuya-weather';

/** WMO 天气代码 → 天空状态 */
const skyOf=(code:number):Sky=>code===0||code===1?'clear':code<=3?'cloudy':code<=48?'fog':code>=95?'storm':(code>=71&&code<=77)||code===85||code===86?'snow':'rain';

function spot():Spot{try{const s=JSON.parse(localStorage.getItem(GEO_KEY)??'null');if(s&&typeof s.lat==='number')return s}catch{}return AKIBA}

export async function getWeather():Promise<Weather>{
 const s=spot(),id=`${s.lat.toFixed(2)},${s.lon.toFixed(2)}`;
 try{const c=JSON.parse(sessionStorage.getItem(CACHE_KEY)??'null');if(c&&c.id===id&&Date.now()-c.at<30*60e3)return c.w}catch{}
 try{
  const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),4500);
  const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${s.lat}&longitude=${s.lon}&current=temperature_2m,weather_code&timezone=auto`,{signal:ctl.signal});
  clearTimeout(timer);const j=await r.json();
  const w:Weather={sky:skyOf(j.current.weather_code),temp:j.current.temperature_2m,place:s.place,live:true};
  try{sessionStorage.setItem(CACHE_KEY,JSON.stringify({id,at:Date.now(),w}))}catch{}
  return w;
 }catch{return{sky:'clear',temp:null,place:s.place,live:false}}
}

/** 改用访客自己的位置（需要授权） */
export function useMyLocation():Promise<void>{
 return new Promise((resolve,reject)=>{
  if(!navigator.geolocation){reject(new Error('浏览器不支持定位'));return}
  navigator.geolocation.getCurrentPosition(p=>{
   try{localStorage.setItem(GEO_KEY,JSON.stringify({lat:+p.coords.latitude.toFixed(3),lon:+p.coords.longitude.toFixed(3),place:'你的位置'}));sessionStorage.removeItem(CACHE_KEY)}catch{}
   resolve();
  },e=>reject(new Error(e.code===1?'没有获得定位授权':'定位失败')),{timeout:8000,maximumAge:3600e3});
 });
}
export function resetLocation():void{try{localStorage.removeItem(GEO_KEY);sessionStorage.removeItem(CACHE_KEY)}catch{}}
export const usingCustomLocation=():boolean=>spot()!==AKIBA;

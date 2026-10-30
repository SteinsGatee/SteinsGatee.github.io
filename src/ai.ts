/// <reference types="vite/client" />
/**
 * DeepSeek 对话（OpenAI 兼容的 /chat/completions，流式 SSE）。
 * 两种接法，优先级从高到低：
 *  1. 构建时设置 VITE_AI_PROXY=代理地址（推荐）：key 保存在 Cloudflare Worker 里，见 worker/deepseek-proxy.js
 *  2. 访客在页面里填自己的 DeepSeek key：只存在本浏览器 localStorage，直接请求 api.deepseek.com
 * 都没有时返回 null，调用方使用离线台词。
 */
export interface ChatMessage {role:'system'|'user'|'assistant';content:string}
export interface AIConfig {mode:'proxy'|'key';endpoint:string;key?:string;model:string}

const KEY='akuya-deepseek-key';
const PROXY=(import.meta.env.VITE_AI_PROXY as string|undefined)?.trim();

export function aiConfig():AIConfig|null{
 if(PROXY)return{mode:'proxy',endpoint:PROXY,model:'deepseek-chat'};
 let key:string|null=null;try{key=localStorage.getItem(KEY)}catch{}
 return key?{mode:'key',endpoint:'https://api.deepseek.com/chat/completions',key,model:'deepseek-chat'}:null;
}
export const hasProxy=()=>!!PROXY;
export function saveKey(key:string):void{try{key?localStorage.setItem(KEY,key.trim()):localStorage.removeItem(KEY)}catch{}}

/** 逐段产出模型回复文本 */
export async function* chat(cfg:AIConfig,messages:ChatMessage[],signal?:AbortSignal):AsyncGenerator<string>{
 const res=await fetch(cfg.endpoint,{method:'POST',signal,headers:{'Content-Type':'application/json',...(cfg.key?{Authorization:`Bearer ${cfg.key}`}:{})},
  body:JSON.stringify({model:cfg.model,messages,stream:true,temperature:1.1,max_tokens:300})});
 if(!res.ok||!res.body){const text=await res.text().catch(()=>'');throw new Error(res.status===401?'Key 无效或已过期':res.status===402?'DeepSeek 账户余额不足':`请求失败（${res.status}）${text.slice(0,120)}`)}
 const reader=res.body.getReader(),decoder=new TextDecoder();let buf='';
 for(;;){
  const {value,done}=await reader.read();if(done)break;
  buf+=decoder.decode(value,{stream:true});
  let nl:number;
  while((nl=buf.indexOf('\n'))>=0){
   const line=buf.slice(0,nl).trim();buf=buf.slice(nl+1);
   if(!line.startsWith('data:'))continue;
   const data=line.slice(5).trim();if(data==='[DONE]')return;
   try{const piece=JSON.parse(data).choices?.[0]?.delta?.content;if(piece)yield piece}catch{}
  }
 }
}

/**
 * DeepSeek 代理（Cloudflare Worker）：把 API key 留在服务端，浏览器只拿到流式回复。
 *
 * 部署：
 *   cd worker && npx wrangler deploy
 *   npx wrangler secret put DEEPSEEK_API_KEY      # 填入你的 sk-...
 * 然后在 GitHub 仓库 Settings → Secrets and variables → Actions → Variables
 * 新增 AI_PROXY_URL = https://<你的 worker>.workers.dev ，重新部署站点即可。
 *
 * 安全：只接受 ALLOWED_ORIGINS 里的来源；限制消息条数与输出长度。
 * 公开站点仍可能被滥用，建议在 Cloudflare 控制台为该 Worker 加上速率限制规则。
 */
export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const ok = allowed.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': ok ? origin : allowed[0] || '',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST' || !ok) return new Response('Forbidden', { status: 403, headers: cors });

    let body;
    try { body = await req.json(); } catch { return new Response('Bad Request', { status: 400, headers: cors }); }
    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .slice(-16)
      .filter(m => ['system', 'user', 'assistant'].includes(m.role) && typeof m.content === 'string')
      .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));

    const upstream = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: env.MODEL || 'deepseek-chat',
        messages,
        stream: true,
        temperature: typeof body.temperature === 'number' ? body.temperature : 1.1,
        max_tokens: Math.min(Number(body.max_tokens) || 300, 400),
      }),
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...cors, 'Content-Type': upstream.headers.get('Content-Type') || 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  },
};

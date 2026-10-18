import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { database } from '../lib/store.js';
import { defaultState, validateState } from '../lib/media.js';
const hash = s => createHash('sha256').update(s).digest('hex');
const token = () => randomBytes(24).toString('base64url');
function reply(res, code, data) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(data)); }
async function body(req) {
  if (req.body) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  let text = '';
  for await (const chunk of req) { text += chunk; if (text.length > 4096) throw new Error('BAD_BODY'); }
  return text ? JSON.parse(text) : {};
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const url = new URL(req.url, 'http://localhost');
    const route = String(req.query?.route || url.searchParams.get('route') || url.pathname.replace(/^\/api\//, '')).replace(/^\/+|\/+$/g, '');
    if (req.headers.origin && req.headers['sec-fetch-site'] === 'cross-site') return reply(res, 403, { error: '请在本站打开控制页面。' });
    if (route === 'health' && req.method === 'GET') {
      await database(); return reply(res, 200, { ok: true });
    }
    const db = await database();
    if (route === 'rooms' && req.method === 'POST') {
      const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local').split(',')[0];
      const creator = hash(ip);
      const recent = await db.query("SELECT count(*)::int AS n FROM wozhi_rooms WHERE creator_hash=$1 AND created_at>now()-interval '1 hour'", [creator]);
      if (recent.rows[0].n >= 30) return reply(res, 429, { error: '创建次数较多，请稍后重试或使用现有连接。' });
      const id = randomBytes(12).toString('hex'), controlToken = token(), screenToken = token();
      const state = { ...defaultState(), version: randomUUID() };
      await db.query("DELETE FROM wozhi_rooms WHERE expires_at < now()");
      await db.query("INSERT INTO wozhi_rooms(id,control_hash,screen_hash,state,expires_at,creator_hash) VALUES($1,$2,$3,$4,now()+interval '24 hours',$5)", [id, hash(controlToken), hash(screenToken), JSON.stringify(state), creator]);
      return reply(res, 201, { id, controlToken, screenToken, state, expiresIn: 86400 });
    }
    const match = route.match(/^rooms\/([a-f0-9]{24})(?:\/(state|heartbeat))?$/);
    if (!match) return reply(res, 404, { error: '找不到接口。' });
    const credential = String(req.headers.authorization || '').replace(/^Bearer /, '');
    if (!/^[\w-]{32}$/.test(credential)) return reply(res, 401, { error: '缺少配对凭证，请重新连接。' });
    const result = await db.query('SELECT * FROM wozhi_rooms WHERE id=$1 AND expires_at>now()', [match[1]]);
    const room = result.rows[0];
    if (!room) return reply(res, 404, { error: '配对已过期，请在电脑上重新创建连接。' });
    const digest = hash(credential), role = digest === room.control_hash ? 'control' : digest === room.screen_hash ? 'screen' : null;
    if (!role) return reply(res, 403, { error: '配对凭证不正确。' });
    if (!match[2] && req.method === 'GET') return reply(res, 200, { state: room.state, screen: room.heartbeat, online: Boolean(room.seen_at && Date.now() - new Date(room.seen_at).getTime() < 12000), expiresAt: room.expires_at });
    if (match[2] === 'state' && req.method === 'PUT' && role === 'control') {
      const valid = validateState(await body(req));
      if (!valid) return reply(res, 400, { error: '不支持的播放设置。' });
      const state = { ...valid, version: randomUUID() };
      await db.query('UPDATE wozhi_rooms SET state=$2 WHERE id=$1', [room.id, JSON.stringify(state)]);
      return reply(res, 200, { state });
    }
    if (match[2] === 'heartbeat' && req.method === 'POST' && role === 'screen') {
      const input = await body(req);
      const heartbeat = { version: String(input.version || '').slice(0, 50), status: ['playing','paused','loading','blocked','error','hidden'].includes(input.status) ? input.status : 'error', fullscreen: input.fullscreen === true, error: String(input.error || '').slice(0, 160), media: String(input.media || '').slice(0, 20) };
      await db.query('UPDATE wozhi_rooms SET heartbeat=$2,seen_at=now() WHERE id=$1', [room.id, JSON.stringify(heartbeat)]);
      return reply(res, 200, { ok: true });
    }
    return reply(res, 403, { error: '显示屏不能修改遥控指令。' });
  } catch (error) {
    if (error instanceof SyntaxError || error.message === 'BAD_BODY') return reply(res, 400, { error: '请求格式不正确。' });
    console.error('[wozhi-api]', error.code || error.message?.replace(/postgres(?:ql)?:\/\/\S+/g, '[database]'));
    return reply(res, 503, { error: '同步服务暂时不可用，请稍后重试。当前视频会继续播放。' });
  }
}

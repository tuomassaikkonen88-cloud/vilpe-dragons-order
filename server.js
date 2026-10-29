// The Dragon's Order — live party game server. No dependencies.
// Players: GET /        DM big screen: GET /host?key=HOST_KEY
const http = require('http');
const fs = require('fs');
const path = require('path');
const G = require('./public/data.js');

const PORT = process.env.PORT || 3000;
const HOST_KEY = process.env.HOST_KEY || 'dragon';
const PUB = path.join(__dirname, 'public');
const STATIC = {
  '/': ['app.html', 'text/html; charset=utf-8'],
  '/host': ['app.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/data.js': ['data.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/qrcode.js': ['qrcode.js', 'text/javascript; charset=utf-8'],
};

// ---------------- game state ----------------
const rid = () => Math.random().toString(36).slice(2, 8);
const fresh = () => ({ runId: rid(), phase: 'lobby', scene: 0, winner: -1, hand: [0, 0, 0], tally: [0, 0, 0], tie: false,
  outcome: null, res: { g: 100, v: 0, m: 50 }, deadline: 0, guild: [], glory: {}, ending: null, awards: null, lastRolls: [], log: [] });
let H = fresh();
const players = new Map(); // pid -> {pid,n,c,vote:{k,v},roll:{k,r},conns,seen}
const clients = new Set(); // {res,pid,host}
const key = () => H.runId + '-' + H.scene;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

function online() {
  const now = Date.now();
  return [...players.values()].filter(p => p.n && (p.conns > 0 || now - p.seen < 90000));
}
function liveTally() {
  const t = [...H.hand];
  for (const p of online()) if (p.vote && p.vote.k === key()) t[p.vote.v]++;
  return t;
}
function liveRolls() {
  const out = [];
  for (const p of players.values()) if (p.n && p.roll && p.roll.k === key()) out.push({ pid: p.pid, n: p.n, c: p.c, r: p.roll.r, phone: true });
  for (const g of H.guild) out.push({ n: null, c: null, r: g, phone: false });
  return out;
}

// Auto-advance: once every online player has voted (or rolled), move on after a short pause
let autoTimer = null, autoKey = '';
function allDone() {
  const ps = online(); if (!ps.length) return false; const k = key();
  if (H.phase === 'vote') return ps.every(p => p.vote && p.vote.k === k);
  if (H.phase === 'roll') return ps.every(p => p.roll && p.roll.k === k);
  return false;
}
function checkAuto() {
  const tag = H.runId + '|' + H.scene + '|' + H.phase;
  if (!allDone()) { if (autoTimer && autoKey === tag) { clearTimeout(autoTimer); autoTimer = null; autoKey = ''; } return; }
  if (autoTimer && autoKey === tag) return;
  clearTimeout(autoTimer); autoKey = tag;
  autoTimer = setTimeout(() => {
    autoTimer = null; autoKey = '';
    if (H.runId + '|' + H.scene + '|' + H.phase === tag && allDone()) { advance(); broadcast(); }
  }, H.phase === 'roll' ? 2600 : 2000);
}
function advance() {
  switch (H.phase) {
    case 'lobby': H.phase = 'intro'; H.scene = 0; break;
    case 'intro': H.phase = 'vote'; H.hand = [0, 0, 0]; H.deadline = Date.now() + 45000; break;
    case 'vote': {
      const tl = liveTally(); H.tally = tl; const max = Math.max(...tl);
      const tops = [0, 1, 2].filter(i => tl[i] === max);
      H.tie = tops.length > 1; H.winner = tops[Math.floor(Math.random() * tops.length)];
      H.phase = 'roll'; H.guild = []; H.deadline = Date.now() + 30000; break;
    }
    case 'roll': resolveRoll(); H.phase = 'result'; H.deadline = 0; break;
    case 'result':
      if (H.scene < 4) { H.scene++; H.phase = 'intro'; H.outcome = null; H.winner = -1; H.lastRolls = []; }
      else { finishGame(); H.phase = 'ending'; }
      break;
    case 'ending': H.phase = 'awards'; break;
    case 'awards': H = fresh(); for (const p of players.values()) { p.vote = null; p.roll = null; } break;
  }
}
function resolveRoll() {
  let rolls = liveRolls();
  if (!rolls.length) { for (let i = 0; i < 5; i++) H.guild.push(G.d20()); rolls = liveRolls(); }
  const sc = G.SCENES[H.scene], o = sc.o[H.winner];
  const totals = rolls.map(x => ({ ...x, tot: G.rollTotal(x.r, x.c, o.tag) }));
  const avg = totals.reduce((s, x) => s + x.tot, 0) / totals.length;
  const tier = G.tierOf(avg, sc.dc);
  const mult = { legendary: 1.5, success: 1, partial: 0.75 }[tier] || 1;
  const base = tier === 'fail' ? o.lose : o.win;
  const d = { g: Math.round(base.g * mult / 10) * 10, v: Math.round(base.v * mult / 50) * 50, m: Math.round(base.m * mult) };
  H.res.g = Math.max(0, H.res.g + d.g); H.res.v = Math.max(0, H.res.v + d.v); H.res.m = clamp(H.res.m + d.m, 0, 100);
  const best = totals.filter(x => x.phone).sort((a, b) => b.tot - a.tot)[0];
  H.outcome = { avg: Math.round(avg * 10) / 10, dc: sc.dc, tier, n: totals.length, delta: d,
    crit: totals.filter(x => x.r === 20 && x.phone).map(x => x.n).slice(0, 8),
    fum: totals.filter(x => x.r === 1 && x.phone).map(x => x.n).slice(0, 8),
    best: best ? { n: best.n, t: best.tot } : null };
  H.lastRolls = totals.map(x => ({ n: x.n, c: x.c, r: x.r, tot: x.tot }));
  H.log.push({ s: H.scene, w: H.winner, tier });
  for (const x of totals) {
    if (!x.phone) continue;
    const g = H.glory[x.pid] || (H.glory[x.pid] = { n: x.n, sum: 0, n20: 0, n1: 0, hi: 0, cnt: 0 });
    g.n = x.n; g.sum += x.tot + (x.r === 20 ? 10 : 0); g.cnt++; if (x.r === 20) g.n20++; if (x.r === 1) g.n1++; g.hi = Math.max(g.hi, x.r);
  }
}
function finishGame() {
  const r = H.res;
  const full = r.v >= 10000;
  let id;
  if (r.v < 4000 || r.m < 20) id = 'disaster';
  else if (full && r.m >= 70) id = 'legendary';
  else if (full && r.m >= 40) id = 'success';
  else if (r.v >= 7500 && r.m >= 40) id = 'short';
  else id = 'messy';
  H.ending = { id, v: r.v, m: r.m, g: r.g };
  const gl = Object.values(H.glory); const aw = [];
  if (gl.length) {
    const by = f => [...gl].sort(f)[0];
    aw.push({ k: 'mvp', n: by((a, b) => b.sum - a.sum).n });
    aw.push({ k: 'luck', n: by((a, b) => (b.n20 - a.n20) || (b.hi - a.hi) || (b.sum - a.sum)).n });
    aw.push({ k: 'fumble', n: by((a, b) => (b.n1 - a.n1) || (a.sum / a.cnt - b.sum / b.cnt)).n });
    if (gl.length > 2) aw.push({ k: 'snack', n: by((a, b) => a.sum - b.sum).n });
  }
  H.awards = aw;
}

// ---------------- broadcasting ----------------
function publicState() {
  const k = key();
  return {
    runId: H.runId, phase: H.phase, scene: H.scene, winner: H.winner, tie: H.tie,
    tally: H.phase === 'vote' ? liveTally() : H.tally, hand: H.hand, outcome: H.outcome, res: H.res,
    left: Math.max(0, H.deadline - Date.now()), ending: H.ending, awards: H.awards, guild: H.guild, lastRolls: H.lastRolls, log: H.log,
    players: online().map(p => ({ n: p.n, c: p.c, voted: !!(p.vote && p.vote.k === k), r: p.roll && p.roll.k === k ? p.roll.r : null })),
  };
}
function meOf(pid) {
  const p = players.get(pid); if (!p || !p.n) return null; const k = key();
  return { n: p.n, c: p.c, v: p.vote && p.vote.k === k ? p.vote.v : -1, r: p.roll && p.roll.k === k ? p.roll.r : null };
}
function send(cl, st) {
  const payload = cl.host ? st : { ...st, players: undefined, me: meOf(cl.pid), count: st.players.length };
  try { cl.res.write('data: ' + JSON.stringify(payload) + '\n\n'); } catch (e) {}
}
let pending = null;
function broadcast() {
  if (pending) return;
  pending = setTimeout(() => { pending = null; const st = publicState(); for (const cl of clients) send(cl, st); }, 80);
}
setInterval(() => { for (const cl of clients) { try { cl.res.write(': ping\n\n'); } catch (e) {} } }, 20000);
setInterval(broadcast, 5000); // keeps timers and the online list fresh

// ---------------- http ----------------
function json(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); }
function body(req) {
  return new Promise(resolve => {
    let d = ''; req.on('data', c => { d += c; if (d.length > 4000) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch (e) { resolve({}); } });
  });
}
const okPid = p => typeof p === 'string' && /^[a-z0-9]{8,32}$/.test(p);
function getP(pid) {
  let p = players.get(pid);
  if (!p) { if (players.size > 300) return null; p = { pid, n: '', c: '', vote: null, roll: null, conns: 0, seen: Date.now() }; players.set(pid, p); }
  p.seen = Date.now(); return p;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const route = url.pathname;

  if (req.method === 'GET' && STATIC[route]) {
    const [f, type] = STATIC[route];
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    return fs.createReadStream(path.join(PUB, f)).pipe(res);
  }
  if (req.method === 'GET' && route === '/healthz') return json(res, 200, { ok: true });
  const im = req.method === 'GET' && /^\/img\/([a-z0-9-]+)\.(jpg|png|webp)$/.exec(route);
  if (im) {
    const f = path.join(PUB, 'img', im[1] + '.' + im[2]);
    return fs.stat(f, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[im[2]], 'Cache-Control': 'public, max-age=3600', 'Content-Length': st.size });
      fs.createReadStream(f).pipe(res);
    });
  }

  if (req.method === 'GET' && route === '/events') {
    const host = url.searchParams.get('key') === HOST_KEY;
    const pid = url.searchParams.get('pid');
    if (url.searchParams.has('key') && !host) return json(res, 403, { error: 'bad_key' });
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write('retry: 2000\n\n');
    const cl = { res, pid: okPid(pid) ? pid : null, host };
    const p = cl.pid ? getP(cl.pid) : null; if (p) p.conns++;
    clients.add(cl); send(cl, publicState()); broadcast();
    req.on('close', () => { clients.delete(cl); if (p) { p.conns = Math.max(0, p.conns - 1); p.seen = Date.now(); } broadcast(); });
    return;
  }

  if (req.method === 'POST' && route.startsWith('/api/')) {
    const b = await body(req);
    if (route === '/api/host') {
      if (b.key !== HOST_KEY) return json(res, 403, { error: 'bad_key' });
      if (b.action === 'next') { if (!b.from || b.from === H.runId + '|' + H.scene + '|' + H.phase) advance(); }
      else if (b.action === 'reset') { H = fresh(); for (const p of players.values()) { p.vote = null; p.roll = null; } }
      else if (b.action === 'guild' && H.phase === 'roll' && H.guild.length < 40) H.guild.push(G.d20());
      else if (b.action === 'kick' && typeof b.n === 'string') { for (const p of players.values()) if (p.n === b.n) { p.n = ''; p.c = ''; }  checkAuto(); }
      broadcast(); return json(res, 200, { ok: true });
    }
    if (!okPid(b.pid)) return json(res, 400, { error: 'bad_pid' });
    const p = getP(b.pid); if (!p) return json(res, 503, { error: 'full' });
    if (route === '/api/join') {
      const n = String(b.n || '').replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮]/g, '').trim().replace(/\s+/g, ' ').slice(0, 18);
      if (!n || !G.cls(b.c)) return json(res, 400, { error: 'bad_input' });
      p.n = n; p.c = b.c; broadcast(); return json(res, 200, { ok: true, me: meOf(p.pid) });
    }
    if (route === '/api/leave') { p.n = ''; p.c = ''; broadcast(); checkAuto(); return json(res, 200, { ok: true }); }
    if (!p.n) return json(res, 409, { error: 'not_joined' });
    if (route === '/api/vote') {
      if (H.phase !== 'vote' || ![0, 1, 2].includes(b.v)) return json(res, 409, { error: 'not_voting' });
      p.vote = { k: key(), v: b.v }; broadcast(); checkAuto(); return json(res, 200, { ok: true, me: meOf(p.pid) });
    }
    if (route === '/api/roll') {
      if (H.phase !== 'roll') return json(res, 409, { error: 'not_rolling' });
      if (!(p.roll && p.roll.k === key())) p.roll = { k: key(), r: G.d20() };
      broadcast(); checkAuto(); return json(res, 200, { ok: true, me: meOf(p.pid) });
    }
    return json(res, 404, { error: 'not_found' });
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found');
});
server.keepAliveTimeout = 65000;
server.listen(PORT, () => console.log('The Dragon\'s Order listening on ' + PORT));

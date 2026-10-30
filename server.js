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
// everyone shown on screens: online players, plus anyone who already rolled this scene (their roll still counts)
function listed() {
  const on = new Set(online()); const k = key();
  for (const p of players.values()) if (p.n && p.roll && p.roll.k === k) on.add(p);
  return [...on];
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
  if (H.phase === 'rescue') return ps.every(p => p.done === k) || rescueNeed() === 0;
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
  }, H.phase === 'roll' ? 4100 : H.phase === 'rescue' ? 2500 : 3500);
}
function advance() {
  switch (H.phase) {
    case 'lobby': H.phase = 'intro'; H.scene = 0; break;
    case 'intro': H.phase = 'vote'; H.hand = [0, 0, 0]; H.deadline = Date.now() + 45000; break;
    case 'vote': {
      const tl = liveTally(); H.tally = tl; const max = Math.max(...tl);
      const tops = [0, 1, 2].filter(i => tl[i] === max);
      H.tie = max > 0 && tops.length > 1; H.winner = tops[Math.floor(Math.random() * tops.length)];
      H.phase = 'roll'; H.guild = []; H.deadline = Date.now() + 30000; break;
    }
    case 'roll': computeRoll(); break;
    case 'rescue': finalizeRoll(); break;
    case 'result':
      if (H.scene < G.SCENES.length - 1) { H.scene++; H.phase = 'intro'; H.outcome = null; H.winner = -1; H.lastRolls = []; H.rescue = null; H.roll = null; }
      else { finishGame(); H.phase = 'ending'; }
      break;
    case 'ending': H.phase = 'awards'; break;
    case 'awards': H = fresh(); for (const p of players.values()) resetStash(p); break;
  }
}
const RESCUE_MS = 20000;
let rescueTimer = null;
function resetStash(p) { p.coins = 0; p.insp = 0; p.streak = 0; p.cold = 0; p.given = 0; p.loot = null; p.vote = null; p.roll = null; p.done = null; }
// Step 1 (end of rolling): guild average, personal streaks and loot. May open a rescue window.
function computeRoll() {
  let rolls = liveRolls();
  if (!rolls.length) { for (let i = 0; i < 5; i++) H.guild.push(G.d20()); rolls = liveRolls(); }
  const sc = G.SCENES[H.scene], o = sc.o[H.winner], k = key();
  const totals = rolls.map(x => ({ ...x, tot: G.rollTotal(x.r, x.c, o.tag) }));
  const sum = totals.reduce((s, x) => s + x.tot, 0), n = totals.length, avg = sum / n;
  const tier0 = G.tierOf(avg, sc.dc);
  for (const x of totals) {
    if (!x.phone) continue;
    const p = players.get(x.pid); if (!p) continue;
    if (x.tot >= sc.dc) { p.streak++; p.cold = 0; } else { p.cold++; p.streak = 0; }
    const base = tier0 === 'severe' ? { c: 0, i: 0 } : G.lootOf(x.r, x.c);
    const mult = G.streakMult(p.streak);
    const c = Math.round(base.c * mult), i = Math.round(base.i * mult);
    p.coins += c; p.insp += i; p.loot = { k, c, i, mult, streak: p.streak, cold: p.cold };
  }
  H.roll = { sum, n, avg, tier0, dc: sc.dc, totals };
  if (tier0 === 'fail' || tier0 === 'partial') {
    const target = tier0 === 'fail' ? 'partial' : 'success';
    H.rescue = { pts: 0, target, thr: target === 'partial' ? sc.dc - 3 : sc.dc, givers: {}, until: Date.now() + RESCUE_MS };
    for (const p of players.values()) p.done = null;
    H.phase = 'rescue'; H.deadline = H.rescue.until;
    const tag = H.runId + '|' + H.scene;
    clearTimeout(rescueTimer);
    rescueTimer = setTimeout(() => { if (H.phase === 'rescue' && H.runId + '|' + H.scene === tag) { finalizeRoll(); broadcast(); } }, RESCUE_MS + 300);
  } else { H.rescue = null; finalizeRoll(); }
}
const rescueNeed = () => H.rescue ? Math.max(0, Math.ceil(H.rescue.thr * H.roll.n - H.roll.sum - H.rescue.pts - 1e-9)) : 0;
// Step 2: apply the (possibly rescued) result
function finalizeRoll() {
  clearTimeout(rescueTimer);
  const R = H.roll, sc = G.SCENES[H.scene], o = sc.o[H.winner];
  const pts = H.rescue ? H.rescue.pts : 0;
  const avg = (R.sum + pts) / R.n;
  let tier = G.tierOf(avg, sc.dc);
  const maxIdx = G.TIERS.indexOf(R.tier0) + (H.rescue ? 1 : 0);
  if (G.TIERS.indexOf(tier) > maxIdx) tier = G.TIERS[maxIdx];
  const mult = { legendary: 1.5, success: 1, partial: 0.75, fail: 1, severe: 1.5 }[tier];
  const base = (tier === 'fail' || tier === 'severe') ? o.lose : o.win;
  const d = { g: Math.round(base.g * mult / 10) * 10, v: Math.round(base.v * mult / 50) * 50, m: Math.round(base.m * mult) };
  H.res.v = Math.max(0, H.res.v + d.v); H.res.m = clamp(H.res.m + d.m, 0, 100);
  // story gold is shared out as coins to every player in the game
  const share = Math.round(d.g / 10);
  if (share) for (const p of listed()) p.coins = Math.max(0, p.coins + share);
  const totals = R.totals;
  const best = totals.filter(x => x.phone).sort((a, b) => b.tot - a.tot)[0];
  H.outcome = { avg: Math.round(avg * 10) / 10, avg0: Math.round(R.avg * 10) / 10, dc: sc.dc, tier, tier0: R.tier0, rescued: G.TIERS.indexOf(tier) > G.TIERS.indexOf(R.tier0), pts, n: totals.length, delta: d, share,
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
  H.phase = 'result'; H.deadline = 0;
}
function finishGame() {
  const r = H.res;
  const full = r.v >= 10000;
  let id;
  if (r.v < 4000 || r.m < 20) id = 'disaster';
  else if (full && r.m >= 70) id = 'legendary';
  else if (full && r.m >= 40) id = 'success';
  else if (full) id = 'grumpy';
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
  const ps = [...players.values()].filter(p => p.n);
  const top = f => ps.slice().sort(f)[0];
  if (ps.length) {
    const r = top((a, b) => b.coins - a.coins); if (r.coins > 0) aw.push({ k: 'rich', n: r.n, x: r.coins });
    const i = top((a, b) => b.insp - a.insp); if (i.insp > 0) aw.push({ k: 'insp', n: i.n, x: i.insp });
    const g = top((a, b) => b.given - a.given); if (g.given > 0) aw.push({ k: 'gen', n: g.n, x: g.given });
  }
  H.awards = aw;
}

// ---------------- broadcasting ----------------
function publicState() {
  const k = key();
  return {
    runId: H.runId, phase: H.phase, scene: H.scene, winner: H.winner, tie: H.tie,
    tally: H.phase === 'vote' ? liveTally() : H.tally, hand: H.hand, outcome: H.outcome,
    res: { ...H.res, g: [...players.values()].filter(p => p.n).reduce((s, p) => s + p.coins, 0), i: [...players.values()].filter(p => p.n).reduce((s, p) => s + p.insp, 0) },
    roll: H.phase === 'rescue' && H.roll ? { sum: H.roll.sum, n: H.roll.n, avg: Math.round(H.roll.avg * 10) / 10, tier0: H.roll.tier0, dc: H.roll.dc } : null,
    rescue: H.phase === 'rescue' && H.rescue ? { pts: H.rescue.pts, target: H.rescue.target, thr: H.rescue.thr, need: rescueNeed(),
      givers: Object.values(H.rescue.givers).sort((a, b) => b.pts - a.pts).slice(0, 12) } : null,
    left: Math.max(0, H.deadline - Date.now()), ending: H.ending, awards: H.awards, guild: H.guild, lastRolls: H.lastRolls, log: H.log,
    players: listed().map(p => ({ id: p.pub, n: p.n, c: p.c, voted: !!(p.vote && p.vote.k === k), r: p.roll && p.roll.k === k ? p.roll.r : null, st: p.streak, cd: p.cold, done: p.done === k })),
  };
}
function meOf(pid) {
  const p = players.get(pid); if (!p || !p.n) return null; const k = key();
  return { n: p.n, c: p.c, v: p.vote && p.vote.k === k ? p.vote.v : -1, r: p.roll && p.roll.k === k ? p.roll.r : null,
    coins: p.coins, insp: p.insp, st: p.streak, cd: p.cold, given: p.given, loot: p.loot && p.loot.k === k ? p.loot : null, done: p.done === k };
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
setInterval(() => { broadcast(); checkAuto(); }, 5000); // keeps timers and the online list fresh; re-checks auto-advance as players drop offline

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
  if (!p) { if (players.size > 300) return null; p = { pid, pub: Math.random().toString(36).slice(2, 10), n: '', c: '', conns: 0, seen: Date.now() }; resetStash(p); players.set(pid, p); }
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
      else if (b.action === 'reset') { clearTimeout(rescueTimer); H = fresh(); for (const p of players.values()) resetStash(p); }
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
    if (route === '/api/give') {
      if (H.phase !== 'rescue' || !H.rescue) return json(res, 409, { error: 'not_rescue' });
      if (rescueNeed() === 0) return json(res, 409, { error: 'rescued', me: meOf(p.pid) });
      let pts = 0;
      if (b.what === 'coins' && p.coins >= 15) { p.coins -= 15; pts = 1; }
      else if (b.what === 'insp' && p.insp >= 5) { p.insp -= 5; pts = 1; }
      if (!pts) return json(res, 409, { error: 'broke', me: meOf(p.pid) });
      H.rescue.pts += pts; p.given += pts;
      const gv = H.rescue.givers[p.pub] || (H.rescue.givers[p.pub] = { id: p.pub, n: p.n, c: p.c, pts: 0 }); gv.pts += pts;
      broadcast(); checkAuto(); return json(res, 200, { ok: true, me: meOf(p.pid) });
    }
    if (route === '/api/done') {
      if (H.phase !== 'rescue') return json(res, 409, { error: 'not_rescue' });
      p.done = key(); broadcast(); checkAuto(); return json(res, 200, { ok: true, me: meOf(p.pid) });
    }
    return json(res, 404, { error: 'not_found' });
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found');
});
server.keepAliveTimeout = 65000;
server.listen(PORT, () => console.log('The Dragon\'s Order listening on ' + PORT));

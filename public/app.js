(function(){
const {CLASSES,TAGS,SCENES,ENDINGS,T,cls,d20,rollTotal,tierOf,modOf,TIERS}=window.GAME;
const reduceMotion=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const $=s=>document.querySelector(s);
const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
let lang=ls.get('vf_lang',(navigator.language||'fi').toLowerCase().startsWith('fi')?'fi':'en'); if(lang!=='fi'&&lang!=='en')lang='fi';
const t=k=>(T[lang][k]??T.en[k]??k);
const L=o=>o[lang]||o.en;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(n).toLocaleString(lang==='fi'?'fi-FI':'en-US');
const moodWord=m=>t('mood'+Math.min(4,Math.floor(m/20.001)));
const tagLabel=tag=>L(TAGS[tag]);
const sgn=n=>n>0?'+'+n:n<0?'−'+Math.abs(n):'±0';
const modCls=n=>n>0?'mod-up':n<0?'mod-down':'mod-zero';
const skillList=c=>Object.entries(c.sk).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<span class="sk ${modCls(v)}"><b class="num">${sgn(v)}</b> ${esc(tagLabel(k))}</span>`).join('');
const modChips=tag=>[...CLASSES].sort((a,b)=>modOf(b.id,tag)-modOf(a.id,tag)).map(c=>`<span class="pill ${modCls(modOf(c.id,tag))}">${c.ic} ${sgn(modOf(c.id,tag))}</span>`).join('');
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const langSw=()=>`<div class="lang" role="group" aria-label="Language"><button type="button" data-lang="fi" aria-pressed="${lang==='fi'}">FI</button><button type="button" data-lang="en" aria-pressed="${lang==='en'}">EN</button></div>`;
function deltaHtml(d,share){
  if(!d)return'';const o=[];
  if(share)o.push(`<span class="delta ${share>0?'up':'down'}">${share>0?'+':''}${share} 🪙</span>`);
  if(d.v)o.push(`<span class="delta ${d.v>0?'up':'down'}">${d.v>0?'+':''}${fmt(d.v)} ${lang==='fi'?'tuuletinta':'vents'}</span>`);
  if(d.m)o.push(`<span class="delta ${d.m>0?'up':'down'}">${d.m>0?'+':''}${d.m} ${lang==='fi'?'mieliala':'mood'}</span>`);
  return o.length?`<div class="deltas">${o.join('')}</div>`:'';
}

const isHost=location.pathname.replace(/\/+$/,'')==='/host';
let hostKey='';
if(isHost){const q=new URLSearchParams(location.search).get('key');if(q){ls.set('vf_key',q);hostKey=q;}else hostKey=ls.get('vf_key','');}
let pid=ls.get('vf_pid','');if(!/^[a-z0-9]{8,32}$/.test(pid)){pid=(Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)).replace(/[^a-z0-9]/g,'').slice(0,16);ls.set('vf_pid',pid);}

let S=null,connected=false,everConnected=false,badKey=false,localDeadline=0;
function render(){document.documentElement.lang=isHost?'fi':lang;if(isHost)renderHost();else renderPlayer();}
document.addEventListener('click',e=>{const b=e.target.closest('[data-lang]');if(b&&!isHost){lang=b.dataset.lang;ls.set('vf_lang',lang);render();}});

/* ---------------- live connection ---------------- */
function connect(){
  const url=isHost?'/events?key='+encodeURIComponent(hostKey):'/events?pid='+pid;
  const es=new EventSource(url);
  es.onopen=()=>{connected=true;everConnected=true;render();};
  es.onmessage=ev=>{
    let d;try{d=JSON.parse(ev.data)}catch(e){return}
    const prev=S;S=d;localDeadline=Date.now()+(+d.left||0);
    if(isHost)renderHost();
    else if(!rolling&&(!prev||structKey(prev)!==structKey(d)))renderPlayer();
    else updatePlayerLive();
  };
  es.onerror=()=>{
    connected=false;
    if(isHost&&!everConnected){fetch(url).then(r=>{if(r.status===403){badKey=true;es.close();render();}}).catch(()=>{});}
    render();
  };
}
async function api(path,b){
  try{const r=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});return await r.json();}
  catch(e){return{error:'network'}}
}
setInterval(()=>{
  const s=Math.max(0,Math.ceil((localDeadline-Date.now())/1000));
  document.querySelectorAll('.js-timer').forEach(el=>el.textContent=s>0?s+' s':'');
},500);

/* ---------------- player ---------------- */
let pickClass=null,rolling=false,pDrumUntil=0;
const structKey=d=>[d.runId,d.phase,d.scene,d.winner,d.me?[d.me.n,d.me.c,d.me.v,d.me.r??'',d.me.coins,d.me.insp,d.me.done?1:0,d.me.st,d.me.cd].join(','):'-',d.awards?1:0,d.rescue&&d.rescue.need===0?1:0].join('|');
function updatePlayerLive(){const el=document.getElementById('pconn');if(el){el.className='conn '+(connected?'on':'off');el.textContent='● '+(connected?t('live'):t('reconnecting'));}
  const rn=document.getElementById('prNeed');if(rn&&S&&S.rescue){rn.innerHTML=S.rescue.need>0?`${esc(t('rescueNeed'))}: <b class="num">${S.rescue.need}</b> ${esc(t('rescuePts'))}`:`<b class="t-success">${esc(t('rescued'))}</b>`;}}
function stashHtml(me){return `<div class="stash"><span class="sc">🪙 <b class="num">${me.coins||0}</b></span><span class="si">✨ <b class="num">${me.insp||0}</b></span>${me.st>=2?`<span class="streak hot">🔥 ${me.st} · ${esc(t('streakHot'))}</span>`:me.cd>=2?`<span class="streak cold">🧊 ${me.cd} · ${esc(t('streakCold'))}</span>`:''}</div>`;}
function lootHtml(me){const l=me.loot;if(!l)return'';if(!l.c&&!l.i)return `<div class="loot muted">${esc(t('noLoot'))}</div>`;
  return `<div class="loot"><span class="muted">${esc(t('lootGot'))}:</span> <b>+${l.c} 🪙</b> <b>+${l.i} ✨</b>${l.mult>1?` <span class="streak hot">🔥 ×${l.mult}</span>`:''}</div>`;}
function renderPlayer(){
  $('#player').hidden=false;const root=$('#player');
  const keepName=document.getElementById('pname')?.value;
  let h=`<div class="ptop"><h1>${esc(t('title'))}</h1>${langSw()}</div>`;
  if(!S){
    h+=`<div class="card center"><div class="muted">${esc(everConnected?t('reconnecting'):t('waking'))}</div></div>`;
    root.innerHTML=h;return;
  }
  const me=S.me;
  if(!me){document.body.classList.remove('onfire','oniced');
    h+=`<div class="card"><div class="muted">${esc(t('prologue'))}</div>
      <div class="field"><label for="pname">${esc(t('yourName'))}</label><input id="pname" maxlength="18" autocomplete="off" placeholder="${esc(t('namePh'))}" value="${esc(keepName||ls.get('vf_name',''))}"></div>
      <div class="field"><span style="font-weight:800">${esc(t('pickClass'))}</span><div class="classes">
      ${CLASSES.map(c=>`<button type="button" class="cls" data-cls="${c.id}" aria-pressed="${pickClass===c.id}"><span class="ic">${c.ic}</span><b>${esc(L(c))}</b><small class="lootcls">${esc(t('lootClass'))}: ${c.loot==='coin'?'🪙 +3':'✨ +2'}</small><span class="sklist">${skillList(c)}</span></button>`).join('')}
      </div></div>
      <button class="btn" id="pjoin" type="button">${esc(t('joinBtn'))}</button><span id="pconn" class="conn center"></span></div>`;
    root.innerHTML=h;
    const valid=()=>{$('#pjoin').disabled=!($('#pname').value.trim()&&pickClass);};
    root.querySelectorAll('[data-cls]').forEach(b=>b.onclick=()=>{pickClass=b.dataset.cls;root.querySelectorAll('[data-cls]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));valid();});
    $('#pname').oninput=valid;valid();
    $('#pjoin').onclick=async()=>{
      const n=$('#pname').value.trim();if(!n||!pickClass)return;
      $('#pjoin').disabled=true;ls.set('vf_name',n);
      const r=await api('join',{pid,n,c:pickClass});
      if(r.me){S={...S,me:r.me};renderPlayer();}else $('#pjoin').disabled=false;
    };
    updatePlayerLive();return;
  }
  const c=cls(me.c);
  document.body.classList.toggle('onfire',me.st>=2);document.body.classList.toggle('oniced',me.cd>=2&&!(me.st>=2));
  h+=`<div class="hero"><span class="ic">${c.ic}</span><div style="min-width:0"><div class="nm">${esc(me.n)}</div><small class="muted">${esc(L(c))} · ${esc(t('lootClass'))}: ${c.loot==='coin'?'🪙 +3':'✨ +2'}</small><div class="sklist row">${skillList(c)}</div>${stashHtml(me)}</div></div>`;
  h+=playerBody(me,c);
  h+=`<div class="center" style="display:grid;gap:4px"><span id="pconn" class="conn"></span><button class="linkbtn" id="pchange" type="button">${esc(t('change'))}</button></div>`;
  root.innerHTML=h;
  $('#pchange').onclick=async()=>{pickClass=me.c;await api('leave',{pid});S={...S,me:null};renderPlayer();};
  root.querySelectorAll('[data-vote]').forEach(b=>b.onclick=async()=>{
    const v=+b.dataset.vote;root.querySelectorAll('[data-vote]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    const r=await api('vote',{pid,v});if(r.me){S={...S,me:r.me};renderPlayer();}
  });
  root.querySelectorAll('[data-give]').forEach(b=>b.onclick=async()=>{b.disabled=true;const r=await api('give',{pid,what:b.dataset.give});if(r.me)S={...S,me:r.me};renderPlayer();});
  const pd=$('#pdone');if(pd)pd.onclick=async()=>{pd.disabled=true;const r=await api('done',{pid});if(r.me)S={...S,me:r.me};renderPlayer();};
  const rb=$('#prollbtn');
  if(rb)rb.onclick=async()=>{
    if(rolling)return;rolling=true;rb.classList.add('rolling');
    const iv=setInterval(()=>{rb.textContent=d20();},70);
    const [r]=await Promise.all([api('roll',{pid}),new Promise(z=>setTimeout(z,900))]);
    clearInterval(iv);rolling=false;
    if(r.me){S={...S,me:r.me};try{navigator.vibrate&&navigator.vibrate(r.me.r===20?[80,40,80,40,200]:60)}catch(e){}}
    renderPlayer();
  };
  updatePlayerLive();
}
function playerBody(me,my){
  const sc=SCENES[S.scene];
  const head=`<div class="eyebrow">${esc(t('scene'))} ${S.scene+1}</div><h2>${esc(L(sc).t)}</h2>`;
  switch(S.phase){
    case 'lobby':return `<div class="card"><div class="eyebrow">VILPE</div><div class="narr">${esc(t('inLobby'))}</div><div class="muted num">${S.count} ${esc(t('onlineN'))}</div></div>`;
    case 'intro':return `<div class="card">${head}<div class="narr">${esc(L(sc).n)}</div><div class="muted">${esc(t('listen'))}</div></div>`;
    case 'vote':
      return `<div class="card">${head}<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><b>${esc(t('voteNow'))}</b><span class="timer num js-timer"></span></div>
       ${sc.o.map((o,i)=>`<button type="button" class="opt" data-vote="${i}" aria-pressed="${me.v===i}"><span class="ttl">${String.fromCharCode(65+i)}. ${esc(L(o).t)}</span><span class="meta"><span class="pill">${esc(tagLabel(o.tag))}</span><span class="pill ${modCls(modOf(me.c,o.tag))}">${sgn(modOf(me.c,o.tag))} ${esc(t('yourBonus'))}</span></span></button>`).join('')}
       ${me.v>=0?`<div class="muted center">${esc(t('voted'))}</div>`:''}</div>`;
    case 'roll':{
      const o=sc.o[S.winner];let inner;
      if(me.r==null){
        inner=`<div class="rollbig"><b>${esc(t('rollNow'))}</b><button type="button" class="die" id="prollbtn" aria-label="${esc(t('tapRoll'))}">20</button><span class="muted">${esc(t('tapRoll'))}</span><span class="timer num js-timer"></span></div>`;
      }else{
        const b=modOf(me.c,o.tag),tot=rollTotal(me.r,me.c,o.tag);
        inner=`<div class="rollbig"><span class="muted">${esc(t('rolled'))}</span><div class="die ${me.r===20?'crit':me.r===1?'fum':''}">${me.r}</div>
         <div class="mathline num">${me.r===1?'1 → 0':`${me.r}${b?` ${b>0?'+':'−'} ${Math.abs(b)} (${esc(tagLabel(o.tag))})`:''}${me.r===20?' + 5':''} = ${tot}`}</div>
         ${me.r===20?`<b class="t-legendary">${esc(t('nat20'))}</b>`:me.r===1?`<b class="t-fail">${esc(t('nat1'))}</b>`:''}
         <div class="muted">${esc(t('waitReveal'))}</div></div>`;
      }
      return `<div class="card">${head}<div><span class="muted">${esc(t('chosen'))}:</span> <b>${esc(L(o).t)}</b> <span class="pill ${modCls(modOf(me.c,o.tag))}">${esc(tagLabel(o.tag))} ${sgn(modOf(me.c,o.tag))}</span></div>${inner}</div>`;}
    case 'rescue':{
      const R=S.rescue||{need:0,target:'partial'},o=sc.o[S.winner];const ok=R.need===0;
      return `<div class="card rcard">${head}${lootHtml(me)}<div class="rbig">${esc(t('rescueTitle'))}</div>
        <div>${esc(t('rescueTo'))}: <b class="t-${R.target}">${esc(t('tl_'+R.target))}</b> <span class="timer num js-timer"></span></div>
        <div class="rneedp" id="prNeed"></div><div class="muted">${esc(t('rescueHelp'))}</div>
        <div class="givebtns"><button type="button" class="btn" data-give="coins"${ok||me.coins<15||me.done?' disabled':''}>🪙 ${esc(t('giveCoins'))}</button><button type="button" class="btn insp" data-give="insp"${ok||me.insp<5||me.done?' disabled':''}>✨ ${esc(t('giveInsp'))}</button></div>
        ${me.given?`<div class="muted num">${esc(t('gaveTotal'))}: ${me.given} ${esc(t('rescuePts'))}</div>`:''}
        ${me.done?`<div class="muted center">${esc(t('rescueDoneMsg'))}</div>`:`<button type="button" class="btn ghost" id="pdone">${esc(t('rescueDone'))}</button>`}</div>`;}
    case 'result':{
      const o=sc.o[S.winner],oc=S.outcome||{};
      if(Date.now()<pDrumUntil)return `<div class="card">${head}<div class="rollbig"><div class="die rolling" aria-hidden="true">?</div><b>${esc(t('fateRolling'))}</b></div></div>`;
      return `<div class="card">${head}<div class="tier t-${oc.tier}">${esc(t('tier_'+oc.tier))}</div>${oc.tier==='partial'?`<div class="muted" style="font-weight:700">${esc(t('partialNote'))}</div>`:''}
       ${oc.rescued?`<div class="rescuedbadge">🛟 ${esc(t('rescuedNote'))} +${oc.pts}</div>`:''}${oc.tier==='severe'?`<div class="muted" style="font-weight:700">${esc(t('severeNote'))}</div>`:''}
       <div class="narr">${esc(oc.tier==='fail'||oc.tier==='severe'?L(o).l:L(o).w)}</div>${deltaHtml(oc.delta,oc.share)}${lootHtml(me)}
       <div class="muted num">${esc(t('groupAvg'))}: ${oc.avg} · ${esc(t('dc'))} ${oc.dc}</div></div>`;}
    case 'ending':case 'awards':{
      const e=S.ending?ENDINGS[S.ending.id]:null;let a='';
      if(S.phase==='awards'&&S.awards){
        a=`<div class="eyebrow">${esc(t('awards'))}</div>`+S.awards.map(x=>`<div class="hero" style="padding:8px 12px"><div><small class="muted">${esc(t('aw_'+x.k))}</small><div class="nm">${esc(x.n)}</div>${x.n===me.n?`<b class="t-legendary">${esc(t('youWon'))}</b>`:''}</div></div>`).join('');
      }
      return `<div class="card"><div class="eyebrow">${esc(t('theEnd'))}</div>${e?`<h2>${esc(L(e).t)}</h2>${S.ending?`<div class="deltas"><span class="delta ${S.ending.v>=10000?'up':'down'}">${esc(t('endStats'))} ${fmt(S.res.v)} ${esc(t('ofOrder'))}</span><span class="delta">${esc(t('mood'))}: ${esc(moodWord(S.res.m))}</span></div>`:''}<div class="narr">${esc(L(e).n)}</div>`:''}${a}</div>`;}
  }
  return '';
}

/* ---------------- host ---------------- */
let qrData=null,armReset=false;
function makeQr(){
  try{const q=qrcode(0,'M');q.addData(location.origin+'/');q.make();
    const n=q.getModuleCount(),cell=Math.floor(440/(n+2)),size=cell*(n+2),cv=document.createElement('canvas');cv.width=cv.height=size;
    const x=cv.getContext('2d');x.fillStyle='#f1e6cc';x.fillRect(0,0,size,size);x.fillStyle='#10201f';
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))x.fillRect((c+1)*cell,(r+1)*cell,cell,cell);
    qrData=cv.toDataURL();}catch(e){qrData=null;}
}
function host(action,extra){return api('host',{key:hostKey,action,...(extra||{})});}
function optCards(sc,mode){
  const tl=S.tally||[0,0,0];
  return sc.o.map((o,i)=>{
    const st=(mode==='vote'||mode==='intro')?'':(i===S.winner?'win':'lose');
    return `<div class="hopt ${st}"><div class="top"><span class="ttl">${String.fromCharCode(65+i)}. ${esc(L(o).t)}</span>${mode!=='intro'?`<span class="cnt num">${tl[i]}</span>`:''}</div>
     <div class="chips"><span class="pill">${esc(tagLabel(o.tag))}</span>${modChips(o.tag)}</div></div>`;
  }).join('');
}
/* ---- bilingual helpers for the TV (Finnish first, English alongside) ---- */
const tf=k=>T.fi[k]??T.en[k]??k, te=k=>T.en[k]??T.fi[k]??k;
const BS=(fi,en,cls)=>`<span class="bi ${cls||''}"><span class="bf">${esc(fi)}</span><span class="be">${esc(en)}</span></span>`;
const BI=(fi,en)=>fi===en?esc(fi):`${esc(fi)}<span class="bsep"> · </span><span class="bei">${esc(en)}</span>`;
const bks=(k,cls)=>BS(tf(k),te(k),cls), bki=k=>BI(tf(k),te(k));
const moodKey=m=>'mood'+Math.min(4,Math.floor(m/20.001));
const fmtFi=n=>Math.round(n).toLocaleString('fi-FI');
const tagBi=tag=>BI(TAGS[tag].fi,TAGS[tag].en);
const twoCol=(fi,en,cls)=>`<div class="bicols ${cls||''}"><div class="bcol"><span class="lt">FI</span><p class="narr">${esc(fi)}</p></div><div class="bcol"><span class="lt">EN</span><p class="narr be-n">${esc(en)}</p></div></div>`;
function deltaBi(d,share){
  if(!d)return'';const o=[];
  if(share)o.push(`<span class="delta ${share>0?'up':'down'}">${share>0?'+':''}${share} 🪙 ${BI('kaikille','each')}</span>`);
  if(d.v)o.push(`<span class="delta ${d.v>0?'up':'down'}">${d.v>0?'+':''}${fmtFi(d.v)} ${BI('tuuletinta','vents')}</span>`);
  if(d.m)o.push(`<span class="delta ${d.m>0?'up':'down'}">${d.m>0?'+':''}${d.m} ${BI('mieliala','mood')}</span>`);
  return o.length?`<div class="deltas">${o.join('')}</div>`:'';
}
const art=(name,cls)=>`<figure class="art ${cls||''}"><img src="/img/${name}.jpg" alt="" onerror="this.closest('figure').hidden=true"></figure>`;
function duelHtml(dc,avg,tier){
  const lo=Math.max(0,dc-11),max=dc+9,pct=v=>clamp((v-lo)/(max-lo)*100,0,100);
  const zones=[['severe',lo,dc-6],['fail',dc-6,dc-3],['partial',dc-3,dc],['success',dc,dc+5],['legendary',dc+5,max]];
  const has=avg!=null;
  return `<div class="duel" data-max="${max}" data-lo="${lo}"><div class="duel-row">
    <div class="dn"><div class="eyebrow">${bki('groupAvg')}</div><div class="n num ${has?'t-'+tier:''}" id="dAvg">${has?avg:'–'}</div></div>
    <div class="vsx">vs</div>
    <div class="dn"><div class="eyebrow">${bki('dc')}</div><div class="n num">${dc}</div></div></div>
    <div class="track" role="img" aria-label="${esc(tf('groupAvg'))} ${has?avg:''}, ${esc(tf('dc'))} ${dc}">
      ${zones.map(([k,a,b])=>`<div class="zone z-${k}${k===tier?' on':''}" data-k="${k}" style="left:${pct(a)}%;width:${pct(b)-pct(a)}%"><span>${esc(tf('tl_'+k))}<br>${esc(te('tl_'+k))}</span></div>`).join('')}
      <div class="dcline" style="left:${pct(dc)}%"></div>
      <div class="marker" id="dMarker" style="left:${has?pct(avg):0}%;opacity:${has?1:0}"><b class="num">${has?avg:''}</b></div>
    </div></div>`;
}
const duel=oc=>duelHtml(oc.dc,oc.avg,oc.tier);
function setDuel(avg,dc){
  const n=$('#dAvg'),m=$('#dMarker'),d=document.querySelector('.duel');if(!n||!m||!d)return;
  const max=+d.dataset.max,lo=+(d.dataset.lo||0);
  if(avg==null){n.textContent='–';n.className='n num';m.style.opacity=0;document.querySelectorAll('.track .zone').forEach(z=>z.classList.remove('on'));return;}
  const tier=tierOf(avg,dc);
  n.textContent=avg;n.className='n num t-'+tier;m.style.opacity=1;m.style.left=clamp((avg-lo)/(max-lo)*100,0,100)+'%';m.querySelector('b').textContent=avg;
  document.querySelectorAll('.track .zone').forEach(z=>z.classList.toggle('on',z.dataset.k===tier));
}
function liveRolls(){
  const sc=SCENES[S.scene],o=sc.o[S.winner],rs=[];
  (S.players||[]).forEach(p=>{if(p.r!=null)rs.push({k:'p:'+(p.id||p.n+'|'+p.c),n:p.n,c:p.c,r:p.r,st:p.st,cd:p.cd});});
  (S.guild||[]).forEach((g,i)=>rs.push({k:'g:'+i,n:tf('guild'),c:null,r:g}));
  rs.forEach(x=>x.tot=rollTotal(x.r,x.c,o.tag));
  const avg=rs.length?Math.round(rs.reduce((a,x)=>a+x.tot,0)/rs.length*10)/10:null;
  return{rs,avg,dc:sc.dc,tag:o.tag};
}
function dieHtml(x,tag,drop){
  const md=x.c&&x.r!==1?modOf(x.c,tag):0;
  return `<div class="die3${drop?' drop':''}${x.r===20?' crit':x.r===1?' fum':''}" data-k="${esc(x.k||'')}" style="--rot:${(Math.random()*36-18).toFixed(1)}deg">
    <div class="dface"><span class="num">${x.r}</span>${md?`<em>${sgn(md)}</em>`:''}</div><div class="dname">${x.c?cls(x.c).ic+' ':'🎲 '}${esc(x.n)}${x.st>=2?' 🔥':x.cd>=2?' 🧊':''}</div></div>`;
}
function updateVote(){
  const tl=S.tally||[0,0,0],tot=tl.reduce((a,b)=>a+b,0),max=Math.max(...tl);
  document.querySelectorAll('.vrow').forEach(r=>{const i=+r.dataset.i;
    r.querySelector('.vcnt').textContent=tl[i];
    r.querySelector('.vbar i').style.width=(tot?tl[i]/tot*100:0)+'%';
    r.classList.toggle('lead',tot>0&&tl[i]===max);});
  const ps=S.players||[],el=$('#vCount');if(el)el.textContent=ps.filter(p=>p.voted).length+' / '+ps.length;
  const ad=$('#allDone');if(ad)ad.hidden=!(ps.length&&ps.every(p=>p.voted));
}
function updateRoll(){
  const {rs,avg,dc,tag}=liveRolls();setDuel(avg,dc);
  const f=$('#diceField');
  if(f){const have=new Set([...f.children].map(c=>c.dataset.k));
    rs.forEach(x=>{if(have.has(x.k))return;f.insertAdjacentHTML('beforeend',dieHtml(x,tag,true));});}
  const ps=S.players||[],el=$('#rCount');if(el)el.textContent=ps.filter(p=>p.r!=null).length+' / '+ps.length;
  const ad=$('#allDone');if(ad)ad.hidden=!(ps.length&&ps.every(p=>p.r!=null));
}
function updateRescue(){
  const R=S.rescue,RL=S.roll;if(!R||!RL)return;
  const avg=Math.round((RL.sum+R.pts)/RL.n*100)/100;
  setDuel(avg,RL.dc);
  const m=$('#dMarker');if(m){m.classList.remove('jit');void m.offsetWidth;m.classList.add('jit');}
  const need=$('#rNeed');if(need){need.innerHTML=R.need>0?`${bki('rescueNeed')}: <b class="num">${R.need}</b> ${bki('rescuePts')}`:`<span class="t-success">${bki('rescued')}</span>`;}
  const pts=$('#rPts');if(pts)pts.textContent='+'+R.pts;
  const gv=$('#rGivers');if(gv)gv.innerHTML=(R.givers||[]).map(g=>`<span class="chip"><span>${cls(g.c)?cls(g.c).ic:''}</span><span class="nm">${esc(g.n)}</span><span class="r num">+${g.pts}</span></span>`).join('');
  const ps=S.players||[],ad=$('#allDone');if(ad)ad.hidden=!(ps.length&&ps.every(p=>p.done))||R.need===0;
}
/* drumroll between rolling and the result */
let lastPhaseKey='',drumKey='',drumUntil=0,drumTimer=null;
const drumming=()=>S&&S.phase==='result'&&drumKey===S.runId+'|'+S.scene&&Date.now()<drumUntil;
function startSpin(dc){
  clearInterval(drumTimer);
  drumTimer=setInterval(()=>{
    if(!drumming()){clearInterval(drumTimer);return;}
    const left=drumUntil-Date.now();
    const spread=left>900?9:left>400?5:2;
    const target=S.outcome.avg;
    const v=Math.round(clamp(target+(Math.random()*2-1)*spread,1,28)*10)/10;
    setDuel(v,dc);
  },90);
}
function renderHost(){
  $('#host').hidden=false;
  if(badKey||!hostKey){$('#hostBand').innerHTML='';$('#dmBar').innerHTML='';$('#hostStage').innerHTML=`<div class="err">${esc(tf('hostKeyBad'))}<br>${esc(te('hostKeyBad'))}</div>`;return;}
  if(!S){$('#hostBand').innerHTML=`<div class="brand"><h1>${esc(tf('title'))}</h1><div class="sub">${esc(te('title'))}</div></div>`;$('#hostStage').innerHTML=`<div class="muted">${bki('waking')}</div>`;renderDm();return;}
  setHeat(S.res.m);
  const r=S.res;
  $('#hostBand').innerHTML=`<div class="brand"><h1>${esc(tf('title'))}</h1><div class="sub">${esc(te('title'))} · VILPE</div></div>
   <div class="score">
    <div class="meter"><span class="lbl">🪙 ${bki('coins')}</span><span class="val num" style="color:var(--gold)">${fmtFi(r.g)}</span></div>
    <div class="meter"><span class="lbl">✨ ${bki('insp')}</span><span class="val num" style="color:#b9a4ff">${fmtFi(r.i||0)}</span></div>
    <div class="meter"><span class="lbl">${bki('vents')}</span><span class="val num">${fmtFi(r.v)} <small class="muted" style="font-size:1rem">/ 10 000</small></span><div class="bar"><i style="width:${clamp(r.v/100,0,100)}%"></i></div></div>
    <div class="meter"><span class="lbl">${bki('mood')}</span><span class="val mval">${BI(tf(moodKey(r.m)),te(moodKey(r.m)))}</span><div class="bar mood"><i style="width:${r.m}%"></i></div></div>
   </div>`;
  const sc=SCENES[S.scene],ps=S.players||[],drum=drumming();
  const head=`<div class="scene-no">${BI(tf('scene')+' '+(S.scene+1),te('scene')+' '+(S.scene+1))}</div><h2 class="stitle">${BS(sc.fi.t,sc.en.t)}</h2>`;
  const chosen=()=>{const o=sc.o[S.winner];return `<div class="hopt win"><div class="top"><span class="ttl">${esc(tf('chosen'))}: ${BS(o.fi.t,o.en.t,'sm')}</span></div>
        <div class="chips"><span class="pill">${tagBi(o.tag)}</span>${modChips(o.tag)}</div></div>`;};
  const stage=$('#hostStage');
  const sig=[S.runId,S.phase,S.scene,S.winner,drum?'drum':''].join('|');
  const live={vote:updateVote,roll:updateRoll,rescue:updateRescue}[S.phase];
  if((live||drum)&&stage.dataset.sig===sig){if(live)live();renderDm();return;}
  let h='';
  switch(S.phase){
    case 'lobby':
      h=`<div class="lobby3"><div style="display:grid;gap:10px;justify-items:start">
        <div class="qr">${qrData?`<img src="${qrData}" alt="QR code">`:''}</div>
        <b class="callout" style="font-size:1.6rem">${bks('scanJoin')}</b><span class="muted">${bki('joinUrl')}</span><span class="joinurl">${esc(location.host)}</span></div>
        <div style="display:grid;gap:16px;min-width:0;align-content:start"><div class="eyebrow">VILPE · Halloween</div>
        <div class="narr lobbytxt">${esc(tf('prologue'))}</div><div class="narr lobbytxt be-n">${esc(te('prologue'))}</div>
        <div class="eyebrow">${bki('heroes')} · <span class="num">${ps.length}</span></div>
        <div class="chips">${ps.length?ps.map(p=>`<span class="chip"><span>${cls(p.c).ic}</span><span class="nm">${esc(p.n)}</span></span>`).join(''):`<span class="muted">${bki('noHeroes')}</span>`}</div></div>
        ${art('lobby','sq')}</div>`;
      break;
    case 'intro':
      h=`<div class="intro3"><div class="ihead">${head}</div>${twoCol(sc.fi.n,sc.en.n)}${art('scene'+(S.scene+1),'sq3')}</div>`;break;
    case 'vote':
      h=`<div class="stage"><div class="left">${head}<div class="callout">${bks('voteOnPhones')}</div>
        <div class="bigcount"><span class="num" id="vCount"></span> <span>${bki('votesCast')}</span> <span class="timer js-timer"></span></div><div class="alldone" id="allDone" hidden>${bks('allVoted')}</div></div>
        <div class="right vrace">${art('scene'+(S.scene+1),'small')}${sc.o.map((o,i)=>`<div class="vrow vrow-l" data-i="${i}"><span class="vletter">${String.fromCharCode(65+i)}</span>
          <div class="vmid"><span class="vttl">${BS(o.fi.t,o.en.t)}</span><div class="vbar"><i style="width:0%"></i></div></div><span class="vcnt num">0</span></div>`).join('')}</div></div>`;break;
    case 'roll':
      h=`<div class="stage"><div class="left">${head}${chosen()}
        ${S.tie?`<div class="muted">${bki('tieBreak')}</div>`:''}
        <div class="callout">${bks('rollOnPhones')}</div>
        <div class="bigcount"><span class="num" id="rCount"></span> <span>${bki('rolledN')}</span> <span class="timer js-timer"></span></div><div class="alldone" id="allDone" hidden>${bks('allRolled')}</div></div>
        <div class="right">${duelHtml(sc.dc,null,null)}<div class="dicefield" id="diceField"></div></div></div>`;break;
    case 'rescue':{
      const RL=S.roll,R=S.rescue;
      h=`<div class="stage rescue"><div class="left">${head}
        <div class="callout rtitle">${bks('rescueTitle')}</div>
        <div class="rsub">${bks('rescueSub')}</div>
        <div class="rtarget">${bki('rescueTo')}: <b class="t-${R.target}">${BI(tf('tl_'+R.target),te('tl_'+R.target))}</b></div>
        <div class="rneed" id="rNeed"></div>
        <div class="bigcount"><span class="num rpts" id="rPts">+0</span> <span>${bki('rescuePts')}</span> <span class="timer js-timer"></span></div>
        <div class="rhelp">${bki('rescueHelp')}</div>
        <div class="alldone" id="allDone" hidden>${bks('allGave')}</div></div>
        <div class="right"><div class="zoomwrap">${duelHtml(RL.dc,RL.avg,RL.tier0)}</div><div class="chips" id="rGivers"></div></div></div>`;break;}
    case 'result':{
      const o=sc.o[S.winner],oc=S.outcome,tag=o.tag;
      if(drum){
        h=`<div class="stage"><div class="left">${head}${chosen()}</div><div class="right">${duelHtml(oc.dc,null,null)}</div></div>`;break;
      }
      const fail=oc.tier==='fail'||oc.tier==='severe';
      const chips=(S.lastRolls||[]).map(x=>`<span class="chip ${x.r===20?'c20':x.r===1?'c1':''}"><span>${x.c?cls(x.c).ic:'🎲'}</span><span class="nm">${esc(x.n||tf('guild'))}</span><span class="r num">${x.tot}</span></span>`).join('');
      h=`<div class="stage"><div class="left">${head}<div class="tier pop t-${oc.tier}">${BS(tf('tier_'+oc.tier),te('tier_'+oc.tier))}</div>${oc.rescued?`<div class="rescuedbadge">🛟 ${bki('rescuedNote')} +${oc.pts} · ${esc(String(oc.avg0))} → ${esc(String(oc.avg))}</div>`:''}${oc.tier==='severe'?`<div class="pnote">${bks('severeNote')}</div>`:oc.tier==='partial'?`<div class="pnote">${bks('partialNote')}</div>`:''}
        ${twoCol(fail?o.fi.l:o.fi.w,fail?o.en.l:o.en.w,'res')}<div class="bigdeltas">${deltaBi(oc.delta,oc.share)}</div></div>
        <div class="right">${duel(oc)}
        <div class="feats">${oc.best?`<div class="feat hero-feat"><span class="eyebrow">${bki('sceneHero')}</span><span class="fw">${esc(oc.best.n)}</span><span class="fs num">${oc.best.t}</span></div>`:''}
        ${oc.crit.length?`<div class="feat"><span class="eyebrow">${bki('crits')}</span><div class="chips">${oc.crit.map(n=>`<span class="chip c20">${esc(n)}</span>`).join('')}</div></div>`:''}
        ${oc.fum.length?`<div class="feat"><span class="eyebrow">${bki('fumbles')}</span><div class="chips">${oc.fum.map(n=>`<span class="chip c1">${esc(n)}</span>`).join('')}</div></div>`:''}</div>
        <div class="chips">${chips}</div></div></div>`;break;}
    case 'ending':{
      const e=ENDINGS[S.ending.id];
      h=`<div class="intro3 ending"><div class="ihead"><div class="eyebrow">${bki('theEnd')}</div>
        <h2 class="stitle" style="color:var(--gold)">${BS(e.fi.t,e.en.t)}</h2>
        <div class="deltas"><span class="delta ${S.ending.v>=10000?'up':'down'}">${fmtFi(S.res.v)} / 10 000 ${BI('tuuletinta','vents')}</span><span class="delta">${bki('mood')}: ${BI(tf(moodKey(S.res.m)),te(moodKey(S.res.m)))}</span></div></div>
        ${twoCol(e.fi.n,e.en.n,'end')}${art('ending-'+S.ending.id,'sq3')}</div>`;break;}
    case 'awards':{
      const e=ENDINGS[S.ending.id];
      h=`<div style="display:grid;gap:22px"><div><div class="eyebrow">${BI(e.fi.t,e.en.t)}</div><h2 class="stitle awtitle">${bks('awards')}</h2></div>
        <div class="awards">${(S.awards||[]).map(a=>`<div class="award"><span class="t">${bki('aw_'+a.k)}</span><span class="w">${esc(a.n)}</span>${a.x?`<span class="ax num">${a.k==='rich'?'🪙 '+a.x:a.k==='insp'?'✨ '+a.x:'🛟 '+a.x+' '+esc(tf('rescuePts'))}</span>`:''}</div>`).join('')||`<span class="muted">—</span>`}</div></div>`;break;}
  }
  const fadeSig=S.phase+S.scene+(drum?'d':'');
  if(stage.dataset.fade!==fadeSig){stage.classList.remove('fade-in');void stage.offsetWidth;stage.classList.add('fade-in');}
  stage.dataset.fade=fadeSig;stage.dataset.sig=sig;
  stage.innerHTML=h;
  if(live)live();
  renderDm();
}
let dmSig='';
function renderDm(){
  const bar=$('#dmBar');if(!S){dmSig='';bar.innerHTML=`<span class="tag">DM</span><span class="conn off">● ${esc(tf('reconnecting'))}</span>`;return;}
  const connTxt=`● ${connected?tf('live'):tf('reconnecting')} · ${(S.players||[]).length} ${tf('onlineN')}`;
  const sig=[S.runId,S.phase,S.scene,armReset?1:0,drumming()?1:0].join('|');
  if(sig===dmSig){const c=$('#dmConn');if(c){c.className='conn '+(connected?'on':'off');c.textContent=connTxt;}return;}
  dmSig=sig;
  const labels={lobby:'begin',intro:'openVote',vote:'closeVote',roll:'reveal',rescue:'endRescue',result:S.scene<SCENES.length-1?'next':'finale',ending:'showAwards',awards:'newGame'};
  let mid='';
  if(false){}
  else if(S.phase==='roll')mid=`<button class="btn ghost small" id="dmGuild" type="button">🎲 ${esc(tf('guildDie'))}</button>`;
  bar.innerHTML=`<span class="tag">DM</span><span id="dmConn" class="conn ${connected?'on':'off'}">${esc(connTxt)}</span>${mid}<span class="grow"></span>
    <button class="btn ghost small" id="dmFs" type="button">${esc(tf('fullscreen'))}</button>
    ${S.phase!=='lobby'&&S.phase!=='awards'?`<button class="btn ghost small" id="dmReset" type="button">${esc(armReset?tf('sure'):tf('newGame'))}</button>`:''}
    <button class="btn" id="dmNext" type="button"${drumming()?' disabled':''}>${esc(tf(labels[S.phase]))}</button>`;
  $('#dmNext').onclick=async e=>{const btn=e.currentTarget;btn.disabled=true;armReset=false;const r=await host('next',{from:S.runId+'|'+S.scene+'|'+S.phase});if(!r||!r.ok){btn.disabled=false;}setTimeout(()=>{if(btn.isConnected&&btn.disabled&&!drumming()){btn.disabled=false;}},3000);};
  $('#dmFs').onclick=()=>{try{const p=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();p&&p.catch&&p.catch(()=>{});}catch(e){}};
  const rs=$('#dmReset');if(rs)rs.onclick=()=>{if(armReset){armReset=false;dmSig='';host('reset');}else{armReset=true;renderDm();setTimeout(()=>{if(armReset){armReset=false;renderDm();}},4000);}};
  const gd=$('#dmGuild');if(gd)gd.onclick=()=>host('guild');
}


/* ---------------- atmosphere: embers + glow driven by the dragon's mood ---------------- */
let heat=0.5,heatShown=0.5,emberCv=null,emberCtx=null,embersArr=[];
function setHeat(m){heat=Math.pow(clamp((100-m)/100,0,1),1.15);}
function initEmbers(){
  emberCv=document.createElement('canvas');emberCv.id='embers';emberCv.setAttribute('aria-hidden','true');
  const g1=document.createElement('div');g1.className='glow glow-top';const g2=document.createElement('div');g2.className='glow glow-floor';
  document.body.prepend(g2);document.body.prepend(g1);document.body.prepend(emberCv);
  emberCtx=emberCv.getContext('2d');
  const size=()=>{const d=Math.min(2,window.devicePixelRatio||1);emberCv.width=innerWidth*d;emberCv.height=innerHeight*d;emberCv.style.width=innerWidth+'px';emberCv.style.height=innerHeight+'px';emberCtx.setTransform(d,0,0,d,0,0);};
  size();addEventListener('resize',size);
  const spawn=(anyY)=>({x:Math.random()*innerWidth,y:anyY?Math.random()*innerHeight:innerHeight+10,
    vy:-(0.25+Math.random()*0.9),vx:(Math.random()-.5)*0.3,r:0.8+Math.random()*2.4,ph:Math.random()*6.28,life:1,
    hue:Math.random()});
  let last=performance.now();
  const tick=now=>{
    const dt=Math.min(50,now-last)/16.7;last=now;
    heatShown+=(heat-heatShown)*0.02*dt;
    const hs=heatShown;
    document.documentElement.style.setProperty('--heat',hs.toFixed(3));
    const target=Math.round((reduceMotion?0.25:1)*(12+190*hs));
    const prime=embersArr.length===0;
    while(embersArr.length<target)embersArr.push(spawn(prime));
    if(embersArr.length>target)embersArr.length=Math.max(target,embersArr.length-2);
    const c=emberCtx;c.clearRect(0,0,innerWidth,innerHeight);c.globalCompositeOperation='lighter';
    const speed=(reduceMotion?0.35:1)*(0.7+hs*1.3);
    for(let i=0;i<embersArr.length;i++){
      const e=embersArr[i];
      e.ph+=0.03*dt;e.x+=(e.vx+Math.sin(e.ph)*0.35)*dt*speed;e.y+=e.vy*dt*speed;
      const fade=clamp(e.y/innerHeight,0,1);
      if(e.y<-10){embersArr[i]=spawn(false);continue;}
      const flick=0.55+0.45*Math.sin(e.ph*3.1);
      const a=(0.25+0.65*fade)*flick;
      // colour: amber when calm, angrier red as heat rises
      const r=255,gr=Math.round(170-110*hs*e.hue-40*e.hue),b=Math.round(60-50*hs);
      c.fillStyle=`rgba(${r},${gr},${b},${(a*0.18).toFixed(3)})`;c.beginPath();c.arc(e.x,e.y,e.r*4,0,6.283);c.fill();
      c.fillStyle=`rgba(${r},${Math.min(230,gr+50)},${b+40},${a.toFixed(3)})`;c.beginPath();c.arc(e.x,e.y,e.r,0,6.283);c.fill();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// scale the TV layout (designed at 1920x1080) to fit any screen or display-scaling setting
function fitTv(){const z=Math.min(innerWidth/1920,innerHeight/1080);document.documentElement.classList.add('tvfit');const h=$('#host');h.style.zoom=z;h.style.minHeight=(innerHeight/z)+'px';}
if(isHost){fitTv();addEventListener('resize',fitTv);initEmbers();makeQr();setInterval(()=>fetch('/healthz').catch(()=>{}),4*60*1000);}
render();connect();
})();

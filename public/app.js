(function(){
const {CLASSES,TAGS,SCENES,ENDINGS,T,cls,d20,rollTotal}=window.GAME;
const $=s=>document.querySelector(s);
const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
let lang=ls.get('vf_lang',(navigator.language||'fi').toLowerCase().startsWith('fi')?'fi':'en'); if(lang!=='fi'&&lang!=='en')lang='fi';
const t=k=>(T[lang][k]??T.en[k]??k);
const L=o=>o[lang]||o.en;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(n).toLocaleString(lang==='fi'?'fi-FI':'en-US');
const moodWord=m=>t('mood'+Math.min(4,Math.floor(m/20.001)));
const tagLabel=tag=>L(TAGS[tag]);
const classesFor=tag=>CLASSES.filter(c=>c.tag===tag).map(c=>c.ic+' '+L(c)).join(', ');
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const langSw=()=>`<div class="lang" role="group" aria-label="Language"><button type="button" data-lang="fi" aria-pressed="${lang==='fi'}">FI</button><button type="button" data-lang="en" aria-pressed="${lang==='en'}">EN</button></div>`;
function deltaHtml(d){
  if(!d)return'';const o=[];
  if(d.g)o.push(`<span class="delta ${d.g>0?'up':'down'}">${d.g>0?'+':''}${fmt(d.g)} ${esc(t('gold'))}</span>`);
  if(d.v)o.push(`<span class="delta ${d.v>0?'up':'down'}">${d.v>0?'+':''}${fmt(d.v)} ${lang==='fi'?'tuuletinta':'vents'}</span>`);
  if(d.m)o.push(`<span class="delta ${d.m>0?'up':'down'}">${d.m>0?'+':''}${d.m} ${lang==='fi'?'mieliala':'mood'}</span>`);
  return o.length?`<div class="deltas">${o.join('')}</div>`:'';
}

const isHost=location.pathname.replace(/\/+$/,'')==='/host';
let hostKey='';
if(isHost){const q=new URLSearchParams(location.search).get('key');if(q){ls.set('vf_key',q);hostKey=q;}else hostKey=ls.get('vf_key','');}
let pid=ls.get('vf_pid','');if(!/^[a-z0-9]{8,32}$/.test(pid)){pid=(Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)).replace(/[^a-z0-9]/g,'').slice(0,16);ls.set('vf_pid',pid);}

let S=null,connected=false,everConnected=false,badKey=false,localDeadline=0;
function render(){document.documentElement.lang=lang;if(isHost)renderHost();else renderPlayer();}
document.addEventListener('click',e=>{const b=e.target.closest('[data-lang]');if(b){lang=b.dataset.lang;ls.set('vf_lang',lang);render();}});

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
let pickClass=null,rolling=false;
const structKey=d=>[d.runId,d.phase,d.scene,d.winner,d.me?d.me.n+d.me.c+d.me.v+(d.me.r??''):'-',d.awards?1:0].join('|');
function updatePlayerLive(){const el=document.getElementById('pconn');if(el){el.className='conn '+(connected?'on':'off');el.textContent='● '+(connected?t('live'):t('reconnecting'));}}
function renderPlayer(){
  $('#player').hidden=false;const root=$('#player');
  const keepName=document.getElementById('pname')?.value;
  let h=`<div class="ptop"><h1>${esc(t('title'))}</h1>${langSw()}</div>`;
  if(!S){
    h+=`<div class="card center"><div class="muted">${esc(everConnected?t('reconnecting'):t('waking'))}</div></div>`;
    root.innerHTML=h;return;
  }
  const me=S.me;
  if(!me){
    h+=`<div class="card"><div class="muted">${esc(t('prologue'))}</div>
      <div class="field"><label for="pname">${esc(t('yourName'))}</label><input id="pname" maxlength="18" autocomplete="off" placeholder="${esc(t('namePh'))}" value="${esc(keepName||ls.get('vf_name',''))}"></div>
      <div class="field"><span style="font-weight:800">${esc(t('pickClass'))}</span><div class="classes">
      ${CLASSES.map(c=>`<button type="button" class="cls" data-cls="${c.id}" aria-pressed="${pickClass===c.id}"><span class="ic">${c.ic}</span><b>${esc(L(c))}</b><small>${esc(t('bonusOn'))} ${esc(tagLabel(c.tag))}</small></button>`).join('')}
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
  h+=`<div class="hero"><span class="ic">${c.ic}</span><div><div class="nm">${esc(me.n)}</div><small class="muted">${esc(L(c))} · ${esc(t('bonusOn'))} ${esc(tagLabel(c.tag))}</small></div></div>`;
  h+=playerBody(me,c);
  h+=`<div class="center" style="display:grid;gap:4px"><span id="pconn" class="conn"></span><button class="linkbtn" id="pchange" type="button">${esc(t('change'))}</button></div>`;
  root.innerHTML=h;
  $('#pchange').onclick=async()=>{pickClass=me.c;await api('leave',{pid});S={...S,me:null};renderPlayer();};
  root.querySelectorAll('[data-vote]').forEach(b=>b.onclick=async()=>{
    const v=+b.dataset.vote;root.querySelectorAll('[data-vote]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    const r=await api('vote',{pid,v});if(r.me){S={...S,me:r.me};renderPlayer();}
  });
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
  const head=`<div class="eyebrow">${esc(t('scene'))} ${S.scene+1}/5</div><h2>${esc(L(sc).t)}</h2>`;
  switch(S.phase){
    case 'lobby':return `<div class="card"><div class="eyebrow">VILPE</div><div class="narr">${esc(t('inLobby'))}</div><div class="muted num">${S.count} ${esc(t('onlineN'))}</div></div>`;
    case 'intro':return `<div class="card">${head}<div class="narr">${esc(L(sc).n)}</div><div class="muted">${esc(t('listen'))}</div></div>`;
    case 'vote':
      return `<div class="card">${head}<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><b>${esc(t('voteNow'))}</b><span class="timer num js-timer"></span></div>
       ${sc.o.map((o,i)=>`<button type="button" class="opt" data-vote="${i}" aria-pressed="${me.v===i}"><span class="ttl">${String.fromCharCode(65+i)}. ${esc(L(o).t)}</span><span class="meta"><span class="pill">${esc(tagLabel(o.tag))}</span>${my.tag===o.tag?`<span class="pill hot">${esc(t('yourBonus'))}</span>`:''}</span></button>`).join('')}
       ${me.v>=0?`<div class="muted center">${esc(t('voted'))}</div>`:''}</div>`;
    case 'roll':{
      const o=sc.o[S.winner];let inner;
      if(me.r==null){
        inner=`<div class="rollbig"><b>${esc(t('rollNow'))}</b><button type="button" class="die" id="prollbtn" aria-label="${esc(t('tapRoll'))}">20</button><span class="muted">${esc(t('tapRoll'))}</span><span class="timer num js-timer"></span></div>`;
      }else{
        const b=my.tag===o.tag?3:0,tot=rollTotal(me.r,me.c,o.tag);
        inner=`<div class="rollbig"><span class="muted">${esc(t('rolled'))}</span><div class="die ${me.r===20?'crit':me.r===1?'fum':''}">${me.r}</div>
         <div class="mathline num">${me.r===1?'1 → 0':`${me.r}${b?` + ${b} ${esc(t('bonus'))}`:''}${me.r===20?' + 5':''} = ${tot}`}</div>
         ${me.r===20?`<b class="t-legendary">${esc(t('nat20'))}</b>`:me.r===1?`<b class="t-fail">${esc(t('nat1'))}</b>`:''}
         <div class="muted">${esc(t('waitReveal'))}</div></div>`;
      }
      return `<div class="card">${head}<div><span class="muted">${esc(t('chosen'))}:</span> <b>${esc(L(o).t)}</b>${my.tag===o.tag?` <span class="pill hot">${esc(t('yourBonus'))}</span>`:''}</div>${inner}</div>`;}
    case 'result':{
      const o=sc.o[S.winner],oc=S.outcome||{};
      return `<div class="card">${head}<div class="tier t-${oc.tier}">${esc(t('tier_'+oc.tier))}</div>${oc.tier==='partial'?`<div class="muted" style="font-weight:700">${esc(t('partialNote'))}</div>`:''}
       <div class="narr">${esc(oc.tier==='fail'?L(o).l:L(o).w)}</div>${deltaHtml(oc.delta)}
       <div class="muted num">${esc(t('groupAvg'))}: ${oc.avg} · ${esc(t('dc'))} ${oc.dc}</div></div>`;}
    case 'ending':case 'awards':{
      const e=S.ending?ENDINGS[S.ending.id]:null;let a='';
      if(S.phase==='awards'&&S.awards){
        a=`<div class="eyebrow">${esc(t('awards'))}</div>`+S.awards.map(x=>`<div class="hero" style="padding:8px 12px"><div><small class="muted">${esc(t('aw_'+x.k))}</small><div class="nm">${esc(x.n)}</div>${x.n===me.n?`<b class="t-legendary">${esc(t('youWon'))}</b>`:''}</div></div>`).join('');
      }
      return `<div class="card"><div class="eyebrow">${esc(t('theEnd'))}</div>${e?`<h2>${esc(L(e).t)}</h2>${S.ending?`<div class="deltas"><span class="delta ${S.ending.v>=10000?'up':'down'}">${esc(t('endStats'))} ${fmt(S.res.v)} ${esc(t('ofOrder'))}</span><span class="delta">${esc(t('mood'))}: ${esc(moodWord(S.res.m))}</span><span class="delta">${esc(t('gold'))}: ${fmt(S.res.g)}</span></div>`:''}<div class="narr">${esc(L(e).n)}</div>`:''}${a}</div>`;}
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
     <div class="chips"><span class="pill">${esc(tagLabel(o.tag))}</span><span class="pill hot">+3 ${esc(classesFor(o.tag))}</span></div></div>`;
  }).join('');
}
function duel(oc){
  const max=Math.max(25,oc.dc+9),pct=v=>clamp(v/max*100,0,100);
  const zones=[['fail',0,oc.dc-3],['partial',oc.dc-3,oc.dc],['success',oc.dc,oc.dc+5],['legendary',oc.dc+5,max]];
  return `<div class="duel"><div class="duel-row">
    <div class="dn"><div class="eyebrow">${esc(t('groupAvg'))}</div><div class="n num t-${oc.tier}">${oc.avg}</div></div>
    <div class="vsx">${esc(t('vsWord'))}</div>
    <div class="dn"><div class="eyebrow">${esc(t('dc'))}</div><div class="n num">${oc.dc}</div></div></div>
    <div class="track" role="img" aria-label="${esc(t('groupAvg'))} ${oc.avg}, ${esc(t('dc'))} ${oc.dc}">
      ${zones.map(([k,a,b])=>`<div class="zone z-${k}${k===oc.tier?' on':''}" style="left:${pct(a)}%;width:${pct(b)-pct(a)}%"><span>${esc(t('tl_'+k))}</span></div>`).join('')}
      <div class="dcline" style="left:${pct(oc.dc)}%"></div>
      <div class="marker" style="left:${pct(oc.avg)}%"><b class="num">${oc.avg}</b></div>
    </div></div>`;
}
function questLog(){
  const log=S.log||[];
  return `<div class="qlog"><span class="eyebrow">${esc(t('questLog'))}</span><div class="qsteps">${SCENES.map((sc,i)=>{
    const e=log.find(x=>x.s===i);const cur=!e&&i===S.scene&&S.phase!=='lobby';
    return `<div class="qstep ${e?'done':cur?'cur':''}"><span class="qn num">${i+1}</span><div class="qt"><b>${esc(L(sc).t)}</b>${e?`<span class="qtier t-${e.tier}">${esc(t('tl_'+e.tier))} · ${esc(L(sc.o[e.w]).t)}</span>`:cur?`<span class="qtier" style="color:var(--ember)">${esc(t('nowPlaying'))}</span>`:''}</div></div>`;}).join('')}</div></div>`;
}
function renderHost(){
  $('#host').hidden=false;
  if(badKey||!hostKey){$('#hostBand').innerHTML='';$('#dmBar').innerHTML='';$('#hostStage').innerHTML=`<div class="err">${esc(t('hostKeyBad'))}</div>`;return;}
  if(!S){$('#hostBand').innerHTML=`<div class="brand"><h1>${esc(t('title'))}</h1></div>`;$('#hostStage').innerHTML=`<div class="muted">${esc(t('waking'))}</div>`;renderDm();return;}
  const r=S.res;
  $('#hostBand').innerHTML=`<div class="brand"><h1>${esc(t('title'))}</h1><div class="sub">${esc(t('sub'))}</div></div>
   <div class="score">
    <div class="meter"><span class="lbl">${esc(t('gold'))}</span><span class="val num" style="color:var(--gold)">${fmt(r.g)}</span></div>
    <div class="meter"><span class="lbl">${esc(t('vents'))}</span><span class="val num">${fmt(r.v)} <small class="muted" style="font-size:1rem">${esc(t('of'))} 10 000</small></span><div class="bar"><i style="width:${clamp(r.v/100,0,100)}%"></i></div></div>
    <div class="meter"><span class="lbl">${esc(t('mood'))}</span><span class="val">${esc(moodWord(r.m))}</span><div class="bar mood"><i style="width:${r.m}%"></i></div></div>
   </div>`;
  const sc=SCENES[S.scene],ps=S.players||[];
  const head=`<div class="scene-no">${esc(t('scene'))} ${S.scene+1} / 5</div><h2>${esc(L(sc).t)}</h2>`;
  let h='';
  switch(S.phase){
    case 'lobby':
      h=`<div class="lobby"><div style="display:grid;gap:10px;justify-items:start">
        <div class="qr">${qrData?`<img src="${qrData}" alt="QR code">`:''}</div>
        <b class="callout" style="font-size:1.6rem">${esc(t('scanJoin'))}</b><span class="muted">${esc(t('joinUrl'))}</span><span class="joinurl">${esc(location.host)}</span></div>
        <div style="display:grid;gap:16px;min-width:0"><div class="eyebrow">VILPE · Halloween</div>
        <div class="narr" style="font-size:clamp(1.15rem,1.8vw,1.6rem);max-width:46ch">${esc(t('prologue'))}</div>
        <div class="eyebrow">${esc(t('heroes'))} · <span class="num">${ps.length}</span></div>
        <div class="chips">${ps.length?ps.map(p=>`<span class="chip"><span>${cls(p.c).ic}</span><span class="nm">${esc(p.n)}</span></span>`).join(''):`<span class="muted">${esc(t('noHeroes'))}</span>`}</div></div></div>`;
      break;
    case 'intro':
      h=`<div class="stage"><div class="left">${head}<div class="narr">${esc(L(sc).n)}</div></div><div class="right">${optCards(sc,'intro')}</div></div>`;break;
    case 'vote':{
      const n=ps.filter(p=>p.voted).length;
      h=`<div class="stage"><div class="left">${head}<div class="callout">${esc(t('voteOnPhones'))}</div>
        <div class="muted num" style="font-size:1.2rem">${n} / ${ps.length} ${esc(t('votesCast'))} · <span class="timer js-timer"></span></div>
        <div class="muted">${esc(t('noPhones'))}</div></div><div class="right">${optCards(sc,'vote')}</div></div>`;break;}
    case 'roll':{
      const o=sc.o[S.winner];const rolled=ps.filter(p=>p.r!=null).length;
      const chips=ps.map(p=>`<span class="chip ${p.r==null?'wait':p.r===20?'c20':p.r===1?'c1':''}"><span>${cls(p.c).ic}</span><span class="nm">${esc(p.n)}</span><span class="r num">${p.r==null?'·':p.r}</span></span>`).join('')
        +(S.guild||[]).map(g=>`<span class="chip ${g===20?'c20':g===1?'c1':''}"><span>🎲</span><span class="nm">${esc(t('guild'))}</span><span class="r num">${g}</span></span>`).join('');
      h=`<div class="stage"><div class="left">${head}<div class="hopt win"><div class="top"><span class="ttl">${esc(t('chosen'))}: ${esc(L(o).t)}</span></div>
        <div class="chips"><span class="pill">${esc(tagLabel(o.tag))}</span><span class="pill hot">+3 ${esc(classesFor(o.tag))}</span></div></div>
        ${S.tie?`<div class="muted">${esc(t('tieBreak'))}</div>`:''}
        <div class="callout">${esc(t('rollOnPhones'))}</div>
        <div class="muted num" style="font-size:1.2rem">${rolled} / ${ps.length} ${esc(t('rolledN'))} · ${esc(t('dc'))} ${sc.dc} · <span class="timer js-timer"></span></div></div>
        <div class="right"><div class="chips">${chips||`<span class="muted">${esc(t('noPhones'))}</span>`}</div></div></div>`;break;}
    case 'result':{
      const o=sc.o[S.winner],oc=S.outcome;
      const chips=(S.lastRolls||[]).map(x=>`<span class="chip ${x.r===20?'c20':x.r===1?'c1':''}"><span>${x.c?cls(x.c).ic:'🎲'}</span><span class="nm">${esc(x.n||t('guild'))}</span><span class="r num">${x.tot}</span></span>`).join('');
      h=`<div class="stage"><div class="left">${head}<div class="tier t-${oc.tier}" style="font-size:clamp(2.6rem,5vw,4.4rem)">${esc(t('tier_'+oc.tier))}</div>${oc.tier==='partial'?`<div class="muted" style="font-weight:700;font-size:clamp(1.05rem,1.5vw,1.4rem)">${esc(t('partialNote'))}</div>`:''}
        <div class="narr">${esc(oc.tier==='fail'?L(o).l:L(o).w)}</div><div class="bigdeltas">${deltaHtml(oc.delta)}</div></div>
        <div class="right">${duel(oc)}
        <div class="feats">${oc.best?`<div class="feat hero-feat"><span class="eyebrow">${esc(t('sceneHero'))}</span><span class="fw">${esc(oc.best.n)}</span><span class="fs num">${oc.best.t}</span></div>`:''}
        ${oc.crit.length?`<div class="feat"><span class="eyebrow">${esc(t('crits'))}</span><div class="chips">${oc.crit.map(n=>`<span class="chip c20">${esc(n)}</span>`).join('')}</div></div>`:''}
        ${oc.fum.length?`<div class="feat"><span class="eyebrow">${esc(t('fumbles'))}</span><div class="chips">${oc.fum.map(n=>`<span class="chip c1">${esc(n)}</span>`).join('')}</div></div>`:''}</div>
        <div class="chips">${chips}</div></div></div>`;break;}
    case 'ending':{
      const e=ENDINGS[S.ending.id];
      h=`<div style="display:grid;gap:18px;max-width:900px"><div class="eyebrow">${esc(t('theEnd'))}</div>
        <h2 style="font-size:clamp(3rem,6vw,5.2rem);color:var(--gold)">${esc(L(e).t)}</h2>${S.ending?`<div class="deltas"><span class="delta ${S.ending.v>=10000?'up':'down'}">${esc(t('endStats'))} ${fmt(S.res.v)} ${esc(t('ofOrder'))}</span><span class="delta">${esc(t('mood'))}: ${esc(moodWord(S.res.m))}</span><span class="delta">${esc(t('gold'))}: ${fmt(S.res.g)}</span></div>`:''}<div class="narr" style="font-size:clamp(1.1rem,1.65vw,1.55rem);max-width:62ch;line-height:1.5">${esc(L(e).n)}</div></div>`;break;}
    case 'awards':{
      const e=ENDINGS[S.ending.id];
      h=`<div style="display:grid;gap:22px"><div><div class="eyebrow">${esc(L(e).t)}</div><h2 style="font-size:clamp(2.6rem,5vw,4.4rem)">${esc(t('awards'))}</h2></div>
        <div class="awards">${(S.awards||[]).map(a=>`<div class="award"><span class="t">${esc(t('aw_'+a.k))}</span><span class="w">${esc(a.n)}</span></div>`).join('')||`<span class="muted">—</span>`}</div></div>`;break;}
  }
  const stage=$('#hostStage');const sig=S.phase+S.scene;
  if(stage.dataset.sig!==sig){stage.dataset.sig=sig;stage.classList.remove('fade-in');void stage.offsetWidth;stage.classList.add('fade-in');}
  if(['intro','vote','roll','result'].includes(S.phase))h+=questLog();
  stage.innerHTML=h;renderDm();
}
function renderDm(){
  const bar=$('#dmBar');if(!S){bar.innerHTML=`<span class="tag">DM</span><span class="conn off">● ${esc(t('reconnecting'))}</span>`;return;}
  const labels={lobby:'begin',intro:'openVote',vote:'closeVote',roll:'reveal',result:S.scene<4?'next':'finale',ending:'showAwards',awards:'newGame'};
  let mid='';
  if(S.phase==='vote')mid=`<span class="tag">${esc(t('hands'))}</span>`+[0,1,2].map(i=>`<span class="handbox"><button class="btn ghost small" data-hand="${i}" data-d="-1" aria-label="-1">−</button><b class="num">${String.fromCharCode(65+i)} ${S.hand[i]}</b><button class="btn ghost small" data-hand="${i}" data-d="1" aria-label="+1">+</button></span>`).join('');
  else if(S.phase==='roll')mid=`<button class="btn ghost small" id="dmGuild" type="button">🎲 ${esc(t('guildDie'))}</button>`;
  bar.innerHTML=`<span class="tag">DM</span><span class="conn ${connected?'on':'off'}">● ${esc(connected?t('live'):t('reconnecting'))} · ${(S.players||[]).length} ${esc(t('onlineN'))}</span>${mid}<span class="grow"></span>
    ${langSw()}<button class="btn ghost small" id="dmFs" type="button">${esc(t('fullscreen'))}</button>
    ${S.phase!=='lobby'&&S.phase!=='awards'?`<button class="btn ghost small" id="dmReset" type="button">${esc(armReset?t('sure'):t('newGame'))}</button>`:''}
    <button class="btn" id="dmNext" type="button">${esc(t(labels[S.phase]))}</button>`;
  $('#dmNext').onclick=async e=>{e.target.disabled=true;armReset=false;await host('next');};
  $('#dmFs').onclick=()=>{try{const p=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();p&&p.catch&&p.catch(()=>{});}catch(e){}};
  const rs=$('#dmReset');if(rs)rs.onclick=()=>{if(armReset){armReset=false;host('reset');}else{armReset=true;renderDm();setTimeout(()=>{if(armReset){armReset=false;renderDm();}},4000);}};
  bar.querySelectorAll('[data-hand]').forEach(b=>b.onclick=()=>host('hand',{i:+b.dataset.hand,d:+b.dataset.d}));
  const gd=$('#dmGuild');if(gd)gd.onclick=()=>host('guild');
}

if(isHost){makeQr();setInterval(()=>fetch('/healthz').catch(()=>{}),4*60*1000);}
render();connect();
})();

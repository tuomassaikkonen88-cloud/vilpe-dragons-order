(function(){
const {CLASSES,TAGS,SCENES,ENDINGS,T,cls,d20,rollTotal,tierOf}=window.GAME;
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
    if(!isHost&&prev&&prev.phase==='roll'&&d.phase==='result'&&prev.scene===d.scene){pDrumUntil=Date.now()+(reduceMotion?600:2800);setTimeout(renderPlayer,(reduceMotion?600:2800)+40);}
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
  const head=`<div class="eyebrow">${esc(t('scene'))} ${S.scene+1}</div><h2>${esc(L(sc).t)}</h2>`;
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
      if(Date.now()<pDrumUntil)return `<div class="card">${head}<div class="rollbig"><div class="die rolling" aria-hidden="true">?</div><b>${esc(t('fateRolling'))}</b></div></div>`;
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
function duelHtml(dc,avg,tier){
  const max=Math.max(25,dc+9),pct=v=>clamp(v/max*100,0,100);
  const zones=[['fail',0,dc-3],['partial',dc-3,dc],['success',dc,dc+5],['legendary',dc+5,max]];
  const has=avg!=null;
  return `<div class="duel" data-max="${max}"><div class="duel-row">
    <div class="dn"><div class="eyebrow">${esc(t('groupAvg'))}</div><div class="n num ${has?'t-'+tier:''}" id="dAvg">${has?avg:'–'}</div></div>
    <div class="vsx">${esc(t('vsWord'))}</div>
    <div class="dn"><div class="eyebrow">${esc(t('dc'))}</div><div class="n num">${dc}</div></div></div>
    <div class="track" role="img" aria-label="${esc(t('groupAvg'))} ${has?avg:''}, ${esc(t('dc'))} ${dc}">
      ${zones.map(([k,a,b])=>`<div class="zone z-${k}${k===tier?' on':''}" data-k="${k}" style="left:${pct(a)}%;width:${pct(b)-pct(a)}%"><span>${esc(t('tl_'+k))}</span></div>`).join('')}
      <div class="dcline" style="left:${pct(dc)}%"></div>
      <div class="marker" id="dMarker" style="left:${has?pct(avg):0}%;opacity:${has?1:0}"><b class="num">${has?avg:''}</b></div>
    </div></div>`;
}
const duel=oc=>duelHtml(oc.dc,oc.avg,oc.tier);
function setDuel(avg,dc){
  const n=$('#dAvg'),m=$('#dMarker'),d=document.querySelector('.duel');if(!n||!m||!d)return;
  const max=+d.dataset.max;
  if(avg==null){n.textContent='–';n.className='n num';m.style.opacity=0;document.querySelectorAll('.track .zone').forEach(z=>z.classList.remove('on'));return;}
  const tier=tierOf(avg,dc);
  n.textContent=avg;n.className='n num t-'+tier;m.style.opacity=1;m.style.left=clamp(avg/max*100,0,100)+'%';m.querySelector('b').textContent=avg;
  document.querySelectorAll('.track .zone').forEach(z=>z.classList.toggle('on',z.dataset.k===tier));
}
function liveRolls(){
  const sc=SCENES[S.scene],o=sc.o[S.winner],rs=[];
  (S.players||[]).forEach(p=>{if(p.r!=null)rs.push({k:'p:'+p.n+'|'+p.c,n:p.n,c:p.c,r:p.r});});
  (S.guild||[]).forEach((g,i)=>rs.push({k:'g:'+i,n:t('guild'),c:null,r:g}));
  rs.forEach(x=>x.tot=rollTotal(x.r,x.c,o.tag));
  const avg=rs.length?Math.round(rs.reduce((a,x)=>a+x.tot,0)/rs.length*10)/10:null;
  return{rs,avg,dc:sc.dc,tag:o.tag};
}
function dieHtml(x,tag,drop){
  const bonus=x.c&&cls(x.c).tag===tag;
  return `<div class="die3${drop?' drop':''}${x.r===20?' crit':x.r===1?' fum':''}" data-k="${esc(x.k||'')}" style="--rot:${(Math.random()*36-18).toFixed(1)}deg">
    <div class="dface"><span class="num">${x.r}</span>${bonus?'<em>+3</em>':''}</div><div class="dname">${x.c?cls(x.c).ic+' ':'🎲 '}${esc(x.n)}</div></div>`;
}
function updateVote(){
  const tl=S.tally||[0,0,0],tot=tl.reduce((a,b)=>a+b,0),max=Math.max(...tl);
  document.querySelectorAll('.vrow').forEach(r=>{const i=+r.dataset.i;
    r.querySelector('.vcnt').textContent=tl[i];
    r.querySelector('.vbar i').style.width=(tot?tl[i]/tot*100:0)+'%';
    r.classList.toggle('lead',tot>0&&tl[i]===max);});
  const ps=S.players||[],el=$('#vCount');if(el)el.textContent=ps.filter(p=>p.voted).length+' / '+ps.length;
}
function updateRoll(){
  const {rs,avg,dc,tag}=liveRolls();setDuel(avg,dc);
  const f=$('#diceField');
  if(f){const have=new Set([...f.children].map(c=>c.dataset.k));
    rs.forEach(x=>{if(have.has(x.k))return;f.insertAdjacentHTML('beforeend',dieHtml(x,tag,true));});}
  const ps=S.players||[],el=$('#rCount');if(el)el.textContent=ps.filter(p=>p.r!=null).length+' / '+ps.length;
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
  if(badKey||!hostKey){$('#hostBand').innerHTML='';$('#dmBar').innerHTML='';$('#hostStage').innerHTML=`<div class="err">${esc(t('hostKeyBad'))}</div>`;return;}
  if(!S){$('#hostBand').innerHTML=`<div class="brand"><h1>${esc(t('title'))}</h1></div>`;$('#hostStage').innerHTML=`<div class="muted">${esc(t('waking'))}</div>`;renderDm();return;}
  const pk=S.runId+'|'+S.scene+'|'+S.phase;
  if(pk!==lastPhaseKey){
    if(S.phase==='result'&&lastPhaseKey===S.runId+'|'+S.scene+'|roll'){
      drumKey=S.runId+'|'+S.scene;drumUntil=Date.now()+(reduceMotion?600:2800);
      setTimeout(renderHost,(reduceMotion?600:2800)+40);
    }
    lastPhaseKey=pk;
  }
  setHeat(S.res.m);
  const r=S.res;
  $('#hostBand').innerHTML=`<div class="brand"><h1>${esc(t('title'))}</h1><div class="sub">${esc(t('sub'))}</div></div>
   <div class="score">
    <div class="meter"><span class="lbl">${esc(t('gold'))}</span><span class="val num" style="color:var(--gold)">${fmt(r.g)}</span></div>
    <div class="meter"><span class="lbl">${esc(t('vents'))}</span><span class="val num">${fmt(r.v)} <small class="muted" style="font-size:1rem">${esc(t('of'))} 10 000</small></span><div class="bar"><i style="width:${clamp(r.v/100,0,100)}%"></i></div></div>
    <div class="meter"><span class="lbl">${esc(t('mood'))}</span><span class="val">${esc(moodWord(r.m))}</span><div class="bar mood"><i style="width:${r.m}%"></i></div></div>
   </div>`;
  const sc=SCENES[S.scene],ps=S.players||[],drum=drumming();
  const head=`<div class="scene-no">${esc(t('scene'))} ${S.scene+1}</div><h2 class="stitle">${esc(L(sc).t)}</h2>`;
  const chosen=()=>{const o=sc.o[S.winner];return `<div class="hopt win"><div class="top"><span class="ttl">${esc(t('chosen'))}: ${esc(L(o).t)}</span></div>
        <div class="chips"><span class="pill">${esc(tagLabel(o.tag))}</span><span class="pill hot">+3 ${esc(classesFor(o.tag))}</span></div></div>`;};
  const stage=$('#hostStage');
  const sig=[S.runId,S.phase,S.scene,S.winner,lang,drum?'drum':''].join('|');
  const live={vote:updateVote,roll:updateRoll}[S.phase];
  if((live||drum)&&stage.dataset.sig===sig){if(live)live();renderDm();return;}
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
    case 'vote':
      h=`<div class="stage"><div class="left">${head}<div class="callout">${esc(t('voteOnPhones'))}</div>
        <div class="bigcount"><span class="num" id="vCount"></span> <span>${esc(t('votesCast'))}</span> <span class="timer js-timer"></span></div></div>
        <div class="right vrace">${sc.o.map((o,i)=>`<div class="vrow" data-i="${i}"><div class="vtop"><span class="ttl">${String.fromCharCode(65+i)}. ${esc(L(o).t)}</span><span class="vcnt num">0</span></div>
          <div class="chips"><span class="pill">${esc(tagLabel(o.tag))}</span><span class="pill hot">+3 ${esc(classesFor(o.tag))}</span></div>
          <div class="vbar"><i style="width:0%"></i></div></div>`).join('')}</div></div>`;break;
    case 'roll':
      h=`<div class="stage"><div class="left">${head}${chosen()}
        ${S.tie?`<div class="muted">${esc(t('tieBreak'))}</div>`:''}
        <div class="callout">${esc(t('rollOnPhones'))}</div>
        <div class="bigcount"><span class="num" id="rCount"></span> <span>${esc(t('rolledN'))}</span> <span class="timer js-timer"></span></div></div>
        <div class="right">${duelHtml(sc.dc,null,null)}<div class="dicefield" id="diceField"></div></div></div>`;break;
    case 'result':{
      const o=sc.o[S.winner],oc=S.outcome,tag=o.tag;
      if(drum){
        h=`<div class="stage"><div class="left">${head}${chosen()}<div class="callout drumcall">${esc(t('fateRolling'))}</div></div>
          <div class="right">${duelHtml(oc.dc,null,null)}<div class="dicefield">${(S.lastRolls||[]).map(x=>dieHtml({...x,n:x.n||t('guild')},tag,false)).join('')}</div></div></div>`;
        break;
      }
      const chips=(S.lastRolls||[]).map(x=>`<span class="chip ${x.r===20?'c20':x.r===1?'c1':''}"><span>${x.c?cls(x.c).ic:'🎲'}</span><span class="nm">${esc(x.n||t('guild'))}</span><span class="r num">${x.tot}</span></span>`).join('');
      h=`<div class="stage"><div class="left">${head}<div class="tier pop t-${oc.tier}" style="font-size:clamp(2.6rem,5vw,4.4rem)">${esc(t('tier_'+oc.tier))}</div>${oc.tier==='partial'?`<div class="muted" style="font-weight:700;font-size:clamp(1.05rem,1.5vw,1.4rem)">${esc(t('partialNote'))}</div>`:''}
        <div class="narr">${esc(oc.tier==='fail'?L(o).l:L(o).w)}</div><div class="bigdeltas">${deltaHtml(oc.delta)}</div></div>
        <div class="right">${duel(oc)}
        <div class="feats">${oc.best?`<div class="feat hero-feat"><span class="eyebrow">${esc(t('sceneHero'))}</span><span class="fw">${esc(oc.best.n)}</span><span class="fs num">${oc.best.t}</span></div>`:''}
        ${oc.crit.length?`<div class="feat"><span class="eyebrow">${esc(t('crits'))}</span><div class="chips">${oc.crit.map(n=>`<span class="chip c20">${esc(n)}</span>`).join('')}</div></div>`:''}
        ${oc.fum.length?`<div class="feat"><span class="eyebrow">${esc(t('fumbles'))}</span><div class="chips">${oc.fum.map(n=>`<span class="chip c1">${esc(n)}</span>`).join('')}</div></div>`:''}</div>
        <div class="chips">${chips}</div></div></div>`;break;}
    case 'ending':{
      const e=ENDINGS[S.ending.id];
      h=`<div style="display:grid;gap:18px;max-width:900px"><div class="eyebrow">${esc(t('theEnd'))}</div>
        <h2 class="stitle" style="font-size:clamp(3rem,6vw,5.2rem);color:var(--gold)">${esc(L(e).t)}</h2>${S.ending?`<div class="deltas"><span class="delta ${S.ending.v>=10000?'up':'down'}">${esc(t('endStats'))} ${fmt(S.res.v)} ${esc(t('ofOrder'))}</span><span class="delta">${esc(t('mood'))}: ${esc(moodWord(S.res.m))}</span><span class="delta">${esc(t('gold'))}: ${fmt(S.res.g)}</span></div>`:''}<div class="narr" style="font-size:clamp(1.1rem,1.65vw,1.55rem);max-width:62ch;line-height:1.5">${esc(L(e).n)}</div></div>`;break;}
    case 'awards':{
      const e=ENDINGS[S.ending.id];
      h=`<div style="display:grid;gap:22px"><div><div class="eyebrow">${esc(L(e).t)}</div><h2 class="stitle" style="font-size:clamp(2.6rem,5vw,4.4rem)">${esc(t('awards'))}</h2></div>
        <div class="awards">${(S.awards||[]).map(a=>`<div class="award"><span class="t">${esc(t('aw_'+a.k))}</span><span class="w">${esc(a.n)}</span></div>`).join('')||`<span class="muted">—</span>`}</div></div>`;break;}
  }
  const fadeSig=S.phase+S.scene+(drum?'d':'');
  if(stage.dataset.fade!==fadeSig&&!(S.phase==='result'&&!drum&&stage.dataset.fade===S.phase+S.scene+'d')){stage.classList.remove('fade-in');void stage.offsetWidth;stage.classList.add('fade-in');}
  stage.dataset.fade=fadeSig;stage.dataset.sig=sig;
  stage.innerHTML=h;
  if(live)live();
  if(drum)startSpin(S.outcome.dc);
  renderDm();
}
function renderDm(){
  const bar=$('#dmBar');if(!S){bar.innerHTML=`<span class="tag">DM</span><span class="conn off">● ${esc(t('reconnecting'))}</span>`;return;}
  const labels={lobby:'begin',intro:'openVote',vote:'closeVote',roll:'reveal',result:S.scene<4?'next':'finale',ending:'showAwards',awards:'newGame'};
  let mid='';
  if(false){}
  else if(S.phase==='roll')mid=`<button class="btn ghost small" id="dmGuild" type="button">🎲 ${esc(t('guildDie'))}</button>`;
  bar.innerHTML=`<span class="tag">DM</span><span class="conn ${connected?'on':'off'}">● ${esc(connected?t('live'):t('reconnecting'))} · ${(S.players||[]).length} ${esc(t('onlineN'))}</span>${mid}<span class="grow"></span>
    ${langSw()}<button class="btn ghost small" id="dmFs" type="button">${esc(t('fullscreen'))}</button>
    ${S.phase!=='lobby'&&S.phase!=='awards'?`<button class="btn ghost small" id="dmReset" type="button">${esc(armReset?t('sure'):t('newGame'))}</button>`:''}
    <button class="btn" id="dmNext" type="button"${drumming()?' disabled':''}>${esc(t(labels[S.phase]))}</button>`;
  $('#dmNext').onclick=async e=>{e.target.disabled=true;armReset=false;await host('next');};
  $('#dmFs').onclick=()=>{try{const p=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();p&&p.catch&&p.catch(()=>{});}catch(e){}};
  const rs=$('#dmReset');if(rs)rs.onclick=()=>{if(armReset){armReset=false;host('reset');}else{armReset=true;renderDm();setTimeout(()=>{if(armReset){armReset=false;renderDm();}},4000);}};
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

if(isHost){initEmbers();makeQr();setInterval(()=>fetch('/healthz').catch(()=>{}),4*60*1000);}
render();connect();
})();

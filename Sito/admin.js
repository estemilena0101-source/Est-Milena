const $=id=>document.getElementById(id);
const GIORNI=['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
const ORDINE=[1,2,3,4,5,6,0];
const today=()=>DB.today();
let CFG=null,BKS=[];
function toast(t){const e=$('toast');e.textContent=t;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),2600)}

/* ACCESSO: si entra solo dal pulsante "Accedi" del sito; senza sessione admin si torna lì */
async function show(){
  const me=await DB.me();
  if(!me||me.role!=='admin'){location.replace('account.html');return}
  $('appView').classList.remove('hidden');
  $('who').textContent='🛠 '+me.name;
  document.querySelector('.t').textContent='Ciao '+me.name+' 👋';
  if(!DB.canImport)$('imp').parentElement.classList.add('hidden');
  await render();
}
$('out').onclick=async()=>{await DB.signOut();location.href='index.html'};

/* TABS */
$('tabs').onclick=e=>{
  const b=e.target.closest('.tab');if(!b)return;
  document.querySelectorAll('#tabs .tab').forEach(t=>t.classList.toggle('on',t===b));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('hidden',v.id!==b.dataset.v));
};

/* KPI */
function kpis(){
  const t=today();
  const oggi=BKS.filter(b=>b.data===t&&b.stato!=='annullata').length;
  const att=BKS.filter(b=>b.stato==='in attesa').length;
  const prox=BKS.filter(b=>b.data>=t&&b.stato!=='annullata').length;
  const cl=CFG.closures.find(c=>t>=c.from&&t<=(c.to||c.from)),day=CFG.week[new Date().getDay()];
  const stato=cl?`🌴 ${DB.esc(cl.tipo)}`:(!day.open?'😴 Chiuso oggi':'✅ Aperto oggi');
  $('kpis').innerHTML=`
   <div class="kpi"><small>Prenotazioni oggi</small><b>${oggi}</b></div>
   <div class="kpi"><small>Da confermare</small><b>${att}</b></div>
   <div class="kpi"><small>Prossimi appuntamenti</small><b>${prox}</b></div>
   <div class="kpi stato"><small>Stato di oggi</small><b>${stato}</b></div>`;
}

/* PRENOTAZIONI */
let filtro='prossime';
function bookings(){
  const F=[['prossime','Prossime'],['attesa','Da confermare'],['confermata','Confermate'],['annullata','Annullate'],['tutte','Tutte']];
  $('flt').innerHTML=F.map(([k,t])=>`<button class="tab ${k===filtro?'on':''}" data-k="${k}" style="padding:8px 20px;font-size:.88rem">${t}</button>`).join('');
  $('flt').querySelectorAll('.tab').forEach(b=>b.onclick=()=>{filtro=b.dataset.k;bookings()});
  const t=today();
  let l=[...BKS].sort((a,b)=>(a.data+a.ora).localeCompare(b.data+b.ora));
  if(filtro==='prossime')l=l.filter(b=>b.data>=t&&b.stato!=='annullata');
  else if(filtro==='attesa')l=l.filter(b=>b.stato==='in attesa');
  else if(filtro==='confermata'||filtro==='annullata')l=l.filter(b=>b.stato===filtro);
  if(!l.length){$('bkList').innerHTML='<div class="empty"><div class="big">🌸</div>Nessuna prenotazione qui.</div>';return}
  $('bkList').innerHTML=l.map(b=>{
    const k=b.stato==='in attesa'?'attesa':b.stato;
    return `<div class="bk">
      <div class="when"><b>${DB.esc(b.ora)}</b><small>${DB.fmtDate(b.data)}</small></div>
      <div class="who"><b>${DB.esc(b.nome)}</b><span class="pill ${k}">${b.stato}</span>
        <small>${DB.esc((b.servizi||[]).join(', '))} · ${b.min||'?'} min · € ${b.prezzo??'?'}</small>
        <small>📞 <a href="tel:${DB.esc(b.tel)}">${DB.esc(b.tel)}</a>${b.email?' · ✉️ '+DB.esc(b.email):''}</small>
        ${b.note?`<small>📝 ${DB.esc(b.note)}</small>`:''}</div>
      <div class="ac">
        ${b.stato!=='confermata'?`<button class="mini ok2" data-a="confermata" data-id="${b.id}">Conferma</button>`:''}
        ${b.stato!=='annullata'?`<button class="mini ko" data-a="annullata" data-id="${b.id}">Annulla</button>`:''}
        <button class="mini ko" data-a="del" data-id="${b.id}">🗑</button>
      </div></div>`}).join('');
  $('bkList').querySelectorAll('[data-a]').forEach(b=>b.onclick=async()=>{
    let r;
    if(b.dataset.a==='del'){if(!confirm('Eliminare definitivamente questa prenotazione?'))return;r=await DB.deleteBooking(b.dataset.id)}
    else r=await DB.setBookingStatus(b.dataset.id,b.dataset.a);
    if(r.error){toast('Errore: '+r.error);return}
    BKS=await DB.listBookings();bookings();kpis();toast('Aggiornato ✓');
  });
}

/* ORARI */
function hours(){
  const c=CFG;
  $('step').value=c.step;
  $('days').innerHTML=ORDINE.map(i=>{
    const d=c.week[i],[r1,r2]=d.ranges;
    return `<div class="day" data-i="${i}">
      <strong>${GIORNI[i]}</strong>
      <label class="sw"><input type="checkbox" class="op" ${d.open?'checked':''}><span></span></label>
      <div class="rng">
        <div class="r"><input type="time" value="${r1[0]}"> – <input type="time" value="${r1[1]}"></div>
        <div class="r"><input type="time" value="${r2[0]}"> – <input type="time" value="${r2[1]}"></div>
        <span class="closed-txt">Chiuso</span>
      </div></div>`}).join('');
  const sync=row=>{const o=row.querySelector('.op').checked;row.querySelectorAll('.r').forEach(r=>r.classList.toggle('hidden',!o));row.querySelector('.closed-txt').classList.toggle('hidden',o)};
  $('days').querySelectorAll('.day').forEach(r=>{sync(r);r.querySelector('.op').onchange=()=>sync(r)});
}
$('saveHours').onclick=async()=>{
  const week={};
  for(const row of $('days').querySelectorAll('.day')){
    const ins=row.querySelectorAll('input[type=time]');
    const rg=[[ins[0].value,ins[1].value],[ins[2].value,ins[3].value]];
    const open=row.querySelector('.op').checked;
    for(const [a,b] of rg){if((a&&!b)||(!a&&b)||(a&&b&&a>=b)){toast(`Controlla gli orari di ${GIORNI[row.dataset.i]}`);return}}
    if(open&&!rg.some(([a,b])=>a&&b)){toast(`${GIORNI[row.dataset.i]}: imposta almeno una fascia o segnalo chiuso`);return}
    week[row.dataset.i]={open,ranges:rg};
  }
  const r=await DB.saveHours(+$('step').value,week);
  if(r.error){toast('Errore: '+r.error);return}
  CFG=await DB.getConfig();kpis();toast('Orari salvati ✓');
};

/* FERIE */
function closures(){
  const t=today();
  const l=[...CFG.closures].sort((a,b)=>a.from.localeCompare(b.from));
  if(!l.length){$('clList').innerHTML='<div class="empty"><div class="big">🌴</div>Nessuna chiusura programmata.</div>';return}
  const bk=BKS.filter(b=>b.stato!=='annullata');
  $('clList').innerHTML=l.map(x=>{
    const to=x.to||x.from,past=to<t;
    const n=bk.filter(b=>b.data>=x.from&&b.data<=to&&b.data>=t).length;
    return `<div class="cl ${past?'past':''}"><div><b>${DB.esc(x.tipo)}${x.motivo?' · '+DB.esc(x.motivo):''}</b>
      <small>${x.to&&x.to!==x.from?'Dal '+DB.fmtDate(x.from)+' al '+DB.fmtDate(x.to):DB.fmtDate(x.from)}${past?' (passata)':''}</small>
      ${n?`<small class="warn">⚠ ${n} prenotazion${n>1?'i':'e'} in questo periodo da gestire</small>`:''}</div>
      <button class="mini ko" data-id="${x.id}">Rimuovi</button></div>`}).join('');
  $('clList').querySelectorAll('[data-id]').forEach(b=>b.onclick=async()=>{
    const r=await DB.removeClosure(b.dataset.id);
    if(r.error){toast('Errore: '+r.error);return}
    CFG=await DB.getConfig();closures();kpis();toast('Chiusura rimossa');
  });
}
$('cfrom').min=$('cto').min=today();
$('cfrom').onchange=()=>{$('cto').min=$('cfrom').value||today()};
$('clForm').onsubmit=async e=>{
  e.preventDefault();
  const from=$('cfrom').value,to=$('cto').value;
  if(to&&to<from){toast('La data finale è prima di quella iniziale');return}
  const r=await DB.addClosure({tipo:$('ctipo').value,motivo:$('cmot').value.trim(),from,to});
  if(r.error){toast('Errore: '+r.error);return}
  e.target.reset();CFG=await DB.getConfig();closures();kpis();toast('Chiusura aggiunta ✓');
};

/* IMPOSTAZIONI */
$('pwForm').onsubmit=async e=>{
  e.preventDefault();
  if($('np').value!==$('np2').value){toast('Le password non coincidono');return}
  const r=await DB.changePassword($('np').value);
  if(r.error){toast('Errore: '+r.error);return}
  e.target.reset();toast('Password aggiornata ✓');
};
$('exp').onclick=async()=>{
  const blob=new Blob([JSON.stringify(await DB.exportAll(),null,1)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='este-backup-'+today()+'.json';a.click();
};
$('imp').onchange=e=>{
  const f=e.target.files[0];if(!f)return;
  f.text().then(async t=>{
    try{const d=JSON.parse(t);if(!d.cfg||!Array.isArray(d.bookings))throw 0;
      if(!confirm('Importando, i dati attuali verranno sostituiti. Continuare?'))return;
      await DB.importAll(d);await render();toast('Dati importati ✓')}
    catch(x){toast('File non valido')}
  });e.target.value='';
};

async function render(){
  [CFG,BKS]=await Promise.all([DB.getConfig(),DB.listBookings()]);
  kpis();bookings();hours();closures();
}
show();

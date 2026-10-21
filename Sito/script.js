const IG='https://www.instagram.com/estemelinaconforto/?hl=en';
const FB='https://www.facebook.com/estemelinaconforto/?ref=NONE_xav_ig_profile_page_web#';
const igSvg='<svg viewBox="0 0 24 24"><path d="M12 7.3A4.7 4.7 0 1 0 12 16.7 4.7 4.7 0 0 0 12 7.3zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm5-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0zM21.9 8c-.1-1.4-.4-2.6-1.4-3.6S18.4 3 17 2.9C15.5 2.8 8.500 2.800 7 2.900 5.600 3 4.400 3.300 3.400 4.300S2.100 6.600 2 8c-.1 1.500-.1 6.500 0 8 .1 1.400.4 2.600 1.400 3.600s2.200 1.300 3.600 1.400c1.500.1 8.500.1 10 0 1.400-.1 2.600-.4 3.600-1.400s1.300-2.200 1.400-3.600c.1-1.500.1-6.500-.1-8zm-2 10.900a2.900 2.900 0 0 1-1.600 1.600c-1.100.4-3.800.3-6.300.3s-5.200.1-6.300-.3a2.900 2.900 0 0 1-1.600-1.600c-.4-1.100-.3-3.800-.3-6.300s-.1-5.200.3-6.300A2.900 2.900 0 0 1 5.700 4.700c1.100-.4 3.800-.3 6.300-.3s5.200-.1 6.300.3a2.900 2.900 0 0 1 1.600 1.600c.4 1.100.3 3.800.3 6.300s.1 5.200-.3 6.300z"/></svg>';
const fbSvg='<svg viewBox="0 0 24 24"><path d="M22 12a10 10 0 1 0-11.600 9.900v-7H7.900V12h2.500V9.800c0-2.500 1.500-3.900 3.800-3.900 1.100 0 2.200.2 2.200.2v2.500h-1.300c-1.200 0-1.600.8-1.600 1.600V12h2.800l-.4 2.900h-2.300v7A10 10 0 0 0 22 12z"/></svg>';

const pages=[['index.html','Home'],['servizi.html','Servizi'],['chi-siamo.html','Chi siamo'],['contatti.html','Contatti']];
const cur=location.pathname.split('/').pop()||'index.html';

document.body.insertAdjacentHTML('afterbegin',`
<header id="hd"><div class="container nav">
  <a href="index.html" class="logo">Estè<span>Centro Estetico</span></a>
  <button class="burger" id="bg" aria-label="Menu"><span></span><span></span><span></span></button>
  <ul class="menu" id="mn">
    ${pages.map(([h,t])=>`<li><a href="${h}" class="${h===cur?'active':''}">${t}</a></li>`).join('')}
    <li><a href="account.html" class="btn sm outline" id="navAcc">Accedi</a></li>
    <li><a href="prenotazioni.html" class="btn sm">Prenota ora</a></li>
  </ul>
</div></header>`);

document.body.insertAdjacentHTML('beforeend',`
<footer><div class="container">
  <div class="foot">
    <div><a href="index.html" class="logo">Estè<span>Centro Estetico</span></a>
      <p>Bellezza, benessere e cura di sé in un ambiente moderno, pulito e accogliente.</p>
      <div class="social"><a href="${IG}" target="_blank" rel="noopener" aria-label="Instagram">${igSvg}</a><a href="${FB}" target="_blank" rel="noopener" aria-label="Facebook">${fbSvg}</a></div></div>
    <div><h4>Menu</h4><ul>${pages.map(([h,t])=>`<li><a href="${h}">${t}</a></li>`).join('')}<li><a href="prenotazioni.html">Prenotazioni</a></li></ul></div>
    <div><h4>Orari</h4><ul><li>Lun – Ven: 9:00 – 19:00</li><li>Sabato: 9:00 – 17:00</li><li>Domenica: chiuso</li></ul></div>
    <div><h4>Seguici</h4><ul><li><a href="${IG}" target="_blank" rel="noopener">Instagram @estemelinaconforto</a></li><li><a href="${FB}" target="_blank" rel="noopener">Facebook Estè</a></li></ul></div>
  </div>
  <div class="copy">© ${new Date().getFullYear()} Estè Centro Estetico · Tutti i diritti riservati</div>
</div></footer>
<div class="float-social"><a class="ig" href="${IG}" target="_blank" rel="noopener" aria-label="Instagram">${igSvg}</a><a class="fb" href="${FB}" target="_blank" rel="noopener" aria-label="Facebook">${fbSvg}</a></div>`);

// Menu: se sei connessa/o il pulsante mostra il nome (promemoria scritto da data.js al login)
try{
  const n=JSON.parse(localStorage.getItem("este_nav")||"null"),a=document.getElementById("navAcc");
  if(n){a.textContent=(n.role==="admin"?"🛠 ":"👤 ")+n.name;if(n.role==="admin")a.href="admin.html"}
}catch(e){}

const hd=document.getElementById('hd'),bg=document.getElementById('bg'),mn=document.getElementById('mn');
addEventListener('scroll',()=>hd.classList.toggle('scrolled',scrollY>30));
hd.classList.toggle('scrolled',scrollY>30);
bg.onclick=()=>{bg.classList.toggle('open');mn.classList.toggle('open')};

const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('show');io.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

// Filtro servizi
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));t.classList.add('on');
  const c=t.dataset.cat;
  document.querySelectorAll('.item').forEach(i=>i.classList.toggle('hide',c!=='tutti'&&i.dataset.cat!==c));
});

// Form prenotazione / contatti
const f=document.getElementById('bookForm');
if(f){
  const d=f.querySelector('input[type=date]');
  if(d){const t=new Date();d.min=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0')}
  const q=new URLSearchParams(location.search).get('servizio');
  const s=f.querySelector('select[name=servizio]');
  if(q&&s)s.value=q;
  if(!f.dataset.custom)f.addEventListener('submit',e=>{
    e.preventDefault();
    // TODO: collegare a un servizio reale (email, WhatsApp, Formspree, gestionale) per ricevere le richieste
    f.style.display='none';
    const ok=document.getElementById('ok');
    ok.style.display='block';
    const n=f.querySelector('[name=nome]').value;
    document.getElementById('okName').textContent=n;
  });
}

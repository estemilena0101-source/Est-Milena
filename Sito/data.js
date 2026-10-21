/* Livello dati di Estè.
   Stessa interfaccia (tutta asincrona) con due motori:
   - Supabase  → se in config.js ci sono URL e chiave (dati online, ruoli controllati dal server)
   - Locale    → altrimenti (dati solo in questo browser, utile per provare il sito) */

const U={
  read(k,f){try{const v=JSON.parse(localStorage.getItem(k));return v==null?f:v}catch(e){return f}},
  write(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},
  uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)},
  today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')},
  toMin(t){const [h,m]=t.split(':').map(Number);return h*60+m},
  toStr(m){return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')},
  esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))},
  fmtDate(d,o={weekday:'short',day:'numeric',month:'short',year:'numeric'}){return new Date(d+'T12:00').toLocaleDateString('it-IT',o)},
  defaultCfg(){
    const g=(a,b)=>({open:true,ranges:[['09:00','13:00'],[a,b]]});
    return{step:30,week:{0:{open:false,ranges:[['09:00','13:00'],['','']]},1:g('14:00','19:00'),2:g('14:00','19:00'),3:g('14:00','19:00'),4:g('14:00','19:00'),5:g('14:00','19:00'),6:g('14:00','17:00')},closures:[]};
  },
  closureFor(closures,d){return closures.find(c=>d>=c.from&&d<=(c.to||c.from))||null},
  /* orari prenotabili: cfg + intervalli occupati [[inizio,fine],...] in minuti */
  computeSlots(cfg,busy,d,dur){
    const cl=U.closureFor(cfg.closures,d);
    if(cl)return{closed:true,reason:(cl.tipo||'Chiusura')+(cl.motivo?': '+cl.motivo:''),slots:[]};
    const day=cfg.week[new Date(d+'T12:00').getDay()];
    if(!day||!day.open)return{closed:true,reason:'Giorno di chiusura settimanale',slots:[]};
    const now=new Date(),nowMin=now.getHours()*60+now.getMinutes(),out=[];
    day.ranges.forEach(([a,b])=>{
      if(!a||!b)return;
      for(let t=U.toMin(a);t+dur<=U.toMin(b);t+=cfg.step){
        if(d===U.today()&&t<=nowMin)continue;
        if(busy.some(([x,y])=>t<y&&t+dur>x))continue;
        out.push(U.toStr(t));
      }
    });
    return{closed:false,reason:'',slots:out};
  },
  /* promemoria per il menu del sito (solo visualizzazione, non è un controllo di sicurezza) */
  setNav(v){try{v?localStorage.setItem('este_nav',JSON.stringify(v)):localStorage.removeItem('este_nav')}catch(e){}}
};

/* ============================ MOTORE LOCALE ============================ */
function makeLocal(){
  const K={cfg:'este_cfg',bk:'este_bookings',admins:'este_admins',sess:'este_session',users:'este_users',usess:'este_user_session'};
  const hash=s=>{let h=5381;for(const c of 'este::'+s)h=((h<<5)+h+c.charCodeAt(0))>>>0;return h.toString(36)};
  const cfg=()=>Object.assign(U.defaultCfg(),U.read(K.cfg,{}));
  const bks=()=>U.read(K.bk,[]);
  const admins=()=>U.read(K.admins,['Admin1','Admin2','Admin3'].map(user=>({user,hash:hash('este2026')})));
  const users=()=>U.read(K.users,[]);
  const adminName=()=>{const n=localStorage.getItem(K.sess);return n&&admins().some(a=>a.user===n)?n:null};
  const curUser=()=>{const id=localStorage.getItem(K.usess);return id?users().find(u=>u.id===id)||null:null};
  const endAll=()=>{localStorage.removeItem(K.sess);localStorage.removeItem(K.usess)};
  return{
    mode:'local',
    async getConfig(){return cfg()},
    async saveHours(step,week){const c=cfg();c.step=step;c.week=week;U.write(K.cfg,c);return{}},
    async addClosure(x){const c=cfg();c.closures.push({id:U.uid(),tipo:x.tipo,motivo:x.motivo||'',from:x.from,to:x.to||''});U.write(K.cfg,c);return{}},
    async removeClosure(id){const c=cfg();c.closures=c.closures.filter(x=>x.id!==id);U.write(K.cfg,c);return{}},
    async slotsFor(d,dur){
      const busy=bks().filter(b=>b.data===d&&b.stato!=='annullata').map(b=>[U.toMin(b.ora),U.toMin(b.ora)+(b.min||30)]);
      return U.computeSlots(cfg(),busy,d,dur);
    },
    async listBookings(){
      if(adminName())return bks();
      const u=curUser();return u?bks().filter(b=>b.userId===u.id):[];
    },
    async addBooking(b){
      const u=curUser();const all=bks();
      all.push({...b,id:U.uid(),userId:u?u.id:null,stato:'in attesa',creato:new Date().toISOString()});
      U.write(K.bk,all);return{};
    },
    async setBookingStatus(id,stato){
      const all=bks(),b=all.find(x=>x.id===id),u=curUser();
      if(!b||(!adminName()&&!(u&&b.userId===u.id&&stato==='annullata')))return{error:'Non autorizzato'};
      b.stato=stato;U.write(K.bk,all);return{};
    },
    async deleteBooking(id){if(!adminName())return{error:'Non autorizzato'};U.write(K.bk,bks().filter(x=>x.id!==id));return{}},

    async me(){
      const a=adminName();
      if(a){U.setNav({name:a,role:'admin'});return{role:'admin',name:a}}
      const u=curUser();
      if(u){U.setNav({name:u.nome.split(' ')[0],role:'cliente'});return{role:'cliente',id:u.id,name:u.nome,email:u.email,tel:u.tel}}
      U.setNav(null);return null;
    },
    async signIn(id,pw){
      const adm=admins().find(a=>a.user.toLowerCase()===id.trim().toLowerCase());
      if(adm){  // i nomi utente admin vengono controllati solo tra gli admin
        if(adm.hash!==hash(pw))return{error:'Credenziali errate'};
        endAll();localStorage.setItem(K.sess,adm.user);return{role:'admin'};
      }
      const u=users().find(x=>x.email===id.trim().toLowerCase()&&x.hash===hash(pw));
      if(!u)return{error:'Credenziali errate'};
      endAll();localStorage.setItem(K.usess,u.id);return{role:'cliente'};
    },
    async signUp({nome,tel,email,password}){
      email=email.trim().toLowerCase();const all=users();
      if(all.some(u=>u.email===email))return{error:'Esiste già un account con questa email'};
      const u={id:U.uid(),nome:nome.trim(),tel:tel.trim(),email,hash:hash(password)};
      all.push(u);U.write(K.users,all);endAll();localStorage.setItem(K.usess,u.id);return{};
    },
    async signOut(){endAll();U.setNav(null)},
    async changePassword(pw){
      const n=adminName();
      if(n){const all=admins();all.find(a=>a.user===n).hash=hash(pw);U.write(K.admins,all);return{}}
      const u=curUser();if(!u)return{error:'Non sei connesso'};
      const all=users();all.find(x=>x.id===u.id).hash=hash(pw);U.write(K.users,all);return{};
    },
    async exportAll(){return{cfg:cfg(),bookings:bks()}},
    canImport:true,
    async importAll(d){U.write(K.cfg,d.cfg);U.write(K.bk,d.bookings);return{}}
  };
}

/* ============================ MOTORE SUPABASE ============================ */
function makeSupa(){
  const sb=window.supabase.createClient(window.ESTE_SUPABASE_URL,window.ESTE_SUPABASE_KEY);
  const toBk=r=>({id:r.id,userId:r.user_id,nome:r.nome,tel:r.tel,email:r.email,note:r.note,servizi:r.servizi,min:r.min,prezzo:r.prezzo,data:r.data,ora:r.ora,stato:r.stato});
  const toCl=r=>({id:r.id,tipo:r.tipo,motivo:r.motivo||'',from:r.from_date,to:r.to_date||''});
  const err=e=>e?{error:e.message}:{};
  const ADMIN_RE=/^admin\d+$/i;            // Admin1, Admin2, Admin3 → admin1@example.com ...
  const adminEmail=n=>n.trim().toLowerCase()+'@example.com';

  async function profile(user){
    const {data}=await sb.from('profiles').select('nome,tel,email,role').eq('id',user.id).maybeSingle();
    const email=(data&&data.email)||user.email;
    const role=data&&data.role==='admin'?'admin':'cliente';
    const name=role==='admin'?email.split('@')[0].replace(/^./,c=>c.toUpperCase()):((data&&data.nome)||email);
    return{role,id:user.id,name,email,tel:data&&data.tel||''};
  }
  return{
    mode:'supabase',
    async getConfig(){
      const [s,c]=await Promise.all([
        sb.from('settings').select('step,week').eq('id',1).maybeSingle(),
        sb.from('closures').select('*').order('from_date')
      ]);
      const d=U.defaultCfg();
      return{step:s.data?s.data.step:d.step,week:s.data?s.data.week:d.week,closures:(c.data||[]).map(toCl)};
    },
    async saveHours(step,week){return err((await sb.from('settings').update({step,week}).eq('id',1)).error)},
    async addClosure(x){return err((await sb.from('closures').insert({tipo:x.tipo,motivo:x.motivo||null,from_date:x.from,to_date:x.to||null})).error)},
    async removeClosure(id){return err((await sb.from('closures').delete().eq('id',id)).error)},
    async slotsFor(d,dur){
      const [cfg,r]=await Promise.all([this.getConfig(),sb.rpc('busy_slots',{d})]);
      const busy=(r.data||[]).map(x=>[U.toMin(x.ora),U.toMin(x.ora)+x.min]);
      return U.computeSlots(cfg,busy,d,dur);
    },
    async listBookings(){
      const {data}=await sb.from('bookings').select('*').order('data').order('ora');
      return(data||[]).map(toBk);
    },
    async addBooking(b){
      const {data:{user}}=await sb.auth.getUser();
      return err((await sb.from('bookings').insert({
        user_id:user?user.id:null,nome:b.nome,tel:b.tel,email:b.email||null,note:b.note||null,
        servizi:b.servizi,min:b.min,prezzo:b.prezzo,data:b.data,ora:b.ora
      })).error);
    },
    async setBookingStatus(id,stato){return err((await sb.from('bookings').update({stato}).eq('id',id)).error)},
    async deleteBooking(id){return err((await sb.from('bookings').delete().eq('id',id)).error)},

    async me(){
      const {data:{session}}=await sb.auth.getSession();
      if(!session){U.setNav(null);return null}
      const p=await profile(session.user);
      U.setNav({name:p.role==='admin'?p.name:p.name.split(' ')[0],role:p.role});
      return p;
    },
    async signIn(id,pw){
      const isAdm=ADMIN_RE.test(id.trim());
      const {data,error}=await sb.auth.signInWithPassword({email:isAdm?adminEmail(id):id.trim().toLowerCase(),password:pw});
      if(error)return{error:'Credenziali errate'};
      const p=await profile(data.user);
      if(isAdm&&p.role!=='admin'){await sb.auth.signOut();return{error:'Credenziali errate'}}
      U.setNav({name:p.role==='admin'?p.name:p.name.split(' ')[0],role:p.role});
      return{role:p.role};
    },
    async signUp({nome,tel,email,password}){
      const {data,error}=await sb.auth.signUp({email:email.trim().toLowerCase(),password,options:{data:{nome:nome.trim(),tel:tel.trim()}}});
      if(error)return{error:/registered/i.test(error.message)?'Esiste già un account con questa email':error.message};
      if(!data.session)return{needsConfirm:true};       // conferma email attiva
      U.setNav({name:nome.trim().split(' ')[0],role:'cliente'});
      return{};
    },
    async signOut(){await sb.auth.signOut();U.setNav(null)},
    async changePassword(pw){return err((await sb.auth.updateUser({password:pw})).error)},
    async exportAll(){return{cfg:await this.getConfig(),bookings:await this.listBookings()}},
    canImport:false
  };
}

const DB=Object.assign(
  (window.ESTE_SUPABASE_URL&&window.ESTE_SUPABASE_KEY&&window.supabase)?makeSupa():makeLocal(),
  {esc:U.esc,fmtDate:U.fmtDate,today:U.today}
);

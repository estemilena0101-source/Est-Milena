-- ESTÈ · setup database Supabase
-- Incolla tutto in Supabase > SQL Editor > New query e premi Run.
-- (Gli admin si creano dopo da Authentication > Users: vedi in fondo.)

-- TABELLE
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  nome text, tel text, email text,
  role text not null default 'cliente' check (role in ('cliente','admin'))
);
create table settings (
  id int primary key default 1 check (id = 1),
  step int not null default 30,
  week jsonb not null
);
create table closures (
  id uuid primary key default gen_random_uuid(),
  tipo text not null, motivo text,
  from_date date not null, to_date date
);
create table bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  nome text not null, tel text not null, email text, note text,
  servizi jsonb not null, min int not null, prezzo int not null,
  data date not null, ora text not null,
  stato text not null default 'in attesa' check (stato in ('in attesa','confermata','annullata')),
  creato timestamptz default now()
);

-- ORARI DI PARTENZA
insert into settings (id, step, week) values (1, 30, '{
 "0":{"open":false,"ranges":[["09:00","13:00"],["",""]]},
 "1":{"open":true,"ranges":[["09:00","13:00"],["14:00","19:00"]]},
 "2":{"open":true,"ranges":[["09:00","13:00"],["14:00","19:00"]]},
 "3":{"open":true,"ranges":[["09:00","13:00"],["14:00","19:00"]]},
 "4":{"open":true,"ranges":[["09:00","13:00"],["14:00","19:00"]]},
 "5":{"open":true,"ranges":[["09:00","13:00"],["14:00","19:00"]]},
 "6":{"open":true,"ranges":[["09:00","13:00"],["14:00","17:00"]]}
}');

-- chi è admin
create function is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;

-- profilo creato in automatico alla registrazione
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, nome, tel, email)
  values (new.id, new.raw_user_meta_data->>'nome', new.raw_user_meta_data->>'tel', new.email);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- orari occupati (senza esporre i dati dei clienti)
create function busy_slots(d date) returns table (ora text, min int)
language sql security definer set search_path = public stable as $$
  select ora, min from bookings where data = d and stato <> 'annullata'
$$;
grant execute on function busy_slots(date) to anon, authenticated;

-- SICUREZZA (RLS)
alter table profiles enable row level security;
alter table settings enable row level security;
alter table closures enable row level security;
alter table bookings enable row level security;

create policy "profilo: vedo il mio" on profiles for select using (id = auth.uid() or is_admin());

create policy "orari: tutti leggono" on settings for select using (true);
create policy "orari: solo admin scrive" on settings for all using (is_admin()) with check (is_admin());

create policy "chiusure: tutti leggono" on closures for select using (true);
create policy "chiusure: solo admin scrive" on closures for all using (is_admin()) with check (is_admin());

create policy "prenota: chiunque" on bookings for insert
  with check (stato = 'in attesa' and (user_id is null or user_id = auth.uid()));
create policy "prenotazioni: vedo le mie" on bookings for select using (user_id = auth.uid() or is_admin());
create policy "prenotazioni: annullo le mie" on bookings for update
  using (user_id = auth.uid()) with check (user_id = auth.uid() and stato = 'annullata');
create policy "prenotazioni: admin gestisce" on bookings for all using (is_admin()) with check (is_admin());

-- ====== DA ESEGUIRE DOPO aver creato i 3 utenti in Authentication > Users ======
-- (estemilena0101+admin1@gmail.com, estemilena0101+admin2@gmail.com, estemilena0101+admin3@gmail.com, password este2026, Auto Confirm)
-- update profiles set role = 'admin'
-- where email in ('estemilena0101+admin1@gmail.com','estemilena0101+admin2@gmail.com','estemilena0101+admin3@gmail.com');

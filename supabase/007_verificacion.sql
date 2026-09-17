-- ============================================================
--  Verificación de profesionales
--  ------------------------------------------------------------
--  EL PROBLEMA QUE ARREGLAMOS
--  Hasta hoy, el escudo de "matrícula vigente" salía de una
--  fecha que escribía el propio profesional. Cualquiera ponía
--  un número inventado y un 2027, y la app le publicaba un
--  escudito verde al lado del nombre.
--
--  Eso es peor que no tener escudo. Sin escudo el vecino
--  pregunta; con un escudo falso, se relaja.
--
--  LA IDEA
--  Separar dos cosas que hoy están pegadas:
--    - lo que el profesional DECLARA  (su matrícula, su seguro)
--    - lo que nosotros VERIFICAMOS    (que eso sea cierto)
--
--  Lo primero lo escribe él. Lo segundo no lo puede tocar ni
--  aunque quiera: la base se lo impide.
--
--  CÓMO SE USA: pegar todo en el SQL Editor de Supabase y Run.
--  OJO: al final del archivo hay UNA línea que tenés que
--  completar con tu mail, para darte de alta como revisor.
-- ============================================================


-- ------------------------------------------------------------
--  1. Los cuatro estados posibles
-- ------------------------------------------------------------
--  pendiente   -> se dio de alta, falta que suba los papeles
--  en_revision -> subió los papeles, esperando que alguien mire
--  verificado  -> alguien miró y están bien
--  rechazado   -> alguien miró y no están bien
-- ------------------------------------------------------------

do $$
begin
  create type public.estado_verificacion as enum
    ('pendiente', 'en_revision', 'verificado', 'rechazado');
exception
  when duplicate_object then null;
end $$;


alter table public.perfiles_profesionales
  add column if not exists verificacion    public.estado_verificacion
                                           not null default 'pendiente',
  add column if not exists verificado_el   timestamptz,
  add column if not exists verificado_por  uuid references public.personas(id),
  add column if not exists motivo_rechazo  text;


-- ------------------------------------------------------------
--  2. Quién revisa
--  ------------------------------------------------------------
--  Una tabla con una sola columna. Nadie tiene permiso de
--  escribir acá desde la app: no hay ninguna regla que lo
--  permita, así que nadie se puede anotar solo. Los admins se
--  agregan desde el SQL Editor y nada más.
-- ------------------------------------------------------------

create table if not exists public.admins (
  persona_id uuid primary key references public.personas(id) on delete cascade,
  desde      timestamptz not null default now()
);

alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create or replace function public.soy_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins a where a.persona_id = auth.uid());
$$;

grant execute on function public.soy_admin() to authenticated;


-- ------------------------------------------------------------
--  3. El blindaje
--  ------------------------------------------------------------
--  Acá está el corazón del asunto. La regla "mi perfil
--  profesional" del paso 1 le da al dueño permiso para editar
--  TODAS las columnas de su perfil. Ahora que agregamos la
--  columna "verificacion", esa misma regla lo dejaría
--  auto-aprobarse. Este disparador lo frena.
--
--  Y frena algo más, que es la parte que no se ve venir:
--  si un profesional YA VERIFICADO edita su matrícula, su
--  seguro o su CUIT, vuelve solo a la cola. Sin esto, alcanzaba
--  con verificarse una vez con papeles buenos y después cambiar
--  los números por cualquier cosa.
-- ------------------------------------------------------------

create or replace function public.verificacion_la_decide_el_admin()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Un admin hace lo que quiera; para eso es admin.
  if public.soy_admin() then
    return new;
  end if;

  -- Nadie más toca las columnas de verificación. Ni un poquito.
  if new.verificacion    is distinct from old.verificacion
  or new.verificado_el   is distinct from old.verificado_el
  or new.verificado_por  is distinct from old.verificado_por
  or new.motivo_rechazo  is distinct from old.motivo_rechazo then
    raise exception
      'El estado de verificación no lo decide el profesional.';
  end if;

  -- Si cambió los papeles, se cae la verificación que tenía.
  if new.matricula_nro   is distinct from old.matricula_nro
  or new.matricula_vence is distinct from old.matricula_vence
  or new.seguro_vence    is distinct from old.seguro_vence
  or new.cuit            is distinct from old.cuit then
    new.verificacion   := 'pendiente';
    new.verificado_el  := null;
    new.verificado_por := null;
    new.motivo_rechazo := null;
  end if;

  return new;
end;
$$;

drop trigger if exists verificacion_blindada on public.perfiles_profesionales;
create trigger verificacion_blindada
  before update on public.perfiles_profesionales
  for each row execute function public.verificacion_la_decide_el_admin();


-- ------------------------------------------------------------
--  4. El botón de aprobar (que por ahora es una función)
-- ------------------------------------------------------------

create or replace function public.verificar_profesional(
  p_perfil   uuid,
  p_decision text,                    -- 'verificado' o 'rechazado'
  p_motivo   text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.soy_admin() then
    raise exception 'Solo un revisor puede verificar profesionales.';
  end if;

  if p_decision not in ('verificado', 'rechazado', 'pendiente', 'en_revision') then
    raise exception 'Decisión inválida: %', p_decision;
  end if;

  if p_decision = 'rechazado' and coalesce(trim(p_motivo), '') = '' then
    raise exception 'Un rechazo sin motivo no le sirve a nadie. Escribí por qué.';
  end if;

  update public.perfiles_profesionales
     set verificacion   = p_decision::public.estado_verificacion,
         verificado_el  = case when p_decision = 'verificado' then now() end,
         verificado_por = case when p_decision = 'verificado' then auth.uid() end,
         motivo_rechazo = case when p_decision = 'rechazado' then p_motivo end
   where id = p_perfil;

  if not found then
    raise exception 'Ese perfil no existe.';
  end if;
end;
$$;

revoke all on function public.verificar_profesional(uuid, text, text) from public;
grant execute on function public.verificar_profesional(uuid, text, text) to authenticated;


-- ------------------------------------------------------------
--  5. Sin verificar no se reciben pedidos
--  ------------------------------------------------------------
--  Esta es la vista que decide quién ve trabajos. Le agregamos
--  una condición.
--
--  Fijate el matiz: la verificación se exige SOLO en los oficios
--  que piden papeles. A un pintor no hay matrícula que
--  revisarle, así que exigirle una revisión lo dejaría afuera
--  para siempre sin motivo.
-- ------------------------------------------------------------

create or replace view public.profesionales_habilitados as
select pp.*
from public.perfiles_profesionales pp
join public.oficios_config oc on oc.oficio = pp.oficio
where pp.activo
  and (not oc.exige_matricula
       or (pp.matricula_nro is not null and pp.matricula_vence >= current_date))
  and (not oc.exige_seguro
       or pp.seguro_vence >= current_date)
  -- LO NUEVO:
  and (not (oc.exige_matricula or oc.exige_seguro)
       or pp.verificacion = 'verificado');

-- Esto ya lo habíamos puesto en el paso 002; lo repetimos porque
-- reescribir la vista puede perder la opción.
alter view public.profesionales_habilitados set (security_invoker = on);


-- ------------------------------------------------------------
--  6. El escudo ahora dice la verdad
--  ------------------------------------------------------------
--  Antes "matricula_vigente" era solo una comparación de fechas
--  contra lo que el tipo había escrito. Ahora además exige que
--  alguien lo haya mirado.
--
--  Y los rechazados directamente no aparecen en la lista
--  pública. No mostramos el rechazo: mostramos nada.
-- ------------------------------------------------------------

drop view if exists public.profesionales_publicos;

create view public.profesionales_publicos as
select
  pp.id,
  pp.persona_id,
  pp.oficio,
  pp.zonas,
  pp.radio_km,
  pp.bio,
  per.nombre,
  per.foto_url,

  (pp.verificacion = 'verificado') as verificado,

  (pp.verificacion = 'verificado'
     and pp.matricula_nro is not null
     and pp.matricula_vence >= current_date) as matricula_vigente,

  (pp.verificacion = 'verificado'
     and pp.seguro_vence >= current_date)    as seguro_vigente,

  extract(year from pp.creado_el)::int as desde,

  (
    select round(avg(r.estrellas)::numeric, 1)
    from public.resenas r
    join public.trabajos t on t.id = r.trabajo_id
    where t.profesional_id = pp.id
  ) as puntaje,
  (
    select count(*)
    from public.resenas r
    join public.trabajos t on t.id = r.trabajo_id
    where t.profesional_id = pp.id
  ) as cantidad_resenas,
  (
    select count(*)
    from public.trabajos t
    where t.profesional_id = pp.id
      and t.estado in ('confirmado', 'pagado')
  ) as trabajos_terminados

from public.perfiles_profesionales pp
join public.personas per on per.id = pp.persona_id
where pp.activo
  and pp.verificacion <> 'rechazado';

grant select on public.profesionales_publicos to anon, authenticated;


-- ------------------------------------------------------------
--  7. La cola de revisión
--  ------------------------------------------------------------
--  Lo que vas a mirar vos. Trae el mail para poder escribirle
--  al profesional si falta algo. Solo lo ve un admin: si no lo
--  sos, la vista devuelve cero filas.
-- ------------------------------------------------------------

create or replace view public.cola_de_verificacion as
select
  pp.id            as perfil_id,
  pp.persona_id,
  per.nombre,
  u.email,
  pp.oficio,
  pp.matricula_nro,
  pp.matricula_vence,
  pp.seguro_vence,
  pp.cuit,
  pp.zonas,
  pp.verificacion,
  pp.motivo_rechazo,
  pp.creado_el
from public.perfiles_profesionales pp
join public.personas per on per.id = pp.persona_id
join auth.users       u   on u.id  = pp.persona_id
where public.soy_admin()
  and pp.verificacion in ('pendiente', 'en_revision')
order by pp.creado_el;

grant select on public.cola_de_verificacion to authenticated;


-- ------------------------------------------------------------
--  8. El revisor puede ver los documentos
--  ------------------------------------------------------------
--  En el paso 004 dijimos: "por ahora solo el dueño; cuando
--  armemos el panel le agregamos una regla para ese rol".
--  Este es ese momento.
-- ------------------------------------------------------------

drop policy if exists "el revisor ve los documentos" on storage.objects;
create policy "el revisor ve los documentos" on storage.objects
  for select to authenticated
  using (bucket_id = 'documentos' and public.soy_admin());


-- ============================================================
--  9. DARTE DE ALTA COMO REVISOR
--  ------------------------------------------------------------
--  👇 CAMBIÁ EL MAIL DE ABAJO POR EL TUYO Y LISTO 👇
-- ============================================================

insert into public.admins (persona_id)
select id from auth.users
where lower(email) = lower('jesusetcheverry22@gmail.com')
on conflict (persona_id) do nothing;


-- Un chequeo final: si esto devuelve 0, el mail estaba mal
-- escrito y no quedaste como revisor.
select count(*) as revisores_dados_de_alta from public.admins;

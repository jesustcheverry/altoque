-- ============================================================
--  Los papeles de verdad
--  ------------------------------------------------------------
--  Hasta ahora el revisor aprobaba mirando lo que el profesional
--  había TIPEADO. Firmar sin leer, un piso más arriba.
--
--  Acá aparece el documento: el profesional sube la foto o el
--  PDF de su matrícula y de su póliza, y el revisor los ve antes
--  de decidir.
--
--  UNA IDEA IMPORTANTE DEL DISEÑO
--  Subir un papel te pone SOLO en la fila. No te aprueba. El
--  estado pasa de "pendiente" a "en_revision", que quiere decir
--  "hay algo para mirar", no "está bien". La diferencia entre
--  esas dos cosas es todo el producto.
--
--  CÓMO SE USA: pegar todo en el SQL Editor de Supabase y Run.
-- ============================================================


-- ------------------------------------------------------------
--  1. Dónde anotamos los documentos
--  ------------------------------------------------------------
--  El archivo pesado va al bucket; acá solo guardamos el camino
--  y qué es. Misma división que con las fotos de los pedidos:
--  las tablas son buenas para buscar, malas para guardar cosas
--  pesadas.
-- ------------------------------------------------------------

create table if not exists public.documentos_profesional (
  id         uuid primary key default gen_random_uuid(),
  perfil_id  uuid not null references public.perfiles_profesionales(id)
             on delete cascade,
  tipo       text not null check (tipo in ('matricula', 'seguro', 'dni', 'otro')),
  ruta       text not null,
  subido_el  timestamptz not null default now()
);

create index if not exists documentos_por_perfil
  on public.documentos_profesional (perfil_id, subido_el desc);

alter table public.documentos_profesional enable row level security;

-- El dueño ve y borra los suyos.
drop policy if exists "veo mis documentos" on public.documentos_profesional;
create policy "veo mis documentos" on public.documentos_profesional
  for select to authenticated
  using (public.es_mi_perfil_profesional(perfil_id));

drop policy if exists "borro mis documentos" on public.documentos_profesional;
create policy "borro mis documentos" on public.documentos_profesional
  for delete to authenticated
  using (public.es_mi_perfil_profesional(perfil_id));

-- El revisor los ve todos. Para eso es revisor.
drop policy if exists "el revisor ve todos los documentos" on public.documentos_profesional;
create policy "el revisor ve todos los documentos" on public.documentos_profesional
  for select to authenticated
  using (public.soy_admin());


-- ------------------------------------------------------------
--  2. Registrar un documento y ponerse en la fila
--  ------------------------------------------------------------
--  Las dos cosas van juntas a propósito. Si fueran dos llamadas
--  separadas, un error en el medio dejaría un papel subido que
--  nadie sabe que existe, esperando para siempre.
-- ------------------------------------------------------------

create or replace function public.registrar_documento(
  p_perfil uuid,
  p_tipo   text,
  p_ruta   text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_mi_perfil_profesional(p_perfil) then
    raise exception 'Ese perfil no es tuyo.';
  end if;

  if p_tipo not in ('matricula', 'seguro', 'dni', 'otro') then
    raise exception 'Tipo de documento inválido: %', p_tipo;
  end if;

  insert into public.documentos_profesional (perfil_id, tipo, ruta)
  values (p_perfil, p_tipo, p_ruta);

  -- Subir un papel te pone en la fila. NO te aprueba.
  -- Si ya estabas verificado, no te toca nada.
  update public.perfiles_profesionales
     set verificacion = 'en_revision'
   where id = p_perfil
     and verificacion in ('pendiente', 'rechazado');
end;
$$;

revoke all on function public.registrar_documento(uuid, text, text) from public;
grant execute on function public.registrar_documento(uuid, text, text) to authenticated;


-- ------------------------------------------------------------
--  3. El disparador tiene que dejar pasar eso
--  ------------------------------------------------------------
--  Hasta ahora decía: "nadie que no sea admin toca la columna
--  verificacion". Pero ponerse en la fila NO es aprobarse, y el
--  profesional tiene que poder hacerlo.
--
--  Así que abrimos una puerta de un solo sentido y bien angosta:
--  de pendiente o rechazado, únicamente hacia en_revision.
--  Cualquier otro salto sigue prohibido.
-- ------------------------------------------------------------

create or replace function public.verificacion_la_decide_el_admin()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_pide_revision boolean;
begin

  -- La puerta angosta: pedir que te miren.
  v_pide_revision :=
        old.verificacion in ('pendiente', 'rechazado')
    and new.verificacion = 'en_revision';

  -- ---- Regla 1: aprobarse a sí mismo, nunca ----
  if not public.soy_admin() and not v_pide_revision then
    if new.verificacion    is distinct from old.verificacion
    or new.verificado_el   is distinct from old.verificado_el
    or new.verificado_por  is distinct from old.verificado_por
    or new.motivo_rechazo  is distinct from old.motivo_rechazo then
      raise exception
        'El estado de verificación no lo decide el profesional.';
    end if;
  end if;

  -- Si se puso en la fila, que no arrastre sellos viejos.
  if v_pide_revision and not public.soy_admin() then
    new.verificado_el  := null;
    new.verificado_por := null;
    new.motivo_rechazo := null;
  end if;

  -- ---- Regla 2: los papeles nuevos no vienen verificados ----
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


-- ------------------------------------------------------------
--  4. Que el revisor pueda ver cuántos papeles hay
--  ------------------------------------------------------------

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
  pp.creado_el,
  (select count(*) from public.documentos_profesional d
    where d.perfil_id = pp.id) as cantidad_documentos
from public.perfiles_profesionales pp
join public.personas per on per.id = pp.persona_id
join auth.users       u   on u.id  = pp.persona_id
where public.soy_admin()
  and pp.verificacion in ('pendiente', 'en_revision')
order by pp.creado_el;

grant select on public.cola_de_verificacion to authenticated;

select 'listo' as resultado;

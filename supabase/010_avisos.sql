-- ============================================================
--  La cola de avisos
--  ------------------------------------------------------------
--  EL PROBLEMA
--  Hoy podés rechazar a un profesional, escribirle un motivo
--  claro... y él no se entera nunca, salvo que se le ocurra
--  volver a entrar. Mandó sus papeles, no recibió nada, asume
--  que la app no anda y no vuelve más.
--
--  LA FORMA FÁCIL Y MALA
--  Que el navegador mande el mail justo después de apretar el
--  botón. Si aprobás desde el SQL Editor, no sale nada. Si se
--  corta la conexión, no sale nada. Y lo peor: no queda ni
--  registro de que se debía un aviso.
--
--  LA FORMA CORRECTA
--  La base anota "hay que avisarle esto a esta persona" en una
--  tabla. Otra cosa, aparte, la lee y manda. Si el envío falla,
--  el renglón sigue pendiente y se reintenta.
--
--  Es la misma idea de siempre: el aviso lo decide la base, no
--  el botón. Pase lo que pase en la pantalla, el aviso queda
--  anotado.
--
--  ESTA ETAPA NO MANDA NINGÚN MAIL. Solo llena la cola. Podés
--  correrla, rechazarte a vos mismo, y mirar la tabla para ver
--  el aviso esperando. El que manda viene después.
--
--  CÓMO SE USA: pegar todo en el SQL Editor de Supabase y Run.
-- ============================================================


-- ------------------------------------------------------------
--  1. La cola
-- ------------------------------------------------------------

create table if not exists public.avisos (
  id           bigserial primary key,
  persona_id   uuid references public.personas(id) on delete set null,
  email        text not null,
  asunto       text not null,
  cuerpo       text not null,
  motivo       text not null,      -- para saber de qué se trata sin leer
  estado       text not null default 'pendiente'
               check (estado in ('pendiente', 'enviado', 'fallido')),
  intentos     int  not null default 0,
  ultimo_error text,
  creado_el    timestamptz not null default now(),
  enviado_el   timestamptz
);

-- El índice que importa: buscar lo pendiente, que es lo único
-- que el enviador va a preguntar, muchas veces por día.
create index if not exists avisos_pendientes
  on public.avisos (creado_el)
  where estado = 'pendiente';


-- ------------------------------------------------------------
--  2. Nadie lee esta tabla desde la app
--  ------------------------------------------------------------
--  Acá adentro va el mail de todo el mundo. Ninguna pantalla
--  necesita leerla, así que no le damos permiso a nadie. El que
--  manda los mails va a entrar por otra puerta, desde el
--  servidor, con una llave que nunca toca el navegador.
-- ------------------------------------------------------------

alter table public.avisos enable row level security;
revoke all on public.avisos from anon, authenticated;


-- ------------------------------------------------------------
--  3. Anotar un aviso
-- ------------------------------------------------------------

create or replace function public.encolar_aviso(
  p_persona uuid,
  p_motivo  text,
  p_asunto  text,
  p_cuerpo  text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select u.email into v_email from auth.users u where u.id = p_persona;

  -- Sin dirección no hay nada que encolar. No es un error: es
  -- una cuenta sin mail, y romper el flujo por eso sería peor.
  if v_email is null or v_email = '' then
    return;
  end if;

  insert into public.avisos (persona_id, email, motivo, asunto, cuerpo)
  values (p_persona, v_email, p_motivo, p_asunto, p_cuerpo);
end;
$$;

revoke all on function public.encolar_aviso(uuid, text, text, text) from public, anon, authenticated;


-- ------------------------------------------------------------
--  4. El disparador de la verificación
--  ------------------------------------------------------------
--  Se dispara cuando cambia el estado de verificación, venga de
--  donde venga: del botón del panel, del SQL Editor, de lo que
--  sea. Ese es todo el punto.
-- ------------------------------------------------------------

create or replace function public.avisar_verificacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_oficio text;
begin
  if new.verificacion is not distinct from old.verificacion then
    return new;
  end if;

  select oc.nombre_visible into v_oficio
  from public.oficios_config oc
  where oc.oficio = new.oficio;

  v_oficio := coalesce(v_oficio, new.oficio::text);

  if new.verificacion = 'verificado' then
    perform public.encolar_aviso(
      new.persona_id,
      'verificacion_aprobada',
      'Tus papeles quedaron verificados',
      'Listo: revisamos tu documentación de ' || v_oficio ||
      ' y está todo en orden.' || chr(10) || chr(10) ||
      'Ya aparecés en las búsquedas y vas a empezar a recibir pedidos ' ||
      'de tu zona. Entrá a "Trabajos disponibles" para ver los que hay ' ||
      'abiertos ahora mismo.'
    );

  elsif new.verificacion = 'rechazado' then
    perform public.encolar_aviso(
      new.persona_id,
      'verificacion_rechazada',
      'Necesitamos que corrijas algo en tu documentación',
      'Revisamos tu documentación de ' || v_oficio ||
      ' y todavía no podemos aprobarla.' || chr(10) || chr(10) ||
      'Motivo: ' || coalesce(new.motivo_rechazo, 'sin especificar') ||
      chr(10) || chr(10) ||
      'Corregilo desde tu perfil y volvés a la cola automáticamente. ' ||
      'No hace falta que hagas ningún trámite ni que nos escribas.'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists avisar_cambio_de_verificacion on public.perfiles_profesionales;
create trigger avisar_cambio_de_verificacion
  after update on public.perfiles_profesionales
  for each row execute function public.avisar_verificacion();


-- ------------------------------------------------------------
--  5. Para mirar la cola desde el SQL Editor
-- ------------------------------------------------------------

select
  count(*) filter (where estado = 'pendiente') as pendientes,
  count(*) filter (where estado = 'enviado')   as enviados,
  count(*) filter (where estado = 'fallido')   as fallidos
from public.avisos;

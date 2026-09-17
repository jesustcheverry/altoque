-- ============================================================
--  Borrar una cuenta de prueba (TOPADORA)
--  ------------------------------------------------------------
--  ESTO NO ES UNA MIGRACIÓN. No forma parte del esquema de la
--  app. Es una herramienta suelta para limpiar basura de prueba,
--  y por eso no lleva número.
--
--  POR QUÉ HACE FALTA
--  Si intentás borrar una cuenta desde Authentication > Users y
--  esa persona publicó aunque sea un pedido, Supabase te tira un
--  error de "foreign key constraint". No es un bug: es la regla
--  "on delete restrict" del paso 1 haciendo su trabajo. En esta
--  app nada se borra, las cosas se cancelan. Un pedido que
--  existió no puede evaporarse.
--
--  Para datos de prueba esa regla estorba, así que esto la
--  esquiva desarmando la pila en el orden correcto: primero lo
--  de más arriba (reseñas), al final lo de más abajo (la cuenta).
--
--  ⚠️  LEÉ ESTO ANTES DE CORRERLO
--  Borra de verdad y no se puede deshacer. No pregunta, no hace
--  copia de seguridad. Es SOLO para cuentas de prueba tuyas.
--  Nunca lo corras contra un usuario real.
--
--  CÓMO SE USA
--  1. Cambiá el mail de abajo por el de la cuenta a borrar.
--  2. Copiá TODO el archivo.
--  3. Pegalo en el SQL Editor de Supabase y dale Run.
--  4. Mirá la solapa de mensajes: te cuenta qué borró.
-- ============================================================

do $$
declare
  -- 👇 LO ÚNICO QUE TENÉS QUE CAMBIAR ES ESTA LÍNEA 👇
  v_mail    text := 'juliboggiano@yahoo.com';

  v_persona uuid;
  n         int;
begin

  select id into v_persona
  from auth.users
  where lower(email) = lower(trim(v_mail));

  if v_persona is null then
    raise exception
      'No encontré ninguna cuenta con el mail "%". Revisá que esté bien escrito. No borré nada.',
      v_mail;
  end if;

  raise notice '--- Borrando la cuenta % ---', v_mail;

  -- 1. Las reseñas. Van primero porque cuelgan de los trabajos.
  delete from public.resenas r
   where r.autor_id = v_persona
      or r.trabajo_id in (
           select t.id
           from public.trabajos t
           join public.pedidos   p on p.id = t.pedido_id
           join public.inmuebles i on i.id = p.inmueble_id
           where i.persona_id = v_persona
         );
  get diagnostics n = row_count;
  raise notice 'reseñas borradas: %', n;

  -- 2. Los pagos, que cuelgan de los trabajos.
  delete from public.pagos pg
   where pg.trabajo_id in (
           select t.id
           from public.trabajos t
           join public.pedidos   p on p.id = t.pedido_id
           join public.inmuebles i on i.id = p.inmueble_id
           where i.persona_id = v_persona
         );
  get diagnostics n = row_count;
  raise notice 'pagos borrados: %', n;

  -- 3. Los trabajos, que cuelgan de los pedidos.
  delete from public.trabajos t
   where t.pedido_id in (
           select p.id
           from public.pedidos   p
           join public.inmuebles i on i.id = p.inmueble_id
           where i.persona_id = v_persona
         );
  get diagnostics n = row_count;
  raise notice 'trabajos borrados: %', n;

  -- 4. Los pedidos. Estos se llevan solos las fotos y los
  --    presupuestos, porque esas dos tablas sí están en cascada.
  delete from public.pedidos p
   where p.inmueble_id in (
           select i.id from public.inmuebles i where i.persona_id = v_persona
         );
  get diagnostics n = row_count;
  raise notice 'pedidos borrados: %', n;

  -- 5. El historial de eventos que dejó esta persona.
  delete from public.eventos e where e.actor_id = v_persona;
  get diagnostics n = row_count;
  raise notice 'eventos borrados: %', n;

  -- 6. Por las dudas: si además tenía perfil profesional.
  delete from public.perfiles_profesionales pp where pp.persona_id = v_persona;
  get diagnostics n = row_count;
  raise notice 'perfiles profesionales borrados: %', n;

  -- 7. Y recién ahora la cuenta. Al borrarla se van en cadena su
  --    fila en "personas" y todas sus direcciones.
  delete from auth.users where id = v_persona;

  raise notice '--- Listo. La cuenta % ya no existe. ---', v_mail;

end $$;

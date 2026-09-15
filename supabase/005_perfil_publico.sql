-- ============================================================
--  El perfil público del profesional
--  ------------------------------------------------------------
--  UN ERROR QUE TENÍAMOS
--  Cuando el cliente mira sus presupuestos, quiere ver quién se
--  los mandó. Pero la regla de la tabla "personas" dice que cada
--  uno ve solo SU fila. Así que el nombre del gasista volvía
--  vacío y la pantalla mostraba "Profesional" a secas.
--
--  Y no alcanza con aflojar esa regla: la tabla personas tiene
--  el teléfono, y eso no puede ser público.
--
--  LA SOLUCIÓN
--  Una vista que expone SOLO lo que corresponde mostrar: nombre,
--  foto, oficio, zonas, bio y reputación. El teléfono y el mail
--  no están acá, así que no hay forma de que se escapen.
--
--  OJO, ACÁ VA AL REVÉS QUE LA VEZ PASADA.
--  En 002 le pusimos security_invoker para que la vista
--  respetara las reglas de quien pregunta. Esta vista, a
--  propósito, NO lo lleva: necesita poder leer "personas" por
--  encima de las reglas. Lo que la hace segura no es el permiso,
--  es que las columnas peligrosas no están en la lista.
--
--  Esa es la diferencia entre las dos: una vista definidora es
--  peligrosa cuando expone todo, y es la herramienta correcta
--  cuando expone poco y elegido a mano.
--
--  CÓMO SE USA: pegar todo en el SQL Editor de Supabase y Run.
-- ============================================================

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
  (pp.matricula_nro is not null and pp.matricula_vence >= current_date)
    as matricula_vigente,
  (pp.seguro_vence >= current_date) as seguro_vigente,
  extract(year from pp.creado_el)::int as desde,

  -- Reputación, calculada al vuelo. No la guardamos en ninguna
  -- columna a propósito: un número guardado se desactualiza y
  -- después nadie sabe cuál es el bueno.
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
where pp.activo;

grant select on public.profesionales_publicos to anon, authenticated;

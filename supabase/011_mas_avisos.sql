-- ============================================================
--  Los avisos que faltaban
--  ------------------------------------------------------------
--  La cañería ya está probada: la base anota, el enviador manda.
--  Así que agregar un aviso nuevo ahora es escribir un
--  disparador y nada más. Esto es lo que se gana haciendo bien
--  la parte aburrida primero.
--
--  Todos siguen la misma forma: miran un cambio de estado,
--  averiguan a quién le importa, y llaman a encolar_aviso.
--  Ninguno manda nada por sí mismo.
--
--  CÓMO SE USA: pegar todo en el SQL Editor de Supabase y Run.
-- ============================================================


-- ------------------------------------------------------------
--  Ayuda: de un pedido al vecino que lo publicó
-- ------------------------------------------------------------

create or replace function public.duenio_del_pedido(p_pedido uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select i.persona_id
  from public.pedidos p
  join public.inmuebles i on i.id = p.inmueble_id
  where p.id = p_pedido;
$$;


-- ============================================================
--  1. "Te llegó un presupuesto"  →  al cliente
--  ------------------------------------------------------------
--  Sin esto el vecino publica su pedido y tiene que adivinar
--  cuándo volver a mirar. Es el aviso que más se extraña.
-- ============================================================

create or replace function public.avisar_presupuesto_nuevo()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_cliente uuid;
  v_oficio  text;
  v_nombre  text;
  v_total   text;
begin
  v_cliente := public.duenio_del_pedido(new.pedido_id);
  if v_cliente is null then return new; end if;

  select oc.nombre_visible into v_oficio
  from public.pedidos p
  join public.oficios_config oc on oc.oficio = p.oficio
  where p.id = new.pedido_id;

  select per.nombre into v_nombre
  from public.perfiles_profesionales pp
  join public.personas per on per.id = pp.persona_id
  where pp.id = new.profesional_id;

  -- Los centavos se guardan como número entero; acá los pasamos
  -- a pesos solo para el texto del mail.
  v_total := '$' || to_char(new.total_centavos / 100.0, 'FM999G999G999D00');

  perform public.encolar_aviso(
    v_cliente,
    'presupuesto_nuevo',
    'Recibiste un presupuesto de ' || coalesce(v_total, 'un profesional'),
    coalesce(v_nombre, 'Un profesional') || ' te mandó un presupuesto para tu pedido de ' ||
    coalesce(v_oficio, 'tu pedido') || '.' || chr(10) || chr(10) ||
    'Total: ' || v_total || chr(10) || chr(10) ||
    'Entrá a "Mis pedidos" para ver el detalle, compararlo con los otros ' ||
    'y decidir. No te apures: podés esperar a que lleguen más.'
  );

  return new;
end;
$$;

drop trigger if exists avisar_presupuesto on public.presupuestos;
create trigger avisar_presupuesto
  after insert on public.presupuestos
  for each row execute function public.avisar_presupuesto_nuevo();


-- ============================================================
--  2. "Te dieron el trabajo"  →  al profesional
--  ------------------------------------------------------------
--  Va sobre la creación del trabajo y no sobre el presupuesto,
--  porque el trabajo es el hecho real: existe uno = alguien fue
--  elegido. Y ahí se destraban su dirección y su teléfono.
-- ============================================================

create or replace function public.avisar_trabajo_adjudicado()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_profesional uuid;
begin
  select pp.persona_id into v_profesional
  from public.perfiles_profesionales pp
  where pp.id = new.profesional_id;

  if v_profesional is null then return new; end if;

  perform public.encolar_aviso(
    v_profesional,
    'trabajo_adjudicado',
    'Te aceptaron el presupuesto',
    'El cliente aceptó tu presupuesto. El trabajo es tuyo.' ||
    chr(10) || chr(10) ||
    'Entrá a "Mis trabajos": ahí vas a ver la dirección exacta y el ' ||
    'teléfono del cliente, que hasta ahora estaban ocultos.' ||
    chr(10) || chr(10) ||
    'Acordá con él el día y la hora, y avisá cuando salgas para allá.'
  );

  return new;
end;
$$;

drop trigger if exists avisar_adjudicacion on public.trabajos;
create trigger avisar_adjudicacion
  after insert on public.trabajos
  for each row execute function public.avisar_trabajo_adjudicado();


-- ============================================================
--  3. y 4. Los avisos del trabajo en curso
--  ------------------------------------------------------------
--  Terminado  -> al cliente, porque le arranca el reloj de las
--                72 horas y hoy no se entera de que empezó.
--  Confirmado -> al profesional, porque significa que cobra.
-- ============================================================

create or replace function public.avisar_estado_del_trabajo()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_cliente     uuid;
  v_profesional uuid;
begin
  if new.estado is not distinct from old.estado then
    return new;
  end if;

  if new.estado = 'terminado' then
    v_cliente := public.duenio_del_pedido(new.pedido_id);
    if v_cliente is null then return new; end if;

    perform public.encolar_aviso(
      v_cliente,
      'trabajo_terminado',
      'El profesional marcó que terminó el trabajo',
      'El profesional dice que el trabajo está terminado.' ||
      chr(10) || chr(10) ||
      'Fijate que haya quedado bien y confirmalo desde la app. Al ' ||
      'confirmar se libera su pago y podés dejarle una reseña.' ||
      chr(10) || chr(10) ||
      'Si no decís nada, se confirma solo a las 72 horas. Y si algo ' ||
      'quedó mal, abrí una disputa antes de que pase ese plazo.'
    );

  elsif new.estado = 'confirmado' then
    select pp.persona_id into v_profesional
    from public.perfiles_profesionales pp
    where pp.id = new.profesional_id;

    if v_profesional is null then return new; end if;

    perform public.encolar_aviso(
      v_profesional,
      'trabajo_confirmado',
      'El cliente confirmó el trabajo',
      'El cliente confirmó que el trabajo quedó bien. Tu pago ' ||
      'quedó liberado.' || chr(10) || chr(10) ||
      'Gracias por el laburo.'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists avisar_estado_trabajo on public.trabajos;
create trigger avisar_estado_trabajo
  after update on public.trabajos
  for each row execute function public.avisar_estado_del_trabajo();


-- ============================================================
--  5. "Hay alguien esperando revisión"  →  a los revisores
--  ------------------------------------------------------------
--  Sin esto tenés que acordarte de entrar a mirar la cola. Y no
--  te vas a acordar: un profesional que espera tres días su
--  aprobación no vuelve.
--
--  Fijate que este recorre la tabla admins. El día que sumes a
--  otra persona como revisora, empieza a recibir avisos sola,
--  sin tocar una línea de código.
-- ============================================================

create or replace function public.avisar_revisores()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_admin  record;
  v_nombre text;
  v_oficio text;
begin
  if new.verificacion is not distinct from old.verificacion then
    return new;
  end if;

  if new.verificacion <> 'en_revision' then
    return new;
  end if;

  select nombre into v_nombre from public.personas where id = new.persona_id;

  select oc.nombre_visible into v_oficio
  from public.oficios_config oc where oc.oficio = new.oficio;

  for v_admin in select persona_id from public.admins loop
    perform public.encolar_aviso(
      v_admin.persona_id,
      'revision_pendiente',
      'Hay un profesional esperando revisión',
      coalesce(v_nombre, 'Un profesional') || ' (' ||
      coalesce(v_oficio, new.oficio::text) ||
      ') mandó su documentación y está esperando que alguien la mire.' ||
      chr(10) || chr(10) ||
      'Revisala en /admin/verificaciones.'
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists avisar_cola_de_revision on public.perfiles_profesionales;
create trigger avisar_cola_de_revision
  after update on public.perfiles_profesionales
  for each row execute function public.avisar_revisores();


select 'listo' as resultado;

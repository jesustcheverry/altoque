-- ============================================================
--  Los estados del trabajo
--  ------------------------------------------------------------
--  Acá se hace cumplir el diagrama del paso 1: quién puede
--  disparar cada paso, y desde qué estado.
--
--  Esto NO puede vivir en la pantalla. Si viviera ahí, un
--  profesional podría marcar un trabajo como confirmado y
--  cobrarse solo. Lo único que impide eso es que la base
--  verifique quién está pidiendo el cambio.
--
--  CÓMO SE USA: pegar todo en el SQL Editor de Supabase y Run.
-- ============================================================


create or replace function public.avanzar_trabajo(
  p_trabajo uuid,
  p_nuevo   text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado          public.estado_trabajo;
  v_pedido          uuid;
  v_perfil          uuid;
  v_soy_cliente     boolean;
  v_soy_profesional boolean;
begin
  select t.estado, t.pedido_id, t.profesional_id
    into v_estado, v_pedido, v_perfil
  from public.trabajos t
  where t.id = p_trabajo;

  if v_estado is null then
    raise exception 'Ese trabajo no existe.';
  end if;

  v_soy_cliente     := public.soy_duenio_del_pedido(v_pedido);
  v_soy_profesional := public.es_mi_perfil_profesional(v_perfil);

  if not (v_soy_cliente or v_soy_profesional) then
    raise exception 'Este trabajo no es tuyo.';
  end if;

  -- ---- Los pasos que dispara el PROFESIONAL ----

  if p_nuevo = 'en_camino' then
    if not v_soy_profesional or v_estado <> 'agendado' then
      raise exception 'Solo el profesional avisa que va en camino, y solo desde un trabajo agendado.';
    end if;
    update public.trabajos
       set estado = 'en_camino', en_camino_el = now()
     where id = p_trabajo;

  elsif p_nuevo = 'en_curso' then
    if not v_soy_profesional or v_estado <> 'en_camino' then
      raise exception 'Solo el profesional avisa que llegó, y solo si estaba en camino.';
    end if;
    update public.trabajos
       set estado = 'en_curso', empezo_el = now()
     where id = p_trabajo;

  elsif p_nuevo = 'terminado' then
    if not v_soy_profesional or v_estado <> 'en_curso' then
      raise exception 'Solo el profesional marca que terminó, y solo si el trabajo estaba en curso.';
    end if;
    update public.trabajos
       set estado = 'terminado', termino_el = now()
     where id = p_trabajo;

  -- ---- Los pasos que dispara el CLIENTE ----

  elsif p_nuevo = 'confirmado' then
    if not v_soy_cliente or v_estado <> 'terminado' then
      raise exception 'Solo el cliente confirma, y solo cuando el profesional marcó que terminó.';
    end if;
    update public.trabajos
       set estado = 'confirmado', confirmado_el = now()
     where id = p_trabajo;

    -- Confirmar es lo que libera la plata. Las dos cosas van
    -- juntas: no puede existir un trabajo confirmado con el pago
    -- todavía retenido.
    update public.pagos
       set estado = 'liberado', liberado_el = now()
     where trabajo_id = p_trabajo;

  elsif p_nuevo = 'en_disputa' then
    if not v_soy_cliente or v_estado <> 'terminado' then
      raise exception 'Solo el cliente abre una disputa, y solo cuando el profesional marcó que terminó.';
    end if;
    update public.trabajos
       set estado = 'en_disputa'
     where id = p_trabajo;

  else
    raise exception 'Ese paso no existe.';
  end if;
end;
$$;

revoke all on function public.avanzar_trabajo(uuid, text) from public;
grant execute on function public.avanzar_trabajo(uuid, text) to authenticated;


-- ============================================================
--  La regla de las 72 horas
--  ------------------------------------------------------------
--  Si el pago dependiera solo de que el cliente confirme, un
--  cliente distraído dejaría al profesional sin cobrar por
--  tiempo indefinido. Y eso vacía la app de profesionales en
--  dos meses.
--
--  Esta función confirma sola los trabajos terminados hace más
--  de 72 horas que nadie tocó. Si el cliente tiene un problema
--  real, abre una disputa antes y el trabajo sale de este
--  circuito.
--
--  OJO: esta función existe pero todavía no la llama nadie.
--  Para que corra sola hay que programarla, y eso lo vamos a
--  hacer cuando publiquemos la app.
-- ============================================================

create or replace function public.confirmar_trabajos_vencidos()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
begin
  update public.trabajos
     set estado = 'confirmado', confirmado_el = now()
   where estado = 'terminado'
     and termino_el < now() - interval '72 hours'
  returning id into v_ids;

  if v_ids is null or array_length(v_ids, 1) is null then
    return 0;
  end if;

  update public.pagos
     set estado = 'liberado', liberado_el = now()
   where trabajo_id = any(v_ids);

  return array_length(v_ids, 1);
end;
$$;


-- ============================================================
--  Calificar
--  ------------------------------------------------------------
--  Ajustamos la regla: solo se puede calificar un trabajo que
--  el cliente ya confirmó. Sin esto, alguien podría calificar
--  algo que todavía no pasó.
-- ============================================================

drop policy if exists "califico mis trabajos" on public.resenas;

create policy "califico mis trabajos" on public.resenas
  for insert to authenticated
  with check (
    autor_id = auth.uid()
    and exists (
      select 1 from public.trabajos t
      where t.id = trabajo_id
        and t.estado in ('confirmado', 'pagado')
        and public.soy_duenio_del_pedido(t.pedido_id)
    )
  );


-- ============================================================
--  Los datos de contacto se destraban con el compromiso
--  ------------------------------------------------------------
--  Hasta ahora le prometíamos al profesional que "la dirección y
--  el teléfono aparecen cuando el cliente acepta tu
--  presupuesto". Era mentira: las reglas no se lo permitían, así
--  que no los veía nunca.
--
--  Estas tres reglas lo arreglan, y de paso encodean una idea
--  del producto: los datos de contacto no son públicos ni
--  secretos, se destraban en el momento exacto en que hay un
--  trabajo acordado entre dos personas. Ni antes ni después.
-- ============================================================

-- El profesional asignado puede ver a dónde tiene que ir.
drop policy if exists "veo el inmueble del trabajo que me dieron" on public.inmuebles;
create policy "veo el inmueble del trabajo que me dieron" on public.inmuebles
  for select to authenticated
  using (
    exists (
      select 1
      from public.pedidos p
      join public.trabajos t on t.pedido_id = p.id
      join public.perfiles_profesionales pp on pp.id = t.profesional_id
      where p.inmueble_id = inmuebles.id
        and pp.persona_id = auth.uid()
        and t.estado <> 'cancelado'
    )
  );

-- El profesional asignado puede ver el teléfono del cliente.
drop policy if exists "veo el contacto de mi cliente" on public.personas;
create policy "veo el contacto de mi cliente" on public.personas
  for select to authenticated
  using (
    exists (
      select 1
      from public.inmuebles i
      join public.pedidos p on p.inmueble_id = i.id
      join public.trabajos t on t.pedido_id = p.id
      join public.perfiles_profesionales pp on pp.id = t.profesional_id
      where i.persona_id = personas.id
        and pp.persona_id = auth.uid()
        and t.estado <> 'cancelado'
    )
  );

-- Y el cliente puede ver el teléfono del profesional que eligió.
drop policy if exists "veo el contacto de mi profesional" on public.personas;
create policy "veo el contacto de mi profesional" on public.personas
  for select to authenticated
  using (
    exists (
      select 1
      from public.trabajos t
      join public.perfiles_profesionales pp on pp.id = t.profesional_id
      where pp.persona_id = personas.id
        and t.estado <> 'cancelado'
        and public.soy_duenio_del_pedido(t.pedido_id)
    )
  );

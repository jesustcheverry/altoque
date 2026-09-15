-- ============================================================
--  Aceptar un presupuesto
--  ------------------------------------------------------------
--  EL PROBLEMA
--  Cuando el cliente acepta un presupuesto pasan cuatro cosas:
--    1. ese presupuesto queda 'aceptado'
--    2. los demás quedan 'rechazado'
--    3. el pedido pasa a 'adjudicado'
--    4. nace el trabajo, y con él el pago
--
--  Si la pantalla hiciera esas cuatro cosas una por una y se
--  cortara internet en el medio, quedaría un pedido adjudicado
--  sin trabajo, o un trabajo sin pago. Basura imposible de
--  arreglar después.
--
--  LA SOLUCIÓN
--  Una función dentro de la base. Las cuatro cosas pasan juntas
--  o no pasa ninguna. Y la pantalla no decide nada: solo pide
--  "aceptá este presupuesto" y la base verifica que tenga
--  derecho a hacerlo. Es la regla 7 del paso 1.
--
--  CÓMO SE USA: pegar todo en el SQL Editor de Supabase y Run.
-- ============================================================


-- ------------------------------------------------------------
--  Configuración del negocio
--  Acá vive la comisión. Está en una tabla y no escondida en el
--  código a propósito: el día que la cambies, cambiás una fila
--  y listo, sin publicar una versión nueva de la app.
-- ------------------------------------------------------------

create table if not exists public.configuracion (
  clave       text primary key,
  valor       numeric not null,
  descripcion text
);

insert into public.configuracion (clave, valor, descripcion)
values ('comision_pct', 12, 'Porcentaje que retiene AlToque de cada trabajo')
on conflict (clave) do nothing;

alter table public.configuracion enable row level security;

drop policy if exists "configuracion visible" on public.configuracion;
create policy "configuracion visible" on public.configuracion
  for select using (true);


-- ------------------------------------------------------------
--  La función
-- ------------------------------------------------------------

create or replace function public.aceptar_presupuesto(p_presupuesto uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido        uuid;
  v_profesional   uuid;
  v_total         bigint;
  v_disponible    timestamptz;
  v_comision_pct  numeric;
  v_trabajo       uuid;
begin
  -- 1. Buscamos el presupuesto. Tiene que estar vigente.
  select p.pedido_id, p.profesional_id, p.total_centavos, p.disponible_el
    into v_pedido, v_profesional, v_total, v_disponible
  from public.presupuestos p
  where p.id = p_presupuesto and p.estado = 'enviado';

  if v_pedido is null then
    raise exception 'Ese presupuesto no existe o ya no está vigente.';
  end if;

  -- 2. LA VERIFICACIÓN QUE IMPORTA.
  --    Esta función corre con permisos elevados, así que somos
  --    nosotros los que tenemos que comprobar que quien llama
  --    sea realmente el dueño del pedido. Sin esto, cualquiera
  --    podría aceptar presupuestos ajenos.
  if not public.soy_duenio_del_pedido(v_pedido) then
    raise exception 'Solo el dueño del pedido puede aceptar un presupuesto.';
  end if;

  -- 3. El pedido tiene que seguir abierto.
  if (select estado from public.pedidos where id = v_pedido) <> 'publicado' then
    raise exception 'Ese pedido ya no está abierto.';
  end if;

  -- 4. A partir de acá, las cuatro cosas juntas.
  update public.presupuestos
     set estado = 'aceptado'
   where id = p_presupuesto;

  update public.presupuestos
     set estado = 'rechazado'
   where pedido_id = v_pedido
     and id <> p_presupuesto
     and estado = 'enviado';

  update public.pedidos
     set estado = 'adjudicado'
   where id = v_pedido;

  insert into public.trabajos (pedido_id, presupuesto_id, profesional_id, agendado_para)
  values (v_pedido, p_presupuesto, v_profesional, v_disponible)
  returning id into v_trabajo;

  -- La comisión se congela acá, con el valor de hoy. Si mañana
  -- cambia, este trabajo sigue mostrando el que se pactó.
  select valor into v_comision_pct
  from public.configuracion where clave = 'comision_pct';

  insert into public.pagos (trabajo_id, monto_centavos, comision_pct, comision_centavos, estado)
  values (
    v_trabajo,
    v_total,
    v_comision_pct,
    round(v_total * v_comision_pct / 100),
    'retenido'
  );

  return v_trabajo;
end;
$$;

-- Solo los usuarios que entraron con su cuenta pueden llamarla.
revoke all on function public.aceptar_presupuesto(uuid) from public;
grant execute on function public.aceptar_presupuesto(uuid) to authenticated;

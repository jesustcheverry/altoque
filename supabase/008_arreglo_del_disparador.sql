-- ============================================================
--  Arreglo: el admin también vuelve a la cola
--  ------------------------------------------------------------
--  EL ERROR QUE ARREGLAMOS
--  En el 007 el disparador arrancaba así:
--
--      if public.soy_admin() then
--        return new;          -- <-- demasiado ancho
--      end if;
--
--  La excepción existía por un motivo real: la función
--  verificar_profesional() necesita escribir las columnas de
--  verificación, y el disparador se lo impedía.
--
--  Pero eximir al admin de TODO el disparador también lo eximía
--  de la regla de "si tocás los papeles volvés a la cola". Un
--  revisor podía verificarse, cambiarse la matrícula por
--  cualquier cosa, y seguir verificado.
--
--  LA CORRECCIÓN
--  Dos reglas separadas, con alcances distintos:
--    - Tocar las columnas de VERIFICACIÓN: solo el admin.
--    - Tocar los PAPELES tumba la verificación: TODOS.
--
--  CÓMO SE USA: pegar todo en el SQL Editor y Run. No hay nada
--  que completar. Se puede correr dos veces sin problema.
-- ============================================================


-- ------------------------------------------------------------
--  1. La función corregida
-- ------------------------------------------------------------

create or replace function public.verificacion_la_decide_el_admin()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin

  -- ---- Regla 1: el estado de verificación es del revisor ----
  if not public.soy_admin() then
    if new.verificacion    is distinct from old.verificacion
    or new.verificado_el   is distinct from old.verificado_el
    or new.verificado_por  is distinct from old.verificado_por
    or new.motivo_rechazo  is distinct from old.motivo_rechazo then
      raise exception
        'El estado de verificación no lo decide el profesional.';
    end if;
  end if;

  -- ---- Regla 2: los papeles nuevos no vienen verificados ----
  -- Esta va para todos. Nadie debería poder aprobar datos que
  -- todavía no existían cuando los aprobó.
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
--  2. La limpieza, con el disparador apagado a propósito
--  ------------------------------------------------------------
--  POR QUÉ HACE FALTA APAGARLO
--  En el SQL Editor no hay ningún usuario logueado: estás
--  conectado como administrador de la BASE, no como usuario de
--  la APP. Entonces auth.uid() es nulo, soy_admin() da falso, y
--  la Regla 1 frena hasta este update.
--
--  Eso es correcto y no lo vamos a aflojar: la regla no tiene
--  puertas traseras. Para una tarea de mantenimiento como esta,
--  lo honesto es apagar el disparador, hacer el cambio, y
--  volverlo a prender.
-- ------------------------------------------------------------

alter table public.perfiles_profesionales
  disable trigger verificacion_blindada;

update public.perfiles_profesionales
   set verificacion   = 'pendiente',
       verificado_el  = null,
       verificado_por = null,
       motivo_rechazo = null
 where verificacion = 'verificado'
   and persona_id in (select persona_id from public.admins);

alter table public.perfiles_profesionales
  enable trigger verificacion_blindada;


-- ------------------------------------------------------------
--  3. Control
-- ------------------------------------------------------------
--  "pendientes" deberia ser 1 (vos) y "verificados" 0.

select
  count(*) filter (where verificacion = 'pendiente')  as pendientes,
  count(*) filter (where verificacion = 'verificado') as verificados
from public.perfiles_profesionales;

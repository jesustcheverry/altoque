-- ============================================================
--  AlToque · estructura de la base de datos
--  ------------------------------------------------------------
--  Esto es el documento del paso 1 convertido en algo que la
--  computadora entiende. Cada "table" es una de las siete cosas
--  que la app recuerda.
--
--  CÓMO SE USA: copiar todo, pegarlo en el SQL Editor de
--  Supabase y apretar Run. UNA SOLA VEZ. Si lo corrés dos veces
--  va a protestar diciendo que las cosas ya existen, y eso es
--  correcto: no quiere pisar lo que ya está.
-- ============================================================


-- ============================================================
--  1. LISTAS CERRADAS
--  ------------------------------------------------------------
--  Un "type" es una lista de valores permitidos. Si el código
--  intenta guardar un estado que no está en la lista, la base
--  lo rechaza. Es la primera línea de defensa contra los
--  errores de tipeo.
-- ============================================================

create type public.oficio as enum (
  'electricista', 'gasista', 'plomero', 'pintor',
  'albanil', 'cerrajero', 'aire', 'carpintero'
);

create type public.urgencia as enum (
  'urgente',           -- hoy mismo, con recargo
  'esta_semana',       -- se coordina día y franja
  'solo_presupuesto'   -- solo quiere saber cuánto sale
);

-- Los cinco estados del pedido, tal cual el diagrama del paso 1.
create type public.estado_pedido as enum (
  'borrador', 'publicado', 'adjudicado', 'cancelado', 'expirado'
);

create type public.estado_presupuesto as enum (
  'enviado', 'aceptado', 'rechazado', 'reemplazado', 'expirado'
);

-- Los estados del trabajo, también del diagrama.
create type public.estado_trabajo as enum (
  'agendado', 'en_camino', 'en_curso', 'terminado',
  'confirmado', 'pagado', 'cancelado', 'en_disputa'
);

create type public.estado_pago as enum (
  'pendiente', 'retenido', 'liberado', 'reembolsado'
);


-- ============================================================
--  2. QUÉ EXIGE CADA OFICIO
--  ------------------------------------------------------------
--  Acá vive la regla de seguridad que aprobaste: en gas y
--  electricidad la matrícula y el seguro son obligatorios; en
--  pintura o carpintería, no.
--
--  Está como tabla y no escondido en el código a propósito.
--  El día que quieras volverte más o menos exigente, cambiás
--  una fila acá y la app entera obedece al instante, sin tener
--  que publicar una versión nueva.
-- ============================================================

create table public.oficios_config (
  oficio           public.oficio primary key,
  exige_matricula  boolean not null default false,
  exige_seguro     boolean not null default false,
  nombre_visible   text not null
);

insert into public.oficios_config (oficio, exige_matricula, exige_seguro, nombre_visible) values
  ('gasista',      true,  true,  'Gasista'),
  ('electricista', true,  true,  'Electricista'),
  ('aire',         false, true,  'Aire acondicionado'),
  ('plomero',      false, false, 'Plomero'),
  ('pintor',       false, false, 'Pintor'),
  ('albanil',      false, false, 'Albañil'),
  ('cerrajero',    false, false, 'Cerrajero'),
  ('carpintero',   false, false, 'Carpintero');


-- ============================================================
--  3. PERSONA
--  ------------------------------------------------------------
--  Una cuenta. Supabase maneja por su cuenta las contraseñas en
--  una tabla privada llamada auth.users; acá guardamos los
--  datos que sí nos interesan a nosotros.
--
--  Una sola cuenta con dos roles: esta tabla es el "cliente",
--  y quien además trabaje de algo tendrá su fila en
--  perfiles_profesionales.
-- ============================================================

create table public.personas (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text not null,
  telefono   text,
  foto_url   text,
  creada_el  timestamptz not null default now()
);

-- Cuando alguien se registra, Supabase crea la fila en auth.users
-- y este disparador crea automáticamente su fila en personas.
-- Sin esto habría cuentas sin perfil.
create or replace function public.crear_persona_al_registrarse()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.personas (id, nombre)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_persona_al_registrarse();


-- ============================================================
--  4. INMUEBLE
--  ------------------------------------------------------------
--  La casa, el departamento, el local. La decisión clave del
--  paso 1: el pedido cuelga del inmueble, no de la persona, así
--  cada propiedad acumula su historial de arreglos.
-- ============================================================

create table public.inmuebles (
  id             uuid primary key default gen_random_uuid(),
  persona_id     uuid not null references public.personas(id) on delete cascade,
  alias          text not null,              -- "Casa", "Depto de mamá"
  calle          text not null,
  altura         text not null,
  piso           text,
  depto          text,
  barrio         text,
  lat            double precision,           -- guardamos coordenadas desde el
  lng            double precision,           -- día uno: abrir otra ciudad
                                             -- después no requiere tocar nada
  instrucciones  text,                       -- "Portero hasta las 20, timbre 6B"
  tipo           text check (tipo in ('departamento','ph','casa','local','otro')),
  anio           int,
  creado_el      timestamptz not null default now()
);

create index inmuebles_por_persona on public.inmuebles (persona_id);


-- ============================================================
--  5. PERFIL PROFESIONAL
--  ------------------------------------------------------------
--  Lo que convierte a una persona en profesional habilitado.
--  Una misma persona puede tener más de un oficio (hay gasistas
--  que también son plomeros), pero no dos veces el mismo.
-- ============================================================

create table public.perfiles_profesionales (
  id              uuid primary key default gen_random_uuid(),
  persona_id      uuid not null references public.personas(id) on delete cascade,
  oficio          public.oficio not null,
  matricula_nro   text,
  matricula_vence date,
  seguro_vence    date,
  cuit            text,                      -- lo pedimos desde ahora aunque la
                                             -- facturación venga después
  zonas           text[] not null default '{}',
  radio_km        int not null default 3,
  bio             text,
  activo          boolean not null default false,
  creado_el       timestamptz not null default now(),
  unique (persona_id, oficio)
);

create index perfiles_por_oficio on public.perfiles_profesionales (oficio);

-- LA REGLA DE SEGURIDAD, HECHA CÓDIGO.
-- Esta vista es la lista de profesionales que pueden recibir
-- pedidos. Si a un gasista se le vence la matrícula o el seguro,
-- desaparece de acá solo, sin que nadie revise nada a mano.
-- La app siempre pregunta por esta vista, nunca por la tabla.
create view public.profesionales_habilitados as
select pp.*
from public.perfiles_profesionales pp
join public.oficios_config oc on oc.oficio = pp.oficio
where pp.activo
  and (not oc.exige_matricula
       or (pp.matricula_nro is not null and pp.matricula_vence >= current_date))
  and (not oc.exige_seguro
       or pp.seguro_vence >= current_date);


-- ============================================================
--  6. PEDIDO
--  ------------------------------------------------------------
--  El problema que alguien tiene en su casa.
-- ============================================================

create table public.pedidos (
  id             uuid primary key default gen_random_uuid(),
  inmueble_id    uuid not null references public.inmuebles(id) on delete restrict,
  oficio         public.oficio not null,
  descripcion    text not null,
  urgencia       public.urgencia not null default 'esta_semana',
  franja_horaria text,
  estado         public.estado_pedido not null default 'borrador',
  publicado_el   timestamptz,
  vence_el       timestamptz,                -- 48 h después de publicarse
  creado_el      timestamptz not null default now()
);

create index pedidos_abiertos on public.pedidos (oficio, estado) where estado = 'publicado';

-- "on delete restrict" es la regla 5 en acción: la base se niega
-- físicamente a borrar un inmueble que tenga pedidos. Nada se
-- borra; las cosas se cancelan.

create table public.pedido_fotos (
  id         uuid primary key default gen_random_uuid(),
  pedido_id  uuid not null references public.pedidos(id) on delete cascade,
  url        text not null,
  orden      int not null default 0
);


-- ============================================================
--  7. PRESUPUESTO
--  ------------------------------------------------------------
--  La respuesta de un profesional a un pedido.
--
--  Los montos van en CENTAVOS y como números enteros. Nunca con
--  decimales: sumando miles de operaciones, los decimales dan
--  resultados apenas distintos del correcto, y en plata "apenas
--  distinto" es un problema.
-- ============================================================

create table public.presupuestos (
  id                  uuid primary key default gen_random_uuid(),
  pedido_id           uuid not null references public.pedidos(id) on delete cascade,
  profesional_id      uuid not null references public.perfiles_profesionales(id) on delete restrict,
  mano_obra_centavos  bigint not null check (mano_obra_centavos >= 0),
  repuestos_centavos  bigint not null default 0 check (repuestos_centavos >= 0),
  total_centavos      bigint generated always as (mano_obra_centavos + repuestos_centavos) stored,
  moneda              text not null default 'ARS',
  incluye             text[] not null default '{}',
  mensaje             text,
  disponible_el       timestamptz,
  estado              public.estado_presupuesto not null default 'enviado',
  enviado_el          timestamptz not null default now(),
  unique (pedido_id, profesional_id, enviado_el)
);

create index presupuestos_por_pedido on public.presupuestos (pedido_id);

-- REGLA 1: un pedido puede tener muchos presupuestos, pero sólo
-- UNO aceptado. Esto no es una validación de pantalla que se
-- pueda esquivar: la base directamente no admite un segundo.
create unique index presupuesto_aceptado_unico
  on public.presupuestos (pedido_id)
  where estado = 'aceptado';

-- REGLA 2: un presupuesto enviado no se edita nunca. Lo único
-- que puede cambiar es su estado. Si el profesional se
-- equivocó, manda uno nuevo y el viejo queda 'reemplazado'.
-- Sin esto, en una disputa no hay forma de saber qué se prometió.
create or replace function public.presupuesto_inmutable()
returns trigger
language plpgsql
as $$
begin
  if (new.pedido_id, new.profesional_id, new.mano_obra_centavos,
      new.repuestos_centavos, new.moneda, new.incluye, new.mensaje)
     is distinct from
     (old.pedido_id, old.profesional_id, old.mano_obra_centavos,
      old.repuestos_centavos, old.moneda, old.incluye, old.mensaje)
  then
    raise exception 'Un presupuesto enviado no se edita. Enviá uno nuevo; el anterior queda como reemplazado.';
  end if;
  return new;
end;
$$;

create trigger presupuestos_no_se_editan
  before update on public.presupuestos
  for each row execute function public.presupuesto_inmutable();


-- ============================================================
--  8. TRABAJO
--  ------------------------------------------------------------
--  Nace cuando el cliente acepta un presupuesto. Un pedido da
--  como mucho un trabajo, y un presupuesto da como mucho uno:
--  por eso los dos son "unique".
-- ============================================================

create table public.trabajos (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid not null unique references public.pedidos(id) on delete restrict,
  presupuesto_id  uuid not null unique references public.presupuestos(id) on delete restrict,
  profesional_id  uuid not null references public.perfiles_profesionales(id) on delete restrict,
  agendado_para   timestamptz,
  estado          public.estado_trabajo not null default 'agendado',
  en_camino_el    timestamptz,
  empezo_el       timestamptz,
  termino_el      timestamptz,
  confirmado_el   timestamptz,
  certificado_url text,
  creado_el       timestamptz not null default now()
);

create index trabajos_por_profesional on public.trabajos (profesional_id, estado);


-- ============================================================
--  9. PAGO
--  ------------------------------------------------------------
--  REGLA 4: la comisión se guarda congelada en cada pago. Si el
--  mes que viene pasás de 12 % a 15 %, los trabajos viejos
--  siguen mostrando 12 %. Los números históricos jamás se
--  recalculan.
-- ============================================================

create table public.pagos (
  id                 uuid primary key default gen_random_uuid(),
  trabajo_id         uuid not null unique references public.trabajos(id) on delete restrict,
  monto_centavos     bigint not null check (monto_centavos >= 0),
  moneda             text not null default 'ARS',
  comision_pct       numeric(5,2) not null,
  comision_centavos  bigint not null check (comision_centavos >= 0),
  estado             public.estado_pago not null default 'pendiente',
  metodo             text,
  referencia_externa text,                  -- el id que devuelve Mercado Pago
  liberado_el        timestamptz,
  creado_el          timestamptz not null default now()
);


-- ============================================================
--  10. RESEÑA
-- ============================================================

create table public.resenas (
  id            uuid primary key default gen_random_uuid(),
  trabajo_id    uuid not null unique references public.trabajos(id) on delete restrict,
  autor_id      uuid not null references public.personas(id) on delete restrict,
  estrellas     int not null check (estrellas between 1 and 5),
  texto         text,
  publicada_el  timestamptz not null default now()
);


-- ============================================================
--  11. EVENTOS
--  ------------------------------------------------------------
--  Cada cambio de estado queda anotado con quién y cuándo. Esto
--  es lo que permite resolver un reclamo sin que sea la palabra
--  de uno contra la del otro. Agregarlo después obligaría a
--  rehacer las tablas, por eso está desde el día uno.
-- ============================================================

create table public.eventos (
  id              bigserial primary key,
  entidad         text not null,            -- 'pedido', 'trabajo', 'pago'
  entidad_id      uuid not null,
  estado_anterior text,
  estado_nuevo    text not null,
  actor_id        uuid references public.personas(id),
  ocurrio_el      timestamptz not null default now()
);

create index eventos_por_entidad on public.eventos (entidad, entidad_id, ocurrio_el);

create or replace function public.anotar_cambio_de_estado()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.estado is not distinct from old.estado then
    return new;
  end if;

  insert into public.eventos (entidad, entidad_id, estado_anterior, estado_nuevo, actor_id)
  values (
    tg_argv[0],
    new.id,
    case when tg_op = 'UPDATE' then old.estado::text else null end,
    new.estado::text,
    auth.uid()
  );
  return new;
end;
$$;

create trigger anotar_pedido
  after insert or update on public.pedidos
  for each row execute function public.anotar_cambio_de_estado('pedido');

create trigger anotar_trabajo
  after insert or update on public.trabajos
  for each row execute function public.anotar_cambio_de_estado('trabajo');

create trigger anotar_pago
  after insert or update on public.pagos
  for each row execute function public.anotar_cambio_de_estado('pago');


-- ============================================================
--  12. QUIÉN PUEDE VER Y TOCAR QUÉ
--  ------------------------------------------------------------
--  Esta es la parte más importante del archivo.
--
--  La base de datos es accesible desde internet. Si no
--  pusiéramos estas reglas, cualquiera con la clave pública de
--  la app podría leer los pedidos, las direcciones y los
--  teléfonos de todos tus usuarios.
--
--  "Row Level Security" significa que las reglas viven en la
--  base, no en las pantallas. Aunque alguien manipule la app o
--  llame a la base directamente, no puede ver una fila que no
--  le corresponde. Es la regla 7 del paso 1.
-- ============================================================

alter table public.personas               enable row level security;
alter table public.inmuebles              enable row level security;
alter table public.perfiles_profesionales enable row level security;
alter table public.pedidos                enable row level security;
alter table public.pedido_fotos           enable row level security;
alter table public.presupuestos           enable row level security;
alter table public.trabajos               enable row level security;
alter table public.pagos                  enable row level security;
alter table public.resenas                enable row level security;
alter table public.eventos                enable row level security;
alter table public.oficios_config         enable row level security;

-- auth.uid() es "quién está pidiendo esto". Lo resuelve Supabase
-- a partir del token de sesión; no se puede falsear desde la app.

-- --- Persona: cada uno ve y edita lo suyo ---
create policy "veo mi persona" on public.personas
  for select using (id = auth.uid());
create policy "edito mi persona" on public.personas
  for update using (id = auth.uid());

-- --- Inmuebles: privados del dueño ---
create policy "mis inmuebles" on public.inmuebles
  for all using (persona_id = auth.uid()) with check (persona_id = auth.uid());

-- --- Perfiles profesionales: el dueño manda; el resto sólo ve los activos ---
create policy "mi perfil profesional" on public.perfiles_profesionales
  for all using (persona_id = auth.uid()) with check (persona_id = auth.uid());
create policy "los perfiles activos son publicos" on public.perfiles_profesionales
  for select using (activo);

-- --- La tabla de configuración de oficios la puede leer cualquiera ---
create policy "config visible" on public.oficios_config
  for select using (true);

-- Funciones de ayuda, para no repetir la misma consulta en cada regla.
create or replace function public.soy_duenio_del_pedido(p_pedido uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.pedidos p
    join public.inmuebles i on i.id = p.inmueble_id
    where p.id = p_pedido and i.persona_id = auth.uid()
  );
$$;

create or replace function public.es_mi_perfil_profesional(p_perfil uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.perfiles_profesionales pp
    where pp.id = p_perfil and pp.persona_id = auth.uid()
  );
$$;

-- --- Pedidos ---
-- El dueño hace lo que quiera con los suyos.
create policy "mis pedidos" on public.pedidos
  for all using (soy_duenio_del_pedido(id))
  with check (exists (
    select 1 from public.inmuebles i
    where i.id = inmueble_id and i.persona_id = auth.uid()
  ));

-- Un profesional HABILITADO ve los pedidos publicados de su oficio.
-- Notá que pregunta por la vista, no por la tabla: al que se le
-- venció la matrícula deja de ver trabajo automáticamente.
create policy "pedidos abiertos de mi oficio" on public.pedidos
  for select using (
    estado = 'publicado'
    and exists (
      select 1 from public.profesionales_habilitados ph
      where ph.persona_id = auth.uid() and ph.oficio = pedidos.oficio
    )
  );

create policy "fotos del pedido" on public.pedido_fotos
  for select using (
    soy_duenio_del_pedido(pedido_id)
    or exists (
      select 1 from public.pedidos p
      join public.profesionales_habilitados ph on ph.oficio = p.oficio
      where p.id = pedido_id and p.estado = 'publicado' and ph.persona_id = auth.uid()
    )
  );
create policy "subo fotos a mis pedidos" on public.pedido_fotos
  for insert with check (soy_duenio_del_pedido(pedido_id));

-- --- Presupuestos ---
create policy "veo los presupuestos de mis pedidos" on public.presupuestos
  for select using (soy_duenio_del_pedido(pedido_id));
create policy "veo los presupuestos que mande" on public.presupuestos
  for select using (es_mi_perfil_profesional(profesional_id));
create policy "mando presupuestos" on public.presupuestos
  for insert with check (
    es_mi_perfil_profesional(profesional_id)
    and exists (select 1 from public.pedidos p where p.id = pedido_id and p.estado = 'publicado')
  );
-- Aceptar o rechazar lo hace el dueño del pedido.
create policy "decido sobre los presupuestos de mis pedidos" on public.presupuestos
  for update using (soy_duenio_del_pedido(pedido_id));

-- --- Trabajos, pagos y reseñas: sólo las dos partes ---
create policy "mis trabajos" on public.trabajos
  for select using (
    soy_duenio_del_pedido(pedido_id) or es_mi_perfil_profesional(profesional_id)
  );
create policy "avanzo mis trabajos" on public.trabajos
  for update using (
    soy_duenio_del_pedido(pedido_id) or es_mi_perfil_profesional(profesional_id)
  );

create policy "mis pagos" on public.pagos
  for select using (
    exists (
      select 1 from public.trabajos t
      where t.id = trabajo_id
        and (soy_duenio_del_pedido(t.pedido_id) or es_mi_perfil_profesional(t.profesional_id))
    )
  );

-- Las reseñas son públicas a propósito: son el motivo por el que
-- alguien elige a un profesional y no a otro.
create policy "las resenas son publicas" on public.resenas
  for select using (true);
create policy "califico mis trabajos" on public.resenas
  for insert with check (
    autor_id = auth.uid() and soy_duenio_del_pedido(
      (select t.pedido_id from public.trabajos t where t.id = trabajo_id)
    )
  );

-- Los eventos se leen, no se escriben desde la app: los escriben
-- los disparadores de más arriba.
create policy "veo los eventos de lo mio" on public.eventos
  for select using (actor_id = auth.uid());

-- ============================================================
--  Archivos: fotos de los pedidos y documentos de los profesionales
--  ------------------------------------------------------------
--  Supabase guarda los archivos aparte de las tablas, en lo que
--  llama "buckets". Un bucket es como una carpeta grande.
--
--  Los dos que creamos acá son PRIVADOS. Eso significa que un
--  archivo no se puede ver pegando su dirección en el navegador:
--  hay que pedirle permiso a la base cada vez. Para fotos de
--  adentro de la casa de alguien, y para documentos con números
--  de matrícula, no hay otra opción razonable.
--
--  CÓMO SE USA: pegar todo en el SQL Editor de Supabase y Run.
-- ============================================================


-- ------------------------------------------------------------
--  Los dos buckets
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pedidos', 'pedidos', false,
  10485760,                                    -- 10 MB por archivo
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos', 'documentos', false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do nothing;


-- ------------------------------------------------------------
--  Quién puede subir y ver qué
--  ------------------------------------------------------------
--  Los archivos se guardan con un camino tipo
--    pedidos/<id del pedido>/foto1.jpg
--    documentos/<id de la persona>/matricula.jpg
--
--  storage.foldername(name) parte ese camino en pedazos, y
--  nosotros usamos el primero para saber de quién es el archivo.
-- ------------------------------------------------------------

-- --- Fotos de pedidos ---

drop policy if exists "subo fotos a mis pedidos" on storage.objects;
create policy "subo fotos a mis pedidos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'pedidos'
    and public.soy_duenio_del_pedido(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "borro fotos de mis pedidos" on storage.objects;
create policy "borro fotos de mis pedidos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'pedidos'
    and public.soy_duenio_del_pedido(((storage.foldername(name))[1])::uuid)
  );

-- Las ve el dueño del pedido, y también los profesionales
-- habilitados en ese oficio mientras el pedido esté abierto.
-- Esa es toda la gracia: el gasista diagnostica mirando la foto.
drop policy if exists "veo las fotos que me corresponden" on storage.objects;
create policy "veo las fotos que me corresponden" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'pedidos'
    and (
      public.soy_duenio_del_pedido(((storage.foldername(name))[1])::uuid)
      or exists (
        select 1
        from public.pedidos p
        join public.profesionales_habilitados ph on ph.oficio = p.oficio
        where p.id = ((storage.foldername(name))[1])::uuid
          and p.estado = 'publicado'
          and ph.persona_id = auth.uid()
      )
    )
  );

-- --- Documentos de profesionales ---
-- Por ahora, solo el dueño. Cuando armemos el panel para
-- revisarlos a mano, le agregamos una regla para ese rol.

drop policy if exists "manejo mis documentos" on storage.objects;
create policy "manejo mis documentos" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

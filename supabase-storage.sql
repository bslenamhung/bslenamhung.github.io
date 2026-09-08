-- BS LÊ NAM HÙNG - STORAGE CHO ẢNH BÁC SĨ
-- Chạy 1 lần trong Supabase SQL Editor sau khi đã có bảng site_content.
insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Admins can upload site media" on storage.objects;
create policy "Admins can upload site media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'site-media' and public.is_admin());

drop policy if exists "Admins can update site media" on storage.objects;
create policy "Admins can update site media"
on storage.objects for update
to authenticated
using (bucket_id = 'site-media' and public.is_admin())
with check (bucket_id = 'site-media' and public.is_admin());

drop policy if exists "Admins can delete site media" on storage.objects;
create policy "Admins can delete site media"
on storage.objects for delete
to authenticated
using (bucket_id = 'site-media' and public.is_admin());

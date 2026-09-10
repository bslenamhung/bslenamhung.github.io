-- BS LÊ NAM HÙNG - SECURITY HARDENING V45.1
-- Mục tiêu: bảo vệ Admin + RLS + public content + Storage + lượt xem.
-- Chạy sau khi đã có public.admin_users và đã thêm tài khoản quản trị.
-- KHÔNG chứa secret/service-role key.

begin;

-- ============================================================
-- 1) ADMIN USERS
-- ============================================================
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on table public.admin_users from anon, authenticated;
grant select on table public.admin_users to authenticated;

drop policy if exists "Admins can read own admin record" on public.admin_users;
create policy "Admins can read own admin record"
on public.admin_users
for select to authenticated
using ((select auth.uid()) = user_id);

create index if not exists idx_admin_users_user_id on public.admin_users(user_id);

-- ============================================================
-- 2) SITE CONTENT: chỉ Admin được đọc/ghi dữ liệu gốc
-- ============================================================
alter table public.site_content enable row level security;
revoke all on table public.site_content from anon, authenticated;
grant select, insert, update, delete on table public.site_content to authenticated;

drop policy if exists "Public can read site content" on public.site_content;
drop policy if exists "Admins can read site content" on public.site_content;
drop policy if exists "Admins can insert site content" on public.site_content;
drop policy if exists "Admins can update site content" on public.site_content;
drop policy if exists "Admins can delete site content" on public.site_content;

create policy "Admins can read site content"
on public.site_content for select to authenticated
using (exists (select 1 from public.admin_users au where au.user_id = (select auth.uid())));

create policy "Admins can insert site content"
on public.site_content for insert to authenticated
with check (exists (select 1 from public.admin_users au where au.user_id = (select auth.uid())));

create policy "Admins can update site content"
on public.site_content for update to authenticated
using (exists (select 1 from public.admin_users au where au.user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users au where au.user_id = (select auth.uid())));

create policy "Admins can delete site content"
on public.site_content for delete to authenticated
using (exists (select 1 from public.admin_users au where au.user_id = (select auth.uid())));

-- ============================================================
-- 3) PUBLIC CONTENT: chỉ đọc, không có bản nháp
-- ============================================================
create table if not exists public.site_content_public (
  id integer primary key check (id = 1),
  content jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.site_content_public enable row level security;
revoke all on table public.site_content_public from anon, authenticated;
grant select on table public.site_content_public to anon, authenticated;

drop policy if exists "Public can read published site content" on public.site_content_public;
create policy "Public can read published site content"
on public.site_content_public for select to anon, authenticated
using (true);

-- ============================================================
-- 4) ĐỒNG BỘ site_content -> site_content_public
-- ============================================================
create schema if not exists private;

create or replace function private.sync_site_content_public()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_public_content jsonb;
begin
  v_public_content := jsonb_set(
    coalesce(new.content, '{}'::jsonb),
    '{articles}',
    coalesce(
      (
        select jsonb_agg(x.value order by x.ordinality)
        from jsonb_array_elements(coalesce(new.content->'articles','[]'::jsonb))
          with ordinality as x(value, ordinality)
        where coalesce(x.value->>'published','true') <> 'false'
      ),
      '[]'::jsonb
    ),
    true
  );

  insert into public.site_content_public(id, content, updated_at)
  values (new.id, v_public_content, coalesce(new.updated_at, pg_catalog.now()))
  on conflict (id) do update
    set content = excluded.content,
        updated_at = excluded.updated_at;
  return new;
end;
$$;

revoke all on function private.sync_site_content_public() from public, anon, authenticated;
drop trigger if exists trg_sync_site_content_public on public.site_content;
create trigger trg_sync_site_content_public
after insert or update of content, updated_at
on public.site_content
for each row execute function private.sync_site_content_public();

-- Đồng bộ dữ liệu hiện tại.
insert into public.site_content_public(id, content, updated_at)
select
  s.id,
  jsonb_set(
    coalesce(s.content, '{}'::jsonb),
    '{articles}',
    coalesce(
      (
        select jsonb_agg(x.value order by x.ordinality)
        from jsonb_array_elements(coalesce(s.content->'articles','[]'::jsonb))
          with ordinality as x(value, ordinality)
        where coalesce(x.value->>'published','true') <> 'false'
      ),
      '[]'::jsonb
    ),
    true
  ),
  s.updated_at
from public.site_content s
where s.id = 1
on conflict (id) do update
set content = excluded.content,
    updated_at = excluded.updated_at;

-- ============================================================
-- 5) LOẠI BỎ helper is_admin cũ (không còn cần)
-- ============================================================
drop policy if exists "Admins can upload site media" on storage.objects;
drop policy if exists "Admins can update site media" on storage.objects;
drop policy if exists "Admins can delete site media" on storage.objects;
drop policy if exists "Admins can read site media metadata" on storage.objects;
revoke all on function public.is_admin() from public, anon, authenticated;
drop function if exists public.is_admin();

-- ============================================================
-- 6) STORAGE: bucket công khai để khách xem ảnh; chỉ Admin được ghi/xóa
-- ============================================================
update storage.buckets
set public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']::text[]
where id = 'site-media';

alter table storage.objects enable row level security;
revoke all on table storage.objects from anon, authenticated;
grant select, insert, update, delete on table storage.objects to authenticated;

drop policy if exists "Admins can read site media metadata" on storage.objects;
drop policy if exists "Admins can upload site media" on storage.objects;
drop policy if exists "Admins can update site media" on storage.objects;
drop policy if exists "Admins can delete site media" on storage.objects;

create policy "Admins can read site media metadata"
on storage.objects for select to authenticated
using (bucket_id='site-media' and exists (select 1 from public.admin_users au where au.user_id=(select auth.uid())));

create policy "Admins can upload site media"
on storage.objects for insert to authenticated
with check (bucket_id='site-media' and exists (select 1 from public.admin_users au where au.user_id=(select auth.uid())));

create policy "Admins can update site media"
on storage.objects for update to authenticated
using (bucket_id='site-media' and exists (select 1 from public.admin_users au where au.user_id=(select auth.uid())))
with check (bucket_id='site-media' and exists (select 1 from public.admin_users au where au.user_id=(select auth.uid())));

create policy "Admins can delete site media"
on storage.objects for delete to authenticated
using (bucket_id='site-media' and exists (select 1 from public.admin_users au where au.user_id=(select auth.uid())));

-- ============================================================
-- 7) LƯỢT XEM BÀI: chỉ ghi qua RPC và chỉ bài đã xuất bản
-- ============================================================
alter table public.article_view_stats enable row level security;
revoke insert, update, delete on table public.article_view_stats from anon, authenticated;
grant select on table public.article_view_stats to anon, authenticated;

create or replace function public.record_article_view(p_article_id text, p_title text default '')
returns public.article_view_stats
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.article_view_stats;
  v_exists boolean;
begin
  if pg_catalog.coalesce(pg_catalog.length(pg_catalog.btrim(p_article_id)),0)=0 then
    raise exception 'article_id is required';
  end if;
  if pg_catalog.length(p_article_id)>200 then
    raise exception 'article_id is too long';
  end if;
  if pg_catalog.length(pg_catalog.coalesce(p_title,''))>500 then
    raise exception 'title is too long';
  end if;

  select exists(
    select 1
    from public.site_content_public s
    cross join jsonb_array_elements(coalesce(s.content->'articles','[]'::jsonb)) a(value)
    where s.id=1 and a.value->>'id'=p_article_id
  ) into v_exists;

  if not v_exists then
    return null;
  end if;

  insert into public.article_view_stats(article_id,title,view_count,updated_at)
  values(p_article_id,pg_catalog.coalesce(p_title,''),1,pg_catalog.now())
  on conflict(article_id) do update
    set view_count=public.article_view_stats.view_count+1,
        title=case when pg_catalog.btrim(pg_catalog.coalesce(excluded.title,''))<>'' then excluded.title else public.article_view_stats.title end,
        updated_at=pg_catalog.now();

  select * into v_row from public.article_view_stats where article_id=p_article_id;
  return v_row;
end;
$$;

revoke all on function public.record_article_view(text,text) from public, anon, authenticated;
grant execute on function public.record_article_view(text,text) to anon, authenticated;

-- ============================================================
-- 8) LƯỢT TRUY CẬP SITE: function SECURITY DEFINER với search_path an toàn
-- ============================================================
alter table public.site_visit_stats enable row level security;
revoke insert, update, delete on table public.site_visit_stats from anon, authenticated;
grant select on table public.site_visit_stats to anon, authenticated;

create or replace function public.record_site_visit()
returns public.site_visit_stats
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := pg_catalog.timezone('Asia/Ho_Chi_Minh', pg_catalog.now())::date;
  v_month text := pg_catalog.to_char(pg_catalog.timezone('Asia/Ho_Chi_Minh', pg_catalog.now()), 'YYYY-MM');
  v_row public.site_visit_stats;
begin
  insert into public.site_visit_stats(id,total_visits,today_visits,month_visits,today_key,month_key)
  values(1,0,0,0,v_today,v_month)
  on conflict(id) do nothing;

  select * into v_row from public.site_visit_stats where id=1 for update;
  if v_row.today_key<>v_today then
    v_row.today_visits:=0; v_row.today_key:=v_today;
  end if;
  if v_row.month_key<>v_month then
    v_row.month_visits:=0; v_row.month_key:=v_month;
  end if;

  v_row.total_visits:=v_row.total_visits+1;
  v_row.today_visits:=v_row.today_visits+1;
  v_row.month_visits:=v_row.month_visits+1;
  v_row.updated_at:=pg_catalog.now();

  update public.site_visit_stats set
    total_visits=v_row.total_visits,
    today_visits=v_row.today_visits,
    month_visits=v_row.month_visits,
    today_key=v_row.today_key,
    month_key=v_row.month_key,
    updated_at=v_row.updated_at
  where id=1
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.record_site_visit() from public, anon, authenticated;
grant execute on function public.record_site_visit() to anon, authenticated;

commit;

-- ============================================================
-- 9) KIỂM TRA NHANH SAU KHI CHẠY
-- ============================================================
select 'admin_users' as check_name, count(*) as rows from public.admin_users;
select 'site_content_public' as check_name, count(*) as rows from public.site_content_public;
select 'published_articles_in_public' as check_name,
       jsonb_array_length(coalesce(content->'articles','[]'::jsonb)) as rows
from public.site_content_public where id=1;

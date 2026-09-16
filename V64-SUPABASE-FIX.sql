-- V64 - FIX ĐỒNG BỘ NỘI DUNG CÔNG KHAI + LƯỢT XEM BÀI
-- Chạy 1 lần trong Supabase SQL Editor.
-- Không chứa service_role key.

create table if not exists public.site_content_public (
  id integer primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_content_public enable row level security;
revoke all on public.site_content_public from anon, authenticated;
grant select on public.site_content_public to anon, authenticated;

drop policy if exists "Public can read published site content" on public.site_content_public;
create policy "Public can read published site content"
on public.site_content_public for select to anon, authenticated using (true);

create schema if not exists private;

create or replace function private.sync_site_content_public()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_public_content jsonb;
begin
  v_public_content := pg_catalog.jsonb_set(
    pg_catalog.coalesce(new.content,'{}'::jsonb), '{articles}',
    pg_catalog.coalesce((
      select pg_catalog.jsonb_agg(x.value order by x.ordinality)
      from pg_catalog.jsonb_array_elements(pg_catalog.coalesce(new.content->'articles','[]'::jsonb)) with ordinality as x(value,ordinality)
      where pg_catalog.coalesce(x.value->>'published','true') <> 'false'
    ), '[]'::jsonb), true);
  insert into public.site_content_public(id,content,updated_at)
  values(new.id,v_public_content,pg_catalog.coalesce(new.updated_at,pg_catalog.now()))
  on conflict(id) do update set content=excluded.content,updated_at=excluded.updated_at;
  return new;
end;
$$;
revoke all on function private.sync_site_content_public() from public,anon,authenticated;
drop trigger if exists trg_sync_site_content_public on public.site_content;
create trigger trg_sync_site_content_public
after insert or update of content,updated_at on public.site_content
for each row execute function private.sync_site_content_public();

-- Đồng bộ ngay dữ liệu hiện tại.
insert into public.site_content_public(id,content,updated_at)
select s.id,
       pg_catalog.jsonb_set(
         pg_catalog.coalesce(s.content,'{}'::jsonb), '{articles}',
         pg_catalog.coalesce((
           select pg_catalog.jsonb_agg(x.value order by x.ordinality)
           from pg_catalog.jsonb_array_elements(pg_catalog.coalesce(s.content->'articles','[]'::jsonb)) with ordinality as x(value,ordinality)
           where pg_catalog.coalesce(x.value->>'published','true') <> 'false'
         ),'[]'::jsonb), true),
       s.updated_at
from public.site_content s where s.id=1
on conflict(id) do update set content=excluded.content,updated_at=excluded.updated_at;

-- Bảng lượt xem.
create table if not exists public.article_view_stats (
  article_id text primary key,
  title text not null default '',
  view_count bigint not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.article_view_stats enable row level security;
revoke insert,update,delete on public.article_view_stats from anon,authenticated;
grant select on public.article_view_stats to anon,authenticated;

drop policy if exists "Public can read article view stats" on public.article_view_stats;
create policy "Public can read article view stats"
on public.article_view_stats for select to anon,authenticated using (true);

-- Ghi lượt xem chỉ khi ID tồn tại trong nội dung đã xuất bản ở site_content.
-- Dùng site_content thay vì site_content_public để lượt xem vẫn hoạt động ngay cả khi bảng public chưa kịp đồng bộ.
create or replace function public.record_article_view(p_article_id text,p_title text default '')
returns public.article_view_stats
language plpgsql
security definer
set search_path=''
as $$
declare v_row public.article_view_stats; v_exists boolean;
begin
  if pg_catalog.coalesce(pg_catalog.length(pg_catalog.btrim(p_article_id)),0)=0 then raise exception 'article_id is required'; end if;
  if pg_catalog.length(p_article_id)>200 then raise exception 'article_id is too long'; end if;
  if pg_catalog.length(pg_catalog.coalesce(p_title,''))>500 then raise exception 'title is too long'; end if;

  select exists(
    select 1 from public.site_content s
    cross join pg_catalog.jsonb_array_elements(pg_catalog.coalesce(s.content->'articles','[]'::jsonb)) a(value)
    where s.id=1 and a.value->>'id'=p_article_id and pg_catalog.coalesce(a.value->>'published','true') <> 'false'
  ) into v_exists;

  -- Hỗ trợ các bài cũ chưa có trường id: dùng ID legacy-... do website tạo từ tiêu đề.
  if not v_exists and pg_catalog.left(p_article_id,7)='legacy-' then
    select exists(
      select 1 from public.site_content s
      cross join pg_catalog.jsonb_array_elements(pg_catalog.coalesce(s.content->'articles','[]'::jsonb)) a(value)
      where s.id=1 and pg_catalog.coalesce(a.value->>'published','true') <> 'false'
        and ('legacy-' || to_hex(pg_catalog.hashtextextended(pg_catalog.coalesce(a.value->>'title',''),2166136261))) = p_article_id
    ) into v_exists;
  end if;

  if not v_exists then return null; end if;

  insert into public.article_view_stats(article_id,title,view_count,updated_at)
  values(p_article_id,pg_catalog.coalesce(p_title,''),1,pg_catalog.now())
  on conflict(article_id) do update set
    view_count=public.article_view_stats.view_count+1,
    title=case when pg_catalog.btrim(pg_catalog.coalesce(excluded.title,''))<>'' then excluded.title else public.article_view_stats.title end,
    updated_at=pg_catalog.now();
  select * into v_row from public.article_view_stats where article_id=p_article_id;
  return v_row;
end;
$$;
revoke all on function public.record_article_view(text,text) from public;
grant execute on function public.record_article_view(text,text) to anon,authenticated;

-- Đảm bảo bộ đếm website tồn tại và RPC có quyền.
create table if not exists public.site_visit_stats (
  id integer primary key check(id=1), total_visits bigint not null default 0,
  today_visits bigint not null default 0, month_visits bigint not null default 0,
  today_key date not null default (timezone('Asia/Ho_Chi_Minh',now())::date),
  month_key text not null default to_char(timezone('Asia/Ho_Chi_Minh',now()),'YYYY-MM'), updated_at timestamptz not null default now()
);
insert into public.site_visit_stats(id) values(1) on conflict(id) do nothing;
alter table public.site_visit_stats enable row level security;
revoke all on public.site_visit_stats from anon,authenticated;
grant select on public.site_visit_stats to anon,authenticated;
drop policy if exists "Public can read visit stats" on public.site_visit_stats;
create policy "Public can read visit stats" on public.site_visit_stats for select to anon,authenticated using(true);

create or replace function public.record_site_visit()
returns public.site_visit_stats language plpgsql security definer set search_path=public as $$
declare v_today date:=timezone('Asia/Ho_Chi_Minh',now())::date; v_month text:=to_char(timezone('Asia/Ho_Chi_Minh',now()),'YYYY-MM'); v_row public.site_visit_stats;
begin
 select * into v_row from public.site_visit_stats where id=1 for update;
 if v_row.today_key<>v_today then v_row.today_visits:=0;v_row.today_key:=v_today;end if;
 if v_row.month_key<>v_month then v_row.month_visits:=0;v_row.month_key:=v_month;end if;
 v_row.total_visits:=v_row.total_visits+1;v_row.today_visits:=v_row.today_visits+1;v_row.month_visits:=v_row.month_visits+1;v_row.updated_at:=now();
 update public.site_visit_stats set total_visits=v_row.total_visits,today_visits=v_row.today_visits,month_visits=v_row.month_visits,today_key=v_row.today_key,month_key=v_row.month_key,updated_at=v_row.updated_at where id=1 returning * into v_row;
 return v_row;
end;$$;
revoke all on function public.record_site_visit() from public;
grant execute on function public.record_site_visit() to anon,authenticated;

-- Kiểm tra sau khi chạy.
select id, jsonb_array_length(coalesce(content->'articles','[]'::jsonb)) as published_articles from public.site_content_public where id=1;
select * from public.site_visit_stats where id=1;
select count(*) as article_view_rows, coalesce(sum(view_count),0) as total_article_views from public.article_view_stats;

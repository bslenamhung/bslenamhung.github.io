-- ==========================================================
-- BS LÊ NAM HÙNG - THỐNG KÊ LƯỢT TRUY CẬP
-- Chạy 1 lần trong Supabase -> SQL Editor
-- Mỗi trình duyệt chỉ được tính tối đa 1 lượt/ngày.
-- ==========================================================

create table if not exists public.site_visit_stats (
  id integer primary key check (id = 1),
  total_visits bigint not null default 0,
  today_visits bigint not null default 0,
  month_visits bigint not null default 0,
  today_key date not null default (timezone('Asia/Ho_Chi_Minh', now())::date),
  month_key text not null default to_char(timezone('Asia/Ho_Chi_Minh', now()), 'YYYY-MM')::text,
  updated_at timestamptz not null default now()
);

insert into public.site_visit_stats (id, total_visits, today_visits, month_visits, today_key, month_key)
values (1, 0, 0, 0, timezone('Asia/Ho_Chi_Minh', now())::date, to_char(timezone('Asia/Ho_Chi_Minh', now()), 'YYYY-MM'))
on conflict (id) do nothing;

alter table public.site_visit_stats enable row level security;

drop policy if exists "Public can read visit stats" on public.site_visit_stats;
create policy "Public can read visit stats"
on public.site_visit_stats for select
to anon, authenticated
using (true);

revoke all on table public.site_visit_stats from anon, authenticated;
grant select on table public.site_visit_stats to anon, authenticated;

create or replace function public.record_site_visit()
returns public.site_visit_stats
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := timezone('Asia/Ho_Chi_Minh', now())::date;
  v_month text := to_char(timezone('Asia/Ho_Chi_Minh', now()), 'YYYY-MM');
  v_row public.site_visit_stats;
begin
  insert into public.site_visit_stats (id, total_visits, today_visits, month_visits, today_key, month_key)
  values (1, 0, 0, 0, v_today, v_month)
  on conflict (id) do nothing;

  select * into v_row from public.site_visit_stats where id = 1 for update;

  if v_row.today_key <> v_today then
    v_row.today_visits := 0;
    v_row.today_key := v_today;
  end if;

  if v_row.month_key <> v_month then
    v_row.month_visits := 0;
    v_row.month_key := v_month;
  end if;

  v_row.total_visits := v_row.total_visits + 1;
  v_row.today_visits := v_row.today_visits + 1;
  v_row.month_visits := v_row.month_visits + 1;
  v_row.updated_at := now();

  update public.site_visit_stats
  set total_visits = v_row.total_visits,
      today_visits = v_row.today_visits,
      month_visits = v_row.month_visits,
      today_key = v_row.today_key,
      month_key = v_row.month_key,
      updated_at = v_row.updated_at
  where id = 1
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.record_site_visit() from public;
grant execute on function public.record_site_visit() to anon, authenticated;


-- ==========================================================
-- THỐNG KÊ LƯỢT XEM TỪNG BÀI VIẾT
-- Mỗi lần người đọc mở một bài viết sẽ +1 lượt xem cho bài đó.
-- Tổng lượt xem bài viết = tổng view_count của bảng này.
-- ==========================================================

create table if not exists public.article_view_stats (
  article_id text primary key,
  title text not null default '',
  view_count bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.article_view_stats enable row level security;

drop policy if exists "Public can read article view stats" on public.article_view_stats;
create policy "Public can read article view stats"
on public.article_view_stats for select
to anon, authenticated
using (true);

revoke all on table public.article_view_stats from anon, authenticated;
grant select on table public.article_view_stats to anon, authenticated;

create or replace function public.record_article_view(p_article_id text, p_title text default '')
returns public.article_view_stats
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.article_view_stats;
begin
  if coalesce(trim(p_article_id),'') = '' then
    raise exception 'article_id is required';
  end if;

  insert into public.article_view_stats (article_id, title, view_count, updated_at)
  values (p_article_id, coalesce(p_title,''), 1, now())
  on conflict (article_id) do update
    set view_count = public.article_view_stats.view_count + 1,
        title = case when coalesce(trim(excluded.title),'') <> '' then excluded.title else public.article_view_stats.title end,
        updated_at = now();

  select * into v_row
  from public.article_view_stats
  where article_id = p_article_id;

  return v_row;
end;
$$;

revoke all on function public.record_article_view(text, text) from public;
grant execute on function public.record_article_view(text, text) to anon, authenticated;

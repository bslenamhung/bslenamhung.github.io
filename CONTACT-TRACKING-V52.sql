-- ==========================================================
-- BS LÊ NAM HÙNG - THỐNG KÊ LƯỢT BẤM LIÊN HỆ
-- V52: Gọi điện + Zalo trên website
-- Chạy 1 lần trong Supabase -> SQL Editor
-- Lưu ý: đây là LƯỢT BẤM, không phải số bệnh nhân thực tế.
-- ==========================================================

create table if not exists public.contact_click_stats (
  day date not null,
  contact_type text not null check (contact_type in ('phone','zalo')),
  click_count bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (day, contact_type)
);

alter table public.contact_click_stats enable row level security;

drop policy if exists "Public can read contact click stats" on public.contact_click_stats;
create policy "Public can read contact click stats"
on public.contact_click_stats for select
to anon, authenticated
using (true);

revoke all on table public.contact_click_stats from anon, authenticated;
grant select on table public.contact_click_stats to anon, authenticated;

create or replace function public.record_contact_click(p_contact_type text)
returns public.contact_click_stats
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := timezone('Asia/Ho_Chi_Minh', now())::date;
  v_type text := lower(trim(coalesce(p_contact_type,'')));
  v_row public.contact_click_stats;
begin
  if v_type not in ('phone','zalo') then
    raise exception 'contact_type must be phone or zalo';
  end if;

  insert into public.contact_click_stats(day, contact_type, click_count, updated_at)
  values(v_day, v_type, 1, now())
  on conflict(day, contact_type) do update
    set click_count = public.contact_click_stats.click_count + 1,
        updated_at = now();

  select * into v_row
  from public.contact_click_stats
  where day=v_day and contact_type=v_type;
  return v_row;
end;
$$;

revoke all on function public.record_contact_click(text) from public;
grant execute on function public.record_contact_click(text) to anon, authenticated;

-- Kiểm tra nhanh sau khi chạy:
-- select * from public.contact_click_stats order by day desc, contact_type;

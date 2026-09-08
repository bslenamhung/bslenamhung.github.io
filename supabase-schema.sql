-- ==========================================================
-- BS LÊ NAM HÙNG - DATABASE + AUTH + RLS
-- Chạy toàn bộ file này trong Supabase SQL Editor.
-- ==========================================================

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.site_content (
  id integer primary key check (id = 1),
  content jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.admin_users enable row level security;
alter table public.site_content enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid()
  );
$$;

revoke all on table public.admin_users from anon, authenticated;
revoke all on table public.site_content from anon, authenticated;
grant select on table public.site_content to anon, authenticated;
grant insert, update, delete on table public.site_content to authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- Người xem website chỉ được đọc dữ liệu công khai.
drop policy if exists "Public can read site content" on public.site_content;
create policy "Public can read site content"
on public.site_content for select
using (true);

-- Chỉ admin được ghi dữ liệu.
drop policy if exists "Admins can insert site content" on public.site_content;
create policy "Admins can insert site content"
on public.site_content for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update site content" on public.site_content;
create policy "Admins can update site content"
on public.site_content for update
 to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete site content" on public.site_content;
create policy "Admins can delete site content"
on public.site_content for delete
 to authenticated
using (public.is_admin());

-- Dữ liệu mặc định. Anh có thể thay bằng nội dung thật từ trang quản trị.
insert into public.site_content (id, content)
values (1, $JSON$
{
  "site": {
    "aboutIntro": "Bác sĩ chuyên ngành Sản Phụ khoa với định hướng chia sẻ kiến thức y khoa dễ hiểu và đồng hành cùng người bệnh.",
    "bioText": "Nội dung giới thiệu BS Lê Nam Hùng sẽ được cập nhật.",
    "careerText": "Thông tin quá trình công tác sẽ được cập nhật.",
    "expertiseText": "Sản khoa, Phụ khoa, Vô sinh – Hiếm muộn, Siêu âm, Hậu sản.",
    "researchText": "Thông tin nghiên cứu khoa học sẽ được cập nhật."
  },
  "specialties": [
    {"name":"Sản khoa","icon":"🤰","desc":"Thai kỳ, theo dõi thai và chăm sóc mẹ."},
    {"name":"Phụ khoa","icon":"🩺","desc":"Khám, tư vấn và các bệnh lý phụ khoa."},
    {"name":"Vô sinh – Hiếm muộn","icon":"🌱","desc":"Tư vấn sức khỏe sinh sản và hiếm muộn."},
    {"name":"Siêu âm","icon":"🖥️","desc":"Siêu âm và giải thích các thông tin cần lưu ý."},
    {"name":"Hậu sản","icon":"🌿","desc":"Chăm sóc mẹ sau sinh và các vấn đề hậu sản."}
  ],
  "services": ["Khám Sản khoa","Khám Phụ khoa","Vô sinh – Hiếm muộn","Siêu âm","Hậu sản"],
  "clinic": {"info":"Địa chỉ, thời gian làm việc và thông tin liên hệ sẽ được cập nhật.","booking":"Liên hệ trực tiếp để được hướng dẫn lịch khám.","phone":"","zalo":""},
  "articles": [
    {"title":"Những điều cần lưu ý khi theo dõi thai kỳ","specialty":"Sản khoa","desc":"Nội dung mẫu để anh thay thế bằng bài viết thực tế của mình."},
    {"title":"Khi nào nên đi khám phụ khoa?","specialty":"Phụ khoa","desc":"Nội dung mẫu để anh thay thế bằng bài viết thực tế của mình."},
    {"title":"Một số thông tin cơ bản về siêu âm thai","specialty":"Siêu âm","desc":"Nội dung mẫu để anh thay thế bằng bài viết thực tế của mình."}
  ]
}
$JSON$::jsonb)
on conflict (id) do nothing;

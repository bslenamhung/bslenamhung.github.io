from pathlib import Path
p=Path('/mnt/data/v25')

# Update index.html footer with public counter and a small stats area in admin is done below.
index=(p/'index.html').read_text()
old='''<footer class="site-footer"><div class="container footer-wrap"><div><strong>BS Lê Nam Hùng</strong><br><span>Sản Phụ khoa</span></div><div>© <span id="year"></span> • Nội dung cung cấp thông tin, không thay thế thăm khám trực tiếp.</div></div></footer>'''
new='''<footer class="site-footer"><div class="container footer-wrap"><div><strong>BS Lê Nam Hùng</strong><br><span>Sản Phụ khoa</span></div><div class="footer-visit"><span>👁️ Đã có <strong id="visitTotal">0</strong> lượt truy cập</span><span>© <span id="year"></span> • Nội dung cung cấp thông tin, không thay thế thăm khám trực tiếp.</span></div></div></footer>'''
if old not in index:
    raise SystemExit('footer pattern not found')
index=index.replace(old,new)
# add visit loader before end of body
old_scripts='''<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script><script src="supabase-config.js"></script><script src="script.js"></script></body></html>'''
new_scripts='''<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script><script src="supabase-config.js"></script><script src="script.js"></script><script>
(function(){
  const KEY='bslenamhung_visit_counted_v1';
  async function countVisit(){
    if(!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_PUBLISHABLE_KEY && !window.SUPABASE_ANON_KEY) return;
    try{
      const client=window.supabase.createClient(SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY || window.SUPABASE_ANON_KEY);
      let shouldCount=false;
      const today=new Date().toISOString().slice(0,10);
      try{
        const last=localStorage.getItem(KEY);
        shouldCount=last!==today;
      }catch(e){ shouldCount=true; }
      let result;
      if(shouldCount){
        result=await client.rpc('record_site_visit');
        try{localStorage.setItem(KEY,today)}catch(e){}
      }else{
        result=await client.from('site_visit_stats').select('total_visits').eq('id',1).maybeSingle();
      }
      if(result && !result.error && result.data){
        const row=Array.isArray(result.data)?result.data[0]:result.data;
        const total=Number(row?.total_visits ?? 0);
        const el=document.getElementById('visitTotal'); if(el) el.textContent=total.toLocaleString('vi-VN');
      }
    }catch(e){/* counter is non-blocking */}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',countVisit); else countVisit();
})();</script></body></html>'''
if old_scripts not in index:
    raise SystemExit('scripts pattern not found')
index=index.replace(old_scripts,new_scripts)
(p/'index.html').write_text(index)

# CSS footer visit styling
css=(p/'style.css').read_text()
needle='.footer-wrap{display:flex;justify-content:space-between;gap:20px;font-size:13px}'
replace=needle+'\n.footer-visit{display:flex;flex-direction:column;align-items:flex-end;gap:6px;text-align:right}.footer-visit>span:first-child{font-weight:700;color:#52616a}.footer-visit strong{color:#8a6544}'
if needle not in css:
    raise SystemExit('css footer pattern not found')
css=css.replace(needle,replace)
(p/'style.css').write_text(css)

# Admin: add visit cards to stat-grid
admin=(p/'admin.html').read_text()
old_stats='''<div class="stat-grid"><div class="stat-card"><span class="stat-label">Chuyên môn</span><strong id="statSpecialties">0</strong><small>mục</small></div><div class="stat-card"><span class="stat-label">Dịch vụ</span><strong id="statServices">0</strong><small>dịch vụ</small></div><div class="stat-card"><span class="stat-label">Bài viết</span><strong id="statArticles">0</strong><small>tổng số bài</small></div><div class="stat-card"><span class="stat-label">Đã xuất bản</span><strong id="statPublished">0</strong><small>đang hiển thị</small></div></div>'''
new_stats='''<div class="stat-grid"><div class="stat-card"><span class="stat-label">Chuyên môn</span><strong id="statSpecialties">0</strong><small>mục</small></div><div class="stat-card"><span class="stat-label">Dịch vụ</span><strong id="statServices">0</strong><small>dịch vụ</small></div><div class="stat-card"><span class="stat-label">Bài viết</span><strong id="statArticles">0</strong><small>tổng số bài</small></div><div class="stat-card"><span class="stat-label">Đã xuất bản</span><strong id="statPublished">0</strong><small>đang hiển thị</small></div><div class="stat-card visit-stat"><span class="stat-label">Tổng lượt truy cập</span><strong id="statVisitsTotal">0</strong><small>lượt</small></div><div class="stat-card visit-stat"><span class="stat-label">Hôm nay</span><strong id="statVisitsToday">0</strong><small>lượt</small></div><div class="stat-card visit-stat"><span class="stat-label">Tháng này</span><strong id="statVisitsMonth">0</strong><small>lượt</small></div></div>'''
if old_stats not in admin:
    raise SystemExit('admin stats pattern not found')
admin=admin.replace(old_stats,new_stats)
(p/'admin.html').write_text(admin)

# Admin JS: replace renderStats with async stats fetch
aj=(p/'admin.js').read_text()
old='''function renderStats(){$('statSpecialties').textContent=D.specialties.length;$('statServices').textContent=D.services.length;$('statArticles').textContent=D.articles.length;$('statPublished').textContent=D.articles.filter(x=>x.published!==false).length}'''
new='''async function renderStats(){$('statSpecialties').textContent=D.specialties.length;$('statServices').textContent=D.services.length;$('statArticles').textContent=D.articles.length;$('statPublished').textContent=D.articles.filter(x=>x.published!==false).length;try{const {data,error}=await client.from('site_visit_stats').select('total_visits,today_visits,month_visits').eq('id',1).maybeSingle();if(!error&&data){$('statVisitsTotal').textContent=Number(data.total_visits||0).toLocaleString('vi-VN');$('statVisitsToday').textContent=Number(data.today_visits||0).toLocaleString('vi-VN');$('statVisitsMonth').textContent=Number(data.month_visits||0).toLocaleString('vi-VN');}}catch(e){}}'''
if old not in aj:
    raise SystemExit('admin renderStats pattern not found')
aj=aj.replace(old,new)
(p/'admin.js').write_text(aj)

# Add CSS styling for new cards
ac=(p/'admin.css').read_text()
needle='.small{max-width:76px}'
replace=needle+'\n.visit-stat{border-color:#e5ecef;background:linear-gradient(180deg,#fff,#fafcfc)}.visit-stat .stat-label{color:#7d6b5d}'
if needle not in ac:
    raise SystemExit('admin css pattern not found')
ac=ac.replace(needle,replace)
(p/'admin.css').write_text(ac)

# SQL file
sql='''-- ==========================================================\n-- BS LÊ NAM HÙNG - THỐNG KÊ LƯỢT TRUY CẬP\n-- Chạy 1 lần trong Supabase -> SQL Editor\n-- Mỗi trình duyệt chỉ được tính tối đa 1 lượt/ngày.\n-- ==========================================================\n\ncreate table if not exists public.site_visit_stats (\n  id integer primary key check (id = 1),\n  total_visits bigint not null default 0,\n  today_visits bigint not null default 0,\n  month_visits bigint not null default 0,\n  today_key date not null default (timezone('Asia/Ho_Chi_Minh', now())::date),\n  month_key text not null default to_char(timezone('Asia/Ho_Chi_Minh', now()), 'YYYY-MM')::text,\n  updated_at timestamptz not null default now()\n);\n\ninsert into public.site_visit_stats (id, total_visits, today_visits, month_visits, today_key, month_key)\nvalues (1, 0, 0, 0, timezone('Asia/Ho_Chi_Minh', now())::date, to_char(timezone('Asia/Ho_Chi_Minh', now()), 'YYYY-MM'))\non conflict (id) do nothing;\n\nalter table public.site_visit_stats enable row level security;\n\ndrop policy if exists \"Public can read visit stats\" on public.site_visit_stats;\ncreate policy \"Public can read visit stats\"\non public.site_visit_stats for select\nto anon, authenticated\nusing (true);\n\nrevoke all on table public.site_visit_stats from anon, authenticated;\ngrant select on table public.site_visit_stats to anon, authenticated;\n\ncreate or replace function public.record_site_visit()\nreturns public.site_visit_stats\nlanguage plpgsql\nsecurity definer\nset search_path = public\nas $$\ndeclare\n  v_today date := timezone('Asia/Ho_Chi_Minh', now())::date;\n  v_month text := to_char(timezone('Asia/Ho_Chi_Minh', now()), 'YYYY-MM');\n  v_row public.site_visit_stats;\nbegin\n  insert into public.site_visit_stats (id, total_visits, today_visits, month_visits, today_key, month_key)\n  values (1, 0, 0, 0, v_today, v_month)\n  on conflict (id) do nothing;\n\n  select * into v_row from public.site_visit_stats where id = 1 for update;\n\n  if v_row.today_key <> v_today then\n    v_row.today_visits := 0;\n    v_row.today_key := v_today;\n  end if;\n\n  if v_row.month_key <> v_month then\n    v_row.month_visits := 0;\n    v_row.month_key := v_month;\n  end if;\n\n  v_row.total_visits := v_row.total_visits + 1;\n  v_row.today_visits := v_row.today_visits + 1;\n  v_row.month_visits := v_row.month_visits + 1;\n  v_row.updated_at := now();\n\n  update public.site_visit_stats\n  set total_visits = v_row.total_visits,\n      today_visits = v_row.today_visits,\n      month_visits = v_row.month_visits,\n      today_key = v_row.today_key,\n      month_key = v_row.month_key,\n      updated_at = v_row.updated_at\n  where id = 1\n  returning * into v_row;\n\n  return v_row;\nend;\n$$;\n\nrevoke all on function public.record_site_visit() from public;\ngrant execute on function public.record_site_visit() to anon, authenticated;\n'''
(p/'supabase-visits.sql').write_text(sql)

# zip package

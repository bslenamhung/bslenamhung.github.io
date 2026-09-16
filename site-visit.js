/* V64 - Bộ đếm lượt truy cập duy nhất. Mỗi lần tải một trang công khai = 1 lượt. */
(function(){
  'use strict';
  if(window.__BSHUNG_SITE_VISIT_STARTED__) return;
  window.__BSHUNG_SITE_VISIT_STARTED__=true;
  async function run(){
    try{
      if(!window.supabase || !window.SUPABASE_URL) return;
      const c=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY||window.SUPABASE_ANON_KEY);
      const r=await c.rpc('record_site_visit');
      if(r?.error) throw r.error;
      const row=Array.isArray(r.data)?r.data[0]:r.data;
      const el=document.getElementById('visitTotal');
      if(el&&row) el.textContent=Number(row.total_visits||0).toLocaleString('vi-VN');
    }catch(e){ console.warn('Không ghi được lượt truy cập:',e?.message||e); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
})();

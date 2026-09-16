/* V62 - Thống kê lượt truy cập: mỗi lần tải một trang công khai = 1 lượt. */
(function(){
  'use strict';
  if(window.__BSHUNG_SITE_VISIT_STARTED__) return;
  window.__BSHUNG_SITE_VISIT_STARTED__=true;
  async function run(){
    try{
      if(!window.supabase || !window.SUPABASE_URL) return;
      const c=window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY||window.SUPABASE_ANON_KEY);
      await c.rpc('record_site_visit');
    }catch(e){ console.warn('Không ghi được lượt truy cập:', e?.message||e); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
})();

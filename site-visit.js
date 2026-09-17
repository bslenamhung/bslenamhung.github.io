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

/* V71 - Luôn đưa link bài viết về URL đẹp, kể cả khi dữ liệu cũ còn dùng article ID. */
(function(){
  'use strict';
  const slugify=value=>{
    let s=String(value||'').trim().toLowerCase().normalize('NFKD');
    s=[...s].filter(ch=>!(/\p{M}/u.test(ch))).join('').replace(/đ/g,'d');
    return s.replace(/[^a-z0-9]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,120);
  };
  let cache=null;
  async function articleMap(){
    if(cache) return cache;
    try{
      if(!window.supabase||!window.SUPABASE_URL) return new Map();
      const c=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY||window.SUPABASE_ANON_KEY);
      const r=await c.from('site_content_public').select('content').eq('id',1).maybeSingle();
      const map=new Map();
      for(const a of (r.data?.content?.articles||[])) if(a?.id) map.set(String(a.id),slugify(a.slug||a.title)||String(a.id));
      cache=map; return map;
    }catch(e){ return new Map(); }
  }
  async function rewrite(){
    const map=await articleMap(); if(!map.size) return;
    document.querySelectorAll('a[href]').forEach(a=>{
      const h=String(a.getAttribute('href')||'');
      let m=h.match(/^(?:\.\/)?bai-viet\/([^/?#]+)\.html$/i);
      if(m && map.has(decodeURIComponent(m[1]))) a.setAttribute('href','bai-viet/'+encodeURIComponent(map.get(decodeURIComponent(m[1])))+'.html');
    });
  }
  document.addEventListener('click',async e=>{
    const a=e.target.closest?.('a[href]'); if(!a) return;
    const h=String(a.getAttribute('href')||'');
    const m=h.match(/^(?:\.\/)?bai-viet\.html\?id=([^&#]+)$/i); if(!m) return;
    e.preventDefault();
    const map=await articleMap(); const slug=map.get(decodeURIComponent(m[1]));
    if(slug) location.href='bai-viet/'+encodeURIComponent(slug)+'.html'; else location.href=h;
  });
  rewrite();
  new MutationObserver(()=>rewrite()).observe(document.documentElement,{childList:true,subtree:true});
})();

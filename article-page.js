const escPage=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function articleIdPage(a){if(a&&a.id)return String(a.id);const t=String(a?.title||'').trim();let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}return 'legacy-'+(h>>>0).toString(36)}
async function loadSite(){
  const fallback={articles:[]};
  try{const c=window.supabase?.createClient?.(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY||window.SUPABASE_ANON_KEY);if(c){const r=await c.from('site_content').select('content').eq('id',1).maybeSingle();if(!r.error&&r.data?.content)return r.data.content}}catch(e){}
  return fallback;
}
async function recordArticleViewPage(a){try{const c=window.supabase?.createClient?.(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY||window.SUPABASE_ANON_KEY);if(!c)return;await c.rpc('record_article_view',{p_article_id:articleIdPage(a),p_title:String(a?.title||'')})}catch(e){}}
function setMeta(a){
 const title=(a.title||'Bài viết')+' | Th.BSNT Lê Nam Hùng'; document.title=title;
 const desc=String(a.desc||a.content||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,155);
 let m=document.querySelector('meta[name="description"]'); if(m)m.setAttribute('content',desc||'Bài viết kiến thức Sản Phụ khoa của Th.BSNT Lê Nam Hùng.');
 let c=document.querySelector('link[rel="canonical"]'); if(c)c.setAttribute('href',location.href);
}
(async()=>{
 document.getElementById('year').textContent=new Date().getFullYear();
 const root=document.getElementById('articlePage'); const params=new URLSearchParams(location.search); const id=params.get('id')||'';
 const data=await loadSite(); const list=Array.isArray(data.articles)?data.articles:[];
 const a=list.find(x=>articleIdPage(x)===id||String(x.id||'')===id);
 if(!a){root.innerHTML='<div class="empty"><h2>Không tìm thấy bài viết</h2><p>Bài viết có thể đã được thay đổi hoặc đường dẫn không còn hợp lệ.</p><p><a class="btn primary" href="index.html#articles">← Quay lại bài viết</a></p></div>';return}
 setMeta(a); root.innerHTML=`<article><div class="article-tag">${escPage(a.specialty||'')}</div><h1>${escPage(a.title||'')}</h1>${a.image?`<img class="article-page-cover" src="${escPage(a.image)}" alt="${escPage(a.title||'')}" loading="eager">`:''}<p class="article-page-desc">${escPage(a.desc||'')}</p><div class="article-full">${a.content||''}</div><p style="margin-top:32px"><a class="btn secondary" href="index.html#articles">← Xem các bài viết khác</a></p></article>`;
 recordArticleViewPage(a);
})();

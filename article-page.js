const escPage=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function articleIdPage(a){if(a&&a.id)return String(a.id);const t=String(a?.title||'').trim();let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}return 'legacy-'+(h>>>0).toString(36)}
async function loadSite(){
  const fallback={articles:[]};
  try{const c=window.supabase?.createClient?.(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY||window.SUPABASE_ANON_KEY);if(c){const r=await c.from('site_content_public').select('content').eq('id',1).maybeSingle();if(!r.error&&r.data?.content)return r.data.content}}catch(e){}
  return fallback;
}
async function recordArticleViewPage(a){try{const c=window.supabase?.createClient?.(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY||window.SUPABASE_ANON_KEY);if(!c)return;const r=await c.rpc('record_article_view',{p_article_id:articleIdPage(a),p_title:String(a?.title||'')});if(r?.error)console.warn('Không ghi được lượt xem bài viết:',r.error.message||r.error)}catch(e){console.warn('Không ghi được lượt xem bài viết:',e?.message||e)}}
function upsertMeta(name,content,attr='name'){let m=document.head.querySelector(`meta[${attr}="${name}"]`);if(!m){m=document.createElement('meta');m.setAttribute(attr,name);document.head.appendChild(m)}m.setAttribute('content',content||'')}
function upsertLink(rel,href){let l=document.head.querySelector(`link[rel="${rel}"]`);if(!l){l=document.createElement('link');l.rel=rel;document.head.appendChild(l)}l.href=href}

function articleUrlPage(a){
 const id=articleIdPage(a);
 return `bai-viet.html?id=${encodeURIComponent(id)}`;
}
function normWords(s){
 return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').split(/[^a-z0-9]+/).filter(w=>w.length>=3);
}
function wordSet(s){ return new Set(normWords(s)); }
function overlapCount(a,b){ let n=0; for(const w of a) if(b.has(w)) n++; return n; }
function articleKeywords(a){ return `${a?.keywords||''} ${a?.specialty||''}`.trim(); }
function relatedArticlesPage(current,list){
 const currentId=articleIdPage(current);
 const curTitle=wordSet(current.title||'');
 const curKeywords=wordSet(articleKeywords(current));
 const curDesc=wordSet(String(current.desc||'').replace(/<[^>]+>/g,' '));
 const curAll=new Set([...curTitle,...curKeywords]);
 const curSpecialty=String(current.specialty||'').trim().toLowerCase();
 const candidates=list.filter(a=>a && articleIdPage(a)!==currentId && a.published!==false)
   .map(a=>{
     const titleWords=wordSet(a.title||'');
     const keywordWords=wordSet(articleKeywords(a));
     const descWords=wordSet(String(a.desc||'').replace(/<[^>]+>/g,' '));
     const sameSpecialty=curSpecialty && String(a.specialty||'').trim().toLowerCase()===curSpecialty;
     const keywordOverlap=overlapCount(curKeywords,keywordWords);
     const titleOverlap=overlapCount(curTitle,titleWords);
     const titleKeywordOverlap=overlapCount(curAll,titleWords);
     const descOverlap=overlapCount(curDesc,descWords);
     let score=0;
     if(sameSpecialty) score+=45;
     score += Math.min(keywordOverlap,8)*7;
     score += Math.min(titleOverlap,5)*5;
     score += Math.min(titleKeywordOverlap,6)*2;
     score += Math.min(descOverlap,4)*1;
     if(curSpecialty && String(a.specialty||'').trim()) {
       const aSpecWords=wordSet(a.specialty);
       const curSpecWords=wordSet(current.specialty||'');
       score += overlapCount(curSpecWords,aSpecWords)*3;
     }
     return {a,score,keywordOverlap,titleOverlap,sameSpecialty};
   })
   .sort((x,y)=>y.score-x.score || y.keywordOverlap-x.keywordOverlap || y.titleOverlap-x.titleOverlap || String(x.a.title||'').localeCompare(String(y.a.title||''),'vi'));

 // Chọn tối đa 4 bài theo điểm liên quan. Ưu tiên bài cùng chuyên môn và có giao nhau về từ khóa.
 const selected=[];
 for(const item of candidates){
   if(selected.length>=4) break;
   if(item.score<=0) continue;
   selected.push(item);
 }
 // Nếu danh sách quá ít, bổ sung bài còn lại để người đọc luôn có đường dẫn đọc tiếp.
 if(selected.length<Math.min(4,candidates.length)){
   for(const item of candidates){
     if(selected.length>=4) break;
     if(!selected.includes(item)) selected.push(item);
   }
 }
 return selected.map(x=>x.a);
}
function renderRelatedPage(current,list){
 const rel=relatedArticlesPage(current,list);
 if(!rel.length) return '';
 const cards=rel.map(a=>`<a class="related-card" href="${escPage(articleUrlPage(a))}"><div class="related-tag">${escPage(a.specialty||'')}</div><h3>${escPage(a.title||'')}</h3><p>${escPage(String(a.desc||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,150))}</p><span>Đọc bài viết →</span></a>`).join('');
 return `<section class="related-articles" aria-labelledby="relatedTitle"><div class="related-head"><div><p class="article-tag">GỢI Ý ĐỌC THÊM</p><h2 id="relatedTitle">Bài viết liên quan</h2></div><a class="text-link" href="index.html#articles">Xem tất cả bài viết →</a></div><div class="related-grid">${cards}</div></section>`;
}

function formatPublishedDate(a){
 const raw=a?.publishedAt || a?.createdAt || a?.created_at || a?.date || '';
 if(!raw) return '';
 const d=new Date(raw);
 if(Number.isNaN(d.getTime())) return '';
 return new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d);
}
function youtubeVideoIdPage(url){
 const raw=String(url||'').trim(); if(!raw)return '';
 try{const u=new URL(raw);const host=u.hostname.replace(/^www\./,'').toLowerCase();
  if(host==='youtu.be')return (u.pathname.split('/').filter(Boolean)[0]||'').slice(0,20);
  if(host==='youtube.com'||host==='m.youtube.com'||host==='youtube-nocookie.com'){
   if(u.pathname==='/watch')return (u.searchParams.get('v')||'').slice(0,20);
   const p=u.pathname.split('/').filter(Boolean);if(['shorts','embed','live'].includes(p[0]))return (p[1]||'').slice(0,20);
  }}catch(e){} return '';
}
function renderArticleVideoPage(a){
 const id=youtubeVideoIdPage(a?.videoUrl||a?.video||''); if(!id)return '';
 return `<div class="article-video-wrap"><iframe src="https://www.youtube-nocookie.com/embed/${escPage(id)}" title="${escPage(a?.title||'Video bài viết')}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
}
function setMeta(a){
 const title=(a.seoTitle||a.title||'Bài viết') .trim(); document.title=title;
 const fallbackDesc=String(a.desc||a.content||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,160);
 const desc=String(a.seoDescription||fallbackDesc||'Kiến thức Sản Phụ khoa của Th.BSNT Lê Nam Hùng.').trim().slice(0,160);
 const canonical=location.href;
 upsertMeta('description',desc); upsertMeta('robots','index,follow');
 upsertMeta('og:title',title,'property'); upsertMeta('og:description',desc,'property'); upsertMeta('og:type','article','property'); upsertMeta('og:url',canonical,'property');
 const image=String(a.seoImage||a.image||'').trim(); if(image)upsertMeta('og:image',image,'property');
 if(a.keywords)upsertMeta('keywords',String(a.keywords).trim());
 upsertLink('canonical',canonical);
 const old=document.getElementById('articleStructuredData'); if(old)old.remove();
 const schema={"@context":"https://schema.org","@type":"BlogPosting","headline":String(a.title||'').trim(),"description":desc,"author":{"@type":"Person","name":"Th.BSNT Lê Nam Hùng","url":"https://bslenamhung.github.io/#about"},"mainEntityOfPage":{"@type":"WebPage","@id":canonical},"url":canonical};
 if(image)schema.image=[image];
 if(a.specialty)schema.articleSection=String(a.specialty);
 if(a.keywords)schema.keywords=String(a.keywords);
 const videoId=youtubeVideoIdPage(a?.videoUrl||a?.video||'');
 if(videoId){schema.video={"@type":"VideoObject","name":String(a.title||'Video bài viết'),"embedUrl":`https://www.youtube-nocookie.com/embed/${videoId}`};if(image)schema.video.thumbnailUrl=image;if(a.publishedAt)schema.video.uploadDate=a.publishedAt;}
 if(a.publishedAt)schema.datePublished=a.publishedAt; if(a.updatedAt)schema.dateModified=a.updatedAt;
 const sc=document.createElement('script');sc.type='application/ld+json';sc.id='articleStructuredData';sc.textContent=JSON.stringify(schema);document.head.appendChild(sc);
}
(async()=>{
 document.getElementById('year').textContent=new Date().getFullYear();
 const root=document.getElementById('articlePage'); const params=new URLSearchParams(location.search); const id=params.get('id')||'';
 const data=await loadSite(); const list=Array.isArray(data.articles)?data.articles:[];
 const a=list.find(x=>articleIdPage(x)===id||String(x.id||'')===id);
 if(!a){root.innerHTML='<div class="empty"><h2>Không tìm thấy bài viết</h2><p>Bài viết có thể đã được thay đổi hoặc đường dẫn không còn hợp lệ.</p><p><a class="btn primary" href="index.html#articles">← Quay lại bài viết</a></p></div>';return}
 const publishedDate=formatPublishedDate(a); setMeta(a); root.innerHTML=`<article><div class="article-tag">${escPage(a.specialty||'')}</div><h1>${escPage(a.title||'')}</h1>${a.image?`<img class="article-page-cover" src="${escPage(a.image)}" alt="${escPage(a.title||'')}" loading="eager">`:''}${renderArticleVideoPage(a)}<p class="article-page-desc">${escPage(a.desc||'')}</p><div class="article-full">${a.content||''}</div>${publishedDate?`<div class="article-published-date">📅 Ngày xuất bản: <strong>${publishedDate}</strong></div>`:''}<p style="margin-top:32px"><a class="btn secondary" href="index.html#articles">← Xem các bài viết khác</a></p>${renderRelatedPage(a,list)}</article>`;
 recordArticleViewPage(a);
})();

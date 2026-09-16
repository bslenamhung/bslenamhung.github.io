/* V60: cập nhật nội dung bài viết tĩnh trực tiếp từ Supabase.
   Trang HTML tĩnh vẫn là fallback SEO nếu mạng/Supabase không sẵn sàng. */
(function(){
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const idOf=a=>{
    if(a&&a.id)return String(a.id);
    const t=String(a?.title||'').trim(); let h=2166136261;
    for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}
    return 'legacy-'+(h>>>0).toString(36);
  };
  const norm=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim().toLowerCase();
  function stripLeading(content,title,seoTitle){
    let out=String(content||'');
    const targets=new Set([norm(title),norm(seoTitle)].filter(Boolean));
    for(let i=0;i<4;i++){
      const m=out.match(/^\s*<(h[1-4]|p|div)\b[^>]*>([\s\S]*?)<\/\1>\s*/i);
      if(!m)break;
      if(targets.has(norm(m[2])))out=out.slice(m[0].length);else break;
    }
    return out;
  }
  function youtubeId(url){
    const raw=String(url||'').trim(); if(!raw)return '';
    try{const u=new URL(raw),h=u.hostname.replace(/^www\./,'').toLowerCase();
      if(h==='youtu.be')return (u.pathname.split('/').filter(Boolean)[0]||'').slice(0,20);
      if(['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(h)){
        if(u.pathname==='/watch')return (u.searchParams.get('v')||'').slice(0,20);
        const p=u.pathname.split('/').filter(Boolean); if(['shorts','embed','live'].includes(p[0]))return (p[1]||'').slice(0,20);
      }
    }catch(e){} return '';
  }
  function videoHtml(a){const id=youtubeId(a?.videoUrl||a?.video||'');return id?`<div class="article-video-wrap"><iframe src="https://www.youtube-nocookie.com/embed/${esc(id)}" title="${esc(a?.title||'Video bài viết')}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`:''}
  function dateText(a){const raw=a?.publishedAt||a?.createdAt||a?.created_at||a?.date||'';if(!raw)return '';const d=new Date(raw);if(Number.isNaN(d.getTime()))return '';return new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d)}
  function articleUrl(a){return new URL('bai-viet/'+encodeURIComponent(idOf(a))+'.html',location.origin+'/').href}
  function words(s){return new Set(String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').split(/[^a-z0-9]+/).filter(w=>w.length>=3))}
  function overlap(a,b){let n=0;for(const w of a)if(b.has(w))n++;return n}
  function related(current,list){
    const cid=idOf(current), ct=words(current.title), ck=words(`${current.keywords||''} ${current.specialty||''}`), cs=String(current.specialty||'').trim().toLowerCase();
    return list.filter(a=>a&&idOf(a)!==cid&&a.published!==false).map(a=>{const ts=words(a.title),ks=words(`${a.keywords||''} ${a.specialty||''}`);let score=0;if(cs&&String(a.specialty||'').trim().toLowerCase()===cs)score+=45;score+=Math.min(overlap(ck,ks),8)*7;score+=Math.min(overlap(ct,ts),5)*5;return {a,score}}).sort((x,y)=>y.score-x.score||String(x.a.title||'').localeCompare(String(y.a.title||''),'vi')).slice(0,4).map(x=>x.a);
  }
  function relatedHtml(current,list){const rel=related(current,list);if(!rel.length)return '';return `<section class="related-articles" aria-labelledby="relatedTitle"><div class="related-head"><div><p class="article-tag">GỢI Ý ĐỌC THÊM</p><h2 id="relatedTitle">Bài viết liên quan</h2></div><a class="text-link" href="${esc(new URL('../index.html#articles',location.href).href)}">Xem tất cả bài viết →</a></div><div class="related-grid">${rel.map(a=>`<a class="related-card" href="${esc(articleUrl(a))}"><div class="related-tag">${esc(a.specialty||'')}</div><h3>${esc(a.title||'')}</h3><p>${esc(String(a.desc||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,150))}</p><span>Đọc bài viết →</span></a>`).join('')}</div></section>`}
  function meta(a){
    const title=String(a.seoTitle||a.title||'Bài viết').trim(); const desc=String(a.seoDescription||a.desc||a.content||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,160); const canonical=articleUrl(a); document.title=title;
    let m=document.querySelector('meta[name="description"]');if(m)m.content=desc; else {m=document.createElement('meta');m.name='description';m.content=desc;document.head.appendChild(m)}
    let c=document.querySelector('link[rel="canonical"]');if(c)c.href=canonical;
    [['og:title',title],['og:description',desc],['og:url',canonical]].forEach(([p,v])=>{let x=document.querySelector(`meta[property="${p}"]`);if(x)x.content=v;});
    if(a.image||a.seoImage){let x=document.querySelector('meta[property="og:image"]');if(x)x.content=String(a.seoImage||a.image)}
  }
  function render(root,a,list){
    const title=String(a.title||a.seoTitle||'Bài viết Sản Phụ khoa');
    const image=String(a.seoImage||a.image||'').trim();
    const content=stripLeading(a.content,a.title,a.seoTitle);
    const d=String(a.desc||'').trim(); const date=dateText(a);
    root.innerHTML=`<div class="article-tag">${esc(a.specialty||'')}</div><h1>${esc(title)}</h1>${image?`<img class="article-page-cover" src="${esc(image)}" alt="${esc(title)}" loading="eager">`:''}${videoHtml(a)}${d?`<p class="article-page-desc">${esc(d)}</p>`:''}<div class="article-full">${content}</div>${date?`<div class="article-published-date">📅 Ngày xuất bản: <strong>${esc(date)}</strong></div>`:''}<p style="margin-top:32px"><a class="btn secondary" href="../index.html#articles">← Xem các bài viết khác</a></p>${relatedHtml(a,list)}`;
  }
  async function run(){
    const root=document.getElementById('articleLiveRoot'); if(!root||!window.supabase||!window.SUPABASE_URL)return;
    const id=root.dataset.articleId||''; if(!id)return;
    try{
      const c=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY||window.SUPABASE_ANON_KEY);
      const r=await c.from('site_content_public').select('content').eq('id',1).maybeSingle();
      if(r.error||!r.data?.content)return;
      const list=Array.isArray(r.data.content.articles)?r.data.content.articles:[];
      const a=list.find(x=>idOf(x)===id||String(x.id||'')===id&&x.published!==false);
      if(!a)return;
      render(root,a,list);meta(a);
      try{await c.rpc('record_article_view',{p_article_id:idOf(a),p_title:String(a.title||'')})}catch(e){}
    }catch(e){/* giữ nội dung tĩnh */}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();

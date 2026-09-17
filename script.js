/* V73: compatibility loader + article pagination/search/filter. */
(function(){
  'use strict';
  function loadCore(){
    var s=document.createElement('script');
    s.src='script-core.js?v=73';
    s.onload=install;
    s.onerror=function(){console.error('Không tải được script-core.js');};
    document.head.appendChild(s);
  }
  function escLocal(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
  function slug(a){var raw=String(a?.slug||a?.title||'').trim().toLowerCase().normalize('NFKD');var out=[...raw].filter(ch=>!/\p{M}/u.test(ch)).join('').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,120);return out||String(a?.id||'');}
  function install(){
    var page=1, per=9, filter='';
    function render(filterArg,keep){
      filter=filterArg||''; if(!keep) page=1;
      var q=document.getElementById('searchInput')?.value.trim().toLowerCase()||'';
      var rows=(window.DATA?.articles||[]).filter(function(a){return a.published!==false&&(!filter||a.specialty===filter)&&(!q||(String(a.title||'')+' '+String(a.desc||'')+' '+String(a.specialty||'')+' '+String(a.content||'')).toLowerCase().includes(q));});
      var total=Math.max(1,Math.ceil(rows.length/per)); page=Math.min(page,total);
      var start=(page-1)*per, visible=rows.slice(start,start+per), grid=document.getElementById('articleGrid');
      if(grid)grid.innerHTML=visible.map(function(a){return '<article class="article-card"><div class="body">'+(a.image?'<img src="'+escLocal(a.image)+'" alt="'+escLocal(a.title)+'" loading="lazy">':'')+'<div class="article-tag">'+escLocal(a.specialty||'')+'</div><h3>'+escLocal(a.title||'')+'</h3><p>'+escLocal(a.desc||'')+'</p><a href="bai-viet/'+encodeURIComponent(slug(a))+'.html">Đọc bài viết →</a></div></article>';}).join('');
      var empty=document.getElementById('emptyState'); if(empty)empty.hidden=rows.length>0;
      draw(total,rows.length);
    }
    function draw(total,count){
      var grid=document.getElementById('articleGrid'); if(!grid)return;
      var box=document.getElementById('articlePagination');
      if(!box){box=document.createElement('nav');box.id='articlePagination';box.className='article-pagination';box.setAttribute('aria-label','Phân trang bài viết');grid.parentNode.insertBefore(box,grid.nextSibling);}
      if(total<=1){box.hidden=true;box.innerHTML='';return;} box.hidden=false;
      var h='<button type="button" class="page-btn" data-page="'+(page-1)+'"'+(page<=1?' disabled':'')+' aria-label="Trang trước">‹</button>';
      var start=Math.max(1,page-2),end=Math.min(total,page+2);
      if(start>1)h+='<button type="button" class="page-btn" data-page="1">1</button>'+(start>2?'<span class="page-dots">…</span>':'');
      for(var i=start;i<=end;i++)h+='<button type="button" class="page-btn'+(i===page?' active':'')+'" data-page="'+i+'"'+(i===page?' aria-current="page"':'')+'>'+i+'</button>';
      if(end<total)h+=(end<total-1?'<span class="page-dots">…</span>':'')+'<button type="button" class="page-btn" data-page="'+total+'">'+total+'</button>';
      h+='<button type="button" class="page-btn" data-page="'+(page+1)+'"'+(page>=total?' disabled':'')+' aria-label="Trang sau">›</button><span class="page-info">Trang '+page+'/'+total+' · '+count+' bài viết</span>';
      box.innerHTML=h; box.querySelectorAll('.page-btn:not([disabled])').forEach(function(b){b.onclick=function(){page=Number(b.dataset.page)||1;render(filter,true);document.getElementById('articles')?.scrollIntoView({behavior:'smooth',block:'start'});};});
    }
    window.renderArticles=render;
    document.getElementById('searchInput')?.addEventListener('input',function(){render(filter);});
    document.querySelectorAll('.specialty-card').forEach(function(el){el.addEventListener('click',function(){setTimeout(function(){render(el.dataset.specialty||'');},50);});});
    render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadCore,{once:true});else loadCore();
})();

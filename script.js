/* V73.1: fix article rendering + pagination/search/filter compatibility. */
(function(){
  'use strict';
  function loadCore(){
    var s=document.createElement('script');
    s.src='script-core.js?v=73.1';
    s.onload=install;
    s.onerror=function(){console.error('Không tải được script-core.js');};
    document.head.appendChild(s);
  }
  function slugFromTitle(title){
    var raw=String(title||'').trim().toLowerCase().normalize('NFKD');
    var out=[...raw].filter(function(ch){return !/\p{M}/u.test(ch);}).join('')
      .replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/-+/g,'-')
      .replace(/^-|-$/g,'').slice(0,120);
    return out;
  }
  function install(){
    var page=1, per=9, filter='';
    var coreRender=window.renderArticles;
    function normalizeLinks(grid){
      if(!grid)return;
      grid.querySelectorAll('.article-card').forEach(function(card){
        var titleEl=card.querySelector('h3');
        var link=card.querySelector('a');
        var slug=slugFromTitle(titleEl ? titleEl.textContent : '');
        if(link && slug)link.href='bai-viet/'+encodeURIComponent(slug)+'.html';
      });
    }
    function render(filterArg,keep){
      filter=filterArg||'';
      if(!keep)page=1;
      var grid=document.getElementById('articleGrid');
      if(!grid)return;
      if(typeof coreRender==='function'){
        try{ coreRender(filter); }catch(e){ console.error('Lỗi render bài viết:',e); }
      }
      normalizeLinks(grid);
      var cards=Array.from(grid.querySelectorAll('.article-card'));
      var count=cards.length;
      var total=Math.max(1,Math.ceil(count/per));
      page=Math.min(page,total);
      var start=(page-1)*per;
      cards.forEach(function(card,i){card.style.display=(i>=start&&i<start+per)?'':'none';});
      var empty=document.getElementById('emptyState');
      if(empty)empty.hidden=count>0;
      draw(total,count);
    }
    function draw(total,count){
      var grid=document.getElementById('articleGrid'); if(!grid)return;
      var box=document.getElementById('articlePagination');
      if(!box){
        box=document.createElement('nav'); box.id='articlePagination'; box.className='article-pagination';
        box.setAttribute('aria-label','Phân trang bài viết'); grid.parentNode.insertBefore(box,grid.nextSibling);
      }
      if(count===0 || total<=1){box.hidden=true;box.innerHTML='';return;}
      box.hidden=false;
      var h='<button type="button" class="page-btn" data-page="'+(page-1)+'"'+(page<=1?' disabled':'')+' aria-label="Trang trước">‹</button>';
      var start=Math.max(1,page-2),end=Math.min(total,page+2);
      if(start>1)h+='<button type="button" class="page-btn" data-page="1">1</button>'+(start>2?'<span class="page-dots">…</span>':'');
      for(var i=start;i<=end;i++)h+='<button type="button" class="page-btn'+(i===page?' active':'')+'" data-page="'+i+'"'+(i===page?' aria-current="page"':'')+'>'+i+'</button>';
      if(end<total)h+=(end<total-1?'<span class="page-dots">…</span>':'')+'<button type="button" class="page-btn" data-page="'+total+'">'+total+'</button>';
      h+='<button type="button" class="page-btn" data-page="'+(page+1)+'"'+(page>=total?' disabled':'')+' aria-label="Trang sau">›</button><span class="page-info">Trang '+page+'/'+total+' · '+count+' bài viết</span>';
      box.innerHTML=h;
      box.querySelectorAll('.page-btn:not([disabled])').forEach(function(b){b.onclick=function(){page=Number(b.dataset.page)||1;render(filter,true);document.getElementById('articles')?.scrollIntoView({behavior:'smooth',block:'start'});};});
    }
    window.renderArticles=render;
    document.getElementById('searchInput')?.addEventListener('input',function(){render(filter);});
    document.querySelectorAll('.specialty-card').forEach(function(el){el.addEventListener('click',function(){setTimeout(function(){render(el.dataset.specialty||'');},50);});});
    render();
    setTimeout(function(){render(filter);},300);
    setTimeout(function(){render(filter);},1000);
    setTimeout(function(){render(filter);},2000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadCore,{once:true}); else loadCore();
})();

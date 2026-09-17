/* V73 FINAL - pagination/search/filter wrapper */
(function(){
  'use strict';
  function loadCore(){
    if(window.__BSLH_V73_LOADED)return;
    window.__BSLH_V73_LOADED=true;
    var s=document.createElement('script'); s.src='script-core.js?v=73-final';
    s.onload=install; s.onerror=function(){console.error('Không tải được script-core.js')};
    document.head.appendChild(s);
  }
  function install(){
    var coreRender=window.renderArticles;
    if(typeof coreRender!=='function'){console.error('Không tìm thấy bộ render bài viết');return;}
    var page=1, per=9, filter='';
    function bindSpecialties(){document.querySelectorAll('#specialtyGrid .specialty-card').forEach(function(card){card.onclick=function(e){e.preventDefault();var value=card.getAttribute('data-specialty')||'';var input=document.getElementById('searchInput');if(input)input.value=value;render(value);var sec=document.getElementById('articles');if(sec)sec.scrollIntoView({behavior:'smooth',block:'start'});};});}
    async function render(f,keep){filter=f||'';if(!keep)page=1;var grid=document.getElementById('articleGrid');if(!grid)return;await coreRender(filter);bindSpecialties();var cards=[...grid.querySelectorAll('.article-card')],total=Math.max(1,Math.ceil(cards.length/per));page=Math.min(page,total);cards.forEach((c,i)=>c.style.display=(i>=(page-1)*per&&i<page*per)?'':'none');draw(total,cards.length)}
    function draw(total,count){var grid=document.getElementById('articleGrid');if(!grid)return;var box=document.getElementById('articlePagination');if(!box){box=document.createElement('nav');box.id='articlePagination';box.className='article-pagination';box.setAttribute('aria-label','Phân trang bài viết');grid.parentNode.insertBefore(box,grid.nextSibling)}if(!count||total<=1){box.hidden=true;box.innerHTML='';return}box.hidden=false;var h='<button type="button" class="page-btn" data-page="'+(page-1)+'"'+(page<=1?' disabled':'')+'>‹</button>';var st=Math.max(1,page-2),en=Math.min(total,page+2);if(st>1)h+='<button type="button" class="page-btn" data-page="1">1</button>'+(st>2?'<span class="page-dots">…</span>':'');for(var i=st;i<=en;i++)h+='<button type="button" class="page-btn'+(i===page?' active':'')+'" data-page="'+i+'"'+(i===page?' aria-current="page"':'')+'>'+i+'</button>';if(en<total)h+=(en<total-1?'<span class="page-dots">…</span>':'')+'<button type="button" class="page-btn" data-page="'+total+'">'+total+'</button>';h+='<button type="button" class="page-btn" data-page="'+(page+1)+'"'+(page>=total?' disabled':'')+'>›</button><span class="page-info">Trang '+page+'/'+total+' · '+count+' bài viết</span>';box.innerHTML=h;box.querySelectorAll('.page-btn:not([disabled])').forEach(b=>b.onclick=()=>{page=Number(b.dataset.page)||1;render(filter,true);document.getElementById('articles')?.scrollIntoView({behavior:'smooth',block:'start'})})}
    window.renderArticles=render; document.getElementById('searchInput')?.addEventListener('input',e=>render(e.target.value)); render('');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadCore,{once:true});else loadCore();
})();

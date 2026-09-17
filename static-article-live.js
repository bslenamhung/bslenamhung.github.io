/* V73: load legacy live renderer, then normalize related article links to slug URLs. */
(function(){
  'use strict';
  var s=document.createElement('script');
  s.src='../static-article-live-core.js?v=73';
  s.onload=function(){
    var root=document.getElementById('articleLiveRoot'); if(!root||!window.supabase||!window.SUPABASE_URL)return;
    var c=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY||window.SUPABASE_ANON_KEY);
    c.from('site_content_public').select('content').eq('id',1).maybeSingle().then(function(r){
      if(r.error||!r.data?.content)return;
      var list=Array.isArray(r.data.content.articles)?r.data.content.articles:[], byId=new Map();
      list.forEach(function(a){if(a?.id)byId.set(String(a.id),a);});
      function slug(a){var raw=String(a?.slug||a?.title||'').trim().toLowerCase().normalize('NFKD');var out=[...raw].filter(ch=>!/\p{M}/u.test(ch)).join('').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,120);return out||String(a?.id||'');}
      root.querySelectorAll('.related-card[href*="/bai-viet/"]').forEach(function(a){var m=a.getAttribute('href').match(/\/bai-viet\/([^/]+)\.html(?:$|[?#])/);if(!m)return;var item=byId.get(decodeURIComponent(m[1]));if(item)a.setAttribute('href','../bai-viet/'+encodeURIComponent(slug(item))+'.html');});
    }).catch(function(){});
  };
  document.head.appendChild(s);
})();

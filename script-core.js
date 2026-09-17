/* V73 FINAL - core renderer: Supabase content + article cards */
(function(){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const slug=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,120);
const DEFAULT={specialties:[{name:'Sản khoa',icon:'🤰',desc:'Thai kỳ, theo dõi thai và chăm sóc mẹ.'},{name:'Phụ khoa',icon:'🩺',desc:'Khám, tư vấn và các bệnh lý phụ khoa.'},{name:'Vô sinh – Hiếm muộn',icon:'🌱',desc:'Tư vấn sức khỏe sinh sản và hiếm muộn.'},{name:'Siêu âm',icon:'🖥️',desc:'Siêu âm và giải thích các thông tin cần lưu ý.'},{name:'Hậu sản',icon:'🌿',desc:'Chăm sóc mẹ sau sinh và các vấn đề hậu sản.'}],services:['Khám Sản khoa','Khám Phụ khoa','Vô sinh – Hiếm muộn','Siêu âm','Hậu sản'],clinic:{phone:'0946444812',zalo:'https://zalo.me/84946444812',facebook:'https://www.facebook.com/DrLeNamHung/',address:'169A Lê Lợi, Nam Đông Hà, Quảng Trị',hours:'Vui lòng liên hệ phòng khám để xác nhận thời gian khám trước khi đến.',tagline:'Điều trị bằng tri thức, chăm sóc từ trái tim',logo:'clinic-logo.png'}};
let DATA={specialties:DEFAULT.specialties,services:DEFAULT.services,clinic:DEFAULT.clinic,articles:[]};
async function getData(){try{const u=window.SUPABASE_URL,k=window.SUPABASE_PUBLISHABLE_KEY||window.SUPABASE_ANON_KEY;if(!window.supabase||!u||!k)return null;const c=window.supabase.createClient(u,k);const r=await c.from('site_content_public').select('content').eq('id',1).maybeSingle();if(!r.error&&r.data&&r.data.content)return r.data.content;}catch(e){console.error('Supabase:',e)}return null}
function applySite(){
 const d=DATA, sp=document.getElementById('specialtyGrid'); if(sp)sp.innerHTML=(Array.isArray(d.specialties)&&d.specialties.length?d.specialties:DEFAULT.specialties).map(x=>`<a class="specialty-card" href="#articles" data-specialty="${esc(x.name)}"><div class="specialty-icon">${esc(x.icon||'•')}</div><h3>${esc(x.name)}</h3><p>${esc(x.desc||'')}</p></a>`).join('');
 const sv=document.getElementById('serviceGrid'); if(sv)sv.innerHTML=(Array.isArray(d.services)&&d.services.length?d.services:DEFAULT.services).map(x=>`<div class="service-item"><i>✓</i><div><strong>${esc(typeof x==='string'?x:x.name||'')}</strong>${typeof x==='object'&&x.desc?`<small>${esc(x.desc)}</small>`:''}</div></div>`).join('');
 const c={...DEFAULT.clinic,...(d.clinic||{})}; DATA.clinic=c;
 const h=document.getElementById('clinicHours');if(h)h.textContent=c.hours;
 const a=document.getElementById('clinicAddress');if(a)a.textContent=c.address;
 const l=document.getElementById('clinicLogo');if(l)l.src=c.logo||DEFAULT.clinic.logo;
 const p=document.getElementById('phoneBtn');if(p){p.href='tel:'+c.phone;p.textContent='Gọi '+c.phone}
 const z=document.getElementById('zaloBtn');if(z){z.href=c.zalo||'#';z.target='_blank'}
 const f=document.getElementById('facebookBtn');if(f){f.href=c.facebook||'#';f.target='_blank'}
}
function articleCard(a){const title=a.title||'Bài viết';const id=a.id||a.article_id||'';const url=a.slug?`bai-viet/${encodeURIComponent(a.slug)}.html`:(id?`bai-viet.html?id=${encodeURIComponent(id)}`:`bai-viet/${encodeURIComponent(slug(title))}.html`);const image=a.image||a.coverImage||a.thumbnail||'';const desc=a.desc||a.description||a.excerpt||'';return `<article class="article-card" data-specialty="${esc(a.specialty||'')}">${image?`<img src="${esc(image)}" alt="${esc(title)}" loading="lazy">`:''}<div class="article-card-body"><small>${esc(a.specialty||'Sản Phụ khoa')}</small><h3><a href="${url}">${esc(title)}</a></h3>${desc?`<p>${esc(desc)}</p>`:''}<a class="read-more" href="${url}">Đọc bài viết →</a></div></article>`}
async function renderArticles(filter){
 const remote=await getData(); if(remote&&typeof remote==='object')DATA={...DATA,...remote,clinic:{...DEFAULT.clinic,...(remote.clinic||{})}}; else DATA.clinic={...DEFAULT.clinic,...(DATA.clinic||{})};
 applySite();
 const grid=document.getElementById('articleGrid');if(!grid)return;
 let list=Array.isArray(DATA.articles)?DATA.articles.filter(a=>a&&a.published!==false):[];const q=String(filter||'').trim().toLowerCase();if(q)list=list.filter(a=>[a.title,a.desc,a.description,a.excerpt,a.specialty].some(v=>String(v||'').toLowerCase().includes(q)));
 grid.innerHTML=list.map(articleCard).join('');
 const empty=document.getElementById('emptyState');if(empty)empty.hidden=list.length>0;
 return list.length;
}
window.renderArticles=renderArticles;
window.__SITE_CORE_READY=true;
})();

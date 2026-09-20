const DEFAULT_DATA={site:{profileImage:'',aboutIntro:'Bác sĩ chuyên ngành Sản Phụ khoa với định hướng chia sẻ kiến thức y khoa dễ hiểu và đồng hành cùng người bệnh.',bioText:'Nội dung giới thiệu BS Lê Nam Hùng sẽ được cập nhật.',careerText:'Thông tin quá trình công tác sẽ được cập nhật.',expertiseText:'Sản khoa, Phụ khoa, Vô sinh – Hiếm muộn, Siêu âm, Hậu sản.',researchText:'Thông tin nghiên cứu khoa học sẽ được cập nhật.'},specialties:[{name:'Sản khoa',icon:'🤰',desc:'Thai kỳ, theo dõi thai và chăm sóc mẹ.'},{name:'Phụ khoa',icon:'🩺',desc:'Khám, tư vấn và các bệnh lý phụ khoa.'},{name:'Vô sinh – Hiếm muộn',icon:'🌱',desc:'Tư vấn sức khỏe sinh sản và hiếm muộn.'},{name:'Siêu âm',icon:'🖥️',desc:'Siêu âm và giải thích các thông tin cần lưu ý.'},{name:'Hậu sản',icon:'🌿',desc:'Chăm sóc mẹ sau sinh và các vấn đề hậu sản.'}],services:['Khám Sản khoa','Khám Phụ khoa','Vô sinh – Hiếm muộn','Siêu âm','Hậu sản'],clinic:{tagline:'Điều trị bằng tri thức, chăm sóc từ trái tim',intro:'Phòng khám chuyên khoa Phụ sản BS Hùng do ThS.BS Lê Nam Hùng phụ trách, cung cấp dịch vụ khám và tư vấn Sản khoa, Phụ khoa và sức khỏe sinh sản tại Đông Hà, Quảng Trị.',info:'Phòng khám chuyên khoa Phụ sản BS Hùng tại 169A Lê Lợi, Nam Đông Hà, Quảng Trị. Phòng khám hướng đến tư vấn rõ ràng, chăm sóc tận tâm và đồng hành cùng người bệnh trong các vấn đề Sản Phụ khoa.',booking:'Vui lòng gọi điện hoặc nhắn Zalo để được hướng dẫn đặt lịch và xác nhận thời gian khám trước khi đến.',phone:'0946444812',zalo:'https://zalo.me/84946444812',zaloQr:'zalo-qr.jpg',facebook:'https://www.facebook.com/DrLeNamHung/',address:'169A Lê Lợi, Nam Đông Hà, Quảng Trị',hours:'Vui lòng liên hệ phòng khám để xác nhận thời gian khám trước khi đến.',mapUrl:'https://www.google.com/maps?q=16.8041129,107.1140670'},articles:[{title:'Những điều cần lưu ý khi theo dõi thai kỳ',specialty:'Sản khoa',desc:'Nội dung mẫu để anh thay thế bằng bài viết thực tế của mình.'},{title:'Khi nào nên đi khám phụ khoa?',specialty:'Phụ khoa',desc:'Nội dung mẫu để anh thay thế bằng bài viết thực tế của mình.'},{title:'Một số thông tin cơ bản về siêu âm thai',specialty:'Siêu âm',desc:'Nội dung mẫu để anh thay thế bằng bài viết thực tế của mình.'}]};
let DATA=structuredClone(DEFAULT_DATA);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const optimizeImageUrl=(src,width=900,quality=72)=>{const s=String(src||'').trim();if(!s)return s;try{const u=new URL(s);const marker='/storage/v1/object/public/';const i=u.pathname.indexOf(marker);if(i>=0){u.pathname=u.pathname.replace(marker,'/storage/v1/render/image/public/');u.searchParams.set('width',String(width));u.searchParams.set('quality',String(quality));u.searchParams.set('format','webp');return u.toString();}}catch(e){}return s;};
function articleId(a){if(a&&a.id)return String(a.id);const t=String(a?.title||'').trim();let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}return 'legacy-'+(h>>>0).toString(36)}
function articleSlug(a){const raw=String(a?.slug||a?.title||'').trim();const id=articleId(a);if(!raw)return id;const slug=raw.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120);return slug||id}


async function recordContactClick(type){
  try{
    if(!window.supabase||!window.SUPABASE_URL)return;
    if(!['phone','zalo'].includes(type))return;
    const c=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY||window.SUPABASE_ANON_KEY);
    await c.rpc('record_contact_click',{p_contact_type:type});
  }catch(e){/* non-blocking */}
}
function bindContactTracking(){
  document.addEventListener('click',event=>{
    const a=event.target.closest('a[href]'); if(!a)return;
    const href=String(a.getAttribute('href')||'').trim();
    if(/^tel:/i.test(href)) recordContactClick('phone');
    else if(/^https?:\/\/(?:www\.)?zalo\.me\//i.test(href)) recordContactClick('zalo');
  },{passive:true});
}
async function loadArticleViewTotal(){try{if(!window.supabase||!window.SUPABASE_URL)return;const c=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY||window.SUPABASE_ANON_KEY);const r=await c.from('article_view_stats').select('view_count');if(!r.error){const total=(r.data||[]).reduce((n,x)=>n+Number(x.view_count||0),0);const el=document.getElementById('articleViewsTotal');if(el)el.textContent=total.toLocaleString('vi-VN')}}catch(e){}}
async function loadData(){
  // Không để mạng/Supabase chặn giao diện. data.json chỉ được phép chờ tối đa 2 giây.
  try{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),2000);
    const local=await fetch('./data-home.json?v=1',{cache:'no-store',signal:controller.signal});
    clearTimeout(timer);
    if(local.ok){
      const snapshot=await local.json();
      if(snapshot&&typeof snapshot==='object') return snapshot;
    }
  }catch(e){
    console.warn('data.json chậm/không khả dụng:',e);
  }
  // Có dữ liệu dự phòng ngay trong script, nên trang vẫn phải render.
  return DEFAULT_DATA;
}
function mergeWithDefaults(remote){
  const r=remote&&typeof remote==='object'?remote:{};
  return {
    ...DEFAULT_DATA,
    ...r,
    site:{...DEFAULT_DATA.site,...(r.site||{})},
    specialties:Array.isArray(r.specialties)&&r.specialties.length?r.specialties:DEFAULT_DATA.specialties,
    services:Array.isArray(r.services)&&r.services.length?r.services:DEFAULT_DATA.services,
    clinic:{...DEFAULT_DATA.clinic,...(r.clinic||{})},
    articles:Array.isArray(r.articles)?r.articles:DEFAULT_DATA.articles
  };
}
function nonGeneric(value,fallback,genericList=[]){
  const v=String(value??'').trim();
  return v && !genericList.includes(v) ? v : fallback;
}
async function render(){
 DATA=mergeWithDefaults(await loadData());DATA.clinic={...DEFAULT_DATA.clinic,...(DATA.clinic||{})};DATA.clinic.zalo=DATA.clinic.zalo||DEFAULT_DATA.clinic.zalo;DATA.clinic.phone=DATA.clinic.phone||DEFAULT_DATA.clinic.phone;DATA.clinic.address=DATA.clinic.address||DEFAULT_DATA.clinic.address;DATA.clinic.info=DATA.clinic.info||DEFAULT_DATA.clinic.info;DATA.clinic.intro=DATA.clinic.intro||DEFAULT_DATA.clinic.intro;DATA.clinic.booking=DATA.clinic.booking||DEFAULT_DATA.clinic.booking;DATA.clinic.hours=DATA.clinic.hours||DEFAULT_DATA.clinic.hours;DATA.clinic.facebook=DATA.clinic.facebook||DEFAULT_DATA.clinic.facebook; if(DATA.clinic.zalo==='http://zaloapp.com/qr/p/quocjkn8vcrk') DATA.clinic.zalo='https://zalo.me/84946444812';DATA.clinic.zaloQr=DATA.clinic.zaloQr||'zalo-qr.jpg';DATA.clinic.images=Array.isArray(DATA.clinic.images)?DATA.clinic.images:['','','',''];DATA.clinic.weeklyScheduleImage=DATA.clinic.weeklyScheduleImage||'';DATA.clinic.tagline=DATA.clinic.tagline||'Điều trị bằng tri thức, chăm sóc từ trái tim';DATA.clinic.logo=DATA.clinic.logo||'clinic-logo.png';
 document.getElementById('year').textContent=new Date().getFullYear();const profileImg=document.getElementById('profileImage'),profileAvatar=document.getElementById('profileAvatar');const profileSrc=String(DATA.site.profileImage||'').trim();if(profileImg){if(profileSrc){profileImg.src=optimizeImageUrl(profileSrc,700,78);profileImg.classList.add('show');profileImg.onerror=()=>{profileImg.classList.remove('show');if(profileAvatar)profileAvatar.style.display='grid'};}else{profileImg.classList.remove('show');profileImg.removeAttribute('src');}if(profileAvatar)profileAvatar.style.display=profileSrc?'none':'grid'}const bioEl=document.getElementById('bioText');if(bioEl) bioEl.textContent=nonGeneric(DATA.site.bioText,DEFAULT_DATA.site.bioText,['Nội dung giới thiệu BS Lê Nam Hùng sẽ được cập nhật.']);const careerEl=document.getElementById('careerText');if(careerEl) careerEl.textContent=nonGeneric(DATA.site.careerText,DEFAULT_DATA.site.careerText,['Thông tin quá trình công tác sẽ được cập nhật.']);const expertiseEl=document.getElementById('expertiseText');if(expertiseEl) expertiseEl.textContent=nonGeneric(DATA.site.expertiseText,DEFAULT_DATA.site.expertiseText,['Nội dung chuyên môn sẽ được cập nhật.']);const researchEl=document.getElementById('researchText');if(researchEl) researchEl.textContent=nonGeneric(DATA.site.researchText,DEFAULT_DATA.site.researchText,['Thông tin nghiên cứu khoa học sẽ được cập nhật.']);const aboutImageMap={bioText:'bioImage',careerText:'careerImage',expertiseText:'expertiseImage',researchText:'researchImage'};Object.entries(aboutImageMap).forEach(([key,imgKey])=>{const wrap=document.querySelector(`[data-about-key="${key}"] .about-card-media`),img=document.querySelector(`[data-about-img="${key}"]`),ph=wrap?.querySelector('.about-photo-placeholder');const src=String(DATA.site?.[imgKey]||'').trim();if(img){if(src){img.src=optimizeImageUrl(src,600,72);img.style.display='block';if(ph)ph.style.display='none';img.onerror=()=>{img.style.display='none';if(ph)ph.style.display='grid'}}else{img.removeAttribute('src');img.style.display='none';if(ph)ph.style.display='grid'}}});const logo=document.getElementById('clinicLogo');if(logo){logo.src=optimizeImageUrl(DATA.clinic.logo||'clinic-logo.png',1000,80);logo.alt='Phòng khám chuyên khoa Phụ sản BS Hùng - '+(DATA.clinic.tagline||'Điều trị bằng tri thức, chăm sóc từ trái tim')}const info=document.getElementById('clinicInfo');if(info)info.textContent=nonGeneric(DATA.clinic.info,DEFAULT_DATA.clinic.info,['Thông tin giới thiệu phòng khám sẽ được cập nhật.']);const addr=document.getElementById('clinicAddress');if(addr)addr.textContent=nonGeneric(DATA.clinic.address,DEFAULT_DATA.clinic.address,['Địa chỉ phòng khám sẽ được cập nhật.']);const hours=document.getElementById('clinicHours');if(hours){const rawHours=nonGeneric(DATA.clinic.hours,DEFAULT_DATA.clinic.hours,['Thông tin thời gian khám sẽ được cập nhật.','Thời gian khám sẽ được cập nhật.']);const urlRe=/https?:\/\/[^\s<]+/g;const lines=String(rawHours).split(/\r?\n/);hours.innerHTML=lines.map(line=>{const m=line.match(urlRe);if(!m)return esc(line);const url=m[0].replace(/[),.;]+$/,'');const label=line.replace(m[0],'').trim()||'Đánh giá phòng khám trên Google Maps';return esc(label)+' <a class="clinic-review-link" href="'+esc(url)+'" target="_blank" rel="noopener">Đánh giá trên Google Maps ↗</a>';}).join('<br>');}const booking=document.getElementById('bookingText');if(booking)booking.textContent=DATA.clinic.booking;const gallery=document.getElementById('clinicGallery');if(gallery){const pics=Array.isArray(DATA.clinic.images)?DATA.clinic.images.slice(0,4):['','','',''];gallery.innerHTML=pics.map((src,i)=>src?`<img src="${esc(optimizeImageUrl(src,800,72))}" alt="Ảnh phòng khám ${i+1}" loading="lazy">`:`<div class="clinic-photo-placeholder"><span>📷</span><small>Ảnh phòng khám ${i+1}</small></div>`).join('')}const ws=document.getElementById('weeklyScheduleWrap'),wsi=document.getElementById('weeklyScheduleImage'),wse=document.getElementById('weeklyScheduleEmpty');if(ws&&wsi){if(DATA.clinic.weeklyScheduleImage){wsi.src=optimizeImageUrl(DATA.clinic.weeklyScheduleImage,1000,72);wsi.style.display='block';if(wse)wse.style.display='none'}else{wsi.removeAttribute('src');wsi.style.display='none';if(wse)wse.style.display='flex'}}
 const sg=document.getElementById('specialtyGrid');sg.innerHTML=DATA.specialties.map(x=>`<a class="specialty-card" href="#articles" data-specialty="${esc(x.name)}"><div class="specialty-icon">${esc(x.icon)}</div><h3>${esc(x.name)}</h3><p>${esc(x.desc)}</p></a>`).join('');
 const svc=document.getElementById('serviceGrid');const services=(DATA.services||[]).map(x=>typeof x==='string'?{name:x,desc:''}:x).filter(x=>x.published!==false);svc.innerHTML=services.map(x=>`<div class="service-item"><i>✓</i><div><strong>${esc(x.name||'')}</strong>${x.desc?`<small>${esc(x.desc)}</small>`:''}</div></div>`).join('');
 const addressMapLink=document.getElementById('addressMapLink');if(addressMapLink){addressMapLink.href='#clinicMapCard'}const phone=document.getElementById('phoneBtn'),z=document.getElementById('zaloBtn'),fb=document.getElementById('facebookBtn');if(DATA.clinic.phone){phone.href='tel:'+DATA.clinic.phone;phone.textContent='Gọi '+DATA.clinic.phone}else{phone.href='#contact'}if(DATA.clinic.zalo){z.href=DATA.clinic.zalo;z.target='_blank'}else{z.href='#contact'}const fbUrl=String(DATA.clinic.facebook||'').trim();if(fb){if(fbUrl){fb.href=fbUrl;fb.target='_blank';fb.rel='noopener'}else{fb.href='#contact'}}const qr=document.getElementById('zaloQr'),qrLink=document.getElementById('zaloQrLink');if(DATA.clinic.zaloQr)qr.src=DATA.clinic.zaloQr;if(DATA.clinic.zalo){qrLink.href=DATA.clinic.zalo;qrLink.target='_blank'}if(qr){qr.style.cursor='pointer';qr.onclick=()=>{if(DATA.clinic.zalo)window.open(DATA.clinic.zalo,'_blank')}}const mapFrame=document.getElementById('clinicMap'),mapEmpty=document.getElementById('mapEmpty'),mapDirections=document.getElementById('mapDirectionsBtn'),mapAddressText=document.getElementById('mapAddressText');const clinicAddress=String(DATA.clinic.address||'').trim();const customMap=String(DATA.clinic.mapUrl||'').trim();const directionUrl=customMap|| (clinicAddress?'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(clinicAddress):'');if(mapAddressText)mapAddressText.textContent=clinicAddress||'Xem vị trí và hướng dẫn đường đi đến phòng khám.';if(mapDirections){if(directionUrl){mapDirections.href=directionUrl;mapDirections.classList.remove('disabled')}else{mapDirections.href='#';mapDirections.classList.add('disabled')}}if(mapFrame){if(customMap){mapFrame.src='https://www.google.com/maps?q=16.8041129,107.1140670&output=embed';if(mapEmpty)mapEmpty.hidden=true}else if(clinicAddress){mapFrame.src='https://www.google.com/maps?q='+encodeURIComponent(clinicAddress)+'&output=embed';if(mapEmpty)mapEmpty.hidden=true}else{mapFrame.src='about:blank';if(mapEmpty)mapEmpty.hidden=false}}
 const acts=document.getElementById('contactActions');acts.innerHTML='';if(DATA.clinic.phone)acts.innerHTML+=`<a class="btn primary" href="tel:${esc(DATA.clinic.phone)}"><svg class="social-icon phone-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.8c.4-.4 1-.5 1.5-.3l2.1.9c.5.2.8.6.9 1.1l.7 2.5c.1.4 0 .9-.2 1.2l-1.4 1.4c1 2 2.5 3.5 4.5 4.5l1.4-1.4c.3-.3.8-.4 1.2-.2l2.5.7c.5.1.9.5 1.1.9l.9 2.1c.2.5.1 1.1-.3 1.5l-1.4 1.4c-.5.5-1.2.7-1.9.5-3.1-.8-6.1-2.5-8.5-4.9s-4.1-5.4-4.9-8.5c-.2-.7 0-1.4.5-1.9L6.6 3.8z" fill="currentColor"/></svg><span>Gọi điện</span></a>`;if(DATA.clinic.zalo)acts.innerHTML+=`<a class="btn secondary" href="${esc(DATA.clinic.zalo)}" target="_blank" rel="noopener"><svg class="social-icon zalo-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="M4 7.5A3.5 3.5 0 0 1 7.5 4h17A3.5 3.5 0 0 1 28 7.5v12a3.5 3.5 0 0 1-3.5 3.5H15l-5.5 5V23H7.5A3.5 3.5 0 0 1 4 19.5v-12z" fill="#1877F2"/><text x="16" y="17.1" text-anchor="middle" font-size="8.5" font-family="Arial, sans-serif" font-weight="800" fill="#fff">ZALO</text></svg><span>Zalo</span></a>`;if(DATA.clinic.facebook)acts.innerHTML+=`<a class="btn secondary facebook-link" href="${esc(DATA.clinic.facebook)}" target="_blank" rel="noopener"><svg class="social-icon facebook-icon" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="#1877F2"></circle><path d="M19.1 17.7l.55-3.58h-3.44v-2.32c0-.98.48-1.93 2.02-1.93h1.56V6.89s-1.42-.24-2.78-.24c-2.84 0-4.7 1.72-4.7 4.83v2.64H9.15v3.58h3.16V25h3.9v-7.3h2.89z" fill="#fff"></path></svg><span>Facebook</span></a>`;
 renderArticles();bindSpecialties();bindAboutCards();loadArticleViewTotal();
}
function aboutTitle(key){return ({bioText:'Giới thiệu bác sĩ',careerText:'Quá trình công tác',expertiseText:'Chuyên môn',researchText:'Nghiên cứu khoa học'})[key]||'Thông tin';}
function openAboutInfo(key){const text=String(DATA.site?.[key]||'').trim()||'Nội dung đang được cập nhật.';const imageKey={bioText:'bioImage',careerText:'careerImage',expertiseText:'expertiseImage',researchText:'researchImage'}[key];const image=String(DATA.site?.[imageKey]||'').trim();let m=document.getElementById('aboutModal');if(!m){m=document.createElement('div');m.id='aboutModal';m.className='article-modal';m.innerHTML='<div class="article-modal-backdrop"></div><div class="article-modal-card about-modal-card"><button class="article-modal-close" aria-label="Đóng">×</button><div class="about-modal-content"></div></div>';document.body.appendChild(m);m.querySelector('.article-modal-close').onclick=()=>m.classList.remove('show');m.querySelector('.article-modal-backdrop').onclick=()=>m.classList.remove('show');}const fallbackImage=String(DATA.site?.profileImage||'').trim();const safeImage=image||fallbackImage;const imageHtml=safeImage?`<img class="about-modal-image" src="${esc(optimizeImageUrl(safeImage,900,78))}" alt="${esc(aboutTitle(key))}" loading="eager" decoding="async">`:'';m.querySelector('.about-modal-content').innerHTML=`<div class="article-tag">HỒ SƠ CHUYÊN MÔN</div><h2>${esc(aboutTitle(key))}</h2>${imageHtml}<div class="about-full">${esc(text).replace(/\n/g,'<br>')}</div>`;const modalImg=m.querySelector('.about-modal-image');if(modalImg){modalImg.onerror=()=>{if(fallbackImage&&modalImg.src!==fallbackImage){modalImg.src=fallbackImage}else{modalImg.style.display='none'}}}m.classList.add('show');}
function bindAboutCards(){document.querySelectorAll('[data-about-key]').forEach(el=>el.addEventListener('click',()=>openAboutInfo(el.dataset.aboutKey)));}
const ARTICLES_PER_PAGE=9;
let currentArticlePage=1;
let currentArticleFilter='';

function normalizeSearchText(value){
  return String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()
    .replace(/\bquy\s+i\b/g,'quy 1').replace(/\bquy\s+ii\b/g,'quy 2').replace(/\bquy\s+iii\b/g,'quy 3')
    .replace(/\bquy\s+iv\b/g,'quy 4').replace(/\bquy\s+v\b/g,'quy 5').replace(/\s+/g,' ').trim();
}
function getFilteredArticles(filter=''){
  const q=normalizeSearchText(document.getElementById('searchInput')?.value||'');
  const tokens=q.split(/\s+/).filter(Boolean);
  const rows=(DATA.articles||[]).filter(a=>a.published!==false&&(!filter||a.specialty===filter));
  if(!q)return rows;
  return rows.map(a=>{
    const title=normalizeSearchText(a.title||''),desc=normalizeSearchText(a.desc||''),specialty=normalizeSearchText(a.specialty||''),keywords=normalizeSearchText(a.keywords||'');
    const haystack=title+' '+desc+' '+specialty+' '+keywords;
    const allTerms=tokens.every(t=>haystack.includes(t));
    if(!allTerms)return null;
    let score=0;
    if(title.includes(q))score+=100;
    if(title.split(' ').some(word=>word===q))score+=40;
    tokens.forEach(t=>{if(title.includes(t))score+=15;if(desc.includes(t))score+=5;if(keywords.includes(t))score+=3});
    return {a,score};
  }).filter(Boolean).sort((x,y)=>y.score-x.score).map(x=>x.a);
}

function renderPagination(totalPages){
  let wrap=document.getElementById('articlePagination');
  if(!wrap){
    wrap=document.createElement('nav');
    wrap.id='articlePagination';
    wrap.className='article-pagination';
    wrap.setAttribute('aria-label','Phân trang bài viết');
    const grid=document.getElementById('articleGrid');
    grid?.after(wrap);
  }
  if(totalPages<=1){wrap.innerHTML='';wrap.hidden=true;return;}
  wrap.hidden=false;
  const buttons=[];
  buttons.push('<button type="button" class="page-btn prev" data-page="'+(currentArticlePage-1)+'" '+(currentArticlePage===1?'disabled':'')+' aria-label="Trang trước">‹ Trước</button>');
  const maxVisible=5;
  let start=Math.max(1,currentArticlePage-Math.floor(maxVisible/2));
  let end=Math.min(totalPages,start+maxVisible-1);
  if(end-start+1<maxVisible)start=Math.max(1,end-maxVisible+1);
  if(start>1){buttons.push('<button type="button" class="page-btn" data-page="1">1</button>');if(start>2)buttons.push('<span class="page-ellipsis">…</span>');}
  for(let p=start;p<=end;p++)buttons.push('<button type="button" class="page-btn '+(p===currentArticlePage?'active':'')+'" data-page="'+p+'" aria-current="'+(p===currentArticlePage?'page':'false')+'">'+p+'</button>');
  if(end<totalPages){if(end<totalPages-1)buttons.push('<span class="page-ellipsis">…</span>');buttons.push('<button type="button" class="page-btn" data-page="'+totalPages+'">'+totalPages+'</button>');}
  buttons.push('<button type="button" class="page-btn next" data-page="'+(currentArticlePage+1)+'" '+(currentArticlePage===totalPages?'disabled':'')+' aria-label="Trang sau">Sau ›</button>');
  wrap.innerHTML=buttons.join('');
  wrap.querySelectorAll('.page-btn[data-page]').forEach(btn=>btn.addEventListener('click',()=>{
    if(btn.disabled)return;
    const p=Number(btn.dataset.page);if(!p||p===currentArticlePage)return;
    currentArticlePage=p;renderArticles(currentArticleFilter,true);
  }));
}

function renderArticles(filter='',keepPage=false){
  if(filter!==currentArticleFilter){currentArticleFilter=filter;currentArticlePage=1;}
  const rows=getFilteredArticles(currentArticleFilter);
  const totalPages=Math.max(1,Math.ceil(rows.length/ARTICLES_PER_PAGE));
  if(currentArticlePage>totalPages)currentArticlePage=totalPages;
  const start=(currentArticlePage-1)*ARTICLES_PER_PAGE;
  const pageRows=rows.slice(start,start+ARTICLES_PER_PAGE);
  const grid=document.getElementById('articleGrid');
  grid.innerHTML=pageRows.map((a)=>{const u='bai-viet/'+encodeURIComponent(articleSlug(a))+'.html';return '<article class="article-card"><div class="body">'+(a.image?'<img src="'+esc(optimizeImageUrl(a.image,720,70))+'" alt="'+esc(a.title)+'" loading="lazy" decoding="async">':'')+'<div class="article-tag">'+esc(a.specialty)+'</div><h3>'+esc(a.title)+'</h3><p>'+esc(a.desc)+'</p><a href="'+esc(u)+'">Đọc bài viết →</a></div></article>'}).join('');
  document.getElementById('emptyState').hidden=rows.length>0;
  renderPagination(totalPages);
  if(keepPage)document.getElementById('articles')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function openArticle(a){const slug=articleSlug(a);if(!slug)return;window.location.href='bai-viet/'+encodeURIComponent(slug)+'.html';}
function bindSpecialties(){document.querySelectorAll('.specialty-card').forEach(el=>el.addEventListener('click',()=>{const f=el.dataset.specialty;setTimeout(()=>renderArticles(f),50)}));}
bindContactTracking();document.getElementById('searchInput')?.addEventListener('input',()=>renderArticles());document.getElementById('navToggle')?.addEventListener('click',()=>{const n=document.getElementById('mainNav'),b=document.getElementById('navToggle');const open=n?.classList.toggle('open');if(b)b.setAttribute('aria-expanded',String(!!open));});document.querySelectorAll('#mainNav a').forEach(a=>a.addEventListener('click',()=>{document.getElementById('mainNav')?.classList.remove('open');document.getElementById('navToggle')?.setAttribute('aria-expanded','false')}));render();

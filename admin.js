const DEFAULT={site:{profileImage:'',bioText:'Nội dung giới thiệu BS Lê Nam Hùng sẽ được cập nhật.',careerText:'Thông tin quá trình công tác sẽ được cập nhật.',expertiseText:'Sản khoa, Phụ khoa, Vô sinh – Hiếm muộn, Siêu âm, Hậu sản.',researchText:'Thông tin nghiên cứu khoa học sẽ được cập nhật.',bioImage:'',careerImage:'',expertiseImage:'',researchImage:''},specialties:[{name:'Sản khoa',icon:'🤰',desc:'Thai kỳ, theo dõi thai và chăm sóc mẹ.'},{name:'Phụ khoa',icon:'🩺',desc:'Khám, tư vấn và các bệnh lý phụ khoa.'},{name:'Vô sinh – Hiếm muộn',icon:'🌱',desc:'Tư vấn sức khỏe sinh sản và hiếm muộn.'},{name:'Siêu âm',icon:'🖥️',desc:'Siêu âm và giải thích các thông tin cần lưu ý.'},{name:'Hậu sản',icon:'🌿',desc:'Chăm sóc mẹ sau sinh và các vấn đề hậu sản.'}],services:['Khám Sản khoa','Khám Phụ khoa','Vô sinh – Hiếm muộn','Siêu âm','Hậu sản'],clinic:{intro:'',info:'',booking:'',phone:'',zalo:'http://zaloapp.com/qr/p/quocjkn8vcrk',facebook:'https://www.facebook.com/DrLeNamHung/',zaloQr:'zalo-qr.jpg',address:'',hours:'',weeklyScheduleImage:'',images:['','','',''],logo:'clinic-logo.png',tagline:'Điều trị bằng tri thức, chăm sóc từ trái tim',mapUrl:'https://www.google.com/maps?q=16.8041129,107.1140670&entry=gps&shh=CAE&lucs=,94297699,94231188,94280568,47071704,94218641,94282134,94286869,100820247,100822499&g_ep=CAISEjI2LjMzLjEuOTYxODkxNDMyMBgAINeCAypTLDk0Mjk3Njk5LDk0MjMxMTg4LDk0MjgwNTY4LDQ3MDcxNzA0LDk0MjE4NjQxLDk0MjgyMTM0LDk0Mjg2ODY5LDEwMDgyMDI0NywxMDA4MjI0OTlCAlZO&skid=98e6f880-314f-4606-8230-22855b908a10&g_st=iz'},articles:[]};
let client=null,D=structuredClone(DEFAULT),editingArticleIndex=-1,ARTICLE_VIEWS={};
const $=id=>document.getElementById(id);
const cloneDefault=()=>JSON.parse(JSON.stringify(DEFAULT));
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function articleId(a){if(a&&a.id)return String(a.id);const t=String(a?.title||'').trim();let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}return 'legacy-'+(h>>>0).toString(36)}
function ensureData(){const base=cloneDefault();D={...base,...D,site:{...base.site,...(D.site||{})},clinic:{...base.clinic,...(D.clinic||{})},specialties:Array.isArray(D.specialties)?D.specialties:[],services:Array.isArray(D.services)?D.services:[],articles:Array.isArray(D.articles)?D.articles:[]};D.clinic.images=Array.isArray(D.clinic.images)?D.clinic.images:['','','',''];D.clinic.weeklyScheduleImage=D.clinic.weeklyScheduleImage||'';D.site.bioImage=D.site.bioImage||'';D.site.careerImage=D.site.careerImage||'';D.site.expertiseImage=D.site.expertiseImage||'';D.site.researchImage=D.site.researchImage||'';D.services=D.services.map(x=>typeof x==='string'?{name:x,desc:'',published:true}:({...x,name:x.name||'Dịch vụ mới',desc:x.desc||'',published:x.published!==false}));D.articles=D.articles.map(x=>({...x,id:x.id||articleId(x),seoTitle:x.seoTitle||'',seoDescription:x.seoDescription||'',keywords:x.keywords||'',seoImage:x.seoImage||''}));}
function setStatus(text,ok=true){const e=$('status');e.textContent=text;e.hidden=false;e.className='status '+(ok?'ok':'err');clearTimeout(setStatus.t);setStatus.t=setTimeout(()=>e.hidden=true,4200)}
function gotoSection(name){document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.section===name));document.querySelectorAll('.admin-section').forEach(s=>s.classList.toggle('active',s.dataset.section===name));window.scrollTo({top:0,behavior:'smooth'})}
async function isAdmin(){const {data,error}=await client.rpc('is_admin');return {ok:!error&&data===true,error:error?.message||null}}
async function boot(){if(!window.supabase||!window.SUPABASE_URL?.startsWith('http')){location.href='admin-login.html';return}client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY);const {data:{session}}=await client.auth.getSession();if(!session){location.href='admin-login.html';return}const guard=await isAdmin();if(!guard.ok){setStatus('Tài khoản này không có quyền quản trị.',false);await client.auth.signOut();setTimeout(()=>location.href='admin-login.html',1000);return}const {data,error}=await client.from('site_content').select('content').eq('id',1).maybeSingle();if(error){setStatus('Không đọc được dữ liệu: '+error.message,false);return}if(data?.content)D=data.content;ensureData();renderAll().catch(err=>setStatus('Lỗi tải quản trị: '+(err?.message||err),false))}
async function renderStats(){
  ensureData();
  $('statSpecialties').textContent=Array.isArray(D.specialties)?D.specialties.length:0;
  $('statServices').textContent=Array.isArray(D.services)?D.services.length:0;
  $('statArticles').textContent=Array.isArray(D.articles)?D.articles.length:0;
  $('statPublished').textContent=(D.articles||[]).filter(x=>x.published!==false).length;
  ARTICLE_VIEWS={};
  try{
    const {data,error}=await client.from('site_visit_stats').select('total_visits,today_visits,month_visits').eq('id',1).maybeSingle();
    if(error) throw error;
    $('statVisitsTotal').textContent=Number(data?.total_visits||0).toLocaleString('vi-VN');
    $('statVisitsToday').textContent=Number(data?.today_visits||0).toLocaleString('vi-VN');
    $('statVisitsMonth').textContent=Number(data?.month_visits||0).toLocaleString('vi-VN');
  }catch(e){ console.warn('Không đọc được thống kê lượt truy cập:',e); }
  try{
    const {data,error}=await client.from('article_view_stats').select('article_id,title,view_count');
    if(error) throw error;
    (data||[]).forEach(x=>ARTICLE_VIEWS[String(x.article_id)]=Number(x.view_count||0));
    const total=(data||[]).reduce((n,x)=>n+Number(x.view_count||0),0);
    $('statArticleViews').textContent=total.toLocaleString('vi-VN');
  }catch(e){ console.warn('Không đọc được thống kê bài viết:',e); }
}

function renderClinic(){
  ensureData();
  const c=D.clinic||{};
  const set=(id,v)=>{const el=$(id); if(el) el.value=v??"";};
  set("clinicTagline",c.tagline||"Điều trị bằng tri thức, chăm sóc từ trái tim");
  set("clinicLogoUrl",c.logo||"clinic-logo.png");
  set("clinicInfo",c.info||"");
  set("bookingText",c.booking||"");
  set("address",c.address||"");
  set("hours",c.hours||"");
  set("weeklyScheduleUrl",c.weeklyScheduleImage||"");
  set("phone",c.phone||"");
  set("zalo",c.zalo||"");
  set("facebook",c.facebook||"https://www.facebook.com/DrLeNamHung/");
  set("zaloQr",c.zaloQr||"zalo-qr.jpg");
  set("mapUrl",c.mapUrl||"");
  const lp=$("clinicLogoPreview"); if(lp){lp.src=c.logo||"clinic-logo.png";lp.style.display="block";}
  const pics=Array.isArray(c.images)?c.images:["","","",""];
  for(let i=1;i<=4;i++){const u=$("clinicImage"+i+"Url"),im=$("clinicImage"+i+"Preview"); if(u)u.value=pics[i-1]||""; if(im){im.src=pics[i-1]||"";im.style.display=pics[i-1]?"block":"none";}}
  const ws=$("weeklySchedulePreview"); if(ws){ws.src=c.weeklyScheduleImage||"";ws.style.display=c.weeklyScheduleImage?"block":"none";}
}
function collect(){
  ensureData();
  D.site.bioText=$("bioText")?.value||"";
  D.site.careerText=$("careerText")?.value||"";
  D.site.expertiseText=$("expertiseText")?.value||"";
  D.site.researchText=$("researchText")?.value||"";D.site.bioImage=$("bioImage")?.value?.trim()||"";D.site.careerImage=$("careerImage")?.value?.trim()||"";D.site.expertiseImage=$("expertiseImage")?.value?.trim()||"";D.site.researchImage=$("researchImage")?.value?.trim()||"";
  const pu=$("profileImageUrl"); if(pu)D.site.profileImage=pu.value.trim();
  const specNames=[...document.querySelectorAll('[data-spec="name"]')];
  D.specialties=specNames.map((el,i)=>({name:el.value.trim()||"Chuyên môn mới",icon:document.querySelector(`[data-spec="icon"][data-i="${i}"]`)?.value||"＋",desc:document.querySelector(`[data-spec="desc"][data-i="${i}"]`)?.value||""}));
  const svcNames=[...document.querySelectorAll('[data-svc="name"]')];
  D.services=svcNames.map((el,i)=>({name:el.value.trim()||"Dịch vụ mới",desc:document.querySelector(`[data-svc="desc"][data-i="${i}"]`)?.value||"",published:document.querySelector(`[data-svc-pub="${i}"]`)?.checked!==false}));
  D.clinic.tagline=$("clinicTagline")?.value?.trim()||"";
  D.clinic.logo=$("clinicLogoUrl")?.value?.trim()||"clinic-logo.png";
  D.clinic.info=$("clinicInfo")?.value||"";
  D.clinic.booking=$("bookingText")?.value||"";
  D.clinic.address=$("address")?.value||"";
  D.clinic.hours=$("hours")?.value||"";
  D.clinic.weeklyScheduleImage=$("weeklyScheduleUrl")?.value?.trim()||"";
  D.clinic.phone=$("phone")?.value||"";
  D.clinic.zalo=$("zalo")?.value||"";
  D.clinic.facebook=$("facebook")?.value?.trim()||"https://www.facebook.com/DrLeNamHung/";
  D.clinic.zaloQr=$("zaloQr")?.value?.trim()||"zalo-qr.jpg";
  D.clinic.mapUrl=$("mapUrl")?.value?.trim()||"";
  D.clinic.images=[]; for(let i=1;i<=4;i++)D.clinic.images.push($("clinicImage"+i+"Url")?.value?.trim()||"");
}
async function uploadPublicImage(file,folder){
  if(!file)throw new Error("Chưa chọn ảnh.");
  if(!/^image\/(png|jpeg|webp)$/.test(file.type))throw new Error("Chỉ hỗ trợ JPG, PNG hoặc WebP.");
  if(file.size>8*1024*1024)throw new Error("Ảnh tối đa 8 MB.");
  const g=await isAdmin();if(!g.ok)throw new Error("Phiên quản trị không hợp lệ.");
  const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
  const path=`${String(folder||"media").replace(/[^a-z0-9_-]/gi,"-")}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  const {error}=await client.storage.from("site-media").upload(path,file,{upsert:false,cacheControl:"3600",contentType:file.type});
  if(error)throw error;
  const {data}=client.storage.from("site-media").getPublicUrl(path);
  if(!data?.publicUrl)throw new Error("Không lấy được URL ảnh.");
  return data.publicUrl;
}
function renderArticleCoverPreview(url){const root=$("articleCoverPreview");if(!root)return;root.innerHTML=url?`<img src="${esc(url)}" alt="Xem trước ảnh đại diện">`:"";}
function openArticleEditor(index=-1){
  editingArticleIndex=index;
  const a=index>=0?D.articles[index]:{title:"",specialty:D.specialties[0]?.name||"Sản khoa",desc:"",image:"",content:"",published:false,seoTitle:"",seoDescription:"",keywords:"",seoImage:""};
  $("modalTitle").textContent=index>=0?"Sửa bài viết":"Thêm bài viết";
  $("editTitle").value=a.title||""; $("editDesc").value=a.desc||""; $("editImage").value=a.image||"";
  $("editSeoTitle").value=a.seoTitle||""; $("editSeoDescription").value=a.seoDescription||""; $("editKeywords").value=a.keywords||"";
  $("editSeoImage").value=a.seoImage||a.image||"";
  $("editPublished").checked=a.published!==false;
  const sel=$("editSpecialty");sel.innerHTML=D.specialties.map(x=>`<option value="${esc(x.name)}">${esc(x.name)}</option>`).join("");sel.value=a.specialty||D.specialties[0]?.name||"";
  $("editContent").innerHTML=a.content||""; renderArticleCoverPreview(a.image||""); renderSeoImagePreview(a.seoImage||a.image||"");
  $("articleCoverStatus").textContent=""; $("articleSeoImageStatus").textContent=""; $("articleImageStatus").textContent=""; $("editorModal").hidden=false;
}
function closeArticleEditor(){ $("editorModal").hidden=true; editingArticleIndex=-1; }
async function renderAll(){renderAbout();renderSpecs();renderServices();renderClinic();await renderStats();renderArticlesList()}
function renderAbout(){$('bioText').value=D.site.bioText||'';$('careerText').value=D.site.careerText||'';$('expertiseText').value=D.site.expertiseText||'';$('researchText').value=D.site.researchText||'';const img=$('profileImagePreview'), fallback=$('profileImageFallback'), url=$('profileImageUrl'); const src=D.site.profileImage||''; if(url)url.value=src; if(img){img.src=src;img.classList.toggle('show',!!src); img.onerror=()=>{img.classList.remove('show'); if(fallback)fallback.style.display='grid';};} if(fallback){fallback.style.display=src?'none':'grid';}['bioImage','careerImage','expertiseImage','researchImage'].forEach(key=>{const urlEl=$(key),pre=$(key+'Preview'),ph=pre?.parentElement?.querySelector('span');const src2=D.site[key]||'';if(urlEl)urlEl.value=src2;if(pre){pre.src=src2||'';pre.style.display=src2?'block':'none';pre.onerror=()=>{pre.style.display='none';if(ph)ph.style.display='inline';};}if(ph)ph.style.display=src2?'none':'inline';});
}
async function uploadAboutImage(key){const file=$(key+'File')?.files?.[0],status=$(key+'Status');if(!file){if(status)status.textContent='Vui lòng chọn ảnh.';return}if(status)status.textContent='Đang tải ảnh lên...';try{const url=await uploadPublicImage(file,'about-'+key.replace('Image',''));D.site[key]=url;const u=$(key),pre=$(key+'Preview'),ph=pre?.parentElement?.querySelector('span');if(u)u.value=url;if(pre){pre.src=url;pre.style.display='block';}if(ph)ph.style.display='none';if(status)status.textContent='Đã tải ảnh. Hãy bấm “Lưu thay đổi”.'}catch(err){if(status)status.textContent='Tải ảnh thất bại: '+(err.message||err)}}
function renderSpecs(){const root=$('specList');if(!D.specialties.length){root.innerHTML='<div class="empty">Chưa có chuyên môn nào.</div>';return}root.innerHTML=D.specialties.map((x,i)=>`<div class="item"><input class="inline-input small" data-spec="icon" data-i="${i}" value="${esc(x.icon||'')}" aria-label="Biểu tượng"><div><input class="inline-input" data-spec="name" data-i="${i}" value="${esc(x.name||'')}" placeholder="Tên chuyên môn"><textarea class="inline-input" data-spec="desc" data-i="${i}" rows="2" placeholder="Mô tả ngắn">${esc(x.desc||'')}</textarea></div><div class="item-actions"><button class="danger-btn" data-del-spec="${i}">Xóa</button></div></div>`).join('');root.querySelectorAll('[data-del-spec]').forEach(b=>b.onclick=()=>{collect();const i=+b.dataset.delSpec;if(confirm('Xóa chuyên môn này? Các bài viết vẫn được giữ lại.')){D.specialties.splice(i,1);renderAll()}})}
function renderServices(){const root=$('serviceList');if(!D.services.length){root.innerHTML='<div class="empty">Chưa có dịch vụ.</div>';return}root.innerHTML=D.services.map((x,i)=>`<div class="service-admin-card"><div class="service-admin-main"><input class="inline-input" data-svc="name" data-i="${i}" value="${esc(x.name)}" placeholder="Tên dịch vụ"><textarea class="inline-input" data-svc="desc" data-i="${i}" rows="2" placeholder="Mô tả ngắn (không bắt buộc)">${esc(x.desc||'')}</textarea></div><label class="switch-row"><input type="checkbox" data-svc-pub="${i}" ${x.published!==false?'checked':''}><span>Hiển thị</span></label><button class="danger-btn" data-del-service="${i}">Xóa</button></div>`).join('');root.querySelectorAll('[data-del-service]').forEach(b=>b.onclick=()=>{collect();const i=+b.dataset.delService;if(confirm('Xóa dịch vụ này?')){D.services.splice(i,1);renderAll()}})}
function renderArticlesList(){const root=$('articleList');if(!D.articles.length){root.innerHTML='<div class="empty">Chưa có bài viết. Bấm “＋ Thêm bài viết” để bắt đầu.</div>';return}const list=[...D.articles].map((a,i)=>({a,i}));root.innerHTML=list.map(({a,i})=>{const v=Number(ARTICLE_VIEWS[articleId(a)]||0);return `<div class="article-row"><div class="article-row-copy"><div class="article-row-top"><span class="tag">${esc(a.specialty||'Chưa phân loại')}</span><span class="status-pill ${a.published!==false?'on':'off'}">${a.published!==false?'Đã xuất bản':'Bản nháp'}</span><span class="view-pill">👁️ ${v.toLocaleString('vi-VN')} lượt xem</span></div><h3>${esc(a.title||'Bài viết chưa có tiêu đề')}</h3><p>${esc(a.desc||'Chưa có mô tả ngắn.')}</p></div><div class="article-row-actions"><button type="button" class="secondary-btn article-edit-btn" data-edit-article="${i}" title="Sửa bài viết" aria-label="Sửa bài viết">✏️ Sửa</button><button type="button" class="danger-btn" data-del-article="${i}">Xóa</button></div></div>`}).join('');root.querySelectorAll('[data-edit-article]').forEach(b=>b.onclick=()=>openArticleEditor(+b.dataset.editArticle));root.querySelectorAll('[data-del-article]').forEach(b=>b.onclick=()=>{collect();const i=+b.dataset.delArticle;if(confirm('Xóa bài viết này?')){D.articles.splice(i,1);renderAll()}})}
async function uploadArticleCover(){
  const file=$('editImageFile')?.files?.[0], status=$('articleCoverStatus');
  if(!file){status.textContent='Vui lòng chọn ảnh đại diện.';return;}
  status.textContent='Đang tải ảnh đại diện lên...';
  try{const url=await uploadPublicImage(file,'cover');$('editImage').value=url;renderArticleCoverPreview(url);status.textContent='Đã tải ảnh. Anh có thể tiếp tục chỉnh bài rồi bấm “Lưu bài viết”.';}
  catch(err){status.textContent='Tải ảnh thất bại: '+(err.message||err);}}
async function insertArticleInlineImage(){
  const input=$('articleInlineImageFile'); if(!input) return;
  input.click();
}
async function handleInlineImageFile(){
  const input=$('articleInlineImageFile'), status=$('articleImageStatus'), file=input?.files?.[0];
  if(!file) return;
  status.textContent='Đang tải ảnh vào bài viết...';
  try{
    const url=await uploadPublicImage(file,'inline');
    $('editContent').focus();
    document.execCommand('insertImage',false,url);
    status.textContent='Đã chèn ảnh vào bài viết.';
  }catch(err){status.textContent='Không chèn được ảnh: '+(err.message||err);}
  input.value='';
}
function seoDefaultsFromCurrent(){
  const title=$("editTitle")?.value.trim()||"Bài viết";
  const desc=$("editDesc")?.value.trim()||"";
  const specialty=$("editSpecialty")?.value.trim()||"Sản khoa";
  return {
    seoTitle:(title+" | Th.BSNT Lê Nam Hùng").slice(0,65),
    seoDescription:(desc||`Kiến thức ${specialty} từ Th.BSNT Lê Nam Hùng.`).replace(/\s+/g," ").slice(0,160),
    keywords:[title,specialty,"Th.BSNT Lê Nam Hùng","Sản Phụ khoa Quảng Trị"].filter(Boolean).join(", "),
    seoImage:$("editImage")?.value.trim()||""
  };
}
const SEO_PRESETS={
  "Những điều cần lưu ý khi theo dõi thai kỳ":{seoTitle:"Những điều cần lưu ý khi theo dõi thai kỳ | Th.BSNT Lê Nam Hùng",seoDescription:"Những điều mẹ bầu cần lưu ý khi theo dõi thai kỳ, từ lịch khám, siêu âm đến các dấu hiệu bất thường cần được bác sĩ đánh giá.",keywords:"theo dõi thai kỳ, khám thai, thai kỳ, sản khoa, Quảng Trị",related:["Ngày dự sinh và tuổi thai","Các giai đoạn phát triển của thai","Đếm cử động thai"]},
  "Khi nào nên đi khám phụ khoa?":{seoTitle:"Khi nào nên đi khám phụ khoa? | Th.BSNT Lê Nam Hùng",seoDescription:"Những dấu hiệu và tình huống thường gặp khi phụ nữ nên đi khám phụ khoa để được thăm khám, tư vấn và theo dõi phù hợp.",keywords:"khám phụ khoa, khi nào nên khám phụ khoa, phụ khoa, chăm sóc sức khỏe phụ nữ, Quảng Trị",related:["Tình dục và thai kỳ","Ốm nghén và thai kỳ","Một số lưu ý sau khi mổ lấy thai giúp sản phụ phục hồi nhanh và tránh biến chứng"]},
  "Một số thông tin cơ bản về siêu âm thai":{seoTitle:"Siêu âm thai: một số thông tin cơ bản | Th.BSNT Lê Nam Hùng",seoDescription:"Một số thông tin cơ bản về siêu âm thai giúp mẹ bầu hiểu mục đích của từng lần siêu âm và những thông tin thường được bác sĩ đánh giá.",keywords:"siêu âm thai, siêu âm sản khoa, theo dõi thai, khám thai, Quảng Trị",related:["Các mốc khám thai quan trọng","Ngày dự sinh và tuổi thai","Các giai đoạn phát triển của thai"]},
  "Tư thế ngủ thích hợp cho bà bầu":{seoTitle:"Tư thế ngủ thích hợp cho bà bầu | Th.BSNT Lê Nam Hùng",seoDescription:"Gợi ý tư thế ngủ và một số lưu ý giúp bà bầu cảm thấy thoải mái hơn trong thai kỳ và có giấc ngủ tốt hơn.",keywords:"tư thế ngủ khi mang thai, bà bầu ngủ, thai kỳ, chăm sóc mẹ bầu, Quảng Trị",related:["Tăng cân trong thai kỳ","Ốm nghén và thai kỳ","Đếm cử động thai"]},
  "Tình dục và thai kỳ":{seoTitle:"Tình dục và thai kỳ: những điều cần biết | Th.BSNT Lê Nam Hùng",seoDescription:"Những điều cần biết về quan hệ tình dục trong thai kỳ, khi nào cần lưu ý và những trường hợp nên được bác sĩ tư vấn.",keywords:"tình dục và thai kỳ, quan hệ khi mang thai, thai kỳ, sản khoa, Quảng Trị",related:["Tư thế ngủ thích hợp cho bà bầu","Các mốc khám thai quan trọng","Khi nào nên đi khám phụ khoa?"]},
  "Đếm cử động thai":{seoTitle:"Đếm cử động thai: mẹ bầu cần biết gì? | Th.BSNT Lê Nam Hùng",seoDescription:"Hướng dẫn mẹ bầu hiểu ý nghĩa cử động thai và theo dõi vận động của em bé để nhận biết khi nào cần liên hệ cơ sở y tế.",keywords:"đếm cử động thai, thai máy, theo dõi thai, thai kỳ, Quảng Trị",related:["Các mốc khám thai quan trọng","Ngày dự sinh và tuổi thai","Tăng cân trong thai kỳ"]},
  "Tăng cân trong thai kỳ":{seoTitle:"Tăng cân trong thai kỳ: mẹ bầu cần lưu ý | Th.BSNT Lê Nam Hùng",seoDescription:"Tăng cân trong thai kỳ liên quan đến sức khỏe mẹ và thai nhi. Tìm hiểu những nguyên tắc theo dõi cân nặng và khi nào cần trao đổi với bác sĩ.",keywords:"tăng cân trong thai kỳ, tăng cân khi mang thai, dinh dưỡng thai kỳ, sản khoa, Quảng Trị",related:["Tư thế ngủ thích hợp cho bà bầu","Ốm nghén và thai kỳ","Đếm cử động thai"]},
  "Ốm nghén và thai kỳ":{seoTitle:"Ốm nghén và thai kỳ: những điều cần biết | Th.BSNT Lê Nam Hùng",seoDescription:"Hiểu về ốm nghén trong thai kỳ, những biểu hiện thường gặp và các dấu hiệu cần được thăm khám để bảo đảm an toàn cho mẹ và bé.",keywords:"ốm nghén, nghén khi mang thai, thai kỳ, sản khoa, Quảng Trị",related:["Tăng cân trong thai kỳ","Tư thế ngủ thích hợp cho bà bầu","Các mốc khám thai quan trọng"]},
  "Ngày dự sinh và tuổi thai":{seoTitle:"Ngày dự sinh và tuổi thai: cách hiểu đơn giản | Th.BSNT Lê Nam Hùng",seoDescription:"Tìm hiểu cách xác định tuổi thai, ngày dự sinh và những mốc thời gian quan trọng để theo dõi thai kỳ phù hợp.",keywords:"ngày dự sinh, tuổi thai, tính tuổi thai, khám thai, Quảng Trị",related:["Các mốc khám thai quan trọng","Các giai đoạn phát triển của thai","Đếm cử động thai"]},
  "Các giai đoạn phát triển của thai":{seoTitle:"Các giai đoạn phát triển của thai | Th.BSNT Lê Nam Hùng",seoDescription:"Khái quát các giai đoạn phát triển của thai trong thai kỳ và những thay đổi quan trọng mẹ bầu nên biết khi theo dõi em bé.",keywords:"phát triển thai nhi, các giai đoạn thai kỳ, thai nhi, sản khoa, Quảng Trị",related:["Các mốc khám thai quan trọng","Ngày dự sinh và tuổi thai","Một số thông tin cơ bản về siêu âm thai"]},
  "Một số lưu ý sau khi mổ lấy thai giúp sản phụ phục hồi nhanh và tránh biến chứng":{seoTitle:"Lưu ý sau mổ lấy thai để phục hồi tốt | Th.BSNT Lê Nam Hùng",seoDescription:"Một số lưu ý sau mổ lấy thai giúp sản phụ chăm sóc vết mổ, vận động và theo dõi các dấu hiệu bất thường trong giai đoạn hồi phục.",keywords:"chăm sóc sau mổ lấy thai, phục hồi sau sinh mổ, vết mổ lấy thai, hậu sản, Quảng Trị",related:["Khi nào nên đi khám phụ khoa?","Tình dục và thai kỳ","Các mốc khám thai quan trọng"]}
};
function getSeoPreset(){
  const title=$("editTitle")?.value.trim()||"";
  return SEO_PRESETS[title]||null;
}
function fillSeoSuggestions(){
  const preset=getSeoPreset();
  const d=preset?{seoTitle:preset.seoTitle,seoDescription:preset.seoDescription,keywords:preset.keywords,seoImage:$("editImage")?.value.trim()||""}:seoDefaultsFromCurrent();
  if($("editSeoTitle"))$("editSeoTitle").value=d.seoTitle;
  if($("editSeoDescription"))$("editSeoDescription").value=d.seoDescription;
  if($("editKeywords"))$("editKeywords").value=d.keywords;
  if($("editSeoImage")&&!$("editSeoImage").value.trim()){$("editSeoImage").value=d.seoImage;renderSeoImagePreview(d.seoImage);}
  const rel=preset?.related||[];
  if($("seoRelatedSuggestions"))$("seoRelatedSuggestions").innerHTML=rel.length?('<strong>🔗 Gợi ý liên kết nội bộ:</strong> '+rel.map(x=>`<span class="seo-related-chip">${esc(x)}</span>`).join(' ')):'<span>Chưa có gợi ý cho bài này.</span>';
  if($("articleSeoStatus"))$("articleSeoStatus").textContent=preset?"✅ Đã áp dụng bộ SEO mẫu cho bài viết này.":"✅ Đã tạo gợi ý SEO tổng quát. Anh có thể chỉnh lại trước khi lưu.";
}
function renderSeoImagePreview(url){const root=$("articleSeoImagePreview");if(!root)return;root.innerHTML=url?`<img src="${esc(url)}" alt="Xem trước ảnh SEO">`:"";}
async function uploadArticleSeoImage(){
  const file=$("editSeoImageFile")?.files?.[0],status=$("articleSeoImageStatus");
  if(!file){if(status)status.textContent="Vui lòng chọn ảnh SEO.";return;}
  if(status)status.textContent="Đang tải ảnh SEO lên...";
  try{const url=await uploadPublicImage(file,'seo');$("editSeoImage").value=url;renderSeoImagePreview(url);status.textContent="✅ Đã tải ảnh SEO. Hãy lưu bài viết.";}catch(err){status.textContent='Tải ảnh thất bại: '+(err.message||err);}
}
function saveArticleFromModal(){
  collect();
  const current=editingArticleIndex>=0?D.articles[editingArticleIndex]:null;
  const title=$("editTitle").value.trim()||"Bài viết mới";
  const cover=$("editImage").value.trim();
  const published=$("editPublished").checked;
  const now=new Date().toISOString();
  const createdAt=current?.createdAt||now;
  const publishedAt=published ? (current?.publishedAt||now) : (current?.publishedAt||'');
  const obj={id:current?.id||('art-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)),title,specialty:$("editSpecialty").value||D.specialties[0]?.name||"Sản khoa",desc:$("editDesc").value.trim(),image:cover,content:$("editContent").innerHTML.trim(),published,seoTitle:$("editSeoTitle").value.trim()||seoDefaultsFromCurrent().seoTitle,seoDescription:$("editSeoDescription").value.trim()||seoDefaultsFromCurrent().seoDescription,keywords:$("editKeywords").value.trim()||seoDefaultsFromCurrent().keywords,seoImage:$("editSeoImage").value.trim()||cover,updatedAt:now,createdAt,publishedAt};
  if(editingArticleIndex<0)D.articles.unshift(obj);else D.articles[editingArticleIndex]=obj;
  closeArticleEditor();renderAll();gotoSection('articles');setStatus('Đã cập nhật bài viết trong bộ nhớ. Hãy bấm “Lưu thay đổi” để ghi lên hệ thống.')
}

async function uploadClinicLogo(){const file=$('clinicLogoFile')?.files?.[0],status=$('clinicLogoStatus');if(!file){if(status)status.textContent='Vui lòng chọn logo.';return}if(status)status.textContent='Đang tải logo lên...';try{const url=await uploadPublicImage(file,'clinic-logo');$('clinicLogoUrl').value=url;$('clinicLogoPreview').src=url;$('clinicLogoPreview').style.display='block';status.textContent='Đã tải logo. Đang lưu lên hệ thống...';await saveClinicOnly();status.textContent='✅ Đã tải và lưu logo phòng khám.'}catch(err){status.textContent='Tải logo thất bại: '+(err.message||err)}}

async function uploadClinicImage(index){const file=$(`clinicImage${index}File`)?.files?.[0],status=$(`clinicImage${index}Status`);if(!file){if(status)status.textContent='Vui lòng chọn ảnh.';return}if(status)status.textContent='Đang tải ảnh lên...';try{const url=await uploadPublicImage(file,`clinic-image-${index}`);D.clinic.images=D.clinic.images||['','','',''];D.clinic.images[index-1]=url;$(`clinicImage${index}Url`).value=url;$(`clinicImage${index}Preview`).src=url;$(`clinicImage${index}Preview`).style.display='block';status.textContent='Đã tải ảnh. Đang lưu lên hệ thống...';await saveClinicOnly();status.textContent='✅ Đã tải và lưu ảnh phòng khám '+index+'.'}catch(err){status.textContent='Tải ảnh thất bại: '+(err.message||err)}}
async function uploadWeeklySchedule(){const file=$('weeklyScheduleFile')?.files?.[0],status=$('weeklyScheduleStatus');if(!file){if(status)status.textContent='Vui lòng chọn ảnh lịch khám.';return}if(status)status.textContent='Đang tải ảnh lịch khám lên...';try{const url=await uploadPublicImage(file,'schedule');$('weeklyScheduleUrl').value=url;$('weeklySchedulePreview').src=url;$('weeklySchedulePreview').style.display='block';status.textContent='Đã tải ảnh lịch khám. Đang lưu lên hệ thống...';await saveClinicOnly();status.textContent='✅ Đã tải và lưu ảnh lịch khám.'}catch(err){status.textContent='Tải ảnh thất bại: '+(err.message||err)}}
async function saveClinicOnly(){ensureData();D.clinic.tagline=($('clinicTagline')?.value||'').trim();D.clinic.info=$('clinicInfo').value;D.clinic.booking=$('bookingText').value;D.clinic.address=$('address').value;D.clinic.hours=$('hours').value;D.clinic.weeklyScheduleImage=$('weeklyScheduleUrl').value.trim();D.clinic.phone=$('phone').value;D.clinic.zalo=$('zalo').value;D.clinic.facebook=$('facebook').value.trim()||'https://www.facebook.com/DrLeNamHung/';D.clinic.zaloQr=$('zaloQr').value||'zalo-qr.jpg';D.clinic.mapUrl=$('mapUrl').value;for(let i=1;i<=4;i++){D.clinic.images[i-1]=$("clinicImage"+i+"Url").value.trim()}const {data:{session}}=await client.auth.getSession();if(!session){location.href='admin-login.html';return false}const guard=await isAdmin();if(!guard.ok){setStatus('Phiên quản trị không hợp lệ.',false);return false}setStatus('Đang lưu thông tin phòng khám...');const {error}=await client.from('site_content').upsert({id:1,content:D,updated_at:new Date().toISOString(),updated_by:session.user.id});if(error){setStatus('Lưu thất bại: '+error.message,false);return false}setStatus('✅ Thông tin phòng khám đã được lưu.');return true}
async function save(){collect();const {data:{session}}=await client.auth.getSession();if(!session){location.href='admin-login.html';return}const guard=await isAdmin();if(!guard.ok){setStatus('Phiên quản trị không hợp lệ.',false);return}setStatus('Đang lưu...');const {error}=await client.from('site_content').upsert({id:1,content:D,updated_at:new Date().toISOString(),updated_by:session.user.id});if(error)setStatus('Lưu thất bại: '+error.message,false);else{setStatus('Đã lưu thành công lên hệ thống.');await renderStats();renderArticlesList()}}
document.querySelectorAll('[data-upload-clinic-image]').forEach(b=>b.onclick=()=>uploadClinicImage(+b.dataset.uploadClinicImage));if($('uploadClinicLogo'))$('uploadClinicLogo').onclick=uploadClinicLogo;const logoUrlInput=$('clinicLogoUrl');if(logoUrlInput)logoUrlInput.addEventListener('input',()=>{const src=logoUrlInput.value.trim(),img=$('clinicLogoPreview');if(img){img.src=src||'clinic-logo.png';img.style.display='block'}});$('uploadWeeklySchedule').onclick=uploadWeeklySchedule;$('weeklyScheduleUrl').addEventListener('input',()=>{const src=$('weeklyScheduleUrl').value.trim(),img=$('weeklySchedulePreview');if(img){img.src=src;img.style.display=src?'block':'none'}});for(let i=1;i<=4;i++){const input=$("clinicImage"+i+"Url");input.addEventListener('input',()=>{const src=input.value.trim(),img=$("clinicImage"+i+"Preview");if(img){img.src=src;img.style.display=src?'block':'none'}})}document.querySelectorAll('[data-upload-about]').forEach(b=>b.onclick=()=>uploadAboutImage(b.dataset.uploadAbout));['bioImage','careerImage','expertiseImage','researchImage'].forEach(key=>{const input=$(key);input?.addEventListener('input',()=>{const src=input.value.trim(),pre=$(key+'Preview'),ph=pre?.parentElement?.querySelector('span');if(pre){pre.src=src;pre.style.display=src?'block':'none';}if(ph)ph.style.display=src?'none':'inline'})});$('saveBtn').onclick=save;$('saveBtnBottom').onclick=save;if($('saveClinicTop'))$('saveClinicTop').onclick=saveClinicOnly;if($('saveClinicBottom'))$('saveClinicBottom').onclick=saveClinicOnly;$('logoutBtn').onclick=async()=>{await client.auth.signOut();location.href='admin-login.html'};document.addEventListener('click',(event)=>{
  const nav=event.target.closest('.nav-item[data-section]');
  if(nav){event.preventDefault();gotoSection(nav.dataset.section);return;}
  const go=event.target.closest('[data-go]');
  if(go){event.preventDefault();gotoSection(go.dataset.go);return;}
});

$('closeModal').onclick=closeArticleEditor;$('cancelModal').onclick=closeArticleEditor;$('editorModal').querySelector('.modal-backdrop').onclick=closeArticleEditor;$('saveArticle').onclick=saveArticleFromModal;document.querySelectorAll('.editor-toolbar button[data-cmd]').forEach(b=>b.onclick=()=>{if(b.dataset.cmd==='formatBlock'){document.execCommand('formatBlock',false,b.dataset.value||'p')}else{document.execCommand(b.dataset.cmd,false,null)}$('editContent').focus()});
$('insertArticleImage').onclick=insertArticleInlineImage;
$('articleInlineImageFile').addEventListener('change',handleInlineImageFile);
$('uploadArticleCover').onclick=uploadArticleCover;
$('editImage').addEventListener('input',()=>{renderArticleCoverPreview($('editImage').value.trim());$('articleCoverStatus').textContent=''});$('editSeoImage').addEventListener('input',()=>{renderSeoImagePreview($('editSeoImage').value.trim());$('articleSeoImageStatus').textContent=''});$('uploadArticleSeoImage').onclick=uploadArticleSeoImage;$('suggestSeoBtn').onclick=fillSeoSuggestions;
$('clearFormatting').onclick=()=>{document.execCommand('removeFormat',false,null);$('editContent').focus()};
boot();

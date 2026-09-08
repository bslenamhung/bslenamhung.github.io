const DEFAULT={
site:{aboutIntro:'Bác sĩ chuyên ngành Sản Phụ khoa với định hướng chia sẻ kiến thức y khoa dễ hiểu và đồng hành cùng người bệnh.',bioText:'Nội dung giới thiệu BS Lê Nam Hùng sẽ được cập nhật.',careerText:'Thông tin quá trình công tác sẽ được cập nhật.',expertiseText:'Sản khoa, Phụ khoa, Vô sinh – Hiếm muộn, Siêu âm, Hậu sản.',researchText:'Thông tin nghiên cứu khoa học sẽ được cập nhật.'},
specialties:[{name:'Sản khoa',icon:'🤰',desc:'Thai kỳ, theo dõi thai và chăm sóc mẹ.'},{name:'Phụ khoa',icon:'🩺',desc:'Khám, tư vấn và các bệnh lý phụ khoa.'},{name:'Vô sinh – Hiếm muộn',icon:'🌱',desc:'Tư vấn sức khỏe sinh sản và hiếm muộn.'},{name:'Siêu âm',icon:'🖥️',desc:'Siêu âm và giải thích các thông tin cần lưu ý.'},{name:'Hậu sản',icon:'🌿',desc:'Chăm sóc mẹ sau sinh và các vấn đề hậu sản.'}],
services:['Khám Sản khoa','Khám Phụ khoa','Vô sinh – Hiếm muộn','Siêu âm','Hậu sản'],clinic:{info:'Địa chỉ, thời gian làm việc và thông tin liên hệ sẽ được cập nhật.',booking:'Liên hệ trực tiếp để được hướng dẫn lịch khám.',phone:'',zalo:''},
articles:[{title:'Những điều cần lưu ý khi theo dõi thai kỳ',specialty:'Sản khoa',desc:'Nội dung mẫu để anh thay thế bằng bài viết thực tế của mình.'},{title:'Khi nào nên đi khám phụ khoa?',specialty:'Phụ khoa',desc:'Nội dung mẫu để anh thay thế bằng bài viết thực tế của mình.'},{title:'Một số thông tin cơ bản về siêu âm thai',specialty:'Siêu âm',desc:'Nội dung mẫu để anh thay thế bằng bài viết thực tế của mình.'}]};
let client=null,D=structuredClone(DEFAULT);
const $=id=>document.getElementById(id); const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function status(t,ok=true){const e=$('status');e.textContent=t;e.style.display='block';e.style.background=ok?'#eef9f0':'#fff0ef';e.style.color=ok?'#166534':'#b42318'}
async function boot(){
 if(!window.supabase||!SUPABASE_URL.startsWith('http')){location.href='admin-login.html';return}
 client=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
 const {data:{session}}=await client.auth.getSession(); if(!session){location.href='admin-login.html';return}
 const {data,error}=await client.from('site_content').select('content').eq('id',1).maybeSingle();
 if(error){status('Không đọc được dữ liệu: '+error.message,false);return}
 if(data?.content) D=data.content; form();
}
function form(){
 $('aboutIntro').value=D.site.aboutIntro||'';$('bioText').value=D.site.bioText||'';$('careerText').value=D.site.careerText||'';$('expertiseText').value=D.site.expertiseText||'';$('researchText').value=D.site.researchText||'';$('clinicInfo').value=D.clinic?.info||'';$('bookingText').value=D.clinic?.booking||'';$('phone').value=D.clinic?.phone||'';$('zalo').value=D.clinic?.zalo||'';
 $('specList').innerHTML=(D.specialties||[]).map((x,i)=>`<div class="row"><input data-s="name" data-i="${i}" value="${esc(x.name)}"><input data-s="icon" data-i="${i}" value="${esc(x.icon)}"><input data-s="desc" data-i="${i}" value="${esc(x.desc)}"><button onclick="delSpec(${i})">Xóa</button></div>`).join('');
 $('serviceList').innerHTML=(D.services||[]).map((x,i)=>`<div class="row"><input class="serviceInput" data-i="${i}" value="${esc(x)}"><small>Hiển thị tại Phòng khám</small><span></span><button onclick="delService(${i})">Xóa</button></div>`).join('');
 $('articleList').innerHTML=(D.articles||[]).map((x,i)=>`<div class="article-row"><input data-a="title" data-i="${i}" value="${esc(x.title)}"><input data-a="specialty" data-i="${i}" value="${esc(x.specialty)}"><input data-a="desc" data-i="${i}" value="${esc(x.desc)}"><button onclick="delArticle(${i})">Xóa</button></div>`).join('');
}
function collect(){D.site.aboutIntro=$('aboutIntro').value;D.site.bioText=$('bioText').value;D.site.careerText=$('careerText').value;D.site.expertiseText=$('expertiseText').value;D.site.researchText=$('researchText').value;D.clinic.info=$('clinicInfo').value;D.clinic.booking=$('bookingText').value;D.clinic.phone=$('phone').value;D.clinic.zalo=$('zalo').value;document.querySelectorAll('[data-s]').forEach(el=>D.specialties[+el.dataset.i][el.dataset.s]=el.value);document.querySelectorAll('.serviceInput').forEach(el=>D.services[+el.dataset.i]=el.value);document.querySelectorAll('[data-a]').forEach(el=>D.articles[+el.dataset.i][el.dataset.a]=el.value)}
window.delSpec=i=>{collect();D.specialties.splice(i,1);form()};window.delService=i=>{collect();D.services.splice(i,1);form()};window.delArticle=i=>{collect();D.articles.splice(i,1);form()};
$('addSpec').onclick=()=>{collect();D.specialties.push({name:'Chuyên môn mới',icon:'＋',desc:'Mô tả chuyên môn mới'});form()};$('addService').onclick=()=>{collect();D.services.push('Dịch vụ mới');form()};$('addArticle').onclick=()=>{collect();D.articles.unshift({title:'Bài viết mới',specialty:'Sản khoa',desc:'Mô tả bài viết mới'});form()};
$('saveBtn').onclick=async()=>{collect();const {data:{session}}=await client.auth.getSession();if(!session){location.href='admin-login.html';return}status('Đang lưu...');const {error}=await client.from('site_content').upsert({id:1,content:D,updated_at:new Date().toISOString(),updated_by:session.user.id});if(error)status('Lưu thất bại: '+error.message,false);else status('Đã lưu thành công lên hệ thống.');};
$('exportBtn').onclick=()=>{collect();const blob=new Blob([JSON.stringify(D,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='lenamhung-site-data.json';a.click();URL.revokeObjectURL(a.href)};
$('logoutBtn').onclick=async()=>{await client.auth.signOut();location.href='admin-login.html'};
boot();

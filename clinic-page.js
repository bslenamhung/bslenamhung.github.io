const $c=id=>document.getElementById(id);
const escC=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const FALLBACK_SERVICES=['Khám Sản khoa','Khám Phụ khoa','Vô sinh – Hiếm muộn','Siêu âm','Hậu sản','Tư vấn sức khỏe sinh sản'];
const fallbackClinic={intro:'',info:'Phòng khám chuyên khoa Phụ sản BS Hùng do ThS.BS Lê Nam Hùng phụ trách, tập trung vào khám và tư vấn Sản khoa, Phụ khoa và sức khỏe sinh sản tại Đông Hà, Quảng Trị.',booking:'Liên hệ trực tiếp qua điện thoại hoặc Zalo để được hướng dẫn lịch khám và xác nhận thời gian phù hợp.',phone:'0946444812',zalo:'https://zalo.me/84946444812',zaloQr:'zalo-qr.jpg',facebook:'https://www.facebook.com/DrLeNamHung/',address:'169A Lê Lợi, Nam Đông Hà, Quảng Trị',hours:'',weeklyScheduleImage:'',images:['','','',''],logo:'clinic-logo.png',tagline:'Điều trị bằng tri thức, chăm sóc từ trái tim',mapUrl:'https://www.google.com/maps?q=16.8041129,107.1140670'};
const genericInfo=['Thông tin giới thiệu phòng khám sẽ được cập nhật.','Địa chỉ, thời gian làm việc và thông tin liên hệ sẽ được cập nhật.','Địa chỉ, thời gian làm việc và thông tin liên hệ sẽ được cập nhật'];
const genericHours=['Thông tin thời gian khám sẽ được cập nhật.','Thời gian khám sẽ được cập nhật.'];
function useful(v,generic){const s=String(v??'').trim();if(!s)return false;const n=s.replace(/\s+/g,' ').toLowerCase();return !(generic||[]).some(g=>n===String(g).trim().replace(/\s+/g,' ').toLowerCase());}
function setMeta(title,desc){document.title=title;const m=document.querySelector('meta[name="description"]');if(m)m.content=desc;const ogt=document.querySelector('meta[property="og:title"]');if(ogt)ogt.content=title;const ogd=document.querySelector('meta[property="og:description"]');if(ogd)ogd.content=desc;}
function applyClinic(c){
  const x={...fallbackClinic,...(c||{})};
  if(x.zalo==='http://zaloapp.com/qr/p/quocjkn8vcrk'||!x.zalo)x.zalo=fallbackClinic.zalo;
  const address=useful(x.address,[]) ? x.address : fallbackClinic.address;
  const info=useful(x.info,genericInfo) ? x.info : fallbackClinic.info;
  const booking=useful(x.booking,[]) ? x.booking : fallbackClinic.booking;
  const hours=useful(x.hours,genericHours) ? x.hours : fallbackClinic.hours;
  if($c('clinicTagline'))$c('clinicTagline').textContent=x.tagline||fallbackClinic.tagline;
  [$c('clinicAddress'),$c('clinicAddressFact')].filter(Boolean).forEach(el=>el.textContent=address);
  [$c('clinicHours'),$c('clinicHoursFact')].filter(Boolean).forEach(el=>el.textContent=hours);
  if($c('clinicInfo'))$c('clinicInfo').textContent=info;
  if($c('bookingText'))$c('bookingText').textContent=booking;
  const phone=String(x.phone||fallbackClinic.phone).replace(/[^0-9+]/g,'')||fallbackClinic.phone;
  [$c('phoneBtn'),$c('phoneBtn2')].filter(Boolean).forEach(b=>{b.href='tel:'+phone;});
  [$c('zaloBtn'),$c('zaloBtn2')].filter(Boolean).forEach(b=>{b.href=x.zalo;b.target='_blank';b.rel='noopener';});
  [$c('facebookBtn')].filter(Boolean).forEach(b=>{b.href=x.facebook||fallbackClinic.facebook;});
  const logo=$c('clinicLogo');if(logo)logo.src=x.logo||'clinic-logo.png';
  const imgs=Array.isArray(x.images)?x.images:[];const gal=$c('clinicGallery');if(gal){const usable=imgs.filter(Boolean);gal.innerHTML=usable.map((u,i)=>`<img src="${escC(u)}" alt="Hình ảnh phòng khám BS Hùng ${i+1}" loading="lazy">`).join('');}
  const sg=$c('serviceGrid');if(sg){let services=[];try{services=Array.isArray(window.__SITE_DATA__.services)?window.__SITE_DATA__.services:[]}catch(e){};if(!services.length)services=FALLBACK_SERVICES;sg.innerHTML=services.map(v=>{const name=typeof v==='string'?v:(v?.name||v?.title||'');return name?`<div class="service-item">✓ ${escC(name)}</div>`:''}).join('');}
  const ws=$c('weeklyScheduleImage'),we=$c('weeklyScheduleEmpty');if(ws){if(x.weeklyScheduleImage){ws.src=x.weeklyScheduleImage;ws.style.display='block';if(we)we.style.display='none';}else{ws.style.display='none';if(we)we.style.display='block';}}
  const mapUrl=x.mapUrl||fallbackClinic.mapUrl;[$c('mapDirectionsBtn2'),$c('quickMapBtn')].filter(Boolean).forEach(b=>b.href=mapUrl);
  if($c('mapAddressText'))$c('mapAddressText').textContent=address;
  const iframe=$c('clinicMap');if(iframe){let src='';try{const u=new URL(mapUrl);const q=u.searchParams.get('q');if(q)src='https://www.google.com/maps?q='+encodeURIComponent(q)+'&output=embed';}catch(e){};if(!src)src='https://www.google.com/maps?q='+encodeURIComponent('16.8041129,107.1140670')+'&output=embed';iframe.src=src;}
  const title='Phòng khám sản phụ khoa BS Hùng | ThS.BS Lê Nam Hùng | Đông Hà, Quảng Trị';const desc='Phòng khám chuyên khoa Phụ sản BS Hùng tại '+address+'. Xem dịch vụ, liên hệ, Zalo và hướng dẫn đường đi.';setMeta(title,desc);
  const schema=$c('clinicStructuredData');if(schema){const data={"@context":"https://schema.org","@type":"MedicalClinic","@id":"https://bslenamhung.github.io/phong-kham-san-phu-khoa.html#clinic","name":"Phòng khám chuyên khoa Phụ sản BS Hùng","alternateName":"Phòng khám Sản Phụ khoa BS Hùng","url":"https://bslenamhung.github.io/phong-kham-san-phu-khoa.html","telephone":phone,"image":x.logo||'https://bslenamhung.github.io/clinic-logo.png',"address":{"@type":"PostalAddress","streetAddress":String(address).split(',')[0].trim(),"addressLocality":"Nam Đông Hà","addressRegion":"Quảng Trị","addressCountry":"VN"},"geo":{"@type":"GeoCoordinates","latitude":16.8041129,"longitude":107.1140670},"sameAs":[x.facebook||fallbackClinic.facebook,'https://zalo.me/84946444812'],"medicalSpecialty":["Obstetrics","Gynecology"]};schema.textContent=JSON.stringify(data);}
}
async function loadClinic(){
  let data={site:{},clinic:{},specialties:[],services:FALLBACK_SERVICES,articles:[]};
  try{const c=window.supabase?.createClient?.(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY||window.SUPABASE_ANON_KEY);if(c){const r=await c.from('site_content_public').select('content').eq('id',1).maybeSingle();if(!r.error&&r.data?.content&&typeof r.data.content==='object')data=r.data.content;}}catch(e){}
  const clinic={...fallbackClinic,...(data.clinic||{})};
  const genericAddress=['Địa chỉ phòng khám sẽ được cập nhật.'];
  const genericInfo=['Thông tin giới thiệu phòng khám sẽ được cập nhật.'];
  const genericHours=['Thông tin thời gian khám sẽ được cập nhật.','Thời gian khám sẽ được cập nhật.'];
  if(!clinic.address||genericAddress.includes(String(clinic.address).trim()))clinic.address=fallbackClinic.address;
  if(!clinic.info||genericInfo.includes(String(clinic.info).trim()))clinic.info=fallbackClinic.info;
  if(!clinic.hours||genericHours.includes(String(clinic.hours).trim()))clinic.hours=fallbackClinic.hours;
  if(!clinic.booking)clinic.booking=fallbackClinic.booking;
  if(!clinic.phone)clinic.phone=fallbackClinic.phone;
  if(!clinic.zalo||clinic.zalo==='http://zaloapp.com/qr/p/quocjkn8vcrk')clinic.zalo=fallbackClinic.zalo;
  data={...data,clinic,services:Array.isArray(data.services)&&data.services.length?data.services:FALLBACK_SERVICES};
  window.__SITE_DATA__=data;
  applyClinic(clinic);
}
document.getElementById('navToggle')?.addEventListener('click',()=>{const n=document.getElementById('mainNav'),b=document.getElementById('navToggle');const open=n?.classList.toggle('open');if(b)b.setAttribute('aria-expanded',String(!!open));});document.querySelectorAll('#mainNav a').forEach(a=>a.addEventListener('click',()=>{document.getElementById('mainNav')?.classList.remove('open');document.getElementById('navToggle')?.setAttribute('aria-expanded','false')}));
loadClinic();

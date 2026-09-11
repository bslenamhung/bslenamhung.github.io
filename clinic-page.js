const $c=id=>document.getElementById(id);
const escC=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const fallbackClinic={intro:'',info:'',booking:'Liên hệ trực tiếp qua điện thoại, Zalo hoặc Facebook để được hướng dẫn đặt lịch khám.',phone:'0946444812',zalo:'https://zalo.me/84946444812',facebook:'https://www.facebook.com/DrLeNamHung/',zaloQr:'zalo-qr.jpg',address:'169A Lê Lợi, Nam Đông Hà, Quảng Trị',hours:'',weeklyScheduleImage:'',images:['','','',''],logo:'clinic-logo.png',tagline:'Điều trị bằng tri thức, chăm sóc từ trái tim'};
function setMeta(title,desc){document.title=title;const m=document.querySelector('meta[name="description"]');if(m)m.content=desc;const ogt=document.querySelector('meta[property="og:title"]');if(ogt)ogt.content=title;const ogd=document.querySelector('meta[property="og:description"]');if(ogd)ogd.content=desc;}
function applyClinic(c){const x={...fallbackClinic,...(c||{})}; if(x.zalo==='http://zaloapp.com/qr/p/quocjkn8vcrk') x.zalo='https://zalo.me/84946444812';
  if($c('clinicTagline'))$c('clinicTagline').textContent=x.tagline||fallbackClinic.tagline;
  [$c('clinicAddress'),$c('clinicAddressFact')].filter(Boolean).forEach(el=>el.textContent=x.address||fallbackClinic.address);
  [$c('clinicHours'),$c('clinicHoursFact')].filter(Boolean).forEach(el=>el.textContent=x.hours||'Vui lòng xem lịch khám hàng tuần hoặc liên hệ để xác nhận thời gian khám.');
  if($c('clinicInfo'))$c('clinicInfo').textContent=x.info||'Thông tin giới thiệu phòng khám sẽ được cập nhật.';
  if($c('bookingText'))$c('bookingText').textContent=x.booking||fallbackClinic.booking;
  const phone=String(x.phone||fallbackClinic.phone).replace(/[^0-9+]/g,'');
  [$c('phoneBtn'),$c('phoneBtn2')].filter(Boolean).forEach(b=>b.href='tel:'+phone);
  [$c('zaloBtn'),$c('zaloBtn2')].filter(Boolean).forEach(b=>{b.href=x.zalo||fallbackClinic.zalo;b.target='_blank';b.rel='noopener'});
  [$c('facebookBtn'),$c('facebookBtn2')].filter(Boolean).forEach(b=>b.href=x.facebook||fallbackClinic.facebook);
  const logo=$c('clinicLogo');if(logo)logo.src=x.logo||'clinic-logo.png';
  const imgs=Array.isArray(x.images)?x.images:[];const gal=$c('clinicGallery');if(gal){const usable=imgs.filter(Boolean);gal.innerHTML=usable.map((u,i)=>`<img src="${escC(u)}" alt="Hình ảnh phòng khám BS Hùng ${i+1}" loading="lazy">`).join('');}
  const sg=$c('serviceGrid');if(sg){let services=[];try{services=Array.isArray(window.__SITE_DATA__.services)?window.__SITE_DATA__.services:[]}catch(e){};sg.innerHTML=services.length?services.map(v=>`<div class="service-item">✓ ${escC(typeof v==='string'?v:(v?.name||v?.title||''))}</div>`).join(''):'<div class="service-item">Danh sách dịch vụ sẽ được cập nhật.</div>';}
  const ws=$c('weeklyScheduleImage'),we=$c('weeklyScheduleEmpty');if(ws){if(x.weeklyScheduleImage){ws.src=x.weeklyScheduleImage;ws.style.display='block';if(we)we.style.display='none';}else{ws.style.display='none';if(we)we.style.display='block';}}
  const mapUrl=x.mapUrl||'https://www.google.com/maps?q=16.8041129,107.1140670';[$c('mapDirectionsBtn'),$c('mapDirectionsBtn2')].filter(Boolean).forEach(b=>b.href=mapUrl);
  if($c('mapAddressText'))$c('mapAddressText').textContent=x.address||fallbackClinic.address;
  const iframe=$c('clinicMap'),empty=$c('mapEmpty');if(iframe){let src='';try{const u=new URL(mapUrl);const q=u.searchParams.get('q');if(q)src='https://www.google.com/maps?q='+encodeURIComponent(q)+'&output=embed';}catch(e){};if(!src)src='https://www.google.com/maps?q='+encodeURIComponent('16.8041129,107.1140670')+'&output=embed';iframe.src=src;iframe.style.display='block';if(empty)empty.style.display='none';}
  const title='Phòng khám sản phụ khoa BS Hùng | Th.BSNT Lê Nam Hùng | Quảng Trị';const desc='Thông tin Phòng khám chuyên khoa Phụ sản BS Hùng tại '+(x.address||fallbackClinic.address)+': địa chỉ, giờ khám, dịch vụ, hình ảnh và hướng dẫn đường đi.';setMeta(title,desc);
  const schema=$c('clinicStructuredData');if(schema){const data={"@context":"https://schema.org","@type":"MedicalClinic","@id":"https://bslenamhung.github.io/phong-kham-san-phu-khoa.html#clinic","name":"Phòng khám chuyên khoa Phụ sản BS Hùng","url":"https://bslenamhung.github.io/phong-kham-san-phu-khoa.html","telephone":phone,"image":x.logo||'https://bslenamhung.github.io/clinic-logo.png',"address":{"@type":"PostalAddress","streetAddress":String(x.address||fallbackClinic.address).split(',')[0].trim(),"addressLocality":"Nam Đông Hà","addressRegion":"Quảng Trị","addressCountry":"VN"},"geo":{"@type":"GeoCoordinates","latitude":16.8041129,"longitude":107.1140670},"sameAs":[x.facebook||fallbackClinic.facebook],"medicalSpecialty":["Obstetrics","Gynecology"]};schema.textContent=JSON.stringify(data);} }
async function loadClinic(){
  let data={site:{},clinic:fallbackClinic,specialties:[],services:[],articles:[]};window.__SITE_DATA__=data;
  try{const c=window.supabase?.createClient?.(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY||window.SUPABASE_ANON_KEY);if(c){const r=await c.from('site_content_public').select('content').eq('id',1).maybeSingle();if(!r.error&&r.data?.content)data=r.data.content;}}catch(e){}
  window.__SITE_DATA__=data;applyClinic({...fallbackClinic,...(data.clinic||{})});
}
document.getElementById('navToggle')?.addEventListener('click',()=>document.getElementById('mainNav')?.classList.toggle('open'));
loadClinic();

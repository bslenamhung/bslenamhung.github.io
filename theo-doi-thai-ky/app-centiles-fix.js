import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL = "https://ckwhjyzomppsdplnkdeq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_FmJK_HkQxhoQ04dIzI1mCg_eupXeR48";
const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = id => document.getElementById(id);
let user = null, profile = null, records = [], selectedPatient = null, patientDirectory = [];
const emailFor = username => username.trim().toLowerCase() + "@patients.bs-hung.invalid";
const fmt = n => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(n);
function prePregnancyBmi(weightKg,heightCm) {
 const w=Number(weightKg),h=Number(heightCm);
 if(weightKg===null||weightKg===undefined||weightKg===""||heightCm===null||heightCm===undefined||heightCm===""||!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)return null;
 const value=w/Math.pow(h/100,2);
 if(!Number.isFinite(value))return null;
 const category=value<18.5?"thiếu cân":value<23?"bình thường":value<25?"thừa cân":"béo phì";
 return {value,category,text:value.toLocaleString("vi-VN",{minimumFractionDigits:1,maximumFractionDigits:1})+" kg/m² ("+category+" theo ngưỡng tham khảo châu Á)"};
}
const ga = r => r.ga_days ? r.ga_weeks + " tuần " + r.ga_days + " ngày" : r.ga_weeks + " tuần";
const dateVi = s => s ? new Date(s + "T12:00:00").toLocaleDateString("vi-VN") : "—";
function gestationAt(dueDate,onDate) {
 if(!dueDate||!onDate)return null;
 const diff=Math.round((Date.parse(dueDate+"T00:00:00Z")-Date.parse(onDate+"T00:00:00Z"))/86400000);
 const ageDays=280-diff;
 if(!Number.isFinite(ageDays)||ageDays<0||ageDays>294)return {invalid:true};
 return {weeks:Math.floor(ageDays/7),days:ageDays%7,ageDays};
}
const todayLocal=()=>{const n=new Date();return new Date(n.getTime()-n.getTimezoneOffset()*60000).toISOString().slice(0,10)};
const gestationText=g=>g&&!g.invalid?g.weeks+" tuần "+g.days+" ngày":"Không tính được tuổi thai (kiểm tra ngày dự sinh)";
const allowedTypes = ["application/pdf","image/jpeg","image/png","image/webp","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const maxFileBytes = 10 * 1024 * 1024;
function view(id) { ["loginView","patientView","adminView"].forEach(k => $(k).hidden = k !== id); }
function toast(msg) { $("globalMessage").textContent = msg; $("globalMessage").hidden = false; }
function fail(el, msg) { $(el).textContent = msg; }
function addHistoryLine(container, text) { const d=document.createElement("div"); d.textContent=text; container.append(d); }
function makeLink(url, name, mime) {
  const a = document.createElement("a");
  a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
  a.textContent = (mime === "application/pdf" ? "📄 " : "🖼 ") + name;
  a.className = "attachmentLink";
  return a;
}
async function attachmentsFor(testIds) {
  if (!testIds?.length) return [];
  const { data, error } = await db.from("patient_test_attachments")
    .select("id,test_record_id,storage_path,file_name,mime_type,size_bytes")
    .in("test_record_id", testIds).order("created_at");
  if (error) throw error;
  const out = [];
  for (const file of data || []) {
    const { data: signed, error: signError } = await db.storage.from("patient-lab-files").createSignedUrl(file.storage_path, 600);
    if (!signError && signed?.signedUrl) out.push({...file, signedUrl:signed.signedUrl});
  }
  return out;
}
function renderPatientFiles(rows, files) {
  const gallery = $("patientTestGallery"); gallery.replaceChildren();
  (rows || []).forEach(r => {
    const related = (files || []).filter(f => f.test_record_id === r.id);
    related.forEach(f => {
      const card = document.createElement("article"); card.className = "testFileCard";
      const heading = document.createElement("div"); heading.className = "testFileHeading";
      heading.textContent = dateVi(r.test_date) + " · Phiếu xét nghiệm"; card.append(heading);
      if (f.mime_type.startsWith("image/")) {
        const img = document.createElement("img"); img.src = f.signedUrl; img.alt = "Ảnh phiếu xét nghiệm"; img.loading = "lazy"; img.className = "testPreviewImage"; card.append(img);
      } else if (f.mime_type === "application/pdf") {
        const frame = document.createElement("iframe"); frame.src = f.signedUrl; frame.title = "Phiếu xét nghiệm PDF"; frame.className = "testPdfPreview"; card.append(frame);
        card.append(makeLink(f.signedUrl, "Mở hoặc tải PDF", f.mime_type));
      } else {
        card.append(makeLink(f.signedUrl, "Mở hoặc tải tệp Word: " + f.file_name, f.mime_type));
      }
      gallery.append(card);
    });
  });
}
const rememberedLoginKey="bsHungRememberedLogin";
try{const remembered=localStorage.getItem(rememberedLoginKey);if(remembered){$("username").value=remembered;$("rememberLogin").checked=true;}}catch(_){}
$("rememberLogin").addEventListener("change",()=>{if(!$("rememberLogin").checked){try{localStorage.removeItem(rememberedLoginKey);}catch(_){}}});
$("loginForm").addEventListener("submit", async e => {
  e.preventDefault(); fail("loginError", "");
  const raw = $("username").value.trim();
  try{if($("rememberLogin").checked)localStorage.setItem(rememberedLoginKey,raw);else localStorage.removeItem(rememberedLoginKey);}catch(_){}
  const email = raw.includes("@") ? raw : emailFor(raw);
  const { data, error } = await db.auth.signInWithPassword({ email, password: $("password").value });
  if (error) { fail("loginError", "Đăng nhập không thành công. Vui lòng kiểm tra thông tin hoặc liên hệ phòng khám."); return; }
  user = data.user; await routeUser();
});
async function routeUser() {
  const { data, error } = await db.from("profiles").select("user_id,username,display_name,phone,address,para,medical_history,pre_pregnancy_weight_kg,height_cm,ultrasound_abnormalities,due_date,date_of_birth").eq("user_id", user.id).single();
  if (error || !data) { await db.auth.signOut(); view("loginView"); fail("loginError", "Không đọc được hồ sơ. Vui lòng liên hệ quản trị viên."); return; }
  profile = data;
  if (user.app_metadata?.role === "admin") { view("adminView"); await loadPatients(); await loadAdminQaThreads(false); }
  else { view("patientView"); await loadPatient(); await loadPatientQaThreads(false); }
}
async function loadWeeklyClinicSchedule(){
 const hours=$("patientClinicHours"),img=$("patientWeeklyScheduleImage"),imgLink=$("patientScheduleImageLink"),empty=$("patientScheduleEmpty"),updated=$("patientScheduleUpdated");
 if(hours)hours.textContent="Đang tải thời gian khám…";
 try{
  const response=await fetch("../data.json?refresh="+Date.now(),{cache:"no-store"});
  if(!response.ok)throw new Error("Không tải được lịch phòng khám");
  const data=await response.json(),clinic=data?.clinic||{};
  if(hours)hours.textContent=clinic.hours||"Vui lòng liên hệ phòng khám để xác nhận thời gian khám.";
  const src=typeof clinic.weeklyScheduleImage==="string"?clinic.weeklyScheduleImage.trim():"";
  if(src){
   img.src=src+(src.includes("?")?"&":"?")+"refresh="+Date.now();
   imgLink.href="https://bslenamhung.github.io/#weeklyScheduleWrap";
   imgLink.hidden=false;empty.hidden=true;
   img.onerror=()=>{imgLink.hidden=true;empty.hidden=false;};
  }else{img.removeAttribute("src");imgLink.hidden=true;empty.hidden=false;}
  if(updated)updated.textContent="Lịch được tải từ website phòng khám lúc "+new Date().toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})+".";
 }catch(error){
  if(hours)hours.textContent="Chưa tải được thời gian khám. Bác sĩ vui lòng mở website phòng khám để xem lịch mới nhất.";
  imgLink.hidden=true;empty.hidden=false;
  if(updated)updated.textContent="Không thể đồng bộ lúc này. Hãy thử nút Cập nhật lịch hoặc mở website phòng khám.";
 }
}
async function renderFollowUpReminder(patientRecords) {
 const card=$("patientFollowUpReminder"), dateEl=$("followUpReminderDate"), messageEl=$("followUpReminderMessage"), button=$("acknowledgeFollowUpReminder");
 if(!card||!dateEl||!messageEl||!button)return;
 card.hidden=true;
 const today=todayLocal();
 const todayMs=Date.parse(today+"T00:00:00Z");
 const candidates=[...new Set((patientRecords||[]).map(r=>r.follow_up_date).filter(d=>{
  if(!d)return false;
  const age=Math.round((todayMs-Date.parse(d+"T00:00:00Z"))/86400000);
  return age>=0&&age<=7;
 }))].sort((a,b)=>a.localeCompare(b));
 if(!candidates.length)return;
 const {data:acknowledged,error}=await db.from("patient_follow_up_reminder_acknowledgements")
  .select("follow_up_date").eq("patient_user_id",user.id).in("follow_up_date",candidates);
 if(error){console.error("Không tải được trạng thái nhắc tái khám:",error);return;}
 const seen=new Set((acknowledged||[]).map(x=>x.follow_up_date));
 const nextDate=candidates.find(d=>!seen.has(d));
 if(!nextDate)return;
 dateEl.textContent=dateVi(nextDate);
 messageEl.textContent="Hôm nay là ngày hẹn hoặc đã qua ngày hẹn không quá 7 ngày. Vui lòng liên hệ phòng khám nếu bạn chưa tái khám hoặc cần đổi lịch.";
 card.hidden=false;
 button.onclick=async()=>{
  button.disabled=true;
  const oldText=button.textContent;
  button.textContent="Đang lưu…";
  const {error:saveError}=await db.from("patient_follow_up_reminder_acknowledgements")
   .insert({patient_user_id:user.id,follow_up_date:nextDate});
  if(saveError&&saveError.code!=="23505"){
   console.error("Không lưu được xác nhận đã xem nhắc tái khám:",saveError);
   button.disabled=false;button.textContent=oldText;
   toast("Chưa lưu được trạng thái đã xem. Vui lòng thử lại.");
   return;
  }
  await renderFollowUpReminder(patientRecords);
 };
}

function pregnancyWeightGainGuidance(bmi,gaWeeks) {
 if(!bmi||!Number.isFinite(gaWeeks)||gaWeeks<1||gaWeeks>42)return null;
 let category, total, weekly;
 if(bmi.value<18.5){category="thiếu cân";total=[12.5,18];weekly=[0.44,0.58];}
 else if(bmi.value<25){category="BMI bình thường theo ngưỡng dùng cho khuyến cáo tăng cân";total=[11.5,16];weekly=[0.40,0.50];}
 else if(bmi.value<30){category="thừa cân";total=[7,11.5];weekly=[0.23,0.33];}
 else {category="béo phì";total=[5,9];weekly=[0.17,0.27];}
 const elapsed=Math.max(0,gaWeeks-13);
 const current=[0.5+weekly[0]*elapsed,2+weekly[1]*elapsed];
 return {category,total,weekly,current,gaWeeks};
}
const kgText=n=>Number(n).toLocaleString("vi-VN",{minimumFractionDigits:1,maximumFractionDigits:1})+" kg";
async function loadMaternalWeightEntries() {
 const dateInput=$("maternalWeightDate"),typeInput=$("maternalPregnancyType");
 if(dateInput&&!dateInput.value)dateInput.value=todayLocal();
 const {data,error}=await db.from("patient_weight_entries").select("id,measured_on,weight_kg,pregnancy_type").eq("patient_user_id",user.id).order("measured_on",{ascending:false});
 if(error){console.error("Không tải được lịch sử cân nặng của mẹ:",error);fail("maternalWeightMessage","Chưa tải được lịch sử cân nặng. Vui lòng tải lại trang.");return;}
 const entries=data||[],today=todayLocal();
 const latest=entries[0];
 $("maternalWeightDate").value=today;
 $("maternalWeightKg").value=latest&&latest.measured_on===today?String(latest.weight_kg):"";
 $("maternalPregnancyType").value=latest?.pregnancy_type||"singleton";
 renderMaternalWeightAdvice(entries);
 const body=$("maternalWeightRows");body.replaceChildren();
 entries.forEach(entry=>{
  const tr=document.createElement("tr");
  const g=profile?.due_date?gestationAt(profile.due_date,entry.measured_on):null;
  const gain=Number(entry.weight_kg)-Number(profile?.pre_pregnancy_weight_kg);
  const vals=[dateVi(entry.measured_on),kgText(entry.weight_kg),Number.isFinite(gain)&&profile?.pre_pregnancy_weight_kg!=null?((gain>0?"+":"")+kgText(gain)):"Chưa đủ dữ liệu",entry.pregnancy_type==="multiple"?"Song thai / đa thai":"Đơn thai"];
  vals.forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.append(td);});
  const actionCell=document.createElement("td");
  const deleteButton=document.createElement("button");
  deleteButton.type="button";deleteButton.className="dangerButton maternalWeightDeleteButton";deleteButton.textContent="Xóa";deleteButton.setAttribute("aria-label","Xóa cân nặng ngày "+dateVi(entry.measured_on));
  deleteButton.addEventListener("click",async()=>{
   if(!confirm("Bạn có chắc muốn xóa lần cân nặng ngày "+dateVi(entry.measured_on)+" ("+kgText(entry.weight_kg)+")? Dữ liệu đã xóa không thể khôi phục."))return;
   deleteButton.disabled=true;deleteButton.textContent="Đang xóa…";
   const {error}=await db.from("patient_weight_entries").delete().eq("id",entry.id).eq("patient_user_id",user.id);
   if(error){console.error("Không xóa được lịch sử cân nặng:",error);deleteButton.disabled=false;deleteButton.textContent="Xóa";fail("maternalWeightMessage","Chưa xóa được lần cân này. Vui lòng thử lại.");return;}
   fail("maternalWeightMessage","Đã xóa lần cân ngày "+dateVi(entry.measured_on)+".");
   await loadMaternalWeightEntries();
  });
  actionCell.append(deleteButton);tr.append(actionCell);body.append(tr);
 });
 if(!entries.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=5;td.textContent="Chưa có dữ liệu cân nặng của mẹ.";tr.append(td);body.append(tr);}
}
function renderMaternalWeightAdvice(entries=[]) {
 const box=$("maternalWeightAdvice");if(!box)return;
 box.replaceChildren();
 const heading=document.createElement("h3");heading.textContent="Tư vấn tăng cân";box.append(heading);
 const weight=Number($("maternalWeightKg").value),date=$("maternalWeightDate").value||todayLocal(),type=$("maternalPregnancyType").value;
 const prep=Number(profile?.pre_pregnancy_weight_kg),bmi=prePregnancyBmi(profile?.pre_pregnancy_weight_kg,profile?.height_cm);
 const g=profile?.due_date?gestationAt(profile.due_date,date):null;
 const p=text=>{const el=document.createElement("p");el.textContent=text;box.append(el);return el;};
 if(!Number.isFinite(weight)||weight<20||weight>300){p("Nhập cân nặng hiện tại từ 20 đến 300 kg để xem tư vấn.");return;}
 if(profile?.pre_pregnancy_weight_kg==null||profile?.height_cm==null||!bmi){p("Hồ sơ chưa có đủ cân nặng trước mang thai và chiều cao. Hãy liên hệ phòng khám để cập nhật BMI ban đầu; cân nặng đã nhập vẫn có thể được lưu.");return;}
 if(!g||g.invalid){p("Chưa tính được tuổi thai cho ngày cân này. Vui lòng kiểm tra ngày dự sinh trong hồ sơ với phòng khám.");return;}
 const gained=weight-prep;
 const line=document.createElement("p");line.innerHTML="BMI trước mang thai: <strong>"+bmi.value.toLocaleString("vi-VN",{minimumFractionDigits:1,maximumFractionDigits:1})+"</strong> · Tăng cân từ đầu thai kỳ: <strong>"+(gained>=0?"+":"")+kgText(gained)+"</strong>.";box.append(line);
 p("Tuổi thai tại ngày cân: "+g.weeks+" tuần "+g.days+" ngày.");
 if(type==="multiple"){p("Bạn chọn song thai/đa thai. Không áp dụng mức tăng cân đơn thai bên dưới; mục tiêu tăng cân cần được bác sĩ xác định riêng theo loại thai và tình trạng mẹ, thai.");return;}
 const guidance=pregnancyWeightGainGuidance(bmi,g.weeks);
 p("Nhóm BMI dùng cho khuyến cáo tăng cân: "+guidance.category+".");
 p("Mục tiêu tham khảo cho cả thai kỳ đơn thai: tăng khoảng "+kgText(guidance.total[0])+"–"+kgText(guidance.total[1])+".");
 const min=guidance.current[0],max=guidance.current[1];
 p("Ước tính tăng cân tích lũy tham khảo đến "+g.weeks+" tuần: khoảng "+kgText(min)+"–"+kgText(max)+". Đây là khoảng ước tính theo tốc độ trung bình từ tam cá nguyệt II, không phải ngưỡng chẩn đoán.");
 if(gained<min-0.5)p("Nhận xét tham khảo: mức tăng hiện tại thấp hơn khoảng ước tính. Hãy trao đổi với bác sĩ khi khám; không tự ép tăng cân hoặc thay đổi chế độ ăn quá mức.");
 else if(gained>max+0.5)p("Nhận xét tham khảo: mức tăng hiện tại cao hơn khoảng ước tính. Cân nhắc trao đổi với bác sĩ để đánh giá xu hướng cân nặng và phù, không tự ăn kiêng khi mang thai.");
 else p("Nhận xét tham khảo: mức tăng hiện tại nằm trong khoảng ước tính. Tiếp tục theo dõi xu hướng cân nặng và khám thai định kỳ.");
 p("Khuyến cáo này áp dụng cho thai kỳ đơn thai và là công cụ tham khảo; cần cá thể hóa theo tình trạng sức khỏe và đánh giá lâm sàng.");
}
$("maternalWeightKg")?.addEventListener("input",()=>renderMaternalWeightAdvice());
$("maternalWeightDate")?.addEventListener("change",()=>renderMaternalWeightAdvice());
$("maternalPregnancyType")?.addEventListener("change",()=>renderMaternalWeightAdvice());
$("maternalWeightForm")?.addEventListener("submit",async e=>{
 e.preventDefault();fail("maternalWeightMessage","");
 const weight=Number($("maternalWeightKg").value),measured_on=$("maternalWeightDate").value||todayLocal(),pregnancy_type=$("maternalPregnancyType").value;
 if(!Number.isFinite(weight)||weight<20||weight>300){fail("maternalWeightMessage","Cân nặng phải từ 20 đến 300 kg.");return;}
 if(measured_on>todayLocal()){fail("maternalWeightMessage","Ngày cân không thể ở tương lai.");return;}
 const button=$("saveMaternalWeight");button.disabled=true;const old=button.textContent;button.textContent="Đang lưu…";
 const {error}=await db.from("patient_weight_entries").upsert({patient_user_id:user.id,measured_on,weight_kg:weight,pregnancy_type,updated_at:new Date().toISOString()},{onConflict:"patient_user_id,measured_on"});
 button.disabled=false;button.textContent=old;
 if(error){console.error("Không lưu được cân nặng:",error);fail("maternalWeightMessage","Chưa lưu được cân nặng. Vui lòng thử lại.");return;}
 fail("maternalWeightMessage","Đã lưu cân nặng ngày "+dateVi(measured_on)+". Tư vấn đã được cập nhật.");
 await loadMaternalWeightEntries();
});

async function loadPatient() {
 await loadWeeklyClinicSchedule();
  $("patientName").textContent = profile.display_name || profile.username;
  $("patientProfileName").textContent = profile.display_name || "Chưa cập nhật";
  $("patientProfileDob").textContent = profile.date_of_birth ? dateVi(profile.date_of_birth) : "Chưa cập nhật";
  $("patientProfileUsername").textContent = profile.username || "—";
  $("patientProfilePhone").textContent = profile.phone || "Chưa cập nhật";
  $("patientProfileAddress").textContent = profile.address || "Chưa cập nhật";
  $("patientProfilePara").textContent = profile.para || "Chưa cập nhật";
  $("patientProfileHistory").textContent = profile.medical_history || "Chưa cập nhật";
  $("patientProfilePreWeight").textContent = profile.pre_pregnancy_weight_kg != null ? String(profile.pre_pregnancy_weight_kg).replace(".", ",") + " kg" : "Chưa cập nhật";
  $("patientProfileHeight").textContent = profile.height_cm != null ? String(profile.height_cm).replace(".", ",") + " cm" : "Chưa cập nhật";
  const patientBmi=prePregnancyBmi(profile.pre_pregnancy_weight_kg,profile.height_cm);
  $("patientProfileBMI").textContent=patientBmi?patientBmi.text:"Chưa đủ dữ liệu cân nặng và chiều cao trước mang thai";
  $("patientProfileUltrasoundAbnormalities").textContent = profile.ultrasound_abnormalities || "Chưa cập nhật";
  $("patientProfileDueDate").textContent = profile.due_date ? dateVi(profile.due_date) : "Chưa cập nhật";
  $("patientProfileGestation").textContent = profile.due_date ? gestationText(gestationAt(profile.due_date,todayLocal())) : "Chưa cập nhật";
  const { data, error } = await db.from("fetal_weight_records").select("scan_date,follow_up_date,ga_weeks,ga_days,efw_grams,note").eq("patient_user_id", user.id).order("scan_date");
  if (error) { toast("Không tải được lịch sử khám."); return; }
  records = data || [];
  await renderFollowUpReminder(records);
  await loadMaternalWeightEntries();
  const today=todayLocal(); const futureFollowUps=records.filter(r=>r.follow_up_date&&r.follow_up_date>=today).sort((a,b)=>a.follow_up_date.localeCompare(b.follow_up_date)); const nextFollowUp=futureFollowUps[0]; const followEl=$("patientNextFollowUp"); followEl.textContent=nextFollowUp?dateVi(nextFollowUp.follow_up_date)+(futureFollowUps.length>1?" (ngày hẹn gần nhất)":""):"Chưa có lịch hẹn tái khám được cập nhật."; followEl.classList.toggle("hasFollowUp",!!nextFollowUp);
  const latest = [...records].sort((a,b) => b.scan_date.localeCompare(a.scan_date))[0];
  $("lastVisit").textContent = latest ? dateVi(latest.scan_date) : "—";
  $("lastGa").textContent = latest ? ga(latest) : "Chưa có dữ liệu";
  $("lastWeight").textContent = latest ? (latest.efw_grams==null?"Chưa nhập EFW":fmt(latest.efw_grams) + " g") : "—";
  $("visitCount").textContent = records.length;
  $("patientRows").replaceChildren();
  [...records].sort((a,b) => b.scan_date.localeCompare(a.scan_date)).forEach(r => {
    const tr = document.createElement("tr");
    [dateVi(r.scan_date), r.follow_up_date ? dateVi(r.follow_up_date) : "—", ga(r), (r.efw_grams==null?"Chưa nhập EFW":fmt(r.efw_grams) + " g"), r.note || "—"].forEach(v => { const td = document.createElement("td"); td.textContent = v; tr.append(td); });
    $("patientRows").append(tr);
  });
  drawChart(records);
  const { data: tests, error: testError } = await db.from("patient_test_records").select("id,test_date").eq("patient_user_id", user.id).order("test_date", {ascending:false});
  if (testError) { toast("Không tải được phiếu xét nghiệm."); return; }
  let testFiles = [];
  try { testFiles = await attachmentsFor((tests || []).map(t=>t.id)); } catch { toast("Không tải được tệp xét nghiệm."); }
  renderPatientFiles(tests || [], testFiles);
  $("patientTestsEmpty").hidden = testFiles.length > 0;
  await loadPatientQaThreads(true);
}
function normalizePatientSearch(value) {
 return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase().trim();
}
function renderPatientOptions() {
 const select=$("patientSelect"), query=normalizePatientSearch($("patientSearch").value);
 const terms=query.split(/\s+/).filter(Boolean);
 const filtered=patientDirectory.filter(p=>{
  const haystack=normalizePatientSearch([p.username,p.display_name,p.phone].filter(Boolean).join(" "));
  return terms.every(term=>haystack.includes(term));
 }).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
 const selected=patientDirectory.find(p=>p.user_id===selectedPatient);
 select.replaceChildren();
 select.add(new Option("— Chọn bệnh nhân —",""));
 if(selected && !filtered.some(p=>p.user_id===selected.user_id)) select.add(new Option("Đang chọn: "+(selected.display_name||selected.username)+" ("+selected.username+")",selected.user_id));
 filtered.forEach(p=>{
  const label=(p.display_name||p.username)+" · "+p.username+(p.phone?" · "+p.phone:"");
  select.add(new Option(label,p.user_id));
 });
 select.value=selectedPatient||"";
 $("patientSearchCount").textContent=query
  ? "Tìm thấy "+filtered.length+" / "+patientDirectory.length+" bệnh nhân. Tên đăng nhập phù hợp được tìm cả khi chỉ nhập một phần; kết quả xếp từ tài khoản tạo gần nhất."
  : "Có "+patientDirectory.length+" bệnh nhân. Gõ không dấu cũng tìm được.";
 if(query && filtered.length===0) $("patientSearchCount").textContent="Không tìm thấy bệnh nhân phù hợp. Thử họ tên không dấu, tên đăng nhập hoặc số điện thoại.";
}
async function loadPatients() {
 const { data, error } = await db.from("profiles").select("user_id,username,display_name,phone,address,para,medical_history,due_date,created_at").order("created_at",{ascending:false});
 if (error) { toast("Không tải được danh sách hồ sơ."); return; }
 patientDirectory=(data||[]).filter(p=>p.user_id!==user.id);
 renderPatientOptions();
}
async function loadSelectedPatient() {
  selectedPatient = $("patientSelect").value || null;
  $("adminPatientHistory").replaceChildren(); $("adminTestHistory").replaceChildren(); $("adminPatientProfile").replaceChildren(); drawChart([], "adminWeightChart", "adminWeightChartEmpty");
  $("editPatientForm").hidden=true; $("editPatientButton").hidden=true;
  fail("recordMessage",""); fail("testMessage",""); fail("editPatientMessage","");
  if (!selectedPatient) return;
  const { data: p, error: pError } = await db.from("profiles").select("username,display_name,phone,address,para,medical_history,pre_pregnancy_weight_kg,height_cm,ultrasound_abnormalities,due_date,date_of_birth").eq("user_id",selectedPatient).single();
  if (pError) { toast("Không tải được thông tin bệnh nhân."); return; }
  [["Họ tên",p.display_name],["Ngày sinh",p.date_of_birth?dateVi(p.date_of_birth):null],["Tên đăng nhập",p.username],["Số điện thoại",p.phone],["Địa chỉ",p.address],["PARA",p.para],["Tiền sử bệnh",p.medical_history],["Cân nặng trước mang thai",p.pre_pregnancy_weight_kg!=null?String(p.pre_pregnancy_weight_kg).replace(".",",")+" kg":null],["Chiều cao",p.height_cm!=null?String(p.height_cm).replace(".",",")+" cm":null],["BMI trước mang thai",prePregnancyBmi(p.pre_pregnancy_weight_kg,p.height_cm)?.text||"Chưa đủ dữ liệu cân nặng và chiều cao trước mang thai"],["Bất thường trên siêu âm",p.ultrasound_abnormalities],["Ngày dự sinh",p.due_date?dateVi(p.due_date):null],["Tuổi thai theo ngày khám",p.due_date?gestationText(gestationAt(p.due_date,dueDateIso($("scanDate").value)||todayLocal())):null]].forEach(([label,value])=>{
    const line=document.createElement("div"); const strong=document.createElement("strong"); strong.textContent=label+": "; line.append(strong,document.createTextNode(value || "Chưa cập nhật")); $("adminPatientProfile").append(line);
  });
  $("editPatientName").value=p.display_name||""; $("editPatientDob").value=isoToDateVi(p.date_of_birth); $("editPatientPhone").value=p.phone||""; $("editPatientAddress").value=p.address||"";
  $("editPatientPara").value=p.para||""; $("editPatientHistory").value=p.medical_history||""; $("editPatientPreWeight").value=p.pre_pregnancy_weight_kg??""; $("editPatientHeight").value=p.height_cm??""; $("editPatientUltrasoundAbnormalities").value=p.ultrasound_abnormalities||""; $("editPatientDueDate").value=isoToDateVi(p.due_date||"");
  $("editPatientButton").hidden=false;
  const { data, error } = await db.from("fetal_weight_records").select("id,scan_date,follow_up_date,ga_weeks,ga_days,efw_grams,note").eq("patient_user_id", selectedPatient).order("scan_date", { ascending:false });
  if (error) { toast("Không tải được lịch sử bệnh nhân."); return; }
  (data || []).forEach(r => {
    const line=document.createElement("div"); line.className="editableFetalHistory";
    const details=document.createElement("span");
    details.textContent=dateVi(r.scan_date)+(r.follow_up_date?" · Hẹn tái khám: "+dateVi(r.follow_up_date):"")+" · "+ga(r)+" · "+(r.efw_grams==null?"Chưa nhập EFW":fmt(r.efw_grams)+" g")+(r.note?" · "+r.note:"");
    const del=document.createElement("button"); del.type="button"; del.className="secondary deleteFetalRecordButton"; del.textContent="Xóa";
    del.addEventListener("click",()=>deleteFetalRecord(r));
    line.append(details,del); $("adminPatientHistory").append(line);
  }); drawChart(data || [], "adminWeightChart", "adminWeightChartEmpty");
  if (!(data || []).length) addHistoryLine($("adminPatientHistory"),"Chưa có số đo được cập nhật.");
  const { data: tests, error: testError } = await db.from("patient_test_records").select("id,test_date,test_name").eq("patient_user_id", selectedPatient).order("test_date", {ascending:false});
  if (testError) { toast("Không tải được lịch sử xét nghiệm."); return; }
  let files = [];
  try { files = await attachmentsFor((tests || []).map(t=>t.id)); } catch { toast("Không tải được danh sách tệp xét nghiệm."); }
  (tests || []).forEach(t => {
    const line = document.createElement("div"); line.className = "adminTestFileLine editableTestHistory";
    const details=document.createElement("div"); details.className="adminTestDetails";
    const heading=document.createElement("strong"); heading.textContent=dateVi(t.test_date)+" · "+(t.test_name||"Phiếu xét nghiệm"); details.append(heading);
    const related = files.filter(f=>f.test_record_id===t.id);
    related.forEach(f=>{
      if (f.mime_type.startsWith("image/")) { const img=document.createElement("img"); img.src=f.signedUrl; img.alt="Ảnh phiếu xét nghiệm"; img.loading="lazy"; img.className="adminTestThumb"; details.append(img); }
      if (f.mime_type === "application/pdf") { const frame=document.createElement("iframe"); frame.src=f.signedUrl; frame.title="Phiếu xét nghiệm PDF"; frame.className="adminTestPdfPreview"; details.append(frame); }
      details.append(makeLink(f.signedUrl,f.file_name,f.mime_type));
    });
    const actions=document.createElement("div");actions.className="adminTestActions";
    const del=document.createElement("button");del.type="button";del.className="dangerButton";del.textContent="Xóa";
    del.addEventListener("click",async()=>{
      if(!window.confirm("Bạn có chắc muốn xóa xét nghiệm ngày "+dateVi(t.test_date)+" và toàn bộ tệp đính kèm của lần này? Thao tác không thể hoàn tác."))return;
      del.disabled=true;del.textContent="Đang xóa…";
      try{
        const {data:att,error:attErr}=await db.from("patient_test_attachments").select("id,storage_path").eq("test_record_id",t.id).eq("patient_user_id",selectedPatient);
        if(attErr)throw attErr;
        const paths=(att||[]).map(a=>a.storage_path);
        if(paths.length){const {error:storageErr}=await db.storage.from("patient-lab-files").remove(paths);if(storageErr)throw storageErr;}
        if((att||[]).length){const {error:metaErr}=await db.from("patient_test_attachments").delete().eq("test_record_id",t.id).eq("patient_user_id",selectedPatient);if(metaErr)throw metaErr;}
        const {error:recordErr}=await db.from("patient_test_records").delete().eq("id",t.id).eq("patient_user_id",selectedPatient);
        if(recordErr)throw recordErr;
        await loadSelectedPatient();toast("Đã xóa xét nghiệm và các tệp đính kèm.");
      }catch(err){console.error("Delete test record failed",err);toast("Chưa xóa hoàn toàn được xét nghiệm: "+(err?.message||"Lỗi không xác định")+". Vui lòng kiểm tra lại.");del.disabled=false;del.textContent="Xóa";}
    });
    actions.append(del);line.append(details,actions);$("adminTestHistory").append(line);
  });
  if (!(tests || []).length) addHistoryLine($("adminTestHistory"),"Chưa có phiếu xét nghiệm được cập nhật.");
}
$("editPatientButton").addEventListener("click",()=>{if(!selectedPatient)return;$("editPatientForm").hidden=false;$("editPatientMessage").textContent="";});
$("cancelEditPatient").addEventListener("click",()=>{$("editPatientForm").hidden=true;$("editPatientMessage").textContent="";});
$("editPatientPara").addEventListener("input",()=>{const v=$("editPatientPara").value;if(v&&!/^\d{0,4}$/.test(v)){$("editPatientPara").value=v.replace(/\D/g,"").slice(0,4);}});
$("editPatientDueDate").addEventListener("input",()=>{const iso=dueDateIso($("editPatientDueDate").value);const g=gestationAt(iso,todayLocal());$("editPatientGestation").textContent=iso?"Tuổi thai hôm nay: "+gestationText(g):"Nhập ngày dự sinh theo dd/mm/yyyy.";});
$("editPatientForm").addEventListener("submit",async e=>{
 e.preventDefault();fail("editPatientMessage","");
 if(user?.app_metadata?.role!=="admin"||!selectedPatient){fail("editPatientMessage","Vui lòng chọn hồ sơ bệnh nhân.");return;}
 const display_name=$("editPatientName").value.trim().toLocaleUpperCase("vi-VN"),dobRaw=$("editPatientDob").value.trim(),date_of_birth=dobRaw?dueDateIso(dobRaw):null,phone=$("editPatientPhone").value.trim(),address=$("editPatientAddress").value.trim().toLocaleUpperCase("vi-VN"),para=$("editPatientPara").value.trim(),medical_history=$("editPatientHistory").value.trim(),preWeightRaw=$("editPatientPreWeight").value.trim(),heightRaw=$("editPatientHeight").value.trim(),ultrasound_abnormalities=$("editPatientUltrasoundAbnormalities").value.trim(),pre_pregnancy_weight_kg=preWeightRaw===""?null:Number(preWeightRaw),height_cm=heightRaw===""?null:Number(heightRaw),due_date=dueDateIso($("editPatientDueDate").value);
 if(!display_name){fail("editPatientMessage","Vui lòng nhập họ tên.");return;} if(dobRaw&&!date_of_birth){fail("editPatientMessage","Ngày sinh không hợp lệ. Vui lòng nhập theo dd/mm/yyyy.");return;} if(date_of_birth&&date_of_birth>todayLocal()){fail("editPatientMessage","Ngày sinh không thể ở tương lai.");return;}
 if(para&&!/^\d{4}$/.test(para)){fail("editPatientMessage","PARA phải gồm đúng 4 chữ số hoặc để trống.");return;}
 if(preWeightRaw!==""&&(!Number.isFinite(pre_pregnancy_weight_kg)||pre_pregnancy_weight_kg<1||pre_pregnancy_weight_kg>300)){fail("editPatientMessage","Cân nặng trước mang thai phải từ 1 đến 300 kg.");return;}
 if(heightRaw!==""&&(!Number.isFinite(height_cm)||height_cm<50||height_cm>250)){fail("editPatientMessage","Chiều cao phải từ 50 đến 250 cm.");return;}
 if(ultrasound_abnormalities.length>2000){fail("editPatientMessage","Thông tin bất thường trên siêu âm quá dài.");return;}
 const g=gestationAt(due_date,todayLocal());if(!due_date||!g||g.invalid){fail("editPatientMessage","Ngày dự sinh không hợp lệ hoặc tuổi thai ngoài khoảng 0–42 tuần.");return;}
 const {error}=await db.from("profiles").update({display_name,date_of_birth,phone:phone||null,address:address||null,para:para||null,medical_history:medical_history||null,pre_pregnancy_weight_kg,height_cm,ultrasound_abnormalities:ultrasound_abnormalities||null,due_date}).eq("user_id",selectedPatient);
 if(error){fail("editPatientMessage","Không cập nhật được hồ sơ: "+error.message);return;}
 fail("editPatientMessage","Đã cập nhật hồ sơ thành công.");await loadPatients();$("patientSelect").value=selectedPatient;await loadSelectedPatient();await refreshRecordGestation();
});
$("patientSearch").addEventListener("input",renderPatientOptions); $("patientSelect").addEventListener("change", async()=>{await loadSelectedPatient();await refreshRecordGestation();});

function dueDateIso(value){
 const parts=(value||"").trim().split("/");
 if(parts.length!==3||parts[0].length!==2||parts[1].length!==2||parts[2].length!==4||parts.some(part=>part.split("").some(ch=>ch<"0"||ch>"9")))return null;
 const day=Number(parts[0]),month=Number(parts[1]),year=Number(parts[2]);
 const d=new Date(Date.UTC(year,month-1,day));
 if(d.getUTCFullYear()!==year||d.getUTCMonth()!==month-1||d.getUTCDate()!==day)return null;
 return year+"-"+String(month).padStart(2,"0")+"-"+String(day).padStart(2,"0");
}
function formatDateInput(el){
 const digits=el.value.split("").filter(ch=>ch>="0"&&ch<="9").join("").slice(0,8);
 el.value=digits.length>4?digits.slice(0,2)+"/"+digits.slice(2,4)+"/"+digits.slice(4):digits.length>2?digits.slice(0,2)+"/"+digits.slice(2):digits;
}
function isoToDateVi(iso){return iso?iso.slice(8,10)+"/"+iso.slice(5,7)+"/"+iso.slice(0,4):"";}
function initDateCalendar(inputId){
 const input=$(inputId),popup=$("calendar-"+inputId);
 let shown=new Date();
 function render(){
  popup.replaceChildren();
  const head=document.createElement("div");head.className="dateCalendarHead";
  const prev=document.createElement("button");prev.type="button";prev.textContent="‹";prev.setAttribute("aria-label","Tháng trước");
  const label=document.createElement("strong");label.textContent=shown.toLocaleDateString("vi-VN",{month:"long",year:"numeric"});
  const next=document.createElement("button");next.type="button";next.textContent="›";next.setAttribute("aria-label","Tháng sau");
  prev.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();shown=new Date(shown.getFullYear(),shown.getMonth()-1,1);render();});
  next.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();shown=new Date(shown.getFullYear(),shown.getMonth()+1,1);render();});
  head.append(prev,label,next);popup.append(head); head.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();});
  const grid=document.createElement("div");grid.className="dateCalendarGrid";
  ["CN","T2","T3","T4","T5","T6","T7"].forEach(day=>{const el=document.createElement("span");el.className="dateCalendarWeekday";el.textContent=day;grid.append(el);});
  const offset=new Date(shown.getFullYear(),shown.getMonth(),1).getDay(),count=new Date(shown.getFullYear(),shown.getMonth()+1,0).getDate();
  for(let i=0;i<offset;i++)grid.append(document.createElement("span"));
  for(let day=1;day<=count;day++){
   const b=document.createElement("button");b.type="button";b.textContent=String(day);
   const iso=shown.getFullYear()+"-"+String(shown.getMonth()+1).padStart(2,"0")+"-"+String(day).padStart(2,"0");
   if(iso===todayLocal())b.classList.add("today");
   if(dueDateIso(input.value)===iso)b.classList.add("selected");
   b.addEventListener("click",()=>{input.value=isoToDateVi(iso);popup.hidden=true;input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));});
   grid.append(b);
  }
  popup.append(grid);
  const foot=document.createElement("div");foot.className="dateCalendarFoot";
  const clear=document.createElement("button");clear.type="button";clear.textContent="Xóa";
  clear.addEventListener("click",()=>{input.value="";popup.hidden=true;input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));});
  const today=document.createElement("button");today.type="button";today.textContent="Hôm nay";
  today.addEventListener("click",()=>{const now=new Date(),iso=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0");input.value=isoToDateVi(iso);shown=new Date(now.getFullYear(),now.getMonth(),1);popup.hidden=true;input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));});
  foot.append(clear,today);popup.append(foot);
 }
 document.querySelector('[data-calendar="'+inputId+'"]').addEventListener("click",e=>{e.preventDefault();e.stopPropagation();popup.hidden=!popup.hidden;if(!popup.hidden){const iso=dueDateIso(input.value);if(iso)shown=new Date(Number(iso.slice(0,4)),Number(iso.slice(5,7))-1,1);else{const now=new Date();shown=new Date(now.getFullYear(),now.getMonth(),1);}render();}});
 input.addEventListener("input",()=>{
  formatDateInput(input);
  if(inputId==="newPatientDueDate"){
   if(input.value.length===10&&!dueDateIso(input.value)){input.value="";refreshNewPatientGestation();toast("Ngày dự sinh không hợp lệ. Vui lòng nhập lại theo dd/mm/yyyy.");return;}
   refreshNewPatientGestation();
  }else refreshRecordGestation();
 });
 input.addEventListener("blur",()=>{
  if(inputId==="newPatientDueDate"&&input.value&&!dueDateIso(input.value)){input.value="";refreshNewPatientGestation();toast("Ngày dự sinh không hợp lệ. Vui lòng nhập lại theo dd/mm/yyyy.");}
 });
 input.addEventListener("change",()=>{if(inputId==="scanDate")refreshRecordGestation();});
 render();
}
document.addEventListener("click",e=>{if(!e.target.closest(".dateControl")&&!e.target.closest(".dateCalendar"))document.querySelectorAll(".dateCalendar").forEach(el=>el.hidden=true);});
["newPatientDob","editPatientDob"].forEach(initDateCalendar);
function refreshNewPatientGestation(){
 const raw=$("newPatientDueDate").value.trim(),d=dueDateIso(raw),g=gestationAt(d,todayLocal());
 $("newPatientGestation").textContent=!raw?"Nhập ngày dự sinh theo dạng ngày/tháng/năm (dd/mm/yyyy) để tự tính tuổi thai.":!d?"Nhập ngày hợp lệ theo dạng dd/mm/yyyy, ví dụ 25/04/2027.":"Tuổi thai hôm nay: "+gestationText(g);
}
async function refreshRecordGestation(){
 const date=dueDateIso($("scanDate").value)||todayLocal();
 if(!selectedPatient){$("gaWeeks").value="";$("gaDays").value="";$("recordGestationHint").textContent="Chọn bệnh nhân có ngày dự sinh để tự tính tuổi thai theo ngày khám.";return;}
 const {data:p,error}=await db.from("profiles").select("due_date").eq("user_id",selectedPatient).single();
 if(error||!p?.due_date){$("gaWeeks").value="";$("gaDays").value="";$("recordGestationHint").textContent="Hồ sơ chưa có ngày dự sinh. Hãy bổ sung ngày dự sinh.";return;}
 const g=gestationAt(p.due_date,date);$("gaWeeks").value=g&&!g.invalid?g.weeks:"";$("gaDays").value=g&&!g.invalid?g.days:"";
 $("recordGestationHint").textContent="Tuổi thai ngày "+dateVi(date)+": "+gestationText(g)+". Ngày dự sinh: "+dateVi(p.due_date)+".";
}

$("newPatientName").addEventListener("input",()=>{const el=$("newPatientName");const pos=el.selectionStart;el.value=el.value.toLocaleUpperCase("vi-VN");if(pos!==null)el.setSelectionRange(pos,pos);}); $("newPatientAddress").addEventListener("input",()=>{const el=$("newPatientAddress");const pos=el.selectionStart;el.value=el.value.toLocaleUpperCase("vi-VN");if(pos!==null)el.setSelectionRange(pos,pos);}); $("newPatientPara").addEventListener("input",()=>{
 const value=$("newPatientPara").value;
 if(value && !/^[0-9]*$/.test(value)){ $("newPatientPara").value=""; toast("PARA chỉ được nhập 4 chữ số. Vui lòng nhập lại."); return; }
 if(value.length>4){ $("newPatientPara").value=""; toast("PARA chỉ được nhập đúng 4 chữ số. Vui lòng nhập lại."); }
});
$("refreshWeeklySchedule").addEventListener("click",loadWeeklyClinicSchedule);
initDateCalendar("newPatientDueDate"); initDateCalendar("scanDate"); initDateCalendar("followUpDate"); initDateCalendar("editPatientDueDate"); $("scanDate").value=isoToDateVi(todayLocal()); $("scanDate").addEventListener("change",refreshRecordGestation);

const newPasswordInput=$("newPassword"),toggleNewPassword=$("toggleNewPassword");
if(newPasswordInput&&toggleNewPassword)toggleNewPassword.addEventListener("click",()=>{const showing=newPasswordInput.type==="text";newPasswordInput.type=showing?"password":"text";toggleNewPassword.textContent=showing?"Hiện":"Ẩn";toggleNewPassword.setAttribute("aria-label",showing?"Hiện mật khẩu khởi tạo":"Ẩn mật khẩu khởi tạo");$("newPasswordHint").textContent=showing?"Mật khẩu đang được ẩn. Bấm Hiện để kiểm tra nội dung.":"Mật khẩu đang hiển thị để kiểm tra trước khi tạo tài khoản.";});
$("createPatientForm").addEventListener("submit", async e => {
  e.preventDefault(); fail("createMessage", "");
  if (user?.app_metadata?.role !== "admin") { fail("createMessage", "Tài khoản không có quyền quản trị."); return; }
  const display_name = $("newPatientName").value.trim().toLocaleUpperCase("vi-VN"), username = $("newUsername").value.trim().toLowerCase(), password = $("newPassword").value, dobRaw=$("newPatientDob").value.trim(), date_of_birth=dobRaw?dueDateIso(dobRaw):null;
  const phone = $("newPatientPhone").value.trim(), address = $("newPatientAddress").value.trim().toLocaleUpperCase("vi-VN");
  const para=$("newPatientPara").value.trim(), medical_history=$("newPatientHistory").value.trim(), preWeightRaw=$("newPatientPreWeight").value.trim(), heightRaw=$("newPatientHeight").value.trim(), pre_pregnancy_weight_kg=preWeightRaw===""?null:Number(preWeightRaw), height_cm=heightRaw===""?null:Number(heightRaw), ultrasound_abnormalities=$("newPatientUltrasoundAbnormalities").value.trim(), due_date=dueDateIso($("newPatientDueDate").value);
  const newGa=gestationAt(due_date,todayLocal());
  if(!due_date||!newGa||newGa.invalid){fail("createMessage","Ngày dự sinh không hợp lệ. Nhập đúng dạng dd/mm/yyyy (ví dụ 25/04/2027) và kiểm tra tuổi thai trong khoảng 0–42 tuần.");return;}
  if(dobRaw&&!date_of_birth){fail("createMessage","Ngày sinh không hợp lệ. Vui lòng nhập theo dd/mm/yyyy.");return;} if(date_of_birth&&date_of_birth>todayLocal()){fail("createMessage","Ngày sinh không thể ở tương lai.");return;}
  if(preWeightRaw!==""&&(!Number.isFinite(pre_pregnancy_weight_kg)||pre_pregnancy_weight_kg<1||pre_pregnancy_weight_kg>300)){fail("createMessage","Cân nặng trước mang thai phải từ 1 đến 300 kg.");return;}
  if(heightRaw!==""&&(!Number.isFinite(height_cm)||height_cm<50||height_cm>250)){fail("createMessage","Chiều cao phải từ 50 đến 250 cm.");return;}
  if(ultrasound_abnormalities.length>2000){fail("createMessage","Thông tin bất thường trên siêu âm quá dài.");return;}
  if (!/^[a-z0-9._-]{4,32}$/.test(username) || password.length < 8) { fail("createMessage", "Tên đăng nhập hoặc mật khẩu chưa đáp ứng yêu cầu."); return; }
  const existing = await db.from("profiles").select("user_id").eq("username", username).maybeSingle();
  if (existing.error) { fail("createMessage", "Chưa kiểm tra được tên đăng nhập. Vui lòng thử lại."); return; }
  if (existing.data) { fail("createMessage", "Tên đăng nhập \"" + username + "\" đã tồn tại. Vui lòng chọn tên khác."); $("newUsername").focus(); return; }
  const { data: { session } } = await db.auth.getSession();
  const { data, error } = await db.functions.invoke("admin-create-patient", { body: { display_name, username, password, phone, address, para, medical_history, pre_pregnancy_weight_kg, height_cm, ultrasound_abnormalities, due_date, date_of_birth }, headers: { Authorization: "Bearer " + session.access_token } });
  const serverMessage = data?.error || error?.message || "";
  if (error || data?.error) {
    if (/tên đăng nhập đã tồn tại|already registered|already been registered|user already exists|duplicate key/i.test(serverMessage)) {
      fail("createMessage", "Tên đăng nhập \"" + username + "\" đã tồn tại. Vui lòng chọn tên khác.");
      $("newUsername").focus();
    } else fail("createMessage", "Không tạo được tài khoản: " + serverMessage);
    return;
  }
  const { data: createdProfile, error: createdProfileLookupError } = await db.from("profiles").select("user_id").eq("username", username).single();
  if (createdProfileLookupError || !createdProfile) { fail("createMessage", "Tài khoản đã tạo, nhưng chưa xác minh được hồ sơ để lưu các thông tin bổ sung. Hãy chọn bệnh nhân và cập nhật lại hồ sơ."); return; }
  const { error: extraProfileError } = await db.from("profiles").update({ pre_pregnancy_weight_kg, height_cm, ultrasound_abnormalities: ultrasound_abnormalities || null }).eq("user_id", createdProfile.user_id);
  if (extraProfileError) { fail("createMessage", "Tài khoản đã tạo, nhưng 3 thông tin bổ sung chưa lưu được. Hãy chọn bệnh nhân vừa tạo, nhập lại các trường này trong phần Sửa / cập nhật hồ sơ. Lỗi: " + extraProfileError.message); return; }
  fail("createMessage", "Đã tạo tài khoản " + username + ". Tuổi thai hôm nay: " + gestationText(newGa) + ". Hãy trao mật khẩu riêng cho bệnh nhân.");
  $("createPatientForm").reset(); $("newPatientGestation").textContent="Nhập ngày dự sinh để tự tính tuổi thai."; await loadPatients();
});
async function deleteFetalRecord(r) {
  if (user?.app_metadata?.role !== "admin" || !selectedPatient || !r?.id) {
    fail("recordMessage","Bạn cần đăng nhập bằng tài khoản bác sĩ và chọn đúng bệnh nhân."); return;
  }
  const ok=window.confirm("Xóa lần khám ngày "+dateVi(r.scan_date)+(r.efw_grams!=null?" · EFW "+fmt(r.efw_grams)+" g":"")+"? Dữ liệu này sẽ bị xóa khỏi lịch sử và biểu đồ của bệnh nhân. Không thể hoàn tác.");
  if(!ok)return;
  const {error}=await db.from("fetal_weight_records").delete().eq("id",r.id).eq("patient_user_id",selectedPatient);
  if(error){fail("recordMessage","Không xóa được lần khám: "+error.message);return;}
  fail("recordMessage","Đã xóa lần khám ngày "+dateVi(r.scan_date)+".");
  await loadSelectedPatient();
}
$("recordForm").addEventListener("submit", async e => {
  e.preventDefault(); fail("recordMessage", "");
  if (user?.app_metadata?.role !== "admin" || !selectedPatient) { fail("recordMessage", "Hãy đăng nhập bằng tài khoản bác sĩ và chọn bệnh nhân."); return; }
  const {data: sp,error: spe}=await db.from("profiles").select("due_date").eq("user_id",selectedPatient).single();
  if(spe||!sp?.due_date){fail("recordMessage","Hồ sơ bệnh nhân chưa có ngày dự sinh. Hãy cập nhật trước.");return;}
  const scanDate=dueDateIso($("scanDate").value); const g=gestationAt(sp.due_date,scanDate);
  if(!g||g.invalid||g.weeks<1||g.weeks>42){fail("recordMessage","Không tính được tuổi thai hợp lệ. Vui lòng kiểm tra ngày dự sinh và ngày khám.");return;}
  $("gaWeeks").value=g.weeks;$("gaDays").value=g.days;
  const followUpRaw=$("followUpDate").value.trim(); const followUpDate=followUpRaw ? dueDateIso(followUpRaw) : null;
  if(followUpRaw&&!followUpDate){fail("recordMessage","Ngày hẹn tái khám không hợp lệ. Vui lòng nhập theo dd/mm/yyyy.");$("followUpDate").value="";return;}
  const efwRaw=$("efw").value.trim(); const efwValue=efwRaw===""?null:Number(efwRaw);
  if(efwValue!==null&&(!Number.isFinite(efwValue)||efwValue<100||efwValue>7000)){fail("recordMessage","Nếu nhập cân nặng, vui lòng nhập từ 100 đến 7000 gam.");return;}
  const row = { patient_user_id:selectedPatient, created_by:user.id, scan_date:scanDate, follow_up_date:followUpDate, ga_weeks:g.weeks, ga_days:g.days, efw_grams:efwValue, note:$("recordNote").value.trim() || null };
  const {error}=await db.from("fetal_weight_records").insert(row);
  if(error){fail("recordMessage","Không lưu được: "+error.message);return;}
  $("recordForm").reset();$("gaWeeks").value="";$("gaDays").value="";
  fail("recordMessage","Đã lưu lần khám.");
  await loadSelectedPatient();
});
$("testForm").addEventListener("submit", async e => {
  e.preventDefault(); fail("testMessage", "");
  if (user?.app_metadata?.role !== "admin" || !selectedPatient) { fail("testMessage", "Hãy chọn bệnh nhân trước khi tải phiếu xét nghiệm."); return; }
  const file = $("testFile").files?.[0];
  if (!file) { fail("testMessage", "Vui lòng chọn một tệp."); return; }
  if (!allowedTypes.includes(file.type)) { fail("testMessage", "Chỉ nhận ảnh JPG, PNG, WEBP, PDF, DOC hoặc DOCX."); return; }
  if (file.size < 1 || file.size > maxFileBytes) { fail("testMessage", "Tệp phải nhỏ hơn hoặc bằng 10 MB."); return; }
  const row = { patient_user_id:selectedPatient, created_by:user.id, test_date:new Date().toISOString().slice(0,10), test_name:"Phiếu xét nghiệm" };
  const { data: test, error } = await db.from("patient_test_records").insert(row).select("id").single();
  if (error || !test) { fail("testMessage", "Không tạo được phiếu xét nghiệm: " + (error?.message || "Lỗi không xác định")); return; }
  const safeName = file.name.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9._-]/g,"_").slice(-100) || "phieu-xet-nghiem";
  const path = selectedPatient + "/" + test.id + "/" + crypto.randomUUID() + "_" + safeName;
  const { error: uploadError } = await db.storage.from("patient-lab-files").upload(path, file, { contentType:file.type, upsert:false });
  if (uploadError) { fail("testMessage", "Không tải được tệp lên: " + uploadError.message); return; }
  const { error: metaError } = await db.from("patient_test_attachments").insert({
    test_record_id:test.id, patient_user_id:selectedPatient, created_by:user.id,
    storage_path:path, file_name:file.name, mime_type:file.type, size_bytes:file.size
  });
  if (metaError) {
    await db.storage.from("patient-lab-files").remove([path]);
    fail("testMessage", "Tệp đã tải lên nhưng không lưu được thông tin. Vui lòng thử lại."); return;
  }
  $("testForm").reset(); await loadSelectedPatient();
  fail("testMessage", "Đã tải phiếu xét nghiệm lên thành công.");
});
function intergrowthEfwCentile(ga, percentile) {
  // INTERGROWTH-21st EFW standard, Stirnemann et al., UOG 2017; GA 22–40 weeks.
  const lambda = -4.257629 - 2162.234 * Math.pow(ga,-2) + 0.0002301829 * Math.pow(ga,3);
  const mu = 4.956737 + 0.0005019687 * Math.pow(ga,3) - 0.0001227065 * Math.pow(ga,3) * Math.log(ga);
  const sigma = 1e-4 * (-6.997171 + 0.057559 * Math.pow(ga,3) - 0.01493946 * Math.pow(ga,3) * Math.log(ga));
  const zValues = {3:-1.880794,10:-1.281552,50:0,90:1.281552,97:1.880794};
  const z=zValues[percentile];
  const logWeight = Math.abs(lambda)<1e-8 ? mu * Math.exp(sigma*z) : mu * Math.pow(1 + lambda*sigma*z, 1/lambda);
  return Math.exp(logWeight);
}
function drawChart(data, canvasId="weightChart", emptyId="chartEmpty") {
  const canvas=$(canvasId),ctx=canvas.getContext("2d"),empty=$(emptyId);
  const pts=[...data].filter(p=>p.efw_grams!==null&&p.efw_grams!==undefined&&Number.isFinite(Number(p.efw_grams))&&Number(p.efw_grams)>=100&&Number(p.efw_grams)<=7000)
    .map(p=>({...p,gaExact:Number(p.ga_weeks)+Number(p.ga_days||0)/7,efw:Number(p.efw_grams)}))
    .sort((a,b)=>a.gaExact-b.gaExact);
  const W=1000,H=520,x0=78,x1=900,y0=42,y1=420,minGA=22,maxGA=40,minW=300,maxW=4500;
  canvas.width=W;canvas.height=H;ctx.clearRect(0,0,W,H);
  // The reference curves remain visible even when no EFW values have been entered.
  empty.hidden=true;
  const xp=ga=>x0+(ga-minGA)/(maxGA-minGA)*(x1-x0);
  const yp=weight=>y1-(weight-minW)/(maxW-minW)*(y1-y0);
  ctx.font="15px Arial";ctx.lineWidth=1;ctx.strokeStyle="#eadfe5";ctx.fillStyle="#756a75";
  for(let w=500;w<=4500;w+=500){
    const y=yp(w);ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(x1,y);ctx.stroke();
    ctx.textAlign="right";ctx.fillText(w.toLocaleString("en-US"),x0-12,y+5);
  }
  for(let ga=22;ga<=40;ga+=2){
    const x=xp(ga);ctx.beginPath();ctx.moveTo(x,y0);ctx.lineTo(x,y1);ctx.stroke();
    ctx.textAlign="center";ctx.fillStyle="#756a75";ctx.fillText(String(ga),x,y1+24);
  }
  ctx.fillStyle="#302630";ctx.textAlign="left";ctx.font="bold 15px Arial";ctx.fillText("EFW (g)",x0,y0-16);
  ctx.textAlign="center";ctx.fillText("Tuổi thai (tuần)",(x0+x1)/2,H-22);
  const curves=[
    {p:3,color:"#64748b",dash:[5,5],width:2},
    {p:10,color:"#0f766e",dash:[7,4],width:2},
    {p:50,color:"#b84e79",dash:[],width:3},
    {p:90,color:"#c07826",dash:[7,4],width:2},
    {p:97,color:"#9f3d46",dash:[5,5],width:2}
  ];
  for(const curve of curves){
    ctx.beginPath();ctx.strokeStyle=curve.color;ctx.lineWidth=curve.width;ctx.setLineDash(curve.dash);
    for(let day=22*7;day<=40*7;day++){
      const ga=day/7,weight=intergrowthEfwCentile(ga,curve.p),x=xp(ga),y=yp(weight);
      if(day===22*7)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.stroke();ctx.setLineDash([]);
    const endY=yp(intergrowthEfwCentile(39.65,curve.p));
    ctx.fillStyle=curve.color;ctx.font="bold 13px Arial";ctx.textAlign="left";
    ctx.fillText("P"+curve.p,x1+7,endY+4);
  }
  // Patient measurements are separate points, so missing EFW does not remove the visit or its follow-up date.
  pts.filter(p=>p.gaExact>=minGA&&p.gaExact<=maxGA).forEach(p=>{
    const x=xp(p.gaExact),y=yp(p.efw);
    ctx.beginPath();ctx.fillStyle="#302630";ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.arc(x,y,6,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle="#302630";ctx.font="bold 13px Arial";ctx.textAlign="left";
    const label=p.efw.toLocaleString("vi-VN")+" g";
    ctx.fillText(label,Math.min(x+9,x1-70),Math.max(y-9,y0+12));
  });
  const outside=pts.filter(p=>p.gaExact<minGA||p.gaExact>maxGA);
  if(outside.length){
    ctx.textAlign="left";ctx.font="13px Arial";ctx.fillStyle="#843651";
    ctx.fillText(outside.length+" số đo ngoài khoảng chuẩn 22–40 tuần không hiển thị trên đồ thị.",x0,y1+49);
  }
}
$("downloadCsv").addEventListener("click", () => {
  const rows = [["Ngày khám","Tuổi thai","EFW (g)","Ghi chú"], ...records.map(r=>[r.scan_date,ga(r),r.efw_grams,r.note||""])];
  const csv = "\uFEFF" + rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));a.download="lich-su-can-nang-thai-nhi.csv";a.click();URL.revokeObjectURL(a.href);
});

let activePatientQaConversation=null,activeAdminQaConversation=null,adminQaBusy=false;
function qaDate(v){return v?new Date(v).toLocaleString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"";}
function qaAppendMessage(box,m,patientName){
 const item=document.createElement("article");item.className="qaMessage qaMessage-"+m.sender_role;
 const meta=document.createElement("div");meta.className="qaMessageMeta";meta.textContent=(m.sender_role==="patient"?(patientName||"Bạn"):m.sender_role==="doctor"?"BS Hùng":"Trợ lý AI")+" · "+qaDate(m.created_at);
 const body=document.createElement("div");body.className="qaMessageBody";body.textContent=m.body||"";item.append(meta,body);
 if(Array.isArray(m.sources)&&m.sources.length){const list=document.createElement("div");list.className="qaSources";const label=document.createElement("strong");label.textContent="Bài viết tham khảo: ";list.append(label);m.sources.forEach((s,i)=>{if(!s||typeof s.url!=="string"||!s.url.startsWith("https://bslenamhung.github.io/"))return;if(i)list.append(document.createTextNode(" · "));const a=document.createElement("a");a.href=s.url;a.target="_blank";a.rel="noopener noreferrer";a.textContent=s.title||"Bài viết phòng khám";list.append(a);});item.append(list);}
 box.append(item);
}
async function loadPatientQaThreads(keep=true){
 const box=$("patientQaThreads");if(!box||!user)return;
 const {data:threads,error}=await db.from("patient_ai_conversations").select("id,subject,status,last_message_at").eq("patient_user_id",user.id).order("last_message_at",{ascending:false});
 if(error){box.textContent="Chưa tải được hội thoại. Vui lòng tải lại trang.";return;}
 box.replaceChildren();if(!threads?.length){const p=document.createElement("p");p.className="muted";p.textContent="Bạn chưa có câu hỏi nào. Bấm “Đặt câu hỏi mới” để bắt đầu." ;box.append(p);if(!activePatientQaConversation)$("patientQaChat").hidden=true;return;}
 threads.forEach(t=>{const b=document.createElement("button");b.type="button";b.className="qaThreadButton"+(t.id===activePatientQaConversation?" selected":"");const title=document.createElement("strong");title.textContent=t.subject;const small=document.createElement("small");small.textContent=(t.status==="answered"?"Đã có phản hồi":t.status==="closed"?"Đã đóng":"Đang chờ phản hồi")+" · "+qaDate(t.last_message_at);b.append(title,small);b.addEventListener("click",()=>openPatientQaConversation(t.id));box.append(b);});
 if(keep&&activePatientQaConversation&&threads.some(t=>t.id===activePatientQaConversation))await renderPatientQaMessages(activePatientQaConversation);
}
async function renderPatientQaMessages(id){
 const tr=await db.from("patient_ai_conversations").select("id,subject").eq("id",id).single();if(tr.error||!tr.data)return;
 const res=await db.from("patient_ai_messages").select("id,sender_role,body,sources,created_at,is_read_by_patient").eq("conversation_id",id).order("created_at");if(res.error){toast("Chưa tải được nội dung hội thoại.");return;}
 $("patientQaSubject").textContent=tr.data.subject;$("patientQaMessages").replaceChildren();(res.data||[]).forEach(m=>qaAppendMessage($("patientQaMessages"),m,"Bạn"));

 $("patientQaChat").hidden=false;$("patientQaMessages").scrollTop=$("patientQaMessages").scrollHeight;
}
async function openPatientQaConversation(id){activePatientQaConversation=id;await loadPatientQaThreads(false);await renderPatientQaMessages(id);}
$("floatingPatientQaButton")?.addEventListener("click",()=>{
  const panel=$("patientQaPanel");
  if(!panel)return;
  panel.scrollIntoView({behavior:"smooth",block:"start"});
  panel.setAttribute("tabindex","-1");
  panel.focus({preventScroll:true});
});
$("newQaConversation")?.addEventListener("click",()=>{activePatientQaConversation=null;$("patientQaSubject").textContent="Câu hỏi mới";$("patientQaMessages").replaceChildren();$("patientQaChat").hidden=false;$("patientQaInput").value="";$("patientQaStatus").textContent="";$("patientQaInput").focus();});
$("patientQaForm")?.addEventListener("submit",async e=>{
 e.preventDefault();const input=$("patientQaInput"),body=input.value.trim();if(!body||body.length>6000)return;const btn=$("patientQaSend");btn.disabled=true;btn.textContent="Đang gửi…";$("patientQaStatus").textContent="";
 try{
  let id=activePatientQaConversation;
  if(!id){const c=await db.from("patient_ai_conversations").insert({patient_user_id:user.id,subject:body.replace(/\s+/g," ").slice(0,76)||"Câu hỏi tư vấn"}).select("id").single();if(c.error||!c.data)throw c.error||new Error("Không tạo được hội thoại");id=c.data.id;activePatientQaConversation=id;}
  const m=await db.from("patient_ai_messages").insert({conversation_id:id,patient_user_id:user.id,sender_role:"patient",body}).select("id").single();if(m.error||!m.data)throw m.error||new Error("Không lưu được câu hỏi");
  input.value="";$("patientQaStatus").textContent="Đã lưu câu hỏi. Đang tìm thông tin trong bài viết phòng khám…";await renderPatientQaMessages(id);await loadPatientQaThreads(false);
  const sess=await db.auth.getSession();const result=await db.functions.invoke("patient-ai-answer",{body:{conversation_id:id,message_id:m.data.id},headers:{Authorization:"Bearer "+sess.data.session.access_token}});
  $("patientQaStatus").textContent=(result.error||result.data?.error)?"Câu hỏi đã được lưu để bác sĩ xem. Trợ lý AI chưa trả lời được lúc này.":"Đã có phản hồi tự động. Bác sĩ cũng có thể xem và trả lời câu hỏi này.";
  await renderPatientQaMessages(id);await loadPatientQaThreads(false);
 }catch(err){console.error("Patient Q&A send failed",err);$("patientQaStatus").textContent="Chưa gửi được câu hỏi. Vui lòng thử lại.";}
 finally{btn.disabled=false;btn.textContent="Gửi câu hỏi";}
});
async function loadAdminQaThreads(keep=true){
 if(adminQaBusy||user?.app_metadata?.role!=="admin")return;adminQaBusy=true;const box=$("adminQaThreads");if(!box){adminQaBusy=false;return;}
 try{
  const r=await db.from("patient_ai_conversations").select("id,patient_user_id,subject,status,last_message_at").order("last_message_at",{ascending:false}).limit(100);if(r.error)throw r.error;
  const ids=[...new Set((r.data||[]).map(t=>t.patient_user_id))];let prof=[];if(ids.length){const p=await db.from("profiles").select("user_id,display_name,username,phone").in("user_id",ids);if(p.error)throw p.error;prof=p.data||[];}const pm=new Map(prof.map(p=>[p.user_id,p]));
  const tids=(r.data||[]).map(t=>t.id);let unread=new Map();if(tids.length){const u=await db.from("patient_ai_messages").select("conversation_id,id").in("conversation_id",tids).eq("sender_role","patient").eq("is_read_by_admin",false);if(!u.error)(u.data||[]).forEach(m=>unread.set(m.conversation_id,(unread.get(m.conversation_id)||0)+1));}
  box.replaceChildren();if(!r.data?.length){const p=document.createElement("p");p.className="muted";p.textContent="Chưa có câu hỏi nào từ bệnh nhân.";box.append(p);}
  (r.data||[]).forEach(t=>{const p=pm.get(t.patient_user_id)||{};const b=document.createElement("button");b.type="button";b.className="qaThreadButton"+(t.id===activeAdminQaConversation?" selected":"")+(unread.get(t.id)?" unread":"");const title=document.createElement("strong");title.textContent=(p.display_name||p.username||"Bệnh nhân")+" · "+t.subject;const small=document.createElement("small");small.textContent=(unread.get(t.id)?"MỚI: "+unread.get(t.id)+" câu hỏi chưa đọc · ":"")+(t.status==="answered"?"Đã trả lời":t.status==="closed"?"Đã đóng":"Đang chờ")+" · "+qaDate(t.last_message_at)+" · "+(p.username||"");b.append(title,small);b.addEventListener("click",()=>openAdminQaConversation(t.id));box.append(b);});
  const n=[...unread.values()].reduce((a,b)=>a+b,0);$("adminQaStatus").textContent=n?"Có "+n+" câu hỏi chưa đọc.":"Danh sách đã cập nhật.";
  if(keep&&activeAdminQaConversation&&r.data.some(t=>t.id===activeAdminQaConversation))await renderAdminQaMessages(activeAdminQaConversation);
 }catch(err){console.error("Admin Q&A load failed",err);box.textContent="Chưa tải được hộp thư. Bấm Làm mới để thử lại.";}finally{adminQaBusy=false;}
}
async function renderAdminQaMessages(id){
 const tr=await db.from("patient_ai_conversations").select("id,patient_user_id,subject,status").eq("id",id).single();if(tr.error||!tr.data)return;const t=tr.data;
 const pair=await Promise.all([db.from("patient_ai_messages").select("id,sender_role,body,sources,created_at,is_read_by_admin").eq("conversation_id",id).order("created_at"),db.from("profiles").select("display_name,username,phone").eq("user_id",t.patient_user_id).single()]);
 if(pair[0].error)return;const p=pair[1].data||{};$("adminQaSubject").textContent=t.subject;$("adminQaPatientMeta").textContent="Bệnh nhân: "+(p.display_name||"Chưa có họ tên")+" · Tên đăng nhập: "+(p.username||"—")+(p.phone?" · SĐT: "+p.phone:"")+" · "+(t.status==="answered"?"Đã trả lời":t.status==="closed"?"Đã đóng":"Đang chờ");
 $("adminQaMessages").replaceChildren();(pair[0].data||[]).forEach(m=>qaAppendMessage($("adminQaMessages"),m,p.display_name||p.username||"Bệnh nhân"));const ids=(pair[0].data||[]).filter(m=>m.sender_role==="patient"&&!m.is_read_by_admin).map(m=>m.id);if(ids.length)await db.from("patient_ai_messages").update({is_read_by_admin:true}).in("id",ids);$("adminQaChat").hidden=false;$("adminQaMessages").scrollTop=$("adminQaMessages").scrollHeight;
}
async function openAdminQaConversation(id){activeAdminQaConversation=id;await renderAdminQaMessages(id);await loadAdminQaThreads(false);}
$("refreshAdminQa")?.addEventListener("click",()=>loadAdminQaThreads(true));
$("adminQaForm")?.addEventListener("submit",async e=>{e.preventDefault();if(user?.app_metadata?.role!=="admin"||!activeAdminQaConversation){$("adminQaReplyStatus").textContent="Chọn một cuộc trò chuyện trước.";return;}const body=$("adminQaInput").value.trim();if(!body||body.length>6000)return;const c=await db.from("patient_ai_conversations").select("patient_user_id").eq("id",activeAdminQaConversation).single();if(c.error||!c.data){$("adminQaReplyStatus").textContent="Không tìm thấy hội thoại.";return;}const btn=$("adminQaSend");btn.disabled=true;btn.textContent="Đang gửi…";const r=await db.from("patient_ai_messages").insert({conversation_id:activeAdminQaConversation,patient_user_id:c.data.patient_user_id,sender_role:"doctor",body});btn.disabled=false;btn.textContent="Gửi trả lời";if(r.error){$("adminQaReplyStatus").textContent="Chưa gửi được câu trả lời. Vui lòng thử lại.";return;}$("adminQaInput").value="";$("adminQaReplyStatus").textContent="Đã gửi câu trả lời cho bệnh nhân.";await renderAdminQaMessages(activeAdminQaConversation);await loadAdminQaThreads(false);});


document.querySelectorAll(".logout").forEach(b=>b.addEventListener("click", async()=>{await db.auth.signOut();user=null;profile=null;records=[];selectedPatient=null;view("loginView");$("password").value="";}));
(async()=>{const {data}=await db.auth.getSession();if(data.session){user=data.session.user;await routeUser();}})();
setInterval(()=>{if(user?.app_metadata?.role==="admin"&&!$("adminView").hidden)loadAdminQaThreads(true);},30000);
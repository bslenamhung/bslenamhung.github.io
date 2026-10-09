import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL = "https://ckwhjyzomppsdplnkdeq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_FmJK_HkQxhoQ04dIzI1mCg_eupXeR48";
const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = id => document.getElementById(id);
let user = null, profile = null, records = [], selectedPatient = null, patientDirectory = [];
const emailFor = username => username.trim().toLowerCase() + "@patients.bs-hung.invalid";
const fmt = n => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(n);
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
$("loginForm").addEventListener("submit", async e => {
  e.preventDefault(); fail("loginError", "");
  const raw = $("username").value.trim();
  const email = raw.includes("@") ? raw : emailFor(raw);
  const { data, error } = await db.auth.signInWithPassword({ email, password: $("password").value });
  if (error) { fail("loginError", "Đăng nhập không thành công. Vui lòng kiểm tra thông tin hoặc liên hệ phòng khám."); return; }
  user = data.user; await routeUser();
});
async function routeUser() {
  const { data, error } = await db.from("profiles").select("user_id,username,display_name,phone,address,para,medical_history,due_date").eq("user_id", user.id).single();
  if (error || !data) { await db.auth.signOut(); view("loginView"); fail("loginError", "Không đọc được hồ sơ. Vui lòng liên hệ quản trị viên."); return; }
  profile = data;
  if (user.app_metadata?.role === "admin") { view("adminView"); await loadPatients(); }
  else { view("patientView"); await loadPatient(); }
}
async function loadPatient() {
  $("patientName").textContent = profile.display_name || profile.username;
  $("patientProfileName").textContent = profile.display_name || "Chưa cập nhật";
  $("patientProfileUsername").textContent = profile.username || "—";
  $("patientProfilePhone").textContent = profile.phone || "Chưa cập nhật";
  $("patientProfileAddress").textContent = profile.address || "Chưa cập nhật";
  $("patientProfilePara").textContent = profile.para || "Chưa cập nhật";
  $("patientProfileHistory").textContent = profile.medical_history || "Chưa cập nhật";
  $("patientProfileDueDate").textContent = profile.due_date ? dateVi(profile.due_date) : "Chưa cập nhật";
  $("patientProfileGestation").textContent = profile.due_date ? gestationText(gestationAt(profile.due_date,todayLocal())) : "Chưa cập nhật";
  const { data, error } = await db.from("fetal_weight_records").select("scan_date,ga_weeks,ga_days,efw_grams,note").eq("patient_user_id", user.id).order("scan_date");
  if (error) { toast("Không tải được lịch sử khám."); return; }
  records = data || [];
  const latest = [...records].sort((a,b) => b.scan_date.localeCompare(a.scan_date))[0];
  $("lastVisit").textContent = latest ? dateVi(latest.scan_date) : "—";
  $("lastGa").textContent = latest ? ga(latest) : "Chưa có dữ liệu";
  $("lastWeight").textContent = latest ? fmt(latest.efw_grams) + " g" : "—";
  $("visitCount").textContent = records.length;
  $("patientRows").replaceChildren();
  [...records].sort((a,b) => b.scan_date.localeCompare(a.scan_date)).forEach(r => {
    const tr = document.createElement("tr");
    [dateVi(r.scan_date), ga(r), fmt(r.efw_grams) + " g", r.note || "—"].forEach(v => { const td = document.createElement("td"); td.textContent = v; tr.append(td); });
    $("patientRows").append(tr);
  });
  drawChart(records);
  const { data: tests, error: testError } = await db.from("patient_test_records").select("id,test_date").eq("patient_user_id", user.id).order("test_date", {ascending:false});
  if (testError) { toast("Không tải được phiếu xét nghiệm."); return; }
  let testFiles = [];
  try { testFiles = await attachmentsFor((tests || []).map(t=>t.id)); } catch { toast("Không tải được tệp xét nghiệm."); }
  renderPatientFiles(tests || [], testFiles);
  $("patientTestsEmpty").hidden = testFiles.length > 0;
}
function normalizePatientSearch(value) {
 return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase().trim();
}
function renderPatientOptions() {
 const select=$("patientSelect"), query=normalizePatientSearch($("patientSearch").value);
 const terms=query.split(/\s+/).filter(Boolean);
 const filtered=patientDirectory.filter(p=>{
  const haystack=normalizePatientSearch([p.display_name,p.username,p.phone].filter(Boolean).join(" "));
  return terms.every(term=>haystack.includes(term));
 });
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
  ? "Tìm thấy "+filtered.length+" / "+patientDirectory.length+" bệnh nhân. Chọn đúng họ tên và tên đăng nhập."
  : "Có "+patientDirectory.length+" bệnh nhân. Gõ không dấu cũng tìm được.";
 if(query && filtered.length===0) $("patientSearchCount").textContent="Không tìm thấy bệnh nhân phù hợp. Thử họ tên không dấu, tên đăng nhập hoặc số điện thoại.";
}
async function loadPatients() {
 const { data, error } = await db.from("profiles").select("user_id,username,display_name,phone,address,para,medical_history,due_date").order("display_name");
 if (error) { toast("Không tải được danh sách hồ sơ."); return; }
 patientDirectory=(data||[]).filter(p=>p.user_id!==user.id);
 renderPatientOptions();
}
async function loadSelectedPatient() {
  selectedPatient = $("patientSelect").value || null;
  $("adminPatientHistory").replaceChildren(); $("adminTestHistory").replaceChildren(); $("adminPatientProfile").replaceChildren();
  fail("recordMessage",""); fail("testMessage","");
  if (!selectedPatient) return;
  const { data: p, error: pError } = await db.from("profiles").select("username,display_name,phone,address,para,medical_history,due_date").eq("user_id",selectedPatient).single();
  if (pError) { toast("Không tải được thông tin bệnh nhân."); return; }
  [["Họ tên",p.display_name],["Tên đăng nhập",p.username],["Số điện thoại",p.phone],["Địa chỉ",p.address],["PARA",p.para],["Tiền sử bệnh",p.medical_history],["Ngày dự sinh",p.due_date?dateVi(p.due_date):null],["Tuổi thai theo ngày khám",p.due_date?gestationText(gestationAt(p.due_date,dueDateIso($("scanDate").value)||todayLocal())):null]].forEach(([label,value])=>{
    const line=document.createElement("div"); const strong=document.createElement("strong"); strong.textContent=label+": "; line.append(strong,document.createTextNode(value || "Chưa cập nhật")); $("adminPatientProfile").append(line);
  });
  const { data, error } = await db.from("fetal_weight_records").select("scan_date,ga_weeks,ga_days,efw_grams,note").eq("patient_user_id", selectedPatient).order("scan_date", { ascending:false });
  if (error) { toast("Không tải được lịch sử bệnh nhân."); return; }
  (data || []).forEach(r => addHistoryLine($("adminPatientHistory"),dateVi(r.scan_date) + " · " + ga(r) + " · " + fmt(r.efw_grams) + " g" + (r.note ? " · " + r.note : "")));
  if (!(data || []).length) addHistoryLine($("adminPatientHistory"),"Chưa có số đo được cập nhật.");
  const { data: tests, error: testError } = await db.from("patient_test_records").select("id,test_date,test_name").eq("patient_user_id", selectedPatient).order("test_date", {ascending:false});
  if (testError) { toast("Không tải được lịch sử xét nghiệm."); return; }
  let files = [];
  try { files = await attachmentsFor((tests || []).map(t=>t.id)); } catch { toast("Không tải được danh sách tệp xét nghiệm."); }
  (tests || []).forEach(t => {
    const line = document.createElement("div"); line.className = "adminTestFileLine";
    line.append(document.createTextNode(dateVi(t.test_date)+" · Phiếu xét nghiệm"));
    const related = files.filter(f=>f.test_record_id===t.id);
    related.forEach(f=>{
      line.append(document.createElement("br"));
      if (f.mime_type.startsWith("image/")) {
        const img=document.createElement("img"); img.src=f.signedUrl; img.alt="Ảnh phiếu xét nghiệm"; img.loading="lazy"; img.className="adminTestThumb"; line.append(img);
      } else line.append(makeLink(f.signedUrl,f.file_name,f.mime_type));
    });
    $("adminTestHistory").append(line);
  });
  if (!(tests || []).length) addHistoryLine($("adminTestHistory"),"Chưa có phiếu xét nghiệm được cập nhật.");
}
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
  prev.addEventListener("click",()=>{shown=new Date(shown.getFullYear(),shown.getMonth()-1,1);render();});
  next.addEventListener("click",()=>{shown=new Date(shown.getFullYear(),shown.getMonth()+1,1);render();});
  head.append(prev,label,next);popup.append(head);
  const grid=document.createElement("div");grid.className="dateCalendarGrid";
  ["CN","T2","T3","T4","T5","T6","T7"].forEach(day=>{const el=document.createElement("span");el.className="dateCalendarWeekday";el.textContent=day;grid.append(el);});
  const offset=new Date(shown.getFullYear(),shown.getMonth(),1).getDay(),count=new Date(shown.getFullYear(),shown.getMonth()+1,0).getDate();
  for(let i=0;i<offset;i++)grid.append(document.createElement("span"));
  for(let day=1;day<=count;day++){
   const b=document.createElement("button");b.type="button";b.textContent=String(day);
   const iso=shown.getFullYear()+"-"+String(shown.getMonth()+1).padStart(2,"0")+"-"+String(day).padStart(2,"0");
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
 document.querySelector('[data-calendar="'+inputId+'"]').addEventListener("click",()=>{popup.hidden=!popup.hidden;if(!popup.hidden){const iso=dueDateIso(input.value);if(iso)shown=new Date(Number(iso.slice(0,4)),Number(iso.slice(5,7))-1,1);else{const now=new Date();shown=new Date(now.getFullYear(),now.getMonth(),1);}render();}});
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

$("newPatientPara").addEventListener("input",()=>{
 const value=$("newPatientPara").value;
 if(value && !/^[0-9]*$/.test(value)){ $("newPatientPara").value=""; toast("PARA chỉ được nhập 4 chữ số. Vui lòng nhập lại."); return; }
 if(value.length>4){ $("newPatientPara").value=""; toast("PARA chỉ được nhập đúng 4 chữ số. Vui lòng nhập lại."); }
});
initDateCalendar("newPatientDueDate"); initDateCalendar("scanDate"); $("scanDate").value=isoToDateVi(todayLocal()); $("scanDate").addEventListener("change",refreshRecordGestation);

$("createPatientForm").addEventListener("submit", async e => {
  e.preventDefault(); fail("createMessage", "");
  if (user?.app_metadata?.role !== "admin") { fail("createMessage", "Tài khoản không có quyền quản trị."); return; }
  const display_name = $("newPatientName").value.trim(), username = $("newUsername").value.trim().toLowerCase(), password = $("newPassword").value;
  const phone = $("newPatientPhone").value.trim(), address = $("newPatientAddress").value.trim();
  const para=$("newPatientPara").value.trim(), medical_history=$("newPatientHistory").value.trim(), due_date=dueDateIso($("newPatientDueDate").value);
  const newGa=gestationAt(due_date,todayLocal());
  if(!due_date||!newGa||newGa.invalid){fail("createMessage","Ngày dự sinh không hợp lệ. Nhập đúng dạng dd/mm/yyyy (ví dụ 25/04/2027) và kiểm tra tuổi thai trong khoảng 0–42 tuần.");return;}
  if (!/^[a-z0-9._-]{4,32}$/.test(username) || password.length < 10) { fail("createMessage", "Tên đăng nhập hoặc mật khẩu chưa đáp ứng yêu cầu."); return; }
  const existing = await db.from("profiles").select("user_id").eq("username", username).maybeSingle();
  if (existing.error) { fail("createMessage", "Chưa kiểm tra được tên đăng nhập. Vui lòng thử lại."); return; }
  if (existing.data) { fail("createMessage", "Tên đăng nhập \"" + username + "\" đã tồn tại. Vui lòng chọn tên khác."); $("newUsername").focus(); return; }
  const { data: { session } } = await db.auth.getSession();
  const { data, error } = await db.functions.invoke("admin-create-patient", { body: { display_name, username, password, phone, address, para, medical_history, due_date }, headers: { Authorization: "Bearer " + session.access_token } });
  const serverMessage = data?.error || error?.message || "";
  if (error || data?.error) {
    if (/tên đăng nhập đã tồn tại|already registered|already been registered|user already exists|duplicate key/i.test(serverMessage)) {
      fail("createMessage", "Tên đăng nhập \"" + username + "\" đã tồn tại. Vui lòng chọn tên khác.");
      $("newUsername").focus();
    } else fail("createMessage", "Không tạo được tài khoản: " + serverMessage);
    return;
  }
  fail("createMessage", "Đã tạo tài khoản " + username + ". Tuổi thai hôm nay: " + gestationText(newGa) + ". Hãy trao mật khẩu riêng cho bệnh nhân.");
  $("createPatientForm").reset(); $("newPatientGestation").textContent="Nhập ngày dự sinh để tự tính tuổi thai."; await loadPatients();
});
$("recordForm").addEventListener("submit", async e => {
  e.preventDefault(); fail("recordMessage", "");
  if (user?.app_metadata?.role !== "admin" || !selectedPatient) { fail("recordMessage", "Hãy đăng nhập bằng tài khoản bác sĩ và chọn bệnh nhân."); return; }
  const {data: sp,error: spe}=await db.from("profiles").select("due_date").eq("user_id",selectedPatient).single();
  if(spe||!sp?.due_date){fail("recordMessage","Hồ sơ bệnh nhân chưa có ngày dự sinh. Hãy cập nhật trước.");return;}
  const scanDate=dueDateIso($("scanDate").value); const g=gestationAt(sp.due_date,scanDate);
  if(!g||g.invalid||g.weeks<1||g.weeks>42){fail("recordMessage","Không tính được tuổi thai hợp lệ. Vui lòng kiểm tra ngày dự sinh và ngày khám.");return;}
  $("gaWeeks").value=g.weeks;$("gaDays").value=g.days;
  const row = { patient_user_id:selectedPatient, created_by:user.id, scan_date:scanDate, ga_weeks:g.weeks, ga_days:g.days, efw_grams:Number($("efw").value), note:$("recordNote").value.trim() || null };
  const { error } = await db.from("fetal_weight_records").insert(row);
  if (error) { fail("recordMessage", "Không lưu được: " + error.message); return; }
  fail("recordMessage", "Đã lưu lần khám."); $("recordNote").value = ""; $("efw").value = ""; await loadSelectedPatient();
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
function drawChart(data) {
  const canvas = $("weightChart"), ctx = canvas.getContext("2d"), empty = $("chartEmpty");
  ctx.clearRect(0,0,canvas.width,canvas.height); empty.hidden = data.length > 0;
  if (!data.length) return;
  const pts = [...data].sort((a,b) => (a.ga_weeks*7+a.ga_days)-(b.ga_weeks*7+b.ga_days));
  const x0=75, x1=960, y0=35, y1=350, minX=Math.min(...pts.map(p=>p.ga_weeks+p.ga_days/7)), maxX=Math.max(minX+1,...pts.map(p=>p.ga_weeks+p.ga_days/7));
  const maxY=Math.max(1000,Math.ceil(Math.max(...pts.map(p=>p.efw_grams))*1.15/500)*500);
  ctx.font="16px Arial"; ctx.strokeStyle="#eadfe5"; ctx.fillStyle="#756a75"; ctx.lineWidth=1;
  for(let i=0;i<=4;i++){const y=y1-(y1-y0)*i/4;ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(x1,y);ctx.stroke();ctx.fillText(Math.round(maxY*i/4).toString(),8,y+5);}
  const xp=p=>maxX===minX?(x0+x1)/2:x0+(p.ga_weeks+p.ga_days/7-minX)/(maxX-minX)*(x1-x0), yp=p=>y1-p.efw_grams/maxY*(y1-y0);
  ctx.fillText("Tuổi thai (tuần)",x0,y1+48);ctx.fillText("EFW (g)",8,20);
  ctx.strokeStyle="#b84e79";ctx.lineWidth=4;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(xp(p),yp(p)):ctx.moveTo(xp(p),yp(p)));ctx.stroke();
  pts.forEach(p=>{ctx.fillStyle="#843651";ctx.beginPath();ctx.arc(xp(p),yp(p),6,0,Math.PI*2);ctx.fill();ctx.fillStyle="#302630";ctx.fillText(String(p.ga_weeks),xp(p)-8,y1+25);});
}
$("downloadCsv").addEventListener("click", () => {
  const rows = [["Ngày khám","Tuổi thai","EFW (g)","Ghi chú"], ...records.map(r=>[r.scan_date,ga(r),r.efw_grams,r.note||""])];
  const csv = "\uFEFF" + rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));a.download="lich-su-can-nang-thai-nhi.csv";a.click();URL.revokeObjectURL(a.href);
});
document.querySelectorAll(".logout").forEach(b=>b.addEventListener("click", async()=>{await db.auth.signOut();user=null;profile=null;records=[];selectedPatient=null;view("loginView");$("password").value="";}));
(async()=>{const {data}=await db.auth.getSession();if(data.session){user=data.session.user;await routeUser();}})();
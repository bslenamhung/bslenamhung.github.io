import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL = "https://ckwhjyzomppsdplnkdeq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_FmJK_HkQxhoQ04dIzI1mCg_eupXeR48";
const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = id => document.getElementById(id);
let user = null, profile = null, records = [], selectedPatient = null;
const emailFor = username => username.trim().toLowerCase() + "@patients.bs-hung.invalid";
const fmt = n => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(n);
const ga = r => r.ga_days ? r.ga_weeks + " tuần " + r.ga_days + " ngày" : r.ga_weeks + " tuần";
const dateVi = s => s ? new Date(s + "T12:00:00").toLocaleDateString("vi-VN") : "—";
const allowedTypes = ["application/pdf","image/jpeg","image/png","image/webp"];
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
async function renderTests(rows, tbodyId, emptyId) {
  const tbody=$(tbodyId); tbody.replaceChildren();
  let files = [];
  try { files = await attachmentsFor((rows || []).map(r=>r.id)); }
  catch (e) { toast("Không tải được danh sách tệp xét nghiệm."); }
  (rows || []).forEach(r=>{
    const tr=document.createElement("tr");
    [dateVi(r.test_date),r.test_name || "—",r.result || "—",r.unit || "—",r.reference_range || "—",r.note || "—"].forEach(v=>{
      const td=document.createElement("td"); td.textContent=v; tr.append(td);
    });
    const td = document.createElement("td");
    const related = files.filter(f=>f.test_record_id===r.id);
    if (!related.length) td.textContent = "—";
    related.forEach((f,i)=>{ if(i) td.append(document.createElement("br")); td.append(makeLink(f.signedUrl,f.file_name,f.mime_type)); });
    tr.append(td); tbody.append(tr);
  });
  if (emptyId) $(emptyId).hidden = !!(rows && rows.length);
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
  const { data, error } = await db.from("profiles").select("user_id,username,display_name,phone,address").eq("user_id", user.id).single();
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
  const { data: tests, error: testError } = await db.from("patient_test_records").select("id,test_date,test_name,result,unit,reference_range,note").eq("patient_user_id", user.id).order("test_date", {ascending:false});
  if (testError) { toast("Không tải được kết quả xét nghiệm."); return; }
  await renderTests(tests || [], "patientTestRows", "patientTestsEmpty");
}
async function loadPatients() {
  const { data, error } = await db.from("profiles").select("user_id,username,display_name,phone,address").order("display_name");
  if (error) { toast("Không tải được danh sách hồ sơ."); return; }
  const select = $("patientSelect"); select.replaceChildren(new Option("— Chọn bệnh nhân —", ""));
  (data || []).filter(p => p.user_id !== user.id).forEach(p => select.add(new Option((p.display_name || p.username) + " (" + p.username + ")", p.user_id)));
}
async function loadSelectedPatient() {
  selectedPatient = $("patientSelect").value || null;
  $("adminPatientHistory").replaceChildren(); $("adminTestHistory").replaceChildren(); $("adminPatientProfile").replaceChildren();
  fail("recordMessage",""); fail("testMessage","");
  if (!selectedPatient) return;
  const { data: p, error: pError } = await db.from("profiles").select("username,display_name,phone,address").eq("user_id",selectedPatient).single();
  if (pError) { toast("Không tải được thông tin bệnh nhân."); return; }
  [["Họ tên",p.display_name],["Tên đăng nhập",p.username],["Số điện thoại",p.phone],["Địa chỉ",p.address]].forEach(([label,value])=>{
    const line=document.createElement("div"); const strong=document.createElement("strong"); strong.textContent=label+": "; line.append(strong,document.createTextNode(value || "Chưa cập nhật")); $("adminPatientProfile").append(line);
  });
  const { data, error } = await db.from("fetal_weight_records").select("scan_date,ga_weeks,ga_days,efw_grams,note").eq("patient_user_id", selectedPatient).order("scan_date", { ascending:false });
  if (error) { toast("Không tải được lịch sử bệnh nhân."); return; }
  (data || []).forEach(r => addHistoryLine($("adminPatientHistory"),dateVi(r.scan_date) + " · " + ga(r) + " · " + fmt(r.efw_grams) + " g" + (r.note ? " · " + r.note : "")));
  if (!(data || []).length) addHistoryLine($("adminPatientHistory"),"Chưa có số đo được cập nhật.");
  const { data: tests, error: testError } = await db.from("patient_test_records").select("id,test_date,test_name,result,unit,reference_range,note").eq("patient_user_id", selectedPatient).order("test_date", {ascending:false});
  if (testError) { toast("Không tải được lịch sử xét nghiệm."); return; }
  let files = [];
  try { files = await attachmentsFor((tests || []).map(t=>t.id)); } catch { toast("Không tải được danh sách tệp xét nghiệm."); }
  (tests || []).forEach(t => {
    const line = document.createElement("div");
    line.append(document.createTextNode(dateVi(t.test_date)+" · "+t.test_name+" · "+(t.result||"Chưa có kết quả")+(t.unit?" "+t.unit:"")+(t.note?" · "+t.note:"")));
    const related = files.filter(f=>f.test_record_id===t.id);
    related.forEach(f=>{line.append(document.createElement("br"),makeLink(f.signedUrl,f.file_name,f.mime_type));});
    $("adminTestHistory").append(line);
  });
  if (!(tests || []).length) addHistoryLine($("adminTestHistory"),"Chưa có xét nghiệm được cập nhật.");
}
$("patientSelect").addEventListener("change", loadSelectedPatient);
$("createPatientForm").addEventListener("submit", async e => {
  e.preventDefault(); fail("createMessage", "");
  if (user?.app_metadata?.role !== "admin") { fail("createMessage", "Tài khoản không có quyền quản trị."); return; }
  const display_name = $("newPatientName").value.trim(), username = $("newUsername").value.trim().toLowerCase(), password = $("newPassword").value;
  const phone = $("newPatientPhone").value.trim(), address = $("newPatientAddress").value.trim();
  if (!/^[a-z0-9._-]{4,32}$/.test(username) || password.length < 10) { fail("createMessage", "Tên đăng nhập hoặc mật khẩu chưa đáp ứng yêu cầu."); return; }
  const { data: { session } } = await db.auth.getSession();
  const { data, error } = await db.functions.invoke("admin-create-patient", { body: { display_name, username, password, phone, address }, headers: { Authorization: "Bearer " + session.access_token } });
  if (error || data?.error) { fail("createMessage", "Không tạo được tài khoản: " + (data?.error || error.message)); return; }
  fail("createMessage", "Đã tạo tài khoản " + username + ". Hãy trao mật khẩu riêng cho bệnh nhân.");
  $("createPatientForm").reset(); await loadPatients();
});
$("recordForm").addEventListener("submit", async e => {
  e.preventDefault(); fail("recordMessage", "");
  if (user?.app_metadata?.role !== "admin" || !selectedPatient) { fail("recordMessage", "Hãy đăng nhập bằng tài khoản bác sĩ và chọn bệnh nhân."); return; }
  const row = { patient_user_id:selectedPatient, created_by:user.id, scan_date:$("scanDate").value, ga_weeks:Number($("gaWeeks").value), ga_days:Number($("gaDays").value), efw_grams:Number($("efw").value), note:$("recordNote").value.trim() || null };
  const { error } = await db.from("fetal_weight_records").insert(row);
  if (error) { fail("recordMessage", "Không lưu được: " + error.message); return; }
  fail("recordMessage", "Đã lưu lần khám."); $("recordNote").value = ""; $("efw").value = ""; await loadSelectedPatient();
});
$("testForm").addEventListener("submit", async e => {
  e.preventDefault(); fail("testMessage", "");
  if (user?.app_metadata?.role !== "admin" || !selectedPatient) { fail("testMessage", "Hãy chọn bệnh nhân trước khi nhập xét nghiệm."); return; }
  const files = Array.from($("testFiles").files || []);
  if (files.length > 8) { fail("testMessage", "Mỗi lần nhập chỉ đính kèm tối đa 8 tệp."); return; }
  for (const f of files) {
    if (!allowedTypes.includes(f.type)) { fail("testMessage", "Tệp không đúng định dạng. Chỉ nhận PDF, JPG, PNG hoặc WEBP."); return; }
    if (f.size < 1 || f.size > maxFileBytes) { fail("testMessage", "Mỗi tệp phải nhỏ hơn hoặc bằng 10 MB."); return; }
  }
  const row = {
    patient_user_id:selectedPatient, created_by:user.id, test_date:$("testDate").value,
    test_name:$("testName").value.trim(), result:$("testResult").value.trim() || null,
    unit:$("testUnit").value.trim() || null, reference_range:$("testRange").value.trim() || null,
    note:$("testNote").value.trim() || null
  };
  const { data: test, error } = await db.from("patient_test_records").insert(row).select("id").single();
  if (error || !test) { fail("testMessage", "Không lưu được xét nghiệm: " + (error?.message || "Lỗi không xác định")); return; }
  let uploaded = 0, errors = [];
  for (const file of files) {
    const safeName = file.name.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9._-]/g,"_").slice(-100) || "xet-nghiem";
    const path = selectedPatient + "/" + test.id + "/" + crypto.randomUUID() + "_" + safeName;
    const { error: uploadError } = await db.storage.from("patient-lab-files").upload(path, file, { contentType:file.type, upsert:false });
    if (uploadError) { errors.push(file.name + ": " + uploadError.message); continue; }
    const { error: metaError } = await db.from("patient_test_attachments").insert({
      test_record_id:test.id, patient_user_id:selectedPatient, created_by:user.id,
      storage_path:path, file_name:file.name, mime_type:file.type, size_bytes:file.size
    });
    if (metaError) {
      await db.storage.from("patient-lab-files").remove([path]);
      errors.push(file.name + ": không lưu được thông tin tệp.");
    } else uploaded++;
  }
  $("testForm").reset(); await loadSelectedPatient();
  if (errors.length) fail("testMessage", "Đã lưu kết quả xét nghiệm và " + uploaded + "/" + files.length + " tệp. Một số tệp lỗi: " + errors.join(" · "));
  else fail("testMessage", "Đã lưu kết quả xét nghiệm" + (files.length ? " cùng " + uploaded + " tệp đính kèm." : "."));
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
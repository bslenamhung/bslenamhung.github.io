import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL = "https://ckwhjyzomppsdplnkdeq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_FmJK_HkQxhoQ04dIzI1mCg_eupXeR48";
const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = id => document.getElementById(id);
let user = null, profile = null, records = [], selectedPatient = null;
const emailFor = username => username.trim().toLowerCase() + "@patients.bs-hung.invalid";
const fmt = n => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(n);
const ga = r => r.ga_days ? r.ga_weeks + " tuần " + r.ga_days + " ngày" : r.ga_weeks + " tuần";
const dateVi = s => new Date(s + "T12:00:00").toLocaleDateString("vi-VN");
function view(id) { ["loginView","patientView","adminView"].forEach(k => $(k).hidden = k !== id); }
function toast(msg) { $("globalMessage").textContent = msg; $("globalMessage").hidden = false; }
function fail(el, msg) { $(el).textContent = msg; }
$("loginForm").addEventListener("submit", async e => {
  e.preventDefault(); fail("loginError", "");
  const raw = $("username").value.trim();
  const email = raw.includes("@") ? raw : emailFor(raw);
  const { data, error } = await db.auth.signInWithPassword({ email, password: $("password").value });
  if (error) { fail("loginError", "Đăng nhập không thành công. Vui lòng kiểm tra thông tin hoặc liên hệ phòng khám."); return; }
  user = data.user; await routeUser();
});
async function routeUser() {
  const { data, error } = await db.from("profiles").select("user_id,username,display_name").eq("user_id", user.id).single();
  if (error || !data) { await db.auth.signOut(); view("loginView"); fail("loginError", "Không đọc được hồ sơ. Vui lòng liên hệ quản trị viên."); return; }
  profile = data;
  if (user.app_metadata?.role === "admin") { view("adminView"); await loadPatients(); }
  else { view("patientView"); await loadPatient(); }
}
async function loadPatient() {
  $("patientName").textContent = profile.display_name || profile.username;
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
}
async function loadPatients() {
  const { data, error } = await db.from("profiles").select("user_id,username,display_name").order("display_name");
  if (error) { toast("Không tải được danh sách hồ sơ."); return; }
  const select = $("patientSelect"); select.replaceChildren(new Option("— Chọn bệnh nhân —", ""));
  (data || []).filter(p => p.user_id !== user.id).forEach(p => select.add(new Option((p.display_name || p.username) + " (" + p.username + ")", p.user_id)));
}
$("patientSelect").addEventListener("change", async () => {
  selectedPatient = $("patientSelect").value || null; $("adminPatientHistory").replaceChildren();
  if (!selectedPatient) return;
  const { data, error } = await db.from("fetal_weight_records").select("scan_date,ga_weeks,ga_days,efw_grams,note").eq("patient_user_id", selectedPatient).order("scan_date", { ascending:false });
  if (error) { toast("Không tải được lịch sử bệnh nhân."); return; }
  (data || []).forEach(r => { const d = document.createElement("div"); d.textContent = dateVi(r.scan_date) + " · " + ga(r) + " · " + fmt(r.efw_grams) + " g" + (r.note ? " · " + r.note : ""); $("adminPatientHistory").append(d); });
});
$("createPatientForm").addEventListener("submit", async e => {
  e.preventDefault(); fail("createMessage", "");
  if (user?.app_metadata?.role !== "admin") { fail("createMessage", "Tài khoản không có quyền quản trị."); return; }
  const display_name = $("newPatientName").value.trim(), username = $("newUsername").value.trim().toLowerCase(), password = $("newPassword").value;
  if (!/^[a-z0-9._-]{4,32}$/.test(username) || password.length < 10) { fail("createMessage", "Tên đăng nhập hoặc mật khẩu chưa đáp ứng yêu cầu."); return; }
  const { data: { session } } = await db.auth.getSession();
  const { data, error } = await db.functions.invoke("admin-create-patient", { body: { display_name, username, password }, headers: { Authorization: "Bearer " + session.access_token } });
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
  fail("recordMessage", "Đã lưu lần khám."); $("recordNote").value = ""; $("efw").value = ""; await $("patientSelect").dispatchEvent(new Event("change"));
});
function drawChart(data) {
  const canvas = $("weightChart"), ctx = canvas.getContext("2d"), empty = $("chartEmpty");
  ctx.clearRect(0,0,canvas.width,canvas.height); empty.hidden = data.length > 0;
  if (!data.length) return;
  const pts = [...data].sort((a,b) => (a.ga_weeks*7+a.ga_days)-(b.ga_weeks*7+b.ga_days));
  const x0=75, x1=960, y0=35, y1=350, minX=Math.min(...pts.map(p=>p.ga_weeks+p.ga_days/7)), maxX=Math.max(minX+1,...pts.map(p=>p.ga_weeks+p.ga_days/7));
  const maxY=Math.max(1000,Math.ceil(Math.max(...pts.map(p=>p.efw_grams))*1.15/500)*500), minY=0;
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
document.querySelectorAll(".logout").forEach(b=>b.addEventListener("click", async()=>{await db.auth.signOut();user=null;profile=null;records=[];view("loginView");$("password").value="";}));
(async()=>{const {data}=await db.auth.getSession();if(data.session){user=data.session.user;await routeUser();}})();
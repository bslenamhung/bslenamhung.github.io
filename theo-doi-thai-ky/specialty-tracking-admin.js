const db = window.__BSHUNG_SUPABASE_CLIENT__;
const $ = id => document.getElementById(id);
const today = new Date().toISOString().slice(0,10);
const configs = {
 infertility: {
  table:"infertility_patient_records", visits:"infertility_patient_visits",
  panel:"infertilityAdminPanel", toggle:"toggleInfertilityAdmin",
  search:"infertilitySearch", refresh:"infertilityRefresh", create:"infertilityNew",
  status:"infertilityStatus", form:"infertilityRecordForm", title:"infertilityFormTitle",
  cancel:"infertilityCancel", list:"infertilityRecords", detail:"infertilityDetail",
  detailTitle:"infertilityDetailTitle", info:"infertilityDetailInfo", edit:"infertilityEdit",
  visitForm:"infertilityVisitForm", visitStatus:"infertilityVisitStatus", visitsList:"infertilityVisits",
  fields:["patient_name","date_of_birth","phone","address","partner_name","infertility_duration","infertility_type","menstrual_history","obstetric_history","medical_history","diagnosis","investigation_summary","treatment_plan","status","notes"],
  visitFields:["visit_date","visit_type","diagnosis","investigations","treatment","follow_up_date","notes"],
  labels:{patient_name:"Họ tên",date_of_birth:"Ngày sinh",phone:"Số điện thoại",address:"Địa chỉ",partner_name:"Chồng / bạn đời",infertility_duration:"Thời gian mong con / vô sinh",infertility_type:"Phân loại vô sinh",menstrual_history:"Tiền sử kinh nguyệt",obstetric_history:"Tiền sử sản khoa",medical_history:"Tiền sử bệnh",diagnosis:"Chẩn đoán",investigation_summary:"Xét nghiệm / siêu âm",treatment_plan:"Kế hoạch điều trị",status:"Trạng thái",notes:"Ghi chú"}
 },
 gynecology: {
  table:"gynecology_patient_records", visits:"gynecology_patient_visits",
  panel:"gynecologyAdminPanel", toggle:"toggleGynecologyAdmin",
  search:"gynecologySearch", refresh:"gynecologyRefresh", create:"gynecologyNew",
  status:"gynecologyStatus", form:"gynecologyRecordForm", title:"gynecologyFormTitle",
  cancel:"gynecologyCancel", list:"gynecologyRecords", detail:"gynecologyDetail",
  detailTitle:"gynecologyDetailTitle", info:"gynecologyDetailInfo", edit:"gynecologyEdit",
  visitForm:"gynecologyVisitForm", visitStatus:"gynecologyVisitStatus", visitsList:"gynecologyVisits",
  fields:["patient_name","date_of_birth","phone","address","para","last_menstrual_period","menstrual_cycle","symptoms","obstetric_history","medical_history","surgical_history","allergies","diagnosis","investigation_summary","treatment_plan","status","notes"],
  visitFields:["visit_date","visit_type","symptoms","diagnosis","investigations","treatment","follow_up_date","notes"],
  labels:{patient_name:"Họ tên",date_of_birth:"Ngày sinh",phone:"Số điện thoại",address:"Địa chỉ",para:"PARA",last_menstrual_period:"Ngày kinh cuối",menstrual_cycle:"Chu kỳ kinh",symptoms:"Triệu chứng",obstetric_history:"Tiền sử sản khoa",medical_history:"Tiền sử bệnh",surgical_history:"Tiền sử phẫu thuật",allergies:"Dị ứng",diagnosis:"Chẩn đoán",investigation_summary:"Xét nghiệm / siêu âm",treatment_plan:"Kế hoạch điều trị",status:"Trạng thái",notes:"Ghi chú"}
 }
};
const state = {infertility:{rows:[],selected:null},gynecology:{rows:[],selected:null}};
const isAdmin = async () => {
 if(!db) return false;
 const {data,error}=await db.auth.getSession();
 return !error && data?.session?.user?.app_metadata?.role==="admin";
};
const dateText = v => v ? new Date(v+"T12:00:00").toLocaleDateString("vi-VN") : "—";
function setFormValues(form,row,fields){
 fields.forEach(k=>{const el=form.elements.namedItem(k);if(el)el.value=row?.[k]??"";});
}
function getFormValues(form,fields){
 const out={};fields.forEach(k=>{const el=form.elements.namedItem(k);if(el)out[k]=el.value.trim()===""?null:el.value.trim();});
 return out;
}
function infoGrid(target,row,labels,fields){
 target.replaceChildren();
 fields.forEach(k=>{
  const box=document.createElement("div"),small=document.createElement("small"),strong=document.createElement("strong");
  small.textContent=labels[k]||k;
  const value=row[k];
  strong.textContent=(k==="date_of_birth"||k==="last_menstrual_period")?dateText(value):(value??"Chưa cập nhật");
  box.append(small,strong);target.append(box);
 });
}
function switchPanel(kind){
 const c=configs[kind];
 ["pregnancyAdmin","adminDueDatePanel","postpartumAdminPanel","registrationApprovalPanel","infertilityAdminPanel","gynecologyAdminPanel"].forEach(id=>{const el=$(id);if(el)el.hidden=id!==c.panel;});
 ["togglePregnancyAdmin","toggleObstetricTracking","togglePostpartumAdmin","toggleRegistrationApproval","toggleInfertilityAdmin","toggleGynecologyAdmin"].forEach(id=>{const b=$(id);if(b){const on=id===c.toggle;b.classList.toggle("active",on);b.setAttribute("aria-expanded",String(on));}});
 $(c.panel).scrollIntoView({behavior:"smooth",block:"start"});
}
async function refreshSpecialtyCounts(){
 if(!await isAdmin())return;
 for(const [kind,id] of [["infertility","infertilityPatientCount"],["gynecology","gynecologyPatientCount"]]){
  const {count,error}=await db.from(configs[kind].table).select("id",{count:"exact",head:true});
  const badge=$(id);if(badge&&!error)badge.textContent=String(count??0);
  if(error)console.error("Không tải được số lượng "+kind,error);
 }
}
async function loadRows(kind){
 const c=configs[kind],s=state[kind],status=$(c.status),list=$(c.list);
 if(!await isAdmin()){status.textContent="Chỉ tài khoản quản trị của phòng khám mới được truy cập khu vực này.";list.replaceChildren();return;}
 status.textContent="Đang tải hồ sơ…";list.replaceChildren();
 const {data,error}=await db.from(c.table).select("*").order("updated_at",{ascending:false});
 if(error){status.textContent="Không tải được hồ sơ. Vui lòng thử Làm mới. ("+error.code+")";console.error(error);return;}
 s.rows=data||[];const badge=$(kind==="infertility"?"infertilityPatientCount":"gynecologyPatientCount");if(badge)badge.textContent=String(s.rows.length);renderRows(kind);
 status.textContent="Có "+s.rows.length+" hồ sơ trong nhóm theo dõi.";
}
function renderRows(kind){
 const c=configs[kind],s=state[kind],list=$(c.list),q=$(c.search).value.trim().toLocaleLowerCase("vi");
 list.replaceChildren();
 const rows=s.rows.filter(r=>[r.record_code,r.patient_name,r.phone].some(v=>String(v||"").toLocaleLowerCase("vi").includes(q)));
 if(!rows.length){const p=document.createElement("p");p.className="muted";p.textContent=s.rows.length?"Không tìm thấy hồ sơ phù hợp.":"Chưa có hồ sơ. Bấm “Tạo hồ sơ” để bắt đầu.";list.append(p);return;}
 rows.forEach(r=>{
  const card=document.createElement("article");card.className="specialtyRecordCard";
  const text=document.createElement("div"),strong=document.createElement("strong"),small=document.createElement("small");
  strong.textContent=r.patient_name;small.textContent=r.record_code+" · "+(r.phone||"Chưa có số điện thoại")+" · "+(r.status||"Đang theo dõi");
  text.append(strong,small);const button=document.createElement("button");button.type="button";button.className="secondary";button.textContent="Mở hồ sơ";button.addEventListener("click",()=>openRecord(kind,r.id));
  card.append(text,button);list.append(card);
 });
}
async function openRecord(kind,id){
 const c=configs[kind],s=state[kind],row=s.rows.find(r=>r.id===id);if(!row)return;
 s.selected=row;$(c.detail).hidden=false;$(c.detailTitle).textContent=row.patient_name+" · "+row.record_code;
 infoGrid($(c.info),row,c.labels,c.fields);
 $(c.visitForm).reset();$(c.visitForm).elements.visit_date.value=today;
 await loadVisits(kind,id);
 $(c.detail).scrollIntoView({behavior:"smooth",block:"start"});
}
async function loadVisits(kind,id){
 const c=configs[kind],target=$(c.visitsList);target.replaceChildren();
 const {data,error}=await db.from(c.visits).select("*").eq("record_id",id).order("visit_date",{ascending:false});
 if(error){const p=document.createElement("p");p.textContent="Không tải được lịch sử lần khám.";target.append(p);console.error(error);return;}
 if(!data?.length){const p=document.createElement("p");p.className="muted";p.textContent="Chưa có lần khám nào được ghi nhận.";target.append(p);return;}
 data.forEach(v=>{
  const card=document.createElement("article");card.className="specialtyVisitCard";
  const h=document.createElement("strong");h.textContent=dateText(v.visit_date)+" · "+(v.visit_type||"Lần khám");
  card.append(h);
  const keys=kind==="infertility"?["diagnosis","investigations","treatment","follow_up_date","notes"]:["symptoms","diagnosis","investigations","treatment","follow_up_date","notes"];
  const labels={symptoms:"Triệu chứng",diagnosis:"Chẩn đoán",investigations:"Xét nghiệm / kết quả",treatment:"Điều trị / xử trí",follow_up_date:"Tái khám",notes:"Ghi chú"};
  keys.forEach(k=>{if(!v[k])return;const p=document.createElement("p");p.textContent=labels[k]+": "+(k==="follow_up_date"?dateText(v[k]):v[k]);card.append(p);});
  target.append(card);
 });
}
async function saveRecord(kind,event){
 event.preventDefault();const c=configs[kind],s=state[kind],form=$(c.form),status=$(c.status);
 if(!await isAdmin()){status.textContent="Phiên quản trị không hợp lệ. Vui lòng đăng nhập lại.";return;}
 const values=getFormValues(form,c.fields);if(!values.patient_name){status.textContent="Vui lòng nhập họ tên bệnh nhân.";return;}
 const {data:auth}=await db.auth.getUser();const payload={...values,updated_at:new Date().toISOString()};
 let query;
 if(s.editingId)query=db.from(c.table).update(payload).eq("id",s.editingId).select("*").single();
 else query=db.from(c.table).insert({...payload,created_by:auth.user.id}).select("*").single();
 const {data,error}=await query;
 if(error){status.textContent="Không lưu được hồ sơ ("+error.code+"). Vui lòng kiểm tra quyền quản trị.";console.error(error);return;}
 s.editingId=null;form.reset();form.hidden=true;$(c.title).textContent=kind==="infertility"?"Tạo hồ sơ vô sinh mới":"Tạo hồ sơ phụ khoa mới";
 status.textContent="Đã lưu hồ sơ "+data.record_code+".";
 await loadRows(kind);await openRecord(kind,data.id);
}
async function saveVisit(kind,event){
 event.preventDefault();const c=configs[kind],s=state[kind],form=$(c.visitForm),status=$(c.visitStatus);
 if(!s.selected){status.textContent="Hãy chọn hồ sơ bệnh nhân trước.";return;}
 if(!await isAdmin()){status.textContent="Phiên quản trị không hợp lệ.";return;}
 const {data:auth}=await db.auth.getUser();const values=getFormValues(form,c.visitFields);
 if(!values.visit_date){status.textContent="Vui lòng nhập ngày khám.";return;}
 const {error}=await db.from(c.visits).insert({...values,record_id:s.selected.id,created_by:auth.user.id});
 if(error){status.textContent="Không lưu được lần khám ("+error.code+").";console.error(error);return;}
 status.textContent="Đã lưu lần khám.";form.reset();form.elements.visit_date.value=today;await loadVisits(kind,s.selected.id);
}
function init(kind){
 const c=configs[kind],s=state[kind];
 $(c.toggle).addEventListener("click",async()=>{if(!await isAdmin()){alert("Khu vực này chỉ dành cho tài khoản quản trị.");return;}switchPanel(kind);await loadRows(kind);});
 $(c.refresh).addEventListener("click",()=>loadRows(kind));
 $(c.search).addEventListener("input",()=>renderRows(kind));
 $(c.create).addEventListener("click",()=>{s.editingId=null;$(c.form).reset();$(c.title).textContent=kind==="infertility"?"Tạo hồ sơ vô sinh mới":"Tạo hồ sơ phụ khoa mới";$(c.form).hidden=false;$(c.form).scrollIntoView({behavior:"smooth",block:"start"});});
 $(c.cancel).addEventListener("click",()=>{s.editingId=null;$(c.form).hidden=true;$(c.form).reset();});
 $(c.form).addEventListener("submit",e=>saveRecord(kind,e));
 $(c.edit).addEventListener("click",()=>{if(!s.selected)return;s.editingId=s.selected.id;setFormValues($(c.form),s.selected,c.fields);$(c.title).textContent="Cập nhật hồ sơ "+s.selected.record_code;$(c.form).hidden=false;$(c.form).scrollIntoView({behavior:"smooth",block:"start"});});
 $(c.visitForm).addEventListener("submit",e=>saveVisit(kind,e));
}
["togglePregnancyAdmin","toggleObstetricTracking","togglePostpartumAdmin","toggleRegistrationApproval"].forEach(id=>$(id)?.addEventListener("click",()=>{["infertilityAdminPanel","gynecologyAdminPanel"].forEach(panelId=>{const panel=$(panelId);if(panel)panel.hidden=true;});}));
if(db){init("infertility");init("gynecology");refreshSpecialtyCounts();}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL="https://ckwhjyzomppsdplnkdeq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_FmJK_HkQxhoQ04dIzI1mCg_eupXeR48";
const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=id=>document.getElementById(id);
let user=null,activeId=null,sending=false,isAdmin=false,adminBusy=false;
const qaDate=v=>v?new Date(v).toLocaleString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"";
function showGate(message){$("chatApp").hidden=true;$("chatGate").hidden=false;$("gateMessage").textContent=message;}
function appendMessage(box,m,patientLabel="Bệnh nhân"){
 const item=document.createElement("article");item.className="qaMessage qaMessage-"+m.sender_role;
 const meta=document.createElement("div");meta.className="qaMessageMeta";meta.textContent=(m.sender_role==="patient"?(isAdmin?patientLabel:"Bạn"):m.sender_role==="doctor"?"BS Hùng":"Trợ lý AI")+" · "+qaDate(m.created_at);
 const body=document.createElement("div");body.className="qaMessageBody";body.textContent=m.body||"";item.append(meta,body);
 if(Array.isArray(m.sources)&&m.sources.length){const list=document.createElement("div");list.className="qaSources";const label=document.createElement("strong");label.textContent="Bài viết tham khảo: ";list.append(label);m.sources.forEach(s=>{if(!s||typeof s.url!=="string"||!s.url.startsWith("https://bslenamhung.github.io/"))return;const a=document.createElement("a");a.href=s.url;a.target="_blank";a.rel="noopener noreferrer";a.textContent=s.title||"Bài viết phòng khám";list.append(a,document.createTextNode(" · "));});item.append(list);}
 box.append(item);
}
function makeThreadButton(t,label,unread=0){
 const b=document.createElement("button");b.type="button";b.className="qaThreadButton"+(t.id===activeId?" selected":"")+(unread?" unread":"");
 const title=document.createElement("strong");title.textContent=label?label+" · "+t.subject:t.subject;
 const small=document.createElement("small");small.textContent=(unread?"MỚI: "+unread+" câu hỏi chưa đọc · ":"")+(t.status==="answered"?"Đã có phản hồi":t.status==="closed"?"Đã đóng":"Đang chờ phản hồi")+" · "+qaDate(t.last_message_at);
 b.append(title,small);b.addEventListener("click",()=>openConversation(t.id));return b;
}
async function loadPatientThreads(){
 const box=$("threadList");
 const {data:threads,error}=await db.from("patient_ai_conversations").select("id,subject,status,last_message_at").eq("patient_user_id",user.id).order("last_message_at",{ascending:false});
 if(error){box.textContent="Chưa tải được hội thoại. Vui lòng tải lại trang.";return;}
 box.replaceChildren();
 if(!threads?.length){const p=document.createElement("p");p.className="muted";p.textContent="Chưa có cuộc trò chuyện. Nhấn “Câu hỏi mới” để bắt đầu.";box.append(p);}
 (threads||[]).forEach(t=>box.append(makeThreadButton(t,"")));
}
async function loadAdminThreads(){
 if(adminBusy)return;adminBusy=true;const box=$("threadList");
 try{
  const r=await db.from("patient_ai_conversations").select("id,patient_user_id,subject,status,last_message_at").order("last_message_at",{ascending:false}).limit(150);
  if(r.error)throw r.error;
  const ids=[...new Set((r.data||[]).map(t=>t.patient_user_id))];let profiles=[];
  if(ids.length){const p=await db.from("profiles").select("user_id,display_name,username,phone").in("user_id",ids);if(p.error)throw p.error;profiles=p.data||[];}
  const pm=new Map(profiles.map(p=>[p.user_id,p]));const threadIds=(r.data||[]).map(t=>t.id);let unread=new Map();
  if(threadIds.length){const u=await db.from("patient_ai_messages").select("conversation_id,id").in("conversation_id",threadIds).eq("sender_role","patient").eq("is_read_by_admin",false);if(!u.error)(u.data||[]).forEach(m=>unread.set(m.conversation_id,(unread.get(m.conversation_id)||0)+1));}
  box.replaceChildren();
  if(!r.data?.length){const p=document.createElement("p");p.className="muted";p.textContent="Chưa có câu hỏi nào từ bệnh nhân.";box.append(p);}
  (r.data||[]).forEach(t=>{const p=pm.get(t.patient_user_id)||{};const label=p.display_name||p.username||"Bệnh nhân";box.append(makeThreadButton(t,label,unread.get(t.id)||0));});
  const count=[...unread.values()].reduce((a,b)=>a+b,0);$("chatStatus").textContent=count?"Có "+count+" câu hỏi chưa đọc.":"Hộp thư đã được cập nhật.";
 }catch(err){console.error("Admin chat inbox load failed",err);box.textContent="Chưa tải được hộp thư. Bấm “Làm mới” để thử lại.";}
 finally{adminBusy=false;}
}
async function openConversation(id){
 activeId=id;$("chatForm").hidden=false;$("conversationMessages").replaceChildren();const loading=document.createElement("p");loading.className="chatEmpty";loading.textContent="Đang tải nội dung…";$("conversationMessages").append(loading);
 let query=db.from("patient_ai_conversations").select("id,patient_user_id,subject,status").eq("id",id);
 if(!isAdmin)query=query.eq("patient_user_id",user.id);
 const tr=await query.single();
 if(tr.error||!tr.data){$("conversationMessages").textContent="Không tải được cuộc trò chuyện này.";return;}
 const thread=tr.data;let patientLabel="";
 if(isAdmin){const pr=await db.from("profiles").select("display_name,username,phone").eq("user_id",thread.patient_user_id).single();const p=pr.data||{};patientLabel=p.display_name||p.username||"Bệnh nhân";$("conversationMeta").textContent="Bệnh nhân: "+patientLabel+(p.username?" · Tên đăng nhập: "+p.username:"")+(p.phone?" · SĐT: "+p.phone:"")+" · "+(thread.status==="answered"?"Đã có phản hồi":thread.status==="closed"?"Đã đóng":"Đang chờ phản hồi");}
 else $("conversationMeta").textContent=thread.status==="answered"?"Bác sĩ đã phản hồi trong cuộc trò chuyện.":"Lịch sử chỉ hiển thị trong tài khoản của bạn.";
 $("conversationTitle").textContent=thread.subject;
 const res=await db.from("patient_ai_messages").select("id,sender_role,body,sources,created_at,is_read_by_admin,is_read_by_patient").eq("conversation_id",id).order("created_at");
 if(res.error){$("conversationMessages").textContent="Chưa tải được nội dung. Vui lòng thử lại.";return;}
 $("conversationMessages").replaceChildren();(res.data||[]).forEach(m=>appendMessage($("conversationMessages"),m,patientLabel));
 if(!res.data?.length){const p=document.createElement("p");p.className="chatEmpty";p.textContent=isAdmin?"Chưa có tin nhắn trong cuộc trò chuyện này.":"Hãy nhập câu hỏi của bạn ở khung bên dưới.";$("conversationMessages").append(p);}
 if(isAdmin){const ids=(res.data||[]).filter(m=>m.sender_role==="patient"&&!m.is_read_by_admin).map(m=>m.id);if(ids.length)await db.from("patient_ai_messages").update({is_read_by_admin:true}).in("id",ids);}
 $("conversationMessages").scrollTop=$("conversationMessages").scrollHeight;
 if(isAdmin)await loadAdminThreads();else await loadPatientThreads();
}
$("backToPortal").addEventListener("click",()=>{window.location.href="index.html";});
$("refreshThreads").addEventListener("click",()=>isAdmin?loadAdminThreads():loadPatientThreads());
$("newChat").addEventListener("click",()=>{
 if(isAdmin)return;activeId=null;$("conversationTitle").textContent="Câu hỏi mới";$("conversationMeta").textContent="Câu hỏi sẽ được lưu riêng trong tài khoản của bạn.";
 $("conversationMessages").replaceChildren();const p=document.createElement("p");p.className="chatEmpty";p.textContent="Bạn muốn hỏi điều gì về thai kỳ?";$("conversationMessages").append(p);
 $("chatForm").hidden=false;$("chatInput").value="";$("chatStatus").textContent="";loadPatientThreads();$("chatInput").focus();
});
$("chatForm").addEventListener("submit",async e=>{
 e.preventDefault();if(sending||!user)return;const input=$("chatInput"),body=input.value.trim();if(!body||body.length>6000)return;
 if(isAdmin&&!activeId){$("chatStatus").textContent="Hãy chọn một cuộc trò chuyện của bệnh nhân trước.";return;}
 sending=true;const btn=$("sendChat");btn.disabled=true;btn.textContent="Đang gửi…";$("chatStatus").textContent="";
 try{
  if(isAdmin){
   const c=await db.from("patient_ai_conversations").select("patient_user_id").eq("id",activeId).single();if(c.error||!c.data)throw c.error||new Error("Không tìm thấy hội thoại");
   const m=await db.from("patient_ai_messages").insert({conversation_id:activeId,patient_user_id:c.data.patient_user_id,sender_role:"doctor",body}).select("id").single();if(m.error)throw m.error;
   input.value="";$("chatStatus").textContent="Đã gửi câu trả lời cho bệnh nhân.";await openConversation(activeId);
  }else{
   let id=activeId;
   if(!id){const c=await db.from("patient_ai_conversations").insert({patient_user_id:user.id,subject:body.replace(/\s+/g," ").slice(0,76)||"Câu hỏi tư vấn"}).select("id").single();if(c.error||!c.data)throw c.error||new Error("Không tạo được hội thoại");id=c.data.id;activeId=id;}
   const m=await db.from("patient_ai_messages").insert({conversation_id:id,patient_user_id:user.id,sender_role:"patient",body}).select("id").single();if(m.error||!m.data)throw m.error||new Error("Không lưu được câu hỏi");
   input.value="";$("chatStatus").textContent="Đã lưu câu hỏi. Đang tìm thông tin trong bài viết phòng khám…";await openConversation(id);
   const sess=await db.auth.getSession();const result=await db.functions.invoke("patient-ai-answer",{body:{conversation_id:id,message_id:m.data.id},headers:{Authorization:"Bearer "+sess.data.session.access_token}});
   $("chatStatus").textContent=(result.error||result.data?.error)?"Câu hỏi đã được lưu để bác sĩ xem. Trợ lý AI chưa trả lời được lúc này.":"Đã có phản hồi tự động. Bác sĩ cũng có thể xem và trả lời câu hỏi này.";
   await openConversation(id);
  }
 }catch(err){console.error("Separate chat failed",err);$("chatStatus").textContent="Chưa gửi được tin nhắn. Vui lòng kiểm tra kết nối rồi thử lại.";}
 finally{sending=false;btn.disabled=false;btn.textContent=isAdmin?"Gửi trả lời":"Gửi câu hỏi";}
});
(async()=>{
 const {data,error}=await db.auth.getSession();
 if(error||!data.session){showGate("Bạn cần đăng nhập vào cổng theo dõi thai kỳ trước, sau đó bấm Trợ lý AI để mở phòng chat riêng.");return;}
 user=data.session.user;isAdmin=user.app_metadata?.role==="admin";
 $("chatGate").hidden=true;$("chatApp").hidden=false;
 if(isAdmin){
  $("chatTitle").textContent="Hỏi đáp với bệnh nhân";$("chatSubtitle").textContent="Hộp thư riêng · Chọn bệnh nhân để xem và trả lời";
  $("threadHeading").textContent="Hộp thư bệnh nhân";$("newChat").hidden=true;$("refreshThreads").hidden=false;
  $("chatInputLabel").textContent="Trả lời bệnh nhân";$("chatInput").placeholder="Nhập câu trả lời riêng cho bệnh nhân…";$("chatWarning").textContent="Chỉ gửi nội dung phù hợp hồ sơ bệnh nhân này.";
  $("conversationTitle").textContent="Chọn một cuộc trò chuyện";$("conversationMeta").textContent="Các câu hỏi mới sẽ hiển thị trong hộp thư này.";
  await loadAdminThreads();
  const params=new URLSearchParams(location.search);const requested=params.get("conversation");if(requested)await openConversation(requested);
  setInterval(()=>{if(isAdmin)loadAdminThreads();},30000);
 }else{
  $("chatTitle").textContent="Trợ lý AI BS Hùng";$("chatSubtitle").textContent="Trao đổi riêng tư với trợ lý và bác sĩ";
  $("threadHeading").textContent="Cuộc trò chuyện";$("newChat").hidden=false;$("refreshThreads").hidden=true;
  $("chatInputLabel").textContent="Câu hỏi của bạn";$("chatInput").placeholder="Nhập câu hỏi về thai kỳ…";$("chatWarning").textContent="Không dùng cho tình huống cấp cứu.";
  await loadPatientThreads();
  const params=new URLSearchParams(location.search);const requested=params.get("conversation");
  if(requested)await openConversation(requested);
  else{const r=await db.from("patient_ai_conversations").select("id").eq("patient_user_id",user.id).order("last_message_at",{ascending:false}).limit(1);if(!r.error&&r.data?.length)await openConversation(r.data[0].id);else{$("chatForm").hidden=true;$("conversationTitle").textContent="Hỏi đáp cùng BS Hùng";$("conversationMeta").textContent="Bắt đầu bằng cách nhấn “Câu hỏi mới”.";}}
 }
})();

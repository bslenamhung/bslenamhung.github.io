import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL="https://ckwhjyzomppsdplnkdeq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_FmJK_HkQxhoQ04dIzI1mCg_eupXeR48";
const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=id=>document.getElementById(id);
let user=null,activeId=null,creatingNew=false,sending=false;
const qaDate=v=>v?new Date(v).toLocaleString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"";
function showGate(message){$("chatApp").hidden=true;$("chatGate").hidden=false;$("gateMessage").textContent=message;}
function appendMessage(box,m){
 const item=document.createElement("article");item.className="qaMessage qaMessage-"+m.sender_role;
 const meta=document.createElement("div");meta.className="qaMessageMeta";meta.textContent=(m.sender_role==="patient"?"Bạn":m.sender_role==="doctor"?"BS Hùng":"Trợ lý AI")+" · "+qaDate(m.created_at);
 const body=document.createElement("div");body.className="qaMessageBody";body.textContent=m.body||"";item.append(meta,body);
 if(Array.isArray(m.sources)&&m.sources.length){const list=document.createElement("div");list.className="qaSources";const label=document.createElement("strong");label.textContent="Bài viết tham khảo: ";list.append(label);m.sources.forEach((s,i)=>{if(!s||typeof s.url!=="string"||!s.url.startsWith("https://bslenamhung.github.io/"))return;if(i)list.append(document.createTextNode(" · "));const a=document.createElement("a");a.href=s.url;a.target="_blank";a.rel="noopener noreferrer";a.textContent=s.title||"Bài viết phòng khám";list.append(a);});item.append(list);}
 box.append(item);
}
async function loadThreads(){
 const box=$("threadList");
 const {data:threads,error}=await db.from("patient_ai_conversations").select("id,subject,status,last_message_at").eq("patient_user_id",user.id).order("last_message_at",{ascending:false});
 if(error){box.textContent="Chưa tải được hội thoại. Vui lòng tải lại trang.";return;}
 box.replaceChildren();
 if(!threads?.length){const p=document.createElement("p");p.className="muted";p.textContent="Chưa có cuộc trò chuyện. Nhấn “Câu hỏi mới” để bắt đầu.";box.append(p);}
 (threads||[]).forEach(t=>{const b=document.createElement("button");b.type="button";b.className="qaThreadButton"+(t.id===activeId?" selected":"");const title=document.createElement("strong");title.textContent=t.subject;const small=document.createElement("small");small.textContent=(t.status==="answered"?"Đã có phản hồi":t.status==="closed"?"Đã đóng":"Đang chờ phản hồi")+" · "+qaDate(t.last_message_at);b.append(title,small);b.addEventListener("click",()=>openConversation(t.id));box.append(b);});
}
async function openConversation(id){
 activeId=id;creatingNew=false;$("chatForm").hidden=false;$("conversationMessages").replaceChildren();$("conversationMessages").innerHTML='<p class="chatEmpty">Đang tải nội dung…</p>';
 const tr=await db.from("patient_ai_conversations").select("id,subject,status").eq("id",id).eq("patient_user_id",user.id).single();
 if(tr.error||!tr.data){$("conversationMessages").textContent="Không tải được cuộc trò chuyện này.";return;}
 $("conversationTitle").textContent=tr.data.subject;$("conversationMeta").textContent=tr.data.status==="answered"?"Bác sĩ đã phản hồi trong cuộc trò chuyện.":"Lịch sử chỉ hiển thị trong tài khoản của bạn.";
 const res=await db.from("patient_ai_messages").select("id,sender_role,body,sources,created_at,is_read_by_patient").eq("conversation_id",id).eq("patient_user_id",user.id).order("created_at");
 if(res.error){$("conversationMessages").textContent="Chưa tải được nội dung. Vui lòng thử lại.";return;}
 $("conversationMessages").replaceChildren();(res.data||[]).forEach(m=>appendMessage($("conversationMessages"),m));
 if(!res.data?.length){const p=document.createElement("p");p.className="chatEmpty";p.textContent="Hãy nhập câu hỏi của bạn ở khung bên dưới."; $("conversationMessages").append(p);}
 $("conversationMessages").scrollTop=$("conversationMessages").scrollHeight;await loadThreads();
}
$("backToPortal").addEventListener("click",()=>{window.location.href="index.html";});
$("newChat").addEventListener("click",()=>{
 activeId=null;creatingNew=true;$("conversationTitle").textContent="Câu hỏi mới";$("conversationMeta").textContent="Câu hỏi sẽ được lưu riêng trong tài khoản của bạn.";
 $("conversationMessages").replaceChildren();const p=document.createElement("p");p.className="chatEmpty";p.textContent="Bạn muốn hỏi điều gì về thai kỳ?";$("conversationMessages").append(p);
 $("chatForm").hidden=false;$("chatInput").value="";$("chatStatus").textContent="";loadThreads();$("chatInput").focus();
});
$("chatForm").addEventListener("submit",async e=>{
 e.preventDefault();if(sending||!user)return;const input=$("chatInput"),body=input.value.trim();if(!body||body.length>6000)return;
 sending=true;const btn=$("sendChat");btn.disabled=true;btn.textContent="Đang gửi…";$("chatStatus").textContent="";
 try{
  let id=activeId;
  if(!id){const c=await db.from("patient_ai_conversations").insert({patient_user_id:user.id,subject:body.replace(/\s+/g," ").slice(0,76)||"Câu hỏi tư vấn"}).select("id").single();if(c.error||!c.data)throw c.error||new Error("Không tạo được hội thoại");id=c.data.id;activeId=id;creatingNew=false;}
  const m=await db.from("patient_ai_messages").insert({conversation_id:id,patient_user_id:user.id,sender_role:"patient",body}).select("id").single();if(m.error||!m.data)throw m.error||new Error("Không lưu được câu hỏi");
  input.value="";$("chatStatus").textContent="Đã lưu câu hỏi. Đang tìm thông tin trong bài viết phòng khám…";await openConversation(id);
  const sess=await db.auth.getSession();const result=await db.functions.invoke("patient-ai-answer",{body:{conversation_id:id,message_id:m.data.id},headers:{Authorization:"Bearer "+sess.data.session.access_token}});
  $("chatStatus").textContent=(result.error||result.data?.error)?"Câu hỏi đã được lưu để bác sĩ xem. Trợ lý AI chưa trả lời được lúc này.":"Đã có phản hồi tự động. Bác sĩ cũng có thể xem và trả lời câu hỏi này.";
  await openConversation(id);
 }catch(err){console.error("Separate patient chat failed",err);$("chatStatus").textContent="Chưa gửi được câu hỏi. Vui lòng kiểm tra kết nối rồi thử lại.";}
 finally{sending=false;btn.disabled=false;btn.textContent="Gửi câu hỏi";}
});
(async()=>{
 const {data,error}=await db.auth.getSession();
 if(error||!data.session){showGate("Bạn cần đăng nhập vào cổng theo dõi thai kỳ trước, sau đó bấm Trợ lý AI để mở phòng chat riêng.");return;}
 user=data.session.user;
 if(user.app_metadata?.role==="admin"){showGate("Tài khoản quản trị sử dụng hộp thư hỏi đáp trong trang quản trị.");return;}
 $("chatGate").hidden=true;$("chatApp").hidden=false;
 const params=new URLSearchParams(location.search);const requested=params.get("conversation");
 await loadThreads();
 if(requested)await openConversation(requested);
 else{
  const r=await db.from("patient_ai_conversations").select("id").eq("patient_user_id",user.id).order("last_message_at",{ascending:false}).limit(1);
  if(!r.error&&r.data?.length)await openConversation(r.data[0].id);
  else {$("chatForm").hidden=true;$("conversationTitle").textContent="Hỏi đáp cùng BS Hùng";$("conversationMeta").textContent="Bắt đầu bằng cách nhấn “Câu hỏi mới”."; }
 }
})();

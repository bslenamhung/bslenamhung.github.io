import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const portal = createClient(
  "https://ckwhjyzomppsdplnkdeq.supabase.co",
  "sb_publishable_FmJK_HkQxhoQ04dIzI1mCg_eupXeR48",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } },
);
const shopUrl = "https://tufzlxfrtdhestbemcly.supabase.co/functions/v1/patient-shop-order-history";
const shopKey = "sb_publishable_gsKYsz40vs6iyWqkb6zyqg_OwoM8k87";
const root = document.getElementById("patientOrdersCard");
const list = document.getElementById("patientOrdersList");
const message = document.getElementById("patientOrdersMessage");
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));
const money = (value) => new Intl.NumberFormat("vi-VN", {
  style: "currency", currency: "VND", maximumFractionDigits: 0,
}).format(Number(value) || 0);
const statusNames = {
  new: "Đơn mới", approved: "Đã xác nhận", rejected: "Từ chối",
  shipping: "Đang giao", delivered: "Đã giao", cancelled: "Đã hủy",
};
function dateText(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("vi-VN");
}
function renderOrders(orders) {
  if (!orders.length) {
    list.innerHTML = "";
    message.textContent = "Chưa tìm thấy đơn hàng theo số điện thoại trong hồ sơ. Nếu anh/chị vừa đặt hàng bằng số điện thoại khác, vui lòng liên hệ phòng khám để được hỗ trợ.";
    return;
  }
  message.textContent = "Hiển thị tối đa 50 đơn gần đây theo số điện thoại trong hồ sơ của bệnh nhân.";
  list.innerHTML = orders.map((order, index) => {
    const items = Array.isArray(order.items) ? order.items : [];
    const validItems = items.filter((item) => item.product_id && Number(item.quantity) > 0);
    const canReorder = validItems.length > 0;
    return `<article class="patientOrderItem">
      <div class="patientOrderHead"><strong>${esc(order.order_code)}</strong><span>${esc(dateText(order.created_at))}</span></div>
      <div class="patientOrderMeta"><span>${esc(statusNames[order.status] || order.status || "Đang cập nhật")}</span><strong>${esc(money(order.total_vnd))}</strong></div>
      <ul>${items.map((item) => `<li>${esc(item.name)} × ${esc(item.quantity)}</li>`).join("")}</ul>
      ${canReorder ? `<button type="button" class="patientReorderButton" data-reorder-index="${index}">Mua lại</button>` : '<p class="patientOrderHint">Không thể mua lại tự động vì đơn này không còn mã sản phẩm.</p>'}
    </article>`;
  }).join("");
  list._orders = orders;
}
async function loadOrders() {
  if (!root || !list || !message) return;
  try {
    const { data: { session } } = await portal.auth.getSession();
    if (!session?.access_token) { root.hidden = true; return; }
    root.hidden = false;
    message.textContent = "Đang tải lịch sử đơn hàng…";
    const response = await fetch(shopUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": shopKey,
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Không tải được đơn hàng.");
    renderOrders(Array.isArray(result.orders) ? result.orders : []);
    if (result.message && !result.orders?.length) message.textContent = result.message;
  } catch (error) {
    console.error("Patient order history unavailable", error);
    root.hidden = false;
    message.textContent = error?.message || "Chưa tải được đơn đã mua. Vui lòng thử lại sau.";
  }
}
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-reorder-index]");
  if (!button || !list?._orders) return;
  const order = list._orders[Number(button.dataset.reorderIndex)];
  const items = (Array.isArray(order?.items) ? order.items : [])
    .filter((item) => item.product_id && Number(item.quantity) > 0)
    .map((item) => ({ product_id: String(item.product_id), quantity: Math.min(99, Math.max(1, Number(item.quantity) || 1)) }));
  if (!items.length) return;
  const params = new URLSearchParams({ reorder: JSON.stringify(items) });
  window.location.href = `https://bslenamhung.github.io/san-pham-me-va-be/?${params.toString()}#cart-panel`;
});
portal.auth.onAuthStateChange((_event, session) => { if (session?.access_token) loadOrders(); else if (root) root.hidden = true; });
loadOrders();

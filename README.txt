BS LÊ NAM HÙNG - WEBSITE V5

Cấu trúc:
- index.html: website công khai
- admin-login.html: đăng nhập quản trị
- admin.html/admin.js/admin.css: CMS quản trị
- supabase-config.js: Project URL + Publishable key
- zalo-qr.jpg: QR Zalo
- supabase-schema.sql: cấu trúc database

V5 bổ sung:
- Quản lý dịch vụ: thêm/sửa mô tả/ẩn/hiện/xóa
- Quản lý bài viết bằng cửa sổ soạn thảo, chọn chuyên môn, ảnh đại diện, lưu nháp/đăng bài
- Quản trị vẫn kiểm tra quyền admin qua RPC is_admin() và RLS của Supabase

Khi cập nhật GitHub Pages, upload/ghi đè toàn bộ file trong thư mục này và giữ zalo-qr.jpg ở thư mục gốc.


Bản V6: phần Phòng khám có bản đồ và nút 'Chỉ đường đến phòng khám'. Cập nhật Địa chỉ trong trang quản trị để bản đồ tự hiển thị. Có thể điền thêm Liên kết Google Maps để nút chỉ đường dùng link của phòng khám.

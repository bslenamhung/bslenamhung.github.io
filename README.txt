BS LÊ NAM HÙNG – V12

V12 bổ sung trình soạn thảo bài viết có hình ảnh:
- Ảnh đại diện: chọn trực tiếp từ máy tính hoặc dán URL.
- Ảnh trong bài: chèn nhiều ảnh vào giữa nội dung.
- Ảnh được tải lên Supabase Storage bucket `site-media` và lưu URL vào bài viết.
- Có định dạng chữ, tiêu đề nhỏ, danh sách, xóa định dạng.
- Vẫn giữ đăng nhập Admin, Supabase, Zalo, QR Zalo và bản đồ của V11.

CÀI ĐẶT SUPABASE STORAGE (chỉ làm 1 lần):
1. Vào Supabase -> SQL Editor.
2. Mở file `supabase-storage.sql` trong bộ website này.
3. Dán toàn bộ nội dung và bấm Run.
4. Sau đó vào `admin.html` -> Bài viết -> Thêm bài viết.

Nếu đã chạy file này ở V11 thì không cần chạy lại; các câu lệnh có thể chạy an toàn nhờ `on conflict` và `drop policy if exists`.


THỐNG KÊ LƯỢT XEM BÀI VIẾT
1) Sau khi đã chạy supabase-visits.sql trước đây, mở file supabase-visits.sql của bản V27 và chạy toàn bộ 1 lần trong Supabase SQL Editor.
2) Website công khai sẽ cộng 1 lượt xem mỗi khi người đọc mở một bài viết.
3) Tổng lượt xem bài viết trong Dashboard bằng tổng lượt xem của từng bài; chỉ số này khác với Tổng lượt truy cập website.

# Cổng theo dõi thai kỳ BS Hùng

Được thêm trong một nhánh riêng để không ghi đè website đang hoạt động.

- URL dự kiến sau khi được hợp nhất và GitHub Pages cập nhật: https://bslenamhung.github.io/theo-doi-thai-ky/
- Supabase project: `ckwhjyzomppsdplnkdeq`
- Trang dùng Supabase publishable key; tuyệt đối không đưa `service_role` key vào trình duyệt.

## Trước khi sử dụng
1. Trong Supabase Authentication → URL Configuration, thêm URL trang triển khai vào Redirect URLs/Site URL khi phù hợp.
2. Xác nhận Edge Function `admin-create-patient` đang hoạt động và có secret `SUPABASE_SERVICE_ROLE_KEY` được cấu hình phía máy chủ.
3. Kiểm tra RLS/policies cho cả `profiles` và `fetal_weight_records`.
4. Thử với tài khoản bệnh nhân giả lập; xác nhận bệnh nhân A không thể đọc dữ liệu của bệnh nhân B.
5. Kiểm tra tạo tài khoản, nhập EFW, lịch sử và xuất CSV trên máy tính lẫn điện thoại.

Không nhập dữ liệu bệnh nhân thật cho đến khi kiểm thử quyền truy cập và quy trình bảo vệ dữ liệu hoàn tất. Biểu đồ nối các số đo đã nhập; không tự đưa ra chẩn đoán hoặc phân vị tăng trưởng.

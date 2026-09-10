V45.2 - BẢO MẬT WEBSITE BS LÊ NAM HÙNG

Điểm sửa chính:
- Không can thiệp cấu trúc storage schema.
- Storage site-media dùng bucket public để khách xem ảnh; upload/update/delete chỉ qua RLS policy cho Admin.
- site_content chỉ Admin được đọc/ghi.
- site_content_public chỉ đọc công khai và tự loại bài chưa xuất bản.
- Lượt xem bài và lượt truy cập chỉ ghi qua RPC SECURITY DEFINER có search_path rỗng.
- Admin kiểm tra bằng Supabase Auth + public.admin_users.

Triển khai SQL trước, website sau. Xem SECURITY-DEPLOY-V45.2.txt.
